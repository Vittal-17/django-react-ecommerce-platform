from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, Category, Product, Cart, CartItem, Order, 
    OrderItem, Review, Wishlist, Coupon, Payment, AdminLog
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'address', 'phone']

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
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

# --- NEW: Strictly for Profile Details ---
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'address', 'phone', 'role']
        read_only_fields = ['id', 'username', 'email'] 

# --- NEW: Strictly for Password Changes ---
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password.")
        return value

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.URLField(source='product.image_url', read_only=True)
    price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_image', 'price', 'quantity']

    def validate(self, data):
        # 1. Identify the product being added (POST) or updated (PATCH)
        product = data.get('product')
        if not product and self.instance:
            # If it's a PATCH request, the product might not be in the payload, so we grab it from the existing instance
            product = self.instance.product

        # 2. Identify the requested quantity (defaults to 1 for new additions)
        quantity = data.get('quantity', 1)

        # 3. The hard stop: Check against actual database stock
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

class OrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='product.name', read_only=True)
    description = serializers.CharField(source='product.description', read_only=True)
    image_url = serializers.CharField(source='product.image_url', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price', 'name', 'description', 'image_url']

from django.db import transaction # Add this to your imports at the top

class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    address = serializers.CharField(source='user.address', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'status', 'created_at', 'order_items', 'total_price', 'address']
        read_only_fields = ['id', 'user', 'created_at', 'total_price', 'address']

    def validate(self, data):
        """
        Validates that the user has a registered shipping address and phone number
        prior to enabling order creation parameters.
        """
        user = self.context['request'].user
        
        # Enforce profile data integrity rules
        user_address = getattr(user, 'address', '')
        user_phone = getattr(user, 'phone', '')
        
        if not user_address or not str(user_address).strip() or not user_phone or not str(user_phone).strip():
            raise serializers.ValidationError(
                "Order placement failed: A valid shipping address and phone number are compulsory."
            )
        return data

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items')
        validated_data.pop('user', None)

        # Open an atomic database transaction
        with transaction.atomic():
            total_price = 0

            # 1. Validate stock and deduct inventory BEFORE creating the order
            for item_data in order_items_data:
                # select_for_update() locks this specific row so no one else can buy it during this millisecond
                product = Product.objects.select_for_update().get(id=item_data['product'].id)
                
                requested_qty = item_data['quantity']

                if requested_qty > product.stock:
                    raise serializers.ValidationError(
                        f"Checkout failed: '{product.name}' only has {product.stock} units left."
                    )
                
                # Calculate running total
                total_price += requested_qty * item_data['price']
                
                # Deduct from the locked inventory and save
                product.stock -= requested_qty
                product.save()

            # 2. Create the Order
            order = Order.objects.create(
                user=self.context['request'].user,
                total_price=total_price,
                **validated_data
            )

            # 3. Create the Order Items
            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)

            # 4. Clear the user's cart
            CartItem.objects.filter(cart__user=self.context['request'].user).delete()

        return order

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'rating', 'comment', 'created_at', 'username']
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