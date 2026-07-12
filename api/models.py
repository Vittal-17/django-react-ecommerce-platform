from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

# ==========================================
# USERS
# ==========================================
class User(AbstractUser):

    email = models.EmailField(unique=True) 
    
    ROLE_CHOICES = (('user', 'User'), ('admin', 'Admin'))
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    
    # Added unique=True for the phone number
    phone = models.CharField(max_length=20, blank=True, null=True, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)


    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username'] 

    def __str__(self):
        return self.email

class Address(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=50, default='Home') # e.g., 'Home', 'Work'
    full_address = models.TextField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.label} - {self.user.username}"

# ==========================================
# E-COMMERCE CORE
# ==========================================
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # Upgraded to prevent negative inventory values
    stock = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    image_url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# ==========================================
# CART SYSTEM
# ==========================================
class Cart(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart of {self.user.username}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in cart of {self.cart.user.username}"

# ==========================================
# ORDER SYSTEM
# ==========================================
class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled')
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} by {self.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order #{self.order.id})"

# ==========================================
# REVIEWS & WISHLIST
# ==========================================
class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review by {self.user.username} on {self.product.name}"

class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s Wishlist: {self.product.name}"

# ==========================================
# PAYMENTS & PROMOS
# ==========================================
class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)
    expires_at = models.DateField()

    def __str__(self):
        return self.code

class Payment(models.Model):
    PAYMENT_METHODS = (
        ('credit_card', 'Credit Card'),
        ('paypal', 'PayPal'),
        ('wallet', 'Wallet')
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    )
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    transaction_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.transaction_id} - {self.status}"

# ==========================================
# ADMIN LOGS
# ==========================================
class AdminLog(models.Model):
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Admin {self.admin.username}: {self.action}"