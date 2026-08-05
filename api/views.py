# views.py
import random
import threading
import time
from datetime import date

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import IntegrityError, transaction

from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import FileResponse
from rest_framework import status
from django.contrib.auth import get_user_model
from .utils.pdf_generator import generate_invoice_pdf
from django.db.models import Q

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .email_service import (
    async_notify_cancellation,
    send_order_email,
    send_otp_email,
    send_vendor_new_order_email,
    async_notify_vendors
)
from .models import (
    Address,
    AdminLog,
    Cart,
    CartItem,
    Category,
    Coupon,
    Order,
    OrderItem,
    Payment,
    Product,
    Review,
    User,
    Wishlist,
)
from .permissions import (
    IsAdminOrOwner,
    IsAdminUser,
    IsOwnerOrReadOnly,
    IsSellerAdminOrReadOnly,
    IsSellerOrAdmin,
)
from .serializers import (
    AddressSerializer,
    AdminLogSerializer,
    CartItemSerializer,
    CartSerializer,
    CategorySerializer,
    ChangePasswordSerializer,
    CouponSerializer,
    CustomTokenObtainPairSerializer,
    OrderItemSerializer,
    OrderSerializer,
    PaymentSerializer,
    ProductSerializer,
    RegisterSerializer,
    ReviewSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
    WishlistSerializer,
)

