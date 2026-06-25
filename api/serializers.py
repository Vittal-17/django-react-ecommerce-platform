from rest_framework import serializers
from .models import *
from django.contrib.auth.password_validation import validate_password

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


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'items']
        read_only_fields = ['id', 'user', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='product.name', read_only=True)
    description = serializers.CharField(source='product.description', read_only=True)
    image_url = serializers.CharField(source='product.image_url', read_only=True)  # <-- Corrected line

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price', 'name', 'description', 'image_url']


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    address = serializers.CharField(source='user.address', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'status', 'created_at', 'order_items', 'total_price', 'address']
        read_only_fields = ['id', 'user', 'created_at', 'total_price', 'address']

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items')
        validated_data.pop('user', None)

        total_price = sum(item['quantity'] * item['price'] for item in order_items_data)

        order = Order.objects.create(
            user=self.context['request'].user,
            total_price=total_price,
            **validated_data
        )

        for item_data in order_items_data:
            OrderItem.objects.create(order=order, **item_data)

        CartItem.objects.filter(cart__user=self.context['request'].user).delete()

        return order




from rest_framework import serializers
from .models import Review

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

from django.contrib.auth.hashers import check_password

class UserUpdateSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'address', 'phone', 'role', 'current_password', 'new_password']
        # Added 'role' to the fields list ^

    def update(self, instance, validated_data):
        current_password = validated_data.pop('current_password', None)
        new_password = validated_data.pop('new_password', None)

        if current_password and new_password:
            if not instance.check_password(current_password):
                raise serializers.ValidationError({'current_password': 'Incorrect current password.'})
            instance.set_password(new_password)
            instance.save()

        return super().update(instance, validated_data)
    