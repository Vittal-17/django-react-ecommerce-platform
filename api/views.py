from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from django.db import transaction


from .models import (
    User, Category, Product, Order, OrderItem, Review, 
    Wishlist, Cart, CartItem, Coupon, Payment, AdminLog
)
from .serializers import (
    UserSerializer, RegisterSerializer, UserProfileUpdateSerializer, ChangePasswordSerializer,
    CategorySerializer, ProductSerializer, OrderSerializer, OrderItemSerializer,
    ReviewSerializer, WishlistSerializer, CartSerializer, CartItemSerializer,
    CouponSerializer, PaymentSerializer, AdminLogSerializer
)
from .permissions import IsOwnerOrReadOnly, IsAdminOrOwner, IsOwnerOrAdmin

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


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class ProductViewSet(viewsets.ModelViewSet):
    # Optimized: Fetch category in the same query
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.select_related('user').prefetch_related('order_items__product')
        if getattr(self.request.user, 'role', None) == 'admin':
            return queryset.all()
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Custom action to cancel an order if it is still pending.
        Safely restores the product stock levels within an atomic transaction.
        """
        order = self.get_object()
        
        if order.status != 'pending':
            return Response(
                {"error": f"Order cannot be cancelled because its current status is '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        with transaction.atomic():
            order.status = 'cancelled'
            order.save()
            
            # Loop through order items and restore stock safely
            for item in order.order_items.all():
                product = Product.objects.select_for_update().get(id=item.product.id)
                product.stock += item.quantity
                product.save()
                
        return Response(
            {"message": "Order has been successfully cancelled and stock restored.", "status": "cancelled"},
            status=status.HTTP_200_OK
        )

class OrderItemViewSet(viewsets.ModelViewSet):
    # Optimized: Join order and product
    queryset = OrderItem.objects.select_related('order', 'product').all()
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        return queryset

class ReviewViewSet(viewsets.ModelViewSet):
    # Optimized: Fetch user and product details together
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

class WishlistViewSet(viewsets.ModelViewSet):
    # Optimized: Fetch product and user
    queryset = Wishlist.objects.select_related('user', 'product').all()
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.select_related('user', 'product').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Optimized: Fetch user
        return Cart.objects.select_related('user').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Optimized: Join cart, user, and product
        return CartItem.objects.select_related('product', 'cart', 'cart__user').filter(cart__user=self.request.user)

    def perform_create(self, serializer):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        try:
            serializer.save(cart=cart)
        except IntegrityError:
            raise ValidationError({"detail": "This product is already in your cart."})

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]

class PaymentViewSet(viewsets.ModelViewSet):
    # Optimized: Join order
    queryset = Payment.objects.select_related('order').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

class AdminLogViewSet(viewsets.ModelViewSet):
    # Optimized: Join user
    queryset = AdminLog.objects.select_related('user').all()
    serializer_class = AdminLogSerializer
    permission_classes = [IsAdminUser]

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