User = get_user_model()

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
    parser_classes = [MultiPartParser, FormParser]


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

        # 5. Send the Email
        try:
            send_otp_email(to_email=user.email, username=user.username, otp=otp)
            return Response({"message": f"OTP sent to {user.email}"}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"\n[OTP EMAIL ERROR] ❌ {e!s}\n")
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
    queryset = Address.exceptions if hasattr(Address, 'exceptions') else Address.objects.all()

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


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            # 🚀 DYNAMIC SECURITY: Uses Lax/HTTP locally, and None/HTTPS in production
            is_production = not settings.DEBUG

            if access_token and refresh_token:
                response.set_cookie(
                    key='access_token',
                    value=access_token,
                    httponly=True,
                    secure=True,        # 🚀 FORCES HTTPS TRANSMISSION
                    samesite='None',    # 🚀 ALLOWS CROSS-DOMAIN COOKIES
                    max_age=300
                )
                response.set_cookie(
                    key='refresh_token',
                    value=refresh_token,
                    httponly=True,
                    secure=True,        # 🚀 FORCES HTTPS TRANSMISSION
                    samesite='None',    # 🚀 ALLOWS CROSS-DOMAIN COOKIES
                    max_age=86400
                )
                del response.data['access']
                del response.data['refresh']

        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            request.data['refresh'] = refresh_token

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access_token = response.data.get('access')

            # 🚀 DYNAMIC SECURITY: Uses Lax/HTTP locally, and None/HTTPS in production
            is_production = not settings.DEBUG

            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=is_production,
                samesite='None' if is_production else 'Lax',
                max_age=300
            )
            del response.data['access']

        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"success": True, "message": "Logged out successfully."})

        # 🚀 DYNAMIC SECURITY: The deletion request must perfectly match the creation flags
        is_production = not settings.DEBUG
        samesite_flag = 'None' if is_production else 'Lax'

        response.delete_cookie('access_token', path='/', samesite=samesite_flag)
        response.delete_cookie('refresh_token', path='/', samesite=samesite_flag)

        return response

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
    queryset = Product.objects.all()
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

        if user.is_authenticated and getattr(user, 'role', '') == 'admin':
            queryset = queryset.all()
        else:
            vendor_param = self.request.query_params.get('vendor')
            if user.is_authenticated and getattr(user, 'role', '') == 'seller' and vendor_param == str(user.id):
                queryset = queryset.filter(vendor=user)
            else:
                # 🚀 SAFEGUARD: Allows 'approved' products OR products with null/blank status so existing DB items don't vanish
                queryset = queryset.filter(
                    Q(approval_status='approved') | Q(approval_status__isnull=True) | Q(approval_status=''),
                    is_active=True
                )

        # Apply custom query parameter filters (Price range & Stock)
        min_price = self.request.query_params.get('price__gte')
        max_price = self.request.query_params.get('price__lte')

        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            queryset = queryset.filter(stock__gt=0)

        return queryset

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
        # 🚀 SECURE BY DEFAULT: Always restricts to the logged-in user's personal orders.
        return Order.objects.select_related('user').prefetch_related('order_items__product').filter(user=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser], url_path='admin-all')
    def admin_all_orders(self, request):
        """Dedicated secure endpoint strictly for the admin panel to view all global orders"""
        queryset = Order.objects.select_related('user').prefetch_related('order_items__product').order_by('-created_at')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        self.send_order_status_email(order)

        # 🚀 FIX: Call the centralized, consolidated email function from email_service.py
        async_notify_vendors(order)

        log_admin_action(self.request.user, f"New Order Placed: #{order.id} for ${order.total_price}")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_instance = serializer.save()

        if old_status != new_instance.status:
            new_instance.order_items.update(status=new_instance.status)
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
            print(f"[EMAIL ERROR] ❌ Threaded email failed: {e!s}")

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != 'pending':
            return Response({"error": "Cannot cancel non-pending order."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order.status = 'cancelled'
            order.save()

            for item in order.order_items.all():
                item.status = 'cancelled'
                item.save()

                if item.product:
                    product = Product.objects.select_for_update().get(id=item.product.id)
                    product.stock += item.quantity
                    product.save()

        if getattr(request.user, 'role', '') == 'admin':
            log_admin_action(request.user, f"Cancelled Order #{order.id}")

        self.send_order_status_email(order)
        async_notify_cancellation(order)

        return Response({"message": "Order cancelled successfully."}, status=status.HTTP_200_OK)


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

    def get_queryset(self):
        user = self.request.user
        queryset = Review.objects.select_related('user', 'product').all().order_by('-id')
        if getattr(user, 'role', '') == 'seller':
            queryset = queryset.filter(product__vendor=user)
        return queryset

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


class VendorSalesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsSellerOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        base_qs = OrderItem.objects.select_related('order', 'order__user', 'product').order_by('-id')

        if getattr(user, 'role', '') == 'admin':
            return base_qs
        if getattr(user, 'role', '') == 'seller':
            return base_qs.filter(vendor=user)

        return OrderItem.objects.none()

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        item = self.get_object()
        new_status = request.data.get('status')
        user = request.user

        if new_status == 'delivered' and getattr(user, 'role', '') != 'admin':
            return Response(
                {"error": "Unauthorized: Vendors cannot mark items as delivered. Only administrators can verify delivery."},
                status=status.HTTP_403_FORBIDDEN
            )

        if new_status not in ['shipped', 'delivered', 'cancelled']:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        item.status = new_status
        item.save()

        order = item.order
        all_items = order.order_items.all()

        if all(i.status == 'delivered' for i in all_items):
            order.status = 'delivered'
        elif any(i.status == 'shipped' for i in all_items):
            order.status = 'shipped'
        elif all(i.status == 'cancelled' for i in all_items):
            order.status = 'cancelled'
        order.save()

        self.notify_customer_async(item)
        return Response({"message": f"Item marked as {new_status}"}, status=status.HTTP_200_OK)

    def notify_customer_async(self, item):
        def send_email():
            try:
                order = item.order
                payment = Payment.objects.filter(order=order).first()

                if payment:
                    payment_method_display = payment.get_payment_method_display()
                    transaction_id_display = payment.transaction_id or "Verified Transaction"
                else:
                    payment_method_display = "Completed"
                    transaction_id_display = "System Confirmed"

                send_order_email(
                    to_email=order.user.email,
                    username=order.user.username,
                    order_id=order.id,
                    status=item.status,
                    total=order.total_price,
                    payment_method=payment_method_display,
                    txn_id=transaction_id_display,
                    address=order.shipping_address or 'Saved Address'
                )
            except Exception as e:
                print(f"[EMAIL ERROR] ❌ Failed to notify customer about item {item.id} status: {e!s}")

        threading.Thread(target=send_email).start()


# ==========================================
# 6. PASSWORD RESET VIA EMAIL OTP ENDPOINTS
# ==========================================
class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 🚀 Use iexact to handle case-insensitivity (e.g. User@Gmail.com vs user@gmail.com)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "No account found with this email address."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit OTP and cache it using the normalized lower-case email as the key
        otp = str(random.randint(100000, 999999))
        normalized_email = email.lower()

        cache.set(f"pwd_reset_{normalized_email}", otp, timeout=300)

        # Send email
        send_otp_email(to_email=user.email, username=user.username, otp=otp)
        return Response({"detail": "OTP sent successfully."}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp')

        if not email or not otp:
            return Response({"error": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get(f"pwd_reset_{email}")

        if not cached_otp or str(cached_otp).strip() != str(otp).strip():
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "OTP verified successfully."}, status=status.HTTP_200_OK)


from django.db import transaction, connection

class ConfirmPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')

        if not email or not otp or not new_password:
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get(f"pwd_reset_{email}")
        if not cached_otp or str(cached_otp).strip() != str(otp).strip():
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Force atomic transaction to ensure it commits
        try:
            with transaction.atomic():
                user = User.objects.filter(email__iexact=email).first()
                if not user:
                    return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

                print(f"[DEBUG] Updating password for user ID: {user.pk} ({user.email})")
                user.set_password(new_password)

                # Explicitly specify update_fields to force an immediate SQL UPDATE
                user.save(update_fields=['password'])

                # Force refresh from database to confirm the hash changed in storage
                user.refresh_from_db()
                print(f"[DEBUG] Successfully committed new hash to DB. Current hash starts with: {user.password[:15]}...")

            # Cache is wiped only after successful transaction commit
            cache.delete(f"pwd_reset_{email}")
            return Response({"detail": "Password reset successfully."}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"[ERROR] Database save failed: {e}")
            return Response({"error": "Internal database error during password reset."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownloadInvoiceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            # Ensure users can only download invoices for their own orders (unless admin)
            order = Order.objects.get(id=order_id)
            if order.user != request.user and getattr(request.user, 'role', None) != 'admin':
                return Response({"error": "Unauthorized access to this invoice."}, status=status.HTTP_403_FORBIDDEN)

            # Generate PDF buffer
            pdf_buffer = generate_invoice_pdf(order)

            # Return file response stream
            filename = f"Invoice_INV-{order.id:05d}.pdf"
            return FileResponse(pdf_buffer, as_attachment=True, filename=filename, content_type='application/pdf')

        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"[PDF ERROR] {e}")
            return Response({"error": "Failed to generate invoice PDF."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
