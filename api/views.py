import random
import time
import threading
from django.db import transaction, IntegrityError
from django.core.cache import cache
from django.contrib.auth import authenticate

from rest_framework import viewsets, generics, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.exceptions import ValidationError

# 🚨 THE UPGRADE: Enterprise Filtering & Search
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
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
    CouponSerializer, PaymentSerializer, AdminLogSerializer, AddressSerializer
)
from .permissions import IsOwnerOrReadOnly, IsAdminOrOwner, IsOwnerOrAdmin
from .email_service import send_transactional_email

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

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserProfileUpdateSerializer
        if self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer

    @action(detail=False, methods=['post'], url_path='request-otp', permission_classes=[IsAuthenticated])
    def request_otp(self, request):
        user = request.user
        otp_code = str(random.randint(100000, 999999))
        cache.set(f"profile_otp_{user.id}", otp_code, timeout=300)
        
        send_transactional_email(
            to_email=user.email,
            subject="Your ShopEazy Security Code",
            text_content=f"Hello {user.username}, your code is: {otp_code}. Expires in 5 minutes."
        )
        return Response({"message": "OTP sent successfully!"}, status=status.HTTP_200_OK)

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
    # 🚨 N+1 FIX: select_related fetches the category efficiently
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    pagination_class = StandardResultsSetPagination 
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category'] # Allows: /api/products/?category=2
    search_fields = ['name', 'description'] # Allows: /api/products/?search=laptop
    ordering_fields = ['price', 'created_at'] # Allows: /api/products/?ordering=-price

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request.user, f"Created Product: '{instance.name}' at ${instance.price}")

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
        instance.delete()
        log_admin_action(self.request.user, f"Deleted Product: '{name}'")


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
        # 🚨 N+1 FIX: Efficiently grabs the Order, User, and the nested product details
        queryset = Order.objects.select_related('user').prefetch_related('order_items__product')
        if getattr(self.request.user, 'role', None) == 'admin':
            return queryset.all()
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        self.send_order_status_email(order)
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
            
            send_transactional_email(order.user.email, subject, body)
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
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product'] # Now React can fetch reviews for a specific product cleanly

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