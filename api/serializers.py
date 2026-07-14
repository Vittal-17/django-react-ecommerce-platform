from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework.exceptions import PermissionDenied

from .models import (
    User, Category, Product, Cart, CartItem, Order, 
    OrderItem, Review, Wishlist, Coupon, Payment, AdminLog, Address
)
import threading
from .email_service import send_welcome_email
# ==========================================
# 1. USERS & AUTHENTICATION
# ==========================================
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create(username=validated_data['username'], email=validated_data['email'])
        user.set_password(validated_data['password'])
        user.save()
    
        # 🚀 The New Welcome Email Trigger
        import threading
        from .email_service import send_welcome_email
        threading.Thread(target=send_welcome_email, args=(user.email, user.username)).start()
    
        return user

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'phone', 'role']

    def validate(self, data):
        if 'role' in data:
            request_user = self.context['request'].user
            if getattr(request_user, 'role', None) != 'admin':
                raise serializers.ValidationError({"role": "You do not have permission to modify user roles."})
        return data

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password.")
        return value

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ['user']


# ==========================================
# 2. CATALOG (CATEGORIES & PRODUCTS)
# ==========================================
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


# ==========================================
# 3. CART SYSTEM
# ==========================================
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.URLField(source='product.image_url', read_only=True)
    price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_image', 'price', 'quantity']

    def validate(self, data):
        product = data.get('product')
        if not product and self.instance:
            product = self.instance.product
        quantity = data.get('quantity', 1)

        if product and quantity > product.stock:
            raise serializers.ValidationError({
                'quantity': f"Sorry, we only have {product.stock} of these in stock right now."
            })
        return data

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'items']
        read_only_fields = ['id', 'user', 'created_at']


# ==========================================
# 4. ORDER & CHECKOUT SYSTEM
# ==========================================
class OrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='product.name', read_only=True)
    description = serializers.CharField(source='product.description', read_only=True)
    image_url = serializers.CharField(source='product.image_url', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price', 'name', 'description', 'image_url']
        read_only_fields = ['id', 'price']

class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'status', 'created_at', 'order_items', 
            'total_price', 'shipping_address', 'contact_phone'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'total_price']

    def validate(self, data):
        if not self.instance:
            shipping_address = data.get('shipping_address')
            contact_phone = data.get('contact_phone')
            if not shipping_address or not str(shipping_address).strip() or not contact_phone or not str(contact_phone).strip():
                raise serializers.ValidationError("Order placement failed: A valid shipping address and contact phone number are compulsory.")
        return data

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user if request else None

        if 'status' in validated_data:
            if user and getattr(user, 'role', None) == 'admin':
                instance.status = validated_data['status']
            else:
                raise PermissionDenied(detail="You do not have permission to do this!")

        instance.shipping_address = validated_data.get('shipping_address', instance.shipping_address)
        instance.contact_phone = validated_data.get('contact_phone', instance.contact_phone)
        instance.save()
        return instance

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items')
        user = validated_data.pop('user', self.context['request'].user)

        with transaction.atomic():
            total_price = 0
            for item_data in order_items_data:
                product = Product.objects.select_for_update().get(id=item_data['product'].id)
                if item_data['quantity'] > product.stock:
                    raise serializers.ValidationError(f"Checkout failed: '{product.name}' only has {product.stock} units left.")
                
                actual_price = product.price 
                total_price += item_data['quantity'] * actual_price
                item_data['price'] = actual_price
                product.stock -= item_data['quantity']
                product.save()

            order = Order.objects.create(user=user, total_price=total_price, **validated_data)

            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)

            CartItem.objects.filter(cart__user=self.context['request'].user).delete()

        return order


# ==========================================
# 5. REVIEWS, WISHLIST & ADMIN TOOLS
# ==========================================
class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'product_name', 'rating', 'comment', 'created_at', 'username']
        read_only_fields = ['user']

class WishlistSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['user', 'created_at']

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class AdminLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminLog
        fields = '__all__'