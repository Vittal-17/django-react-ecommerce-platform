import random
from django.db import transaction, IntegrityError
from django.core.cache import cache
from django.core.mail import send_mail
from django.contrib.auth import authenticate

from rest_framework import viewsets, generics, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    User, Category, Product, Order, OrderItem, Review, 
    Wishlist, Cart, CartItem, Coupon, Payment, AdminLog, Address
)
from .serializers import (
    UserSerializer, RegisterSerializer, UserProfileUpdateSerializer, ChangePasswordSerializer,
    CategorySerializer, ProductSerializer, OrderSerializer, OrderItemSerializer,
    ReviewSerializer, WishlistSerializer, CartSerializer, CartItemSerializer,
    CouponSerializer, PaymentSerializer, AdminLogSerializer,AddressSerializer
)
from .permissions import IsOwnerOrReadOnly, IsAdminOrOwner, IsOwnerOrAdmin
from .utils import log_admin_action
import threading
from .email_service import send_transactional_email


# ==========================================
# SMART ADMIN LOGGER HELPER
# ==========================================
def log_admin_action(user, message):
    """
    Safely logs an action only if the user is an admin.
    Truncates message to 255 chars to prevent database constraint errors.
    """
    if user.is_authenticated and getattr(user, 'role', '') == 'admin':
        safe_message = message[:255]
        AdminLog.objects.create(admin=user, action=safe_message)


# ==========================================
# USERS & AUTHENTICATION
# ==========================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserProfileUpdateSerializer
        if self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer

    # --- THREADED EMAIL HELPER ---
    def _send_otp_email_async(self, email, username, otp_code):
        try:
            send_mail(
                subject="Your ShopEazy Security Code",
                message=f"Hello {username},\n\nYou requested to update your profile. Your verification code is: {otp_code}\n\nThis code expires in 5 minutes.",
                from_email="updates.eazyshop@gmail.com",
                recipient_list=[email],
                fail_silently=True, # Critical: Prevents crashing the worker if SMTP fails
            )
            print(f"[EMAIL LOG] ✅ OTP sent to {email}")
        except Exception as e:
            print(f"[EMAIL ERROR] ❌ Failed to send OTP email: {str(e)}")

    @action(detail=False, methods=['post'], url_path='request-otp', permission_classes=[IsAuthenticated])
    def request_otp(self, request):
        user = request.user
        otp_code = str(random.randint(100000, 999999))
        cache.set(f"profile_otp_{user.id}", otp_code, timeout=300)
        
        # Call the new service
        send_transactional_email(
            to_email=user.email,
            subject="Your ShopEazy Security Code",
            text_content=f"Hello {user.username}, your code is: {otp_code}. Expires in 5 minutes."
        )
        return Response({"message": "OTP sent successfully!"}, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 1. SECURITY CHECK: Ensure only the owner or an admin can access this endpoint
        is_owner = request.user.id == instance.id
        is_admin = getattr(request.user, 'role', None) == 'admin'
        
        if not is_owner and not is_admin:
            return Response({"error": "Unauthorized action."}, status=status.HTTP_403_FORBIDDEN)

        # 2. PRIVILEGE ESCALATION PREVENTION: 
        # If 'role' is in the request data, ONLY admins are allowed to pass.
        if 'role' in request.data and not is_admin:
            return Response({"error": "Only admins can modify user roles."}, status=status.HTTP_403_FORBIDDEN)

        # 3. OTP VERIFICATION:
        # We enforce OTP only if they are trying to change critical fields (like password or phone)
        # Note: You could expand this list to include other sensitive fields
        if 'password' in request.data or 'phone' in request.data:
            submitted_otp = request.data.get('otp')
            cached_otp = cache.get(f"profile_otp_{request.user.id}")

            if not submitted_otp or not cached_otp or str(cached_otp).strip() != str(submitted_otp).strip():
                return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            
            # OTP verified, clear it
            cache.delete(f"profile_otp_{request.user.id}")

        # 4. Handle Password Update
        password = request.data.get('password')
        if password:
            instance.set_password(password)

        # 5. Execute the Database Update
        try:
            # This calls the serializer's update method
            response = super().update(request, *args, **kwargs)
            return response
        except Exception as e:
            return Response({"error": "Profile update failed."}, status=status.HTTP_400_BAD_REQUEST)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own address book
        return Address.objects.filter(user=self.request.user).order_by('-is_default', '-created_at')

    def perform_create(self, serializer):
        # 1. Check if this is their first address
        is_first = not Address.objects.filter(user=self.request.user).exists()
        
        # 2. If it's their first, force it to be default. Otherwise, take user's choice.
        is_default = True if is_first else serializer.validated_data.get('is_default', False)
        
        instance = serializer.save(user=self.request.user, is_default=is_default)
        
        # 3. If this new one is default, remove default status from all others
        if instance.is_default and not is_first:
            Address.objects.filter(user=self.request.user).exclude(id=instance.id).update(is_default=False)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # If updated to default, remove default status from all others
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
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'role': user.role,
            },
        }

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ==========================================
# CORE E-COMMERCE (Products & Categories)
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
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request.user, f"Created Product: '{instance.name}' at ${instance.price}")

    def perform_update(self, serializer):
        # 1. Capture old state
        instance = self.get_object()
        old_price = instance.price
        old_stock = instance.stock
        old_name = instance.name
        
        # 2. Save new state
        new_instance = serializer.save()
        
        # 3. Calculate smart diffs
        changes = []
        if old_price != new_instance.price:
            changes.append(f"Price: ${old_price} -> ${new_instance.price}")
        if old_stock != new_instance.stock:
            changes.append(f"Stock: {old_stock} -> {new_instance.stock}")
        if old_name != new_instance.name:
            changes.append(f"Name: {old_name} -> {new_instance.name}")
            
        if changes:
            log_admin_action(self.request.user, f"Updated '{new_instance.name}': {', '.join(changes)}")
        else:
            log_admin_action(self.request.user, f"Updated metadata/description for '{new_instance.name}'")
            
    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        log_admin_action(self.request.user, f"Deleted Product: '{name}'")


