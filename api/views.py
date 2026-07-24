import random
import time
import threading
from django.db import transaction, IntegrityError
from django.db.models import Q
from django.core.cache import cache
from datetime import date
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import viewsets, generics, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.exceptions import ValidationError

# 🚨 THE UPGRADE: Enterprise Filtering & Search
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import permissions
from .permissions import IsSellerAdminOrReadOnly, IsSellerOrAdmin, IsAdminUser

from .models import (
    User, Category, Product, Order, OrderItem, Review, 
    Wishlist, Cart, CartItem, Coupon, Payment, AdminLog, Address
)
from .serializers import (
    UserSerializer, RegisterSerializer, UserProfileUpdateSerializer, ChangePasswordSerializer,
    CategorySerializer, ProductSerializer, OrderSerializer, OrderItemSerializer,
    ReviewSerializer, WishlistSerializer, CartSerializer, CartItemSerializer,
    CouponSerializer, PaymentSerializer, AdminLogSerializer, AddressSerializer
)
from .permissions import IsOwnerOrReadOnly, IsAdminOrOwner, IsOwnerOrAdmin
from .email_service import send_order_email,send_otp_email,send_vendor_new_order_email,send_vendor_product_status_email, async_notify_cancellation

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12 
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==========================================
# SMART ADMIN LOGGER HELPER
# ==========================================
def log_admin_action(user, message):
    if user.is_authenticated and getattr(user, 'role', '') == 'admin':
        safe_message = message[:255]
        AdminLog.objects.create(admin=user, action=safe_message)


