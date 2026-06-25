import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Cart = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Fetch cart items from API
  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/cart-items/');
      setCartItems(res.data);
      console.log('Cart items loaded from API:', res.data); // Debugging log
    } catch (err) {
      console.error('Failed to load cart items:', err);
      showToast('❌ Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const handleAddToCart = async (item) => {
    try {
      const res = await axiosInstance.post('/api/cart-items/', { product: item.id, quantity: 1 });
      setCartItems(prev => [...prev, res.data]);
      console.log('Item added to cart:', res.data); // Debugging log
    } catch (err) {
      console.error('Failed to add to cart:', err);
      showToast('Failed to add to cart');
    }
  };

  // Fetch wishlist items
  const fetchWishlist = async () => {
    try {
      const res = await axiosInstance.get('/api/wishlist/');
      const ids = res.data.map(item => item.product.id);
      setWishlistIds(ids);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    }
  };

  // Add item to wishlist
  const handleAddToWishlist = async (productId) => {
    if (!user) {
      showToast('Please log in to add items to wishlist');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (wishlistIds.includes(productId)) {
      showToast('Already in wishlist');
      return;
    }

    try {
      await axiosInstance.post('/api/wishlist/', { product_id: productId }); // Corrected the field name
      setWishlistIds(prev => [...prev, productId]);
      showToast('Added to wishlist ❤️');
    } catch (err) {
      console.error('Failed to add to wishlist:', err);
      showToast('Failed to add to wishlist');
    }
  };

  // Update quantity of cart item
  const handleQuantityChange = async (id, quantity) => {
    try {
      await axiosInstance.patch(`/api/cart-items/${id}/`, { quantity });
      fetchCartItems(); // Reload cart after updating quantity
      showToast('Quantity updated');
    } catch (err) {
      console.error('Failed to update quantity:', err);
      showToast('Failed to update quantity');
    }
  };

  // Remove item from cart
  const handleRemoveItem = async (id) => {
    if (!window.confirm('Remove this item from your cart?')) return;
    try {
      await axiosInstance.delete(`/api/cart-items/${id}/`);
      fetchCartItems(); // Reload cart after removing item
      showToast('Item removed from cart');
    } catch (err) {
      console.error('Failed to remove item:', err);
      showToast('Failed to remove item');
    }
  };

  // Proceed to checkout
  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) return showToast('Your cart is empty');

    const cartData = JSON.stringify(cartItems); // Converting to string to pass as query parameter
    navigate(`/checkout/?cartData=${encodeURIComponent(cartData)}`);
  };

  // Calculate total price
  const total = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0).toFixed(2);

  // Fetch cart data and wishlist on mount
  useEffect(() => {
    fetchCartItems();
    fetchWishlist();
  }, [axiosInstance]);

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '1rem' }}>
      <h1 style={{ textAlign: 'center' }}>🛒 Your Cart</h1>

      {toast && <div style={{ background: '#4caf50', color: 'white', padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px', textAlign: 'center' }}>{toast}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div className="spinner" style={{ border: '6px solid #f3f3f3', borderTop: '6px solid #4caf50', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' }}></div>
        </div>
      ) : (
        <>
          {cartItems.length === 0 ? (
            <p style={{ textAlign: 'center' }}>Your cart is empty 🛒</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cartItems.map(item => (
                <li key={item.id} style={{ background: '#fafafa', marginBottom: '1rem', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' }}>
                  <img
                    src={item.product_image}
                    alt={item.product_name || item.name}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginRight: '1rem' }}
                  />
                  <div style={{ flexGrow: 1 }}>
                    <strong>{item.product_name || item.name}</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                        style={{ width: '60px', marginRight: '8px', padding: '0.25rem' }}
                      />
                      × ${Number(item.price).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <strong>${(item.quantity * Number(item.price)).toFixed(2)}</strong>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{ background: 'red', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleAddToWishlist(item.product)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: wishlistIds.includes(item.product) ? 'default' : 'pointer',
                        fontSize: '1.5rem'
                      }}
                      title={wishlistIds.includes(item.product) ? 'Already in wishlist' : 'Add to wishlist'}
                      disabled={wishlistIds.includes(item.product)}
                    >
                      {wishlistIds.includes(item.product) ? '❤️' : '🤍'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ textAlign: 'right', marginTop: '1rem' }}>Total: ${total}</h3>
          <button onClick={handleProceedToCheckout} style={{ display: 'block', margin: '1rem auto', padding: '0.75rem 1.5rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
            ✅ Proceed to Checkout
          </button>
        </>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Cart;