# ==========================================
# CART & ORDERS
# ==========================================
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.select_related('user').prefetch_related('order_items__product')
        if getattr(self.request.user, 'role', None) == 'admin':
            return queryset.all()
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        # Trigger email async
        self.send_order_status_email(order)
        log_admin_action(self.request.user, f"New Order Placed: #{order.id} for ${order.total_price}")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_instance = serializer.save()
        
        if old_status != new_instance.status:
            log_admin_action(
                self.request.user, 
                f"Order #{new_instance.id} Status: '{old_status}' -> '{new_instance.status}'"
            )
            self.send_order_status_email(new_instance)

    # --- OPTIMIZED EMAIL DISPATCHER ---
    def send_order_status_email(self, order):
        # Fire-and-forget: Pass the ID so the thread fetches fresh data
        threading.Thread(target=self._send_email_async, args=(order.id,)).start()

    def _send_email_async(self, order_id):
        try:
            order = Order.objects.get(id=order_id)
            payment = Payment.objects.filter(order=order).first()
            
            # Simplified formatting
            subject = f"ShopEazy Update: Order #{order.id} is now {order.status.capitalize()}"
            body = f"""Hello {order.user.username},

There is an update on your ShopEazy order #{order.id}.
Status: {order.status.upper()}
Total: ${order.total_price}
Payment: {payment.get_payment_method_display() if payment else 'Pending'}
Transaction ID: {payment.transaction_id if payment else 'N/A'}
Delivery to: {order.shipping_address or 'Saved Address'}

Thank you!"""
            
            send_transactional_email(order.user.email, subject, body)
            print(f"[EMAIL LOG] ✅ Background email sent for Order #{order_id}")
        except Exception as e:
            print(f"[EMAIL ERROR] ❌ Threaded email failed: {str(e)}")

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != 'pending':
            return Response({"error": "Cannot cancel non-pending order."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            order.status = 'cancelled'
            order.save()
            for item in order.order_items.all():
                product = Product.objects.select_for_update().get(id=item.product.id)
                product.stock += item.quantity
                product.save()
                
        if getattr(request.user, 'role', '') == 'admin':
            log_admin_action(request.user, f"Cancelled Order #{order.id}")
            
        return Response({"message": "Order cancelled."}, status=status.HTTP_200_OK)


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
    def get_queryset(self):
        return Cart.objects.select_related('user').filter(user=self.request.user)
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
# REVIEWS & WISHLIST
# ==========================================
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('user', 'product').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsAdminOrOwner()]
        return super().get_permissions()

    def get_queryset(self):
        product_id = self.request.query_params.get('product')
        if product_id:
            return Review.objects.select_related('user', 'product').filter(product_id=product_id).order_by('-created_at')
        return super().get_queryset()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        review_info = f"Review by {instance.user.username} on '{instance.product.name}'"
        instance.delete()
        # Only admins triggering this will actually write to the log (due to log_admin_action check)
        log_admin_action(self.request.user, f"Deleted {review_info}")


class WishlistViewSet(viewsets.ModelViewSet):
    queryset = Wishlist.objects.select_related('user', 'product').all()
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Wishlist.objects.select_related('user', 'product').filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==========================================
# ADMIN SPECIFIC (Coupons, Payments, Logs)
# ==========================================
class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]

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