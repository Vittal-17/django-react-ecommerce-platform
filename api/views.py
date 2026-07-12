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

    @action(detail=False, methods=['get'], url_path='me', permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put'], url_path='change-password', permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='request-otp', permission_classes=[IsAuthenticated])
    def request_otp(self, request):
        user = request.user
        otp_code = str(random.randint(100000, 999999))
        cache.set(f"profile_otp_{user.id}", otp_code, timeout=300)
        
        send_mail(
            subject="Your ShopEazy Security Code",
            message=f"Hello {user.username},\n\nYou requested to update your profile. Your verification code is: {otp_code}\n\nThis code expires in 5 minutes.",
            from_email="updates.eazyshop@gmail.com",
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({"message": "OTP sent successfully!"}, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.id != instance.id:
            return Response({"error": "Unauthorized action."}, status=status.HTTP_403_FORBIDDEN)

        # 1. Extract the submitted OTP from the frontend payload
        submitted_otp = request.data.get('otp')
        if not submitted_otp:
            return Response({"error": "OTP verification code is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Fetch the true OTP from the Django cache
        cached_otp = cache.get(f"profile_otp_{request.user.id}")

        # ---> 🚨 TERMINAL DEBUG LOGGER 🚨 <---
        print(f"\n[SECURITY LOG] User: {request.user.username}")
        print(f"[SECURITY LOG] Server Expected: {cached_otp}")
        print(f"[SECURITY LOG] User Submitted : {submitted_otp}\n")

        # 3. Validate the code (Using .strip() to protect against accidental spaces)
        if not cached_otp or str(cached_otp).strip() != str(submitted_otp).strip():
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Handle optional password update
        password = request.data.get('password')
        if password:
            instance.set_password(password)
            instance.save()

        # 5. Execute the Database Update FIRST 
        # (If this fails due to a phone number formatting error, execution stops here and the OTP is kept safe!)
        response = super().update(request, *args, **kwargs)

        # 6. ONLY destroy the OTP if the database successfully saved!
        if response.status_code == 200:
            cache.delete(f"profile_otp_{request.user.id}")
            print(f"[SECURITY LOG] ✅ Profile updated. OTP securely destroyed.")

        return response

    # Track if an admin deletes a user
    def perform_destroy(self, instance):
        username = instance.username
        instance.delete()
        log_admin_action(self.request.user, f"Deleted user account: '{username}'")


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
        # 1. Save the new order to the database
        order = serializer.save(user=self.request.user)
        
        # 2. Send the instant Order Confirmation email to the customer
        self.send_order_status_email(order)
        
        # 3. (Optional but recommended) Log the new order for the Admin Activity Trail
        log_admin_action(self.request.user, f"New Order Placed: #{order.id} for ${order.total_price}")

    # ==========================================
    # PHASE 3 (Logs) & PHASE 4 (Emails) TRIGGER
    # ==========================================
    def perform_update(self, serializer):
        # 1. Capture the old state before saving
        instance = self.get_object()
        old_status = instance.status
        
        # 2. Save the new state
        new_instance = serializer.save()
        
        # 3. Check if the status ACTUALLY changed
        if old_status != new_instance.status:
            # Step A: Log it for the Admin
            log_admin_action(
                self.request.user, 
                f"Order #{new_instance.id} Status: '{old_status}' -> '{new_instance.status}'"
            )
            
            # Step B: Email the Customer
            self.send_order_status_email(new_instance)

    # ==========================================
    # EMAIL DISPATCHER WITH PAYMENT DETAILS
    # ==========================================
    def send_order_status_email(self, order):
        from .models import Payment # Imported here to avoid circular imports
        
        subject = f"ShopEazy Update: Order #{order.id} is now {order.status.capitalize()}"
        
        # Format the delivery details neatly
        address_display = order.shipping_address if order.shipping_address else "Your Saved Address"
        phone_display = order.contact_phone if order.contact_phone else "Your Saved Phone"

        # Fetch the payment associated with this order
        payment = Payment.objects.filter(order=order).first()
        
        # Format payment details securely
        if payment:
            payment_method_display = payment.get_payment_method_display() 
            transaction_id_display = payment.transaction_id
        else:
            payment_method_display = "Pending / N/A"
            transaction_id_display = "Pending / N/A"

        message = f"""Hello {order.user.username},

Great news! There is an update regarding your recent ShopEazy order.

-----------------------------------------
ORDER SUMMARY
-----------------------------------------
Order ID: #{order.id}
Current Status: {order.status.upper()}
Order Total: ${order.total_price}

-----------------------------------------
PAYMENT DETAILS
-----------------------------------------
Method: {payment_method_display}
Transaction ID: {transaction_id_display}

-----------------------------------------
DELIVERY DETAILS
-----------------------------------------
Location: {address_display}
Contact: {phone_display}

If you have any questions, simply reply to this email.

Thank you for shopping with us!
- The ShopEazy Team"""
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email="updates.eazyshop@gmail.com",
                recipient_list=[order.user.email],
                fail_silently=False, 
            )
            print(f"[EMAIL LOG] ✅ Status update sent to {order.user.email} for Order #{order.id}")
        except Exception as e:
            print(f"[EMAIL ERROR] ❌ Failed to send email to {order.user.email}: {str(e)}")

    # ==========================================
    # SECURE ORDER CANCELLATION
    # ==========================================
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        
        if order.status != 'pending':
            return Response(
                {"error": f"Order cannot be cancelled because its current status is '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        with transaction.atomic():
            order.status = 'cancelled'
            order.save()
            
            # Restore stock safely
            for item in order.order_items.all():
                product = Product.objects.select_for_update().get(id=item.product.id)
                product.stock += item.quantity
                product.save()
                
        # If an admin forced this cancellation, log it
        if getattr(request.user, 'role', '') == 'admin':
            log_admin_action(request.user, f"Cancelled Order #{order.id} and restored inventory")
            
        return Response(
            {"message": "Order has been successfully cancelled and stock restored.", "status": "cancelled"},
            status=status.HTTP_200_OK
        )


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