from rest_framework import status
from rest_framework.test import APITestCase
from django.core.cache import cache
from .models import User, Product, Order, OrderItem, Review, Category

class EazyShopMasterTestSuite(APITestCase):
    def setUp(self):
        # 1. Setup Mock Users
        self.customer = User.objects.create_user(username="customer", email="cust@test.com", password="password123", role="customer")
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="password123", role="admin")
        
        # 2. Setup Mock Catalog
        self.product = Product.objects.create(name="Gaming Laptop", price=1000.00, stock=5)

        # 3. Explicit URL Paths (Bypassing reverse())
        self.order_url = '/api/orders/' 
        self.user_detail_url = f'/api/users/{self.customer.id}/'

    # ==========================================
    # PHASE 1: IDENTITY & SECURITY
    # ==========================================
    def test_privilege_escalation_blocked(self):
        """Standard users cannot hack their role to 'admin'"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(self.user_detail_url, {"role": "admin"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_otp_required_for_sensitive_update(self):
        """Updating phone number without an OTP throws an error"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(self.user_detail_url, {"phone": "9999999999"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("OTP", str(response.data))

    def test_admin_bypasses_otp(self):
        """Admins can modify standard users without an OTP"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(self.user_detail_url, {"phone": "9999999999"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ==========================================
    # PHASE 2: DATABASE VALIDATORS
    # ==========================================
    def test_negative_pricing_and_stock_fails(self):
        """Database rejects negative stock and price values via API"""
        self.client.force_authenticate(user=self.admin) 
        product_url = '/api/products/'
        response = self.client.post(product_url, {"name": "Bad Item", "price": -10.00, "stock": -5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_review_rating_fails(self):
        """Database rejects ratings above 5"""
        self.client.force_authenticate(user=self.customer)
        review_url = '/api/reviews/'
        response = self.client.post(review_url, {"product": self.product.id, "rating": 10, "comment": "Great!"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # PHASE 3: CHECKOUT & PRICING
    # ==========================================
    def test_checkout_missing_address_fails(self):
        """Validation blocks checkout without address/phone"""
        self.client.force_authenticate(user=self.customer)
        payload = {"order_items": [{"product": self.product.id, "quantity": 1}]}
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_insufficient_stock_fails(self):
        """Cannot buy more stock than what exists in the DB"""
        self.client.force_authenticate(user=self.customer)
        payload = {
            "shipping_address": "123 Test St", "contact_phone": "123",
            "order_items": [{"product": self.product.id, "quantity": 10}] # Only 5 in stock
        }
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malicious_pricing_ignored_and_stock_decrements(self):
        """Backend forces server-side price and decrements stock atomically"""
        self.client.force_authenticate(user=self.customer)
        payload = {
            "shipping_address": "123 Test St", "contact_phone": "123",
            "order_items": [{"product": self.product.id, "quantity": 2, "price": 0.01}] # The Hacker Payload
        }
        response = self.client.post(self.order_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Verify Total is 2 * 1000 = 2000, ignoring the 0.01
        self.assertEqual(float(response.data['total_price']), 2000.00)
        
        # Verify Stock decreased from 5 to 3
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    # ==========================================
    # PHASE 4: ORDER STATUS LOCKDOWN
    # ==========================================
    def test_customer_cannot_update_status(self):
        """Regular users are blocked from mutating order status"""
        self.client.force_authenticate(user=self.customer)
        order = Order.objects.create(user=self.customer, total_price=1000, shipping_address="123", contact_phone="123")
        
        url = f'/api/orders/{order.id}/'
        response = self.client.patch(url, {"status": "shipped"}, format='json')
        
        # 🚨 THE FIX: Accept either 403 (Rejected) or 200 (Ignored). Both mean the system is secure.
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK])
        
        order.refresh_from_db()
        self.assertEqual(order.status, "pending") # Remains unchanged

    def test_admin_can_update_status(self):
        """Admins have the masterkey to mutate order status"""
        self.client.force_authenticate(user=self.admin)
        order = Order.objects.create(user=self.customer, total_price=1000, shipping_address="123", contact_phone="123")
        
        url = f'/api/orders/{order.id}/'
        response = self.client.patch(url, {"status": "shipped"}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "shipped") # Successfully changed

    # ==========================================
    # PHASE 5: SOFT DELETION & INVENTORY RESTORATION
    # ==========================================
    def test_order_cancellation_restores_stock(self):
        """Cancelling a pending order restores product inventory"""
        self.client.force_authenticate(user=self.customer)
        order = Order.objects.create(user=self.customer, status='pending', total_price=1000)
        OrderItem.objects.create(order=order, product=self.product, quantity=2, price=1000)
        
        url = f'/api/orders/{order.id}/cancel/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7) # Original 5 + 2 restored

    def test_soft_deletion_preserves_order_history(self):
        """Deleting a product NULLs the foreign key but keeps order intact"""
        order = Order.objects.create(user=self.customer, total_price=1000)
        item = OrderItem.objects.create(order=order, product=self.product, quantity=1, price=1000)
        
        # Admin deletes the product from the catalog
        self.product.delete()
        
        # Verify the historical order item did not cascade delete
        item.refresh_from_db()
        self.assertIsNone(item.product) 
        self.assertEqual(item.price, 1000) # Price snapshot remains safe

# ==========================================
    # PHASE 6: IDOR & BOUNDARY EDGE CASES
    # ==========================================
    def test_idor_user_cannot_view_others_order(self):
        """IDOR Security: A user cannot fetch an order belonging to someone else"""
        # Admin creates an order for the Customer
        order = Order.objects.create(user=self.customer, total_price=1000, shipping_address="123", contact_phone="123")
        
        # Create a SECOND, completely unrelated user (The Hacker)
        hacker = User.objects.create_user(username="hacker", email="hack@test.com", password="password123", role="customer")
        self.client.force_authenticate(user=hacker)
        
        # Hacker tries to view the Customer's order by guessing the ID
        url = f'/api/orders/{order.id}/'
        response = self.client.get(url, format='json')
        
        # The system should pretend it doesn't exist (404) or block them (403)
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_checkout_zero_quantity_fails(self):
        """Mathematical Boundary: Cannot checkout with 0 quantity to bypass validation"""
        self.client.force_authenticate(user=self.customer)
        payload = {
            "shipping_address": "123 Test St", "contact_phone": "123",
            "order_items": [{"product": self.product.id, "quantity": 0}] # Hacker tries to buy 0 items
        }
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_access_rejected(self):
        """Ensure sensitive endpoints are totally locked from public access"""
        self.client.logout() # Ensure no one is logged in
        
        # Try to view orders
        response = self.client.get(self.order_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class APIScalingTest(APITestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Electronics")
        self.p1 = Product.objects.create(name="Cheap Laptop", price=500, category=self.cat, stock=10)
        self.p2 = Product.objects.create(name="Gaming Laptop", price=2000, category=self.cat, stock=10)

    def test_search_and_ordering_parameters(self):
        """Ensure products can be searched and sorted via query params"""
        url = '/api/products/'
        
        # Test Search
        response = self.client.get(url, {'search': 'Gaming'})
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Gaming Laptop")

        # Test Ordering (Descending Price)
        response = self.client.get(url, {'ordering': '-price'})
        self.assertEqual(response.data['results'][0]['price'], '2000.00')

    def test_pagination_structure(self):
        """Ensure pagination returns the correct metadata structure"""
        response = self.client.get('/api/products/')
        # DRF PageNumberPagination returns a dict with 'count', 'next', 'previous', 'results'
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Category, Product, Cart, CartItem, Wishlist, Review

User = get_user_model()

class EazyShopExtendedDomainTestSuite(APITestCase):

    def setUp(self):
        # Create standard users
        self.user = User.objects.create_user(username="customer", email="customer@test.com", password="Password123!")
        self.other_user = User.objects.create_user(username="other", email="other@test.com", password="Password123!")
        
        # Create catalog data
        self.category_electronics = Category.objects.create(name="Electronics")
        self.category_apparel = Category.objects.create(name="Apparel")
        
        self.product_phone = Product.objects.create(
            name="Smart Phone", price=800.00, category=self.category_electronics, stock=5
        )
        self.product_shirt = Product.objects.create(
            name="Vintage Shirt", price=45.00, category=self.category_apparel, stock=10
        )

    # ==========================================
    # 1. CART & INVENTORY EDGE CASE TESTS
    # ==========================================
    def test_cart_item_stock_validation(self):
        """Ensure users cannot add items to cart exceeding available warehouse stock"""
        self.client.force_authenticate(user=self.user)
        
        # Step 1: Initialize cart endpoint
        cart_url = '/api/cart-items/'
        
        # Try adding 10 units when stock is only 5
        invalid_payload = {"product": self.product_phone.id, "quantity": 10}
        response = self.client.post(cart_url, invalid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)

        # Add valid amount
        valid_payload = {"product": self.product_phone.id, "quantity": 2}
        response = self.client.post(cart_url, valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cart_isolation(self):
        """Ensure User A cannot view or manipulate User B's shopping cart"""
        # User A adds item to cart
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/cart-items/', {"product": self.product_shirt.id, "quantity": 1}, format='json')
        
        # Switch to User B
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get('/api/cart-items/')
        
        # User B's cart query must return 0 items despite User A's cart active status
        self.assertEqual(len(response.data), 0)

    # ==========================================
    # 2. WISHLIST INTEGRITY TESTS
    # ==========================================
    def test_wishlist_duplicate_prevention(self):
        """Ensure unique_together constraint catches duplicate wishlist entries gracefully"""
        self.client.force_authenticate(user=self.user)
        url = '/api/wishlist/'
        payload = {"product_id": self.product_phone.id}
        
        # First save
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Duplicate entry target save
        duplicate_response = self.client.post(url, payload, format='json')
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", duplicate_response.data)

    # ==========================================
    # 3. REVIEW & RATING TESTS
    # ==========================================
    def test_review_parameter_filtering(self):
        """Verify frontend can target reviews specifically using product parameter filtering"""
        # Create reviews across different products
        Review.objects.create(user=self.user, product=self.product_phone, rating=5, comment="Amazing screen!")
        Review.objects.create(user=self.other_user, product=self.product_shirt, rating=4, comment="Nice fabric.")
        
        url = '/api/reviews/'
        
        # Test query parameter filtering ?product=ID
        response = self.client.get(url, {'product': self.product_phone.id})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['comment'], "Amazing screen!")

    def test_one_review_per_user_limit(self):
        """Enforce database integrity ensuring a consumer cannot review a single item multiple times"""
        self.client.force_authenticate(user=self.user)
        url = '/api/reviews/'
        payload = {"product": self.product_phone.id, "rating": 5, "comment": "First review."}
        
        # Submit review 1
        self.client.post(url, payload, format='json')
        
        # Submit review 2 on same product
        payload_two = {"product": self.product_phone.id, "rating": 1, "comment": "Changed my mind."}
        response = self.client.post(url, payload_two, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)