# ==========================================
# 1. USERS & AUTHENTICATION
# ==========================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    pagination_class = StandardResultsSetPagination
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserProfileUpdateSerializer
        if self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='request-otp')
    def request_otp(self, request):
        """Generates an OTP for profile updates with enterprise rate-limiting"""
        user = request.user
        today = date.today().isoformat()
        
        count_key = f"otp_count_{user.id}_{today}"
        cooldown_key = f"otp_cooldown_{user.id}"

        # 🚨 1. Check the 60-Second Cooldown
        if cache.get(cooldown_key):
            return Response(
                {"error": "Please wait 60 seconds before requesting another OTP."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 🚨 2. Check the Daily Limit (10 per day)
        otp_count = cache.get(count_key, 0)
        if otp_count >= 10:
            return Response(
                {"error": "Daily OTP limit reached (10/day). Please try again tomorrow."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 3. Generate the 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # 4. Save to Cache
        cache.set(f"profile_otp_{user.id}", otp, timeout=300) # OTP valid for 5 mins
        cache.set(count_key, otp_count + 1, timeout=86400)    # Increment daily count (expires in 24h)
        cache.set(cooldown_key, True, timeout=60)             # Lock the endpoint for 60 seconds

        # 5. Send the Email (Using your existing email logic)
        subject = "Your EazyShop Security Code"
        body = f"Hello {user.username},\n\nYour security code is: {otp}\n\nThis code expires in 5 minutes.\n\nNever share this code with anyone."
        
        try:
            send_otp_email(to_email=user.email, username=user.username, otp=otp)
            return Response({"message": f"OTP sent to {user.email}"}, status=status.HTTP_200_OK)
        except Exception as e:
            # If email fails, immediately remove the cooldown so they can try again
            print(f"\n[OTP EMAIL ERROR] ❌ {str(e)}\n")

            cache.delete(cooldown_key)
            return Response({"error": "Failed to send email. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_owner = request.user.id == instance.id
        is_admin = getattr(request.user, 'role', None) == 'admin'
        
        if not is_owner and not is_admin:
            return Response({"error": "Unauthorized action."}, status=status.HTTP_403_FORBIDDEN)

        if 'role' in request.data and not is_admin:
            return Response({"error": "Only admins can modify user roles."}, status=status.HTTP_403_FORBIDDEN)

        if ('password' in request.data or 'phone' in request.data) and not is_admin:
            submitted_otp = request.data.get('otp')
            cached_otp = cache.get(f"profile_otp_{request.user.id}")

            if not submitted_otp or not cached_otp or str(cached_otp).strip() != str(submitted_otp).strip():
                return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            cache.delete(f"profile_otp_{request.user.id}")

        new_password = request.data.get('password')
        current_password = request.data.get('current_password')

        if new_password:
            if not current_password or not instance.check_password(current_password):
                return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
            instance.set_password(new_password)
            instance.save()

        try:
            return super().update(request, *args, **kwargs)
        except Exception:
            return Response({"error": "Profile update failed."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='verify-password')
    def verify_password(self, request):
        """Real-time backend validation for the current password"""
        user = request.user
        current_password = request.data.get('current_password')

        if not current_password:
            return Response({"error": "Current password is required."}, status=status.HTTP_400_BAD_REQUEST)

        if user.check_password(current_password):
            return Response({"message": "Password verified successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    queryset = Address.objects.all()
    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        is_first = not Address.objects.filter(user=self.request.user).exists()
        is_default = True if is_first else serializer.validated_data.get('is_default', False)
        instance = serializer.save(user=self.request.user, is_default=is_default)
        if instance.is_default and not is_first:
            Address.objects.filter(user=self.request.user).exclude(id=instance.id).update(is_default=False)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_default:
            Address.objects.filter(user=self.request.user).exclude(id=instance.id).update(is_default=False)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = []

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD
    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(request=self.context.get('request'), username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role,
            },
        }

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ==========================================
# 2. CORE E-COMMERCE (Catalog)
# ==========================================
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request.user, f"Created category: '{instance.name}'")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_name = instance.name
        new_instance = serializer.save()
        if old_name != new_instance.name:
            log_admin_action(self.request.user, f"Renamed Category: '{old_name}' -> '{new_instance.name}'")

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        log_admin_action(self.request.user, f"Deleted category: '{name}'")

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all() # 🚀 THE FIX: Keeps the URL Router happy
    serializer_class = ProductSerializer
    permission_classes = [IsSellerAdminOrReadOnly] 
    pagination_class = StandardResultsSetPagination 
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category'] 
    search_fields = ['name', 'description'] 
    ordering_fields = ['price', 'created_at'] 

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.select_related('category', 'vendor')
        
        # 1. ADMIN PANEL: Admins see absolutely everything
        if user.is_authenticated and getattr(user, 'role', '') == 'admin':
            return queryset.all()
            
        # 2. VENDOR DASHBOARD: Sellers explicitly fetching their own catalog
        vendor_param = self.request.query_params.get('vendor')
        if user.is_authenticated and getattr(user, 'role', '') == 'seller' and vendor_param == str(user.id):
            return queryset.filter(vendor=user)
            
        # 3. PUBLIC STOREFRONT: Everyone else (Guests, Users, and Sellers browsing the store)
        # ONLY return active, fully approved products!
        return queryset.filter(approval_status='approved', is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        auto_status = 'approved' if getattr(user, 'role', '') == 'admin' else 'pending'
        instance = serializer.save(vendor=user, approval_status=auto_status)
        log_admin_action(self.request.user, f"Created Product: '{instance.name}' at ${instance.price} (Status: {auto_status})")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_price, old_stock, old_name = instance.price, instance.stock, instance.name
        new_instance = serializer.save()
        
        changes = []
        if old_price != new_instance.price: changes.append(f"Price: ${old_price} -> ${new_instance.price}")
        if old_stock != new_instance.stock: changes.append(f"Stock: {old_stock} -> {new_instance.stock}")
        if old_name != new_instance.name: changes.append(f"Name: {old_name} -> {new_instance.name}")
            
        if changes:
            log_admin_action(self.request.user, f"Updated '{new_instance.name}': {', '.join(changes)}")
            
    def perform_destroy(self, instance):
        name = instance.name
        instance.is_active = False
        instance.save()
        log_admin_action(self.request.user, f"Soft-Deleted Product: '{name}'")

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        product = self.get_object()
        product.approval_status = 'approved'
        product.save()
        log_admin_action(request.user, f"Approved product ID {product.id}")
        return Response({"message": f"{product.name} is now live!"}, status=status.HTTP_200_OK)


# ==========================================
# 3. CART & ORDERS
# ==========================================
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'total_price']

    def get_queryset(self):
        queryset = Order.objects.select_related('user').prefetch_related('order_items__product')
        if getattr(self.request.user, 'role', None) == 'admin':
            return queryset.all()
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        self.send_order_status_email(order)
        # 🚀 Trigger emails to the vendors who own the products
        self.notify_vendors_async(order)
        log_admin_action(self.request.user, f"New Order Placed: #{order.id} for ${order.total_price}")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_instance = serializer.save()
        if old_status != new_instance.status:
            log_admin_action(self.request.user, f"Order #{new_instance.id} Status: '{old_status}' -> '{new_instance.status}'")
            self.send_order_status_email(new_instance)

    def send_order_status_email(self, order):
        threading.Thread(target=self._send_email_async, args=(order.id,)).start()

    def _send_email_async(self, order_id):
        try:
            order = Order.objects.get(id=order_id)
            payment = None
            
            for _ in range(5):
                payment = Payment.objects.filter(order=order).first()
                if payment: break
                time.sleep(1) 
            
            if payment:
                payment_method_display = payment.get_payment_method_display()
                transaction_id_display = payment.transaction_id or "Mock-TXN-Pending"
            else:
                payment_method_display = "Pending Payment"
                transaction_id_display = "Awaiting System Confirmation"
            
            subject = f"ShopEazy Update: Order #{order.id} is now {order.status.capitalize()}"
            body = f"Hello {order.user.username},\n\nThere is an update on your ShopEazy order #{order.id}.\nStatus: {order.status.upper()}\nTotal: ${order.total_price}\n\nPayment: {payment_method_display}\nTransaction ID: {transaction_id_display}\n\nDelivery to: {order.shipping_address or 'Saved Address'}\n\nThank you!"
            
            send_order_email(
    to_email=order.user.email,
    username=order.user.username,
    order_id=order.id,
    status=order.status,
    total=order.total_price,
    payment_method=payment_method_display,
    txn_id=transaction_id_display,
    address=order.shipping_address or 'Saved Address'
)
        except Exception as e:
            print(f"[EMAIL ERROR] ❌ Threaded email failed: {str(e)}")


    def notify_vendors_async(self, order):
        """Spins up a thread to email vendors about their sales using premium HTML templates"""
        def send_emails():
            for item in order.order_items.all():
                if item.vendor:
                    try:
                        # 🚀 Trigger the new premium HTML vendor email!
                        send_vendor_new_order_email(
                            to_email=item.vendor.email,
                            username=item.vendor.username,
                            order_id=order.id,
                            product_name=item.product.name,
                            quantity=item.quantity,
                            earnings=item.seller_earnings,
                            customer_name=order.user.username,
                            address=order.shipping_address or 'Saved Address'
                        )
                    except Exception as e:
                        print(f"Failed to notify vendor {item.vendor.email}: {e}")
        
        threading.Thread(target=send_emails).start()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != 'pending':
            return Response({"error": "Cannot cancel non-pending order."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            order.status = 'cancelled'
            order.save()
            
            # 🚀 1. Restore stock AND update individual vendor order item statuses to cancelled
            for item in order.order_items.all():
                item.status = 'cancelled'
                item.save()
                
                if item.product:
                    product = Product.objects.select_for_update().get(id=item.product.id)
                    product.stock += item.quantity
                    product.save()
                
        if getattr(request.user, 'role', '') == 'admin':
            log_admin_action(request.user, f"Cancelled Order #{order.id}")
            
        # 2. Email the customer about the cancellation
        self.send_order_status_email(order)

        async_notify_cancellation(order)
        # 🚀 3. Alert the affected vendors in the background
        #self.notify_vendors_of_cancellation_async(order)
        
        return Response({"message": "Order cancelled successfully."}, status=status.HTTP_200_OK)

    def notify_vendors_of_cancellation_async(self, order):
        """Spins up a thread to notify vendors that an order was cancelled"""
        def send_cancellation_emails():
            for item in order.order_items.all():
                if item.vendor:
                    subject = f"Notice: Order #{order.id} has been Cancelled"
                    body = f"Hello {item.vendor.username},\n\nOrder #{order.id} containing your product '{item.product.name}' has been cancelled by the customer. Please do not fulfill this item.\n\nEazyShop Team"
                    try:
                        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [item.vendor.email])
                    except Exception as e:
                        print(f"Failed to notify vendor {item.vendor.email} of cancellation: {e}")
        
        threading.Thread(target=send_cancellation_emails).start()


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('order', 'product').all()
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        return queryset


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]
    queryset = Cart.objects.all()
    def get_queryset(self):
        # 🚨 MASSIVE N+1 FIX: prefetch_related('items__product') stops the database from
        # pinging the server for every single product inside the cart.
        return Cart.objects.prefetch_related('items__product').filter(user=self.request.user)
        
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CartItem.objects.select_related('product', 'cart', 'cart__user').filter(cart__user=self.request.user)
        
    def perform_create(self, serializer):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        try:
            serializer.save(cart=cart)
        except IntegrityError:
            raise ValidationError({"detail": "This product is already in your cart."})


# ==========================================
# 4. REVIEWS & WISHLIST
# ==========================================
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('user', 'product').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'user']

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsAdminOrOwner()]
        return super().get_permissions()

    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({"detail": "You have already reviewed this product."})

    def perform_destroy(self, instance):
        review_info = f"Review by {instance.user.username} on '{instance.product.name}'"
        instance.delete()
        log_admin_action(self.request.user, f"Deleted {review_info}")

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    queryset = Wishlist.objects.all()
    def get_queryset(self):
        # 🚨 N+1 FIX: Grabs the nested product details to prevent loops
        return Wishlist.objects.select_related('product__category').filter(user=self.request.user)
        
    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({"detail": "This product is already in your wishlist."})


# ==========================================
# 5. ADMIN SPECIFIC (Coupons, Payments, Logs)
# ==========================================
class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request.user, f"Created Promo Code: '{instance.code}' ({instance.discount_percent}% off)")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_discount = instance.discount_percent
        new_instance = serializer.save()
        if old_discount != new_instance.discount_percent:
            log_admin_action(self.request.user, f"Updated Coupon '{new_instance.code}': {old_discount}% -> {new_instance.discount_percent}%")

    def perform_destroy(self, instance):
        code = instance.code
        instance.delete()
        log_admin_action(self.request.user, f"Deleted Promo Code: '{code}'")

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('order').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_instance = serializer.save()
        if old_status != new_instance.status:
            log_admin_action(self.request.user, f"Payment Tx #{new_instance.transaction_id} Status: '{old_status}' -> '{new_instance.status}'")

class AdminLogViewSet(viewsets.ModelViewSet):
    queryset = AdminLog.objects.select_related('admin').all().order_by('-timestamp')
    serializer_class = AdminLogSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

import threading
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class VendorSalesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer 
    permission_classes = [IsSellerOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') != 'seller':
            return OrderItem.objects.none()
        return OrderItem.objects.filter(vendor=user).select_related('order', 'product').order_by('-id')

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        item = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['shipped', 'delivered', 'cancelled']:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. Update the individual item status
        item.status = new_status
        item.save()

        # 🚀 2. Automatically Sync the Parent Order Status!
        order = item.order
        all_items = order.order_items.all()
        
        # If all items in this order are now delivered, mark the order delivered
        if all(i.status == 'delivered' for i in all_items):
            order.status = 'delivered'
        # If any item is shipped (and none pending/cancelled improperly), mark order shipped
        elif any(i.status == 'shipped' for i in all_items):
            order.status = 'shipped'
        elif all(i.status == 'cancelled' for i in all_items):
            order.status = 'cancelled'
        order.save()
        
        # 3. Trigger the customer email silently in the background
        self.notify_customer_async(item)
        
        return Response({"message": f"Item marked as {new_status}"}, status=status.HTTP_200_OK)

    def notify_customer_async(self, item):
        """Spins up a thread to alert the customer that their specific item shipped/delivered"""
        def send_email():
            try:
                order = item.order
                # Look up the payment so the receipt looks official
                payment = Payment.objects.filter(order=order).first()
                
                if payment:
                    payment_method_display = payment.get_payment_method_display()
                    transaction_id_display = payment.transaction_id or "Verified Transaction"
                else:
                    payment_method_display = "Completed"
                    transaction_id_display = "System Confirmed"
                
                # 🚀 Fire the HTML email to the customer!
                send_order_email(
                    to_email=order.user.email,
                    username=order.user.username,
                    order_id=order.id,
                    status=item.status,  # Passes 'shipped', 'delivered', or 'cancelled'
                    total=order.total_price,
                    payment_method=payment_method_display,
                    txn_id=transaction_id_display,
                    address=order.shipping_address or 'Saved Address'
                )
            except Exception as e:
                print(f"[EMAIL ERROR] ❌ Failed to notify customer about item {item.id} status: {str(e)}")
                
        threading.Thread(target=send_email).start()