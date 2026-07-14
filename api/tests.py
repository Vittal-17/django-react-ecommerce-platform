from rest_framework import status
from rest_framework.test import APITestCase
from django.core.cache import cache
from .models import User, Product, Order, OrderItem, Review, Category, Address, AdminLog, CartItem, Cart, Wishlist, Coupon

class EazyShopTitaniumTestSuite(APITestCase):
    def setUp(self):
        # 1. Setup Identities (🔥 THE FIX: added is_staff=True to Admin)
        self.customer = User.objects.create_user(username="customer", email="cust@test.com", password="password123", role="user")
        self.hacker = User.objects.create_user(username="hacker", email="hack@test.com", password="password123", role="user")
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="password123", role="admin", is_staff=True)
        
        # 2. Setup Catalog
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(name="Gaming Laptop", price=1000.00, stock=5, category=self.category)
        self.product_two = Product.objects.create(name="Mouse", price=50.00, stock=20, category=self.category)
        
        # 3. Setup Cart
        self.cart = Cart.objects.create(user=self.customer)

        # 4. URLs
        self.order_url = '/api/orders/' 
        self.cart_url = '/api/cart-items/'
        self.user_detail_url = f'/api/users/{self.customer.id}/'

    # ==========================================
    # PHASE 1: AUTHENTICATION & IDENTITY
    # ==========================================
    def test_01_registration_success(self):
        """Standard registration succeeds with matching passwords"""
        response = self.client.post('/api/register/', {
            "username": "new", 
            "email": "new@test.com", 
            "password": "StrongPassword123!", 
            "password2": "StrongPassword123!"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_02_registration_password_mismatch(self):
        """Registration rejects mismatched passwords"""
        response = self.client.post('/api/register/', {
            "username": "new", 
            "email": "new@test.com", 
            "password": "StrongPassword123!", 
            "password2": "WrongPassword456!"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_03_jwt_token_generation(self):
        """Valid credentials return access and refresh JWT tokens"""
        response = self.client.post('/api/token/', {"email": "cust@test.com", "password": "password123"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_04_privilege_escalation_blocked(self):
        """Standard users cannot hack their role to 'admin'"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(self.user_detail_url, {"role": "admin"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_05_unauthenticated_access_rejected(self):
        """Unauthenticated users cannot access secure endpoints"""
        response = self.client.get(self.order_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ==========================================
    # PHASE 2: OTP & SECURITY PROFILE
    # ==========================================
    def test_06_otp_required_for_sensitive_update(self):
        """Updating phone number without an OTP throws an error"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(self.user_detail_url, {"phone": "9999999999"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_07_successful_otp_profile_update(self):
        """A valid OTP allows a user to update their security profile"""
        self.client.force_authenticate(user=self.customer)
        cache.set(f"profile_otp_{self.customer.id}", "123456", timeout=300)
        response = self.client.patch(self.user_detail_url, {"phone": "555-1234", "otp": "123456"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_08_invalid_otp_rejected(self):
        """An incorrect OTP is rejected"""
        self.client.force_authenticate(user=self.customer)
        cache.set(f"profile_otp_{self.customer.id}", "123456", timeout=300)
        response = self.client.patch(self.user_detail_url, {"phone": "555-1234", "otp": "999999"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_admin_bypasses_otp(self):
        """Admins can modify standard users without requiring OTPs"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(self.user_detail_url, {"phone": "9999999999"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ==========================================
    # PHASE 3: CATALOG & FILTERING
    # ==========================================
    def test_10_negative_pricing_and_stock_fails(self):
        """Database rejects negative stock and price values via API"""
        self.client.force_authenticate(user=self.admin) 
        response = self.client.post('/api/products/', {"name": "Bad", "price": -10.00, "stock": -5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_11_category_deletion_sets_null(self):
        """Deleting a category does not delete the product, it sets category to NULL"""
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f'/api/categories/{self.category.id}/')
        self.product.refresh_from_db()
        self.assertIsNone(self.product.category)

    def test_12_product_search_filter(self):
        """Search parameter correctly filters products"""
        response = self.client.get('/api/products/', {'search': 'Laptop'})
        self.assertEqual(len(response.data['results']), 1)

    def test_13_dynamic_pagination_override(self):
        """Frontend can dynamically override page_size up to max limit"""
        response = self.client.get('/api/products/', {'page_size': 1})
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['count'], 2)

    def test_14_product_category_filtering(self):
        """Category parameter correctly filters products"""
        response = self.client.get('/api/products/', {'category': self.category.id})
        self.assertEqual(len(response.data['results']), 2)

    # ==========================================
    # PHASE 4: CART INTEGRITY
    # ==========================================
    def test_15_add_to_cart_success(self):
        """User can add a valid item to their cart"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(self.cart_url, {"product": self.product.id, "quantity": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_16_cart_unique_product_constraint(self):
        """Cannot add the exact same product to the cart twice as a new row"""
        self.client.force_authenticate(user=self.customer)
        self.client.post(self.cart_url, {"product": self.product.id, "quantity": 1}, format='json')
        response = self.client.post(self.cart_url, {"product": self.product.id, "quantity": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_17_cart_exceeds_stock_fails(self):
        """Adding more items than available in warehouse fails"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(self.cart_url, {"product": self.product.id, "quantity": 10}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_18_cart_isolation(self):
        """IDOR: Hacker cannot view Customer's cart"""
        self.client.force_authenticate(user=self.customer)
        self.client.post(self.cart_url, {"product": self.product.id, "quantity": 1}, format='json')
        self.client.force_authenticate(user=self.hacker)
        response = self.client.get(self.cart_url)
        self.assertEqual(len(response.data), 0)

    def test_19_cart_item_update_quantity(self):
        """User can update the quantity of an existing cart item"""
        self.client.force_authenticate(user=self.customer)
        item = CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        response = self.client.patch(f'{self.cart_url}{item.id}/', {"quantity": 3}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 3)

    # ==========================================
    # PHASE 5: CHECKOUT & MATHEMATICS
    # ==========================================
    def test_20_checkout_success(self):
        """Valid checkout payload creates order successfully"""
        self.client.force_authenticate(user=self.customer)
        payload = {"shipping_address": "123", "contact_phone": "123", "order_items": [{"product": self.product.id, "quantity": 1}]}
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_21_checkout_missing_address_fails(self):
        """Validation blocks checkout without address/phone"""
        self.client.force_authenticate(user=self.customer)
        payload = {"order_items": [{"product": self.product.id, "quantity": 1}]}
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_22_checkout_zero_quantity_fails(self):
        """Mathematical Boundary: Cannot checkout with 0 quantity"""
        self.client.force_authenticate(user=self.customer)
        payload = {"shipping_address": "123", "contact_phone": "123", "order_items": [{"product": self.product.id, "quantity": 0}]}
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_23_malicious_pricing_ignored(self):
        """Backend forces server-side price despite malicious payload"""
        self.client.force_authenticate(user=self.customer)
        payload = {"shipping_address": "123", "contact_phone": "123", "order_items": [{"product": self.product.id, "quantity": 2, "price": 0.01}]}
        response = self.client.post(self.order_url, payload, format='json')
        self.assertEqual(float(response.data['total_price']), 2000.00)

    def test_24_checkout_decrements_stock(self):
        """Successful checkout reduces warehouse inventory"""
        self.client.force_authenticate(user=self.customer)
        payload = {"shipping_address": "123", "contact_phone": "123", "order_items": [{"product": self.product.id, "quantity": 2}]}
        self.client.post(self.order_url, payload, format='json')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    def test_25_checkout_clears_cart(self):
        """Successful checkout automatically wipes the user's shopping cart"""
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        payload = {"shipping_address": "123", "contact_phone": "123", "order_items": [{"product": self.product.id, "quantity": 1}]}
        self.client.post(self.order_url, payload, format='json')
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 0)

    # ==========================================
    # PHASE 6: ORDER MANAGEMENT & CANCELLATION
    # ==========================================
    def test_26_customer_cannot_update_status(self):
        """Users cannot change order status to shipped/delivered"""
        self.client.force_authenticate(user=self.customer)
        order = Order.objects.create(user=self.customer, total_price=1000)
        response = self.client.patch(f'/api/orders/{order.id}/', {"status": "shipped"}, format='json')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK])
        order.refresh_from_db()
        self.assertEqual(order.status, "pending")

    def test_27_admin_can_update_status(self):
        """Admins can change order status to shipped/delivered"""
        self.client.force_authenticate(user=self.admin)
        order = Order.objects.create(user=self.customer, total_price=1000)
        response = self.client.patch(f'/api/orders/{order.id}/', {"status": "shipped"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_28_customer_cannot_cancel_shipped_order(self):
        """Users cannot cancel an order once it is shipped"""
        self.client.force_authenticate(user=self.customer)
        order = Order.objects.create(user=self.customer, total_price=1000, status="shipped")
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_29_order_cancellation_restores_stock(self):
        """Cancelling a pending order restores product inventory immediately"""
        self.client.force_authenticate(user=self.customer)
        order = Order.objects.create(user=self.customer, status='pending', total_price=1000)
        OrderItem.objects.create(order=order, product=self.product, quantity=2, price=1000)
        self.client.post(f'/api/orders/{order.id}/cancel/')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7)

    def test_30_idor_user_cannot_view_others_order(self):
        """IDOR: A user cannot fetch an order belonging to someone else"""
        order = Order.objects.create(user=self.customer, total_price=1000)
        self.client.force_authenticate(user=self.hacker)
        response = self.client.get(f'/api/orders/{order.id}/', format='json')
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_31_order_sorting_by_price(self):
        """Orders can be sorted by total price"""
        self.client.force_authenticate(user=self.admin)
        Order.objects.create(user=self.customer, total_price=50)
        Order.objects.create(user=self.customer, total_price=500)
        response = self.client.get('/api/orders/', {'ordering': '-total_price'})
        self.assertEqual(float(response.data['results'][0]['total_price']), 500.00)

    # ==========================================
    # PHASE 7: SMART ADDRESS BOOK
    # ==========================================
    def test_32_first_address_is_default(self):
        """First address added is automatically marked as default"""
        self.client.force_authenticate(user=self.customer)
        self.client.post('/api/addresses/', {"label": "Home", "full_address": "123"}, format='json')
        addr = Address.objects.get(user=self.customer)
        self.assertTrue(addr.is_default)

    def test_33_address_default_toggling(self):
        """When a new default address is added, old ones are set to False"""
        self.client.force_authenticate(user=self.customer)
        self.client.post('/api/addresses/', {"label": "Home", "full_address": "123"}, format='json')
        self.client.post('/api/addresses/', {"label": "Work", "full_address": "456", "is_default": True}, format='json')
        addr1 = Address.objects.get(label="Home")
        addr2 = Address.objects.get(label="Work")
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)

    # ==========================================
    # PHASE 8: REVIEWS & WISHLIST
    # ==========================================
    def test_34_review_rating_boundaries(self):
        """Database rejects ratings above 5 or below 1"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/reviews/', {"product": self.product.id, "rating": 6, "comment": "Good"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_35_one_review_per_user_limit(self):
        """A consumer cannot review a single item multiple times"""
        self.client.force_authenticate(user=self.customer)
        self.client.post('/api/reviews/', {"product": self.product.id, "rating": 5, "comment": "Good"}, format='json')
        response = self.client.post('/api/reviews/', {"product": self.product.id, "rating": 1, "comment": "Bad"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_36_review_user_filtering(self):
        """Dashboard can fetch reviews for only the logged-in user using ?user="""
        Review.objects.create(user=self.customer, product=self.product, rating=5, comment="Mine")
        Review.objects.create(user=self.hacker, product=self.product_two, rating=4, comment="Theirs")
        response = self.client.get('/api/reviews/', {'user': self.customer.id})
        self.assertEqual(len(response.data['results']), 1)

    def test_37_review_editing_updates_rating(self):
        """User can edit their existing review rating"""
        self.client.force_authenticate(user=self.customer)
        review = Review.objects.create(user=self.customer, product=self.product, rating=3, comment="Okay")
        response = self.client.patch(f'/api/reviews/{review.id}/', {"rating": 5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.rating, 5)

    def test_38_wishlist_duplicate_prevention(self):
        """Ensures unique constraint catches duplicate wishlist entries gracefully"""
        self.client.force_authenticate(user=self.customer)
        self.client.post('/api/wishlist/', {"product_id": self.product.id}, format='json')
        response = self.client.post('/api/wishlist/', {"product_id": self.product.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # PHASE 9: ADMIN LOGS & AUDITING
    # ==========================================
    def test_39_admin_actions_are_logged(self):
        """Any destructive/creative action by an admin creates an AdminLog"""
        self.client.force_authenticate(user=self.admin)
        self.client.post('/api/categories/', {"name": "New"}, format='json')
        self.assertEqual(AdminLog.objects.count(), 1)

    def test_40_non_admins_cannot_view_logs(self):
        """Standard users cannot access the audit trails"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/admin-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ==========================================
    # PHASE 10: PAYMENTS & COUPONS
    # ==========================================
    def test_41_admin_can_create_coupon(self):
        """Admins can create promotional codes"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/coupons/', {"code": "SAVE50", "discount_percent": 50, "expires_at": "2030-01-01"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_42_user_cannot_create_coupon(self):
        """Standard users are blocked from creating promotional codes"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/coupons/', {"code": "HACK100", "discount_percent": 100, "expires_at": "2030-01-01"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)