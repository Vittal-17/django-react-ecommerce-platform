from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet, CategoryViewSet, ProductViewSet, OrderViewSet, OrderItemViewSet,
    ReviewViewSet, WishlistViewSet, CouponViewSet, PaymentViewSet, AdminLogViewSet,
    CartViewSet, CartItemViewSet, RegisterView, CustomTokenObtainPairView
)

# Public API router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'order-items', OrderItemViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'wishlist', WishlistViewSet)
router.register(r'coupons', CouponViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'admin-logs', AdminLogViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-items')

# Admin-only API router (strictly for frontend admin panel)
admin_router = DefaultRouter()
admin_router.register(r'users', UserViewSet, basename='admin-users')
admin_router.register(r'products', ProductViewSet, basename='admin-products')
admin_router.register(r'orders', OrderViewSet, basename='admin-orders')

urlpatterns = [
    path('', include(router.urls)),  # public API
    path('secure/api/', include(admin_router.urls)),  # protected admin-only API for React
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), 
]