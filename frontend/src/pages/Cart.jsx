import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

// ==========================================
// DEBOUNCED QUANTITY CONTROLLER COMPONENT
// ==========================================
const CartQuantityController = ({ itemId, initialQuantity, onQuantityUpdate }) => {
  const [localQuantity, setLocalQuantity] = useState(initialQuantity);

  useEffect(() => {
    setLocalQuantity(initialQuantity);
  }, [initialQuantity]);

  useEffect(() => {
    if (localQuantity === initialQuantity) return;

    const delayDebounceFn = setTimeout(() => {
      if (localQuantity > 0) {
        onQuantityUpdate(itemId, localQuantity);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [localQuantity, itemId, initialQuantity, onQuantityUpdate]);

  const handleIncrement = () => setLocalQuantity(prev => Number(prev) + 1);
  const handleDecrement = () => setLocalQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleManualInput = (e) => {
    const val = e.target.value;
    if (val === '') {
      setLocalQuantity(''); 
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setLocalQuantity(parsed);
    }
  };

  const handleBlur = () => {
    if (localQuantity === '' || localQuantity < 1) {
      setLocalQuantity(initialQuantity); 
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button 
        type="button"
        onClick={handleDecrement}
        disabled={localQuantity <= 1}
        style={{
          ...baseBtnStyle,
          // Faded red when disabled, bold red when active
          background: localQuantity <= 1 ? '#ffb3b3' : '#ff4d4d',
          cursor: localQuantity <= 1 ? 'not-allowed' : 'pointer'
        }}
        title="Decrease quantity"
      >
        ➖
      </button>
      
      <input
        type="number"
        min="1"
        value={localQuantity}
        onChange={handleManualInput}
        onBlur={handleBlur}
        style={inputStyle}
      />
      
      <button 
        type="button"
        onClick={handleIncrement}
        style={{
          ...baseBtnStyle,
          // Matches the #4caf50 green of your checkout button
          background: '#4caf50' 
        }}
        title="Increase quantity"
      >
        ➕
      </button>
    </div>
  );
};

// Quick styles for the new touch targets
const btnStyle = {
  background: '#e0e0e0',
  border: 'none',
  padding: '0.4rem 0.6rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none'
};

const baseBtnStyle = {
  border: 'none',
  padding: '0.4rem 0.6rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  color: 'white', // Ensures the emoji/text pops against the colors
  transition: 'background 0.2s ease'
};

const inputStyle = {
  width: '50px', 
  textAlign: 'center', 
  padding: '0.25rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontWeight: 'bold',
  MozAppearance: 'textfield'
};

// ==========================================
// MAIN CART COMPONENT
// ==========================================
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
      console.log('Cart items loaded from API:', res.data);
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
      await axiosInstance.post('/api/wishlist/', { product_id: productId });
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
      fetchCartItems(); // Reload data once backend finishes processing
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
      fetchCartItems();
      showToast('Item removed from cart');
    } catch (err) {
      console.error('Failed to remove item:', err);
      showToast('Failed to remove item');
    }
  };

  // Proceed to checkout
  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) return showToast('Your cart is empty');
    const cartData = JSON.stringify(cartItems);
    navigate(`/checkout/?cartData=${encodeURIComponent(cartData)}`);
  };

  // Calculate total price
  const total = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0).toFixed(2);

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
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      
                      {/* INTEGRATED THE NEW UX CONTROLLER */}
                      <CartQuantityController 
                        itemId={item.id} 
                        initialQuantity={item.quantity} 
                        onQuantityUpdate={handleQuantityChange} 
                      />
                      
                      <span>× ${Number(item.price).toFixed(2)}</span>
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
        /* Hides default native spinner arrows in Chrome, Safari, Edge, Opera */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default Cart;