import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import styled from 'styled-components';

// ==========================================
// DEBOUNCED QUANTITY CONTROLLER COMPONENT
// ==========================================
const CartQuantityController = ({ itemId, initialQuantity, stockLimit, onQuantityUpdate }) => {
  const [localQuantity, setLocalQuantity] = useState(initialQuantity);
  const isAtLimit = localQuantity >= stockLimit;

  useEffect(() => {
    setLocalQuantity(initialQuantity);
  }, [initialQuantity]);

  useEffect(() => {
    if (localQuantity === initialQuantity) return;
    const delayDebounceFn = setTimeout(() => {
      if (localQuantity > 0 && localQuantity <= stockLimit) {
        onQuantityUpdate(itemId, localQuantity);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [localQuantity, itemId, initialQuantity, onQuantityUpdate, stockLimit]);

  const handleIncrement = () => {
    if (!isAtLimit) setLocalQuantity(prev => Number(prev) + 1);
  };
  const handleDecrement = () => setLocalQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleManualInput = (e) => {
    const val = e.target.value;
    if (val === '') {
      setLocalQuantity(''); 
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setLocalQuantity(Math.min(parsed, stockLimit));
    }
  };

  const handleBlur = () => {
    if (localQuantity === '' || localQuantity < 1) {
      setLocalQuantity(initialQuantity); 
    }
  };

  return (
    <QuantityWrapper>
      <ControlButton 
        type="button"
        onClick={handleDecrement}
        disabled={localQuantity <= 1}
        $disabled={localQuantity <= 1}
        $variant="decrement"
      >➖</ControlButton>
      
      <QuantityInput
        type="number"
        min="1"
        value={localQuantity}
        onChange={handleManualInput}
        onBlur={handleBlur}
      />
      
      <ControlButton 
        type="button"
        onClick={handleIncrement}
        disabled={isAtLimit}
        $disabled={isAtLimit}
        $variant="increment"
      >➕</ControlButton>
    </QuantityWrapper>
  );
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

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/cart-items/');
      setCartItems(res.data);
    } catch (err) {
      showToast('❌ Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const res = await axiosInstance.get('/api/wishlist/');
      const ids = res.data.map(item => item.product.id);
      setWishlistIds(ids);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToWishlist = async (productId) => {
    if (!user) {
      showToast('Please log in to add items to wishlist');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    if (wishlistIds.includes(productId)) return showToast('Already in wishlist');
    try {
      await axiosInstance.post('/api/wishlist/', { product_id: productId });
      setWishlistIds(prev => [...prev, productId]);
      showToast('Added to wishlist ❤️');
    } catch (err) {
      showToast('Failed to add to wishlist');
    }
  };

  const handleQuantityChange = async (id, quantity) => {
    try {
      setCartItems(prevItems => prevItems.map(item => item.id === id ? { ...item, quantity } : item));
      await axiosInstance.patch(`/api/cart-items/${id}/`, { quantity });
    } catch (err) {
      if (err.response && err.response.status === 400) {
        showToast('❌ No more stock available');
      } else {
        showToast('❌ Failed to update');
      }
      fetchCartItems(); 
    }
  };

  const handleRemoveItem = async (id) => {
    if (!window.confirm('Remove this item from your cart?')) return;
    try {
      await axiosInstance.delete(`/api/cart-items/${id}/`);
      fetchCartItems();
      showToast('Item removed from cart');
    } catch (err) {
      showToast('Failed to remove item');
    }
  };

  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) return showToast('Your cart is empty');
    const cartData = JSON.stringify(cartItems);
    navigate(`/checkout/?cartData=${encodeURIComponent(cartData)}`);
  };

  const total = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0).toFixed(2);

  useEffect(() => {
    fetchCartItems();
    fetchWishlist();
  }, [axiosInstance]);

  return (
    <CartContainer>
      <h1>🛒 Your Cart</h1>
      {toast && <ToastMessage>{toast}</ToastMessage>}

      {loading ? (
        <SpinnerContainer><div className="spinner"></div></SpinnerContainer>
      ) : (
        <>
          {cartItems.length === 0 ? (
            <EmptyMessage>Your cart is empty 🛒</EmptyMessage>
          ) : (
            <CartList>
              {cartItems.map(item => (
                <CartItemCard key={item.id}>
                  <ProductImage src={item.product_image} alt={item.product_name || item.name} />
                  
                  <ProductDetails>
                    <ProductTitle>{item.product_name || item.name}</ProductTitle>
                    <ControlsRow>
                      <CartQuantityController 
                        itemId={item.id} 
                        initialQuantity={item.quantity} 
                        stockLimit={item.product_stock || 99} 
                        onQuantityUpdate={handleQuantityChange} 
                      />
                      <UnitPrice>× ${Number(item.price).toFixed(2)}</UnitPrice>
                    </ControlsRow>
                  </ProductDetails>

                  <ActionColumn>
                    <TotalPrice>${(item.quantity * Number(item.price)).toFixed(2)}</TotalPrice>
                    <RemoveButton onClick={() => handleRemoveItem(item.id)}>Remove</RemoveButton>
                    <WishlistButton 
                      onClick={() => handleAddToWishlist(item.product)} 
                      disabled={wishlistIds.includes(item.product)}
                    >
                      {wishlistIds.includes(item.product) ? '❤️' : '🤍'}
                    </WishlistButton>
                  </ActionColumn>
                </CartItemCard>
              ))}
            </CartList>
          )}
          
          <CheckoutSection>
            <h3>Total: ${total}</h3>
            <CheckoutButton onClick={handleProceedToCheckout}>✅ Proceed to Checkout</CheckoutButton>
          </CheckoutSection>
        </>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spinner { border: 6px solid #f3f3f3; border-top: 6px solid #4caf50; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: auto; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </CartContainer>
  );
};

// ==========================================
// RESPONSIVE STYLED COMPONENTS
// ==========================================

const CartContainer = styled.div`
  max-width: 800px;
  margin: auto;
  padding: 1rem;
  h1 { text-align: center; font-size: clamp(1.8rem, 4vw, 2.5rem); margin-bottom: 2rem; }
`;

const ToastMessage = styled.div`
  background: #4caf50; color: white; padding: 0.75rem; margin-bottom: 1rem; border-radius: 8px; text-align: center;
`;

const SpinnerContainer = styled.div` text-align: center; margin-top: 2rem; `;
const EmptyMessage = styled.p` text-align: center; font-size: 1.2rem; color: #666; `;

const CartList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

// THE FIX: Stacks columns on mobile, row on desktop
const CartItemCard = styled.li`
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
    text-align: left;
  }
`;

const ProductImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 8px;
`;

const ProductDetails = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
`;

const ProductTitle = styled.strong`
  font-size: 1.1rem;
  color: #333;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;

  @media (min-width: 600px) {
    justify-content: flex-start;
  }
`;

const UnitPrice = styled.span`
  color: #666;
  font-size: 0.95rem;
`;

const ActionColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  width: 100%;

  @media (min-width: 600px) {
    align-items: flex-end;
    width: auto;
  }
`;

const TotalPrice = styled.strong`
  font-size: 1.2rem;
  color: #1b5e20;
`;

const RemoveButton = styled.button`
  background: #ff4d4d; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;
  transition: background 0.2s;
  &:hover { background: #e60000; }
  @media (min-width: 600px) { width: auto; }
`;

const WishlistButton = styled.button`
  background: none; border: none; cursor: ${props => props.disabled ? 'default' : 'pointer'}; font-size: 1.5rem;
`;

const CheckoutSection = styled.div`
  margin-top: 2rem;
  text-align: right;
  border-top: 2px solid #eee;
  padding-top: 1.5rem;
  
  h3 { font-size: 1.5rem; margin-bottom: 1rem; color: #333; }
`;

const CheckoutButton = styled.button`
  width: 100%; padding: 1rem; background: #4caf50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: bold;
  @media (min-width: 600px) { width: auto; padding: 1rem 2.5rem; }
`;

// QUANTITY CONTROLLER STYLES
const QuantityWrapper = styled.div` display: flex; align-items: center; gap: 4px; `;
const QuantityInput = styled.input` width: 50px; text-align: center; padding: 0.4rem; border: 1px solid #ccc; border-radius: 6px; font-weight: bold; `;
const ControlButton = styled.button`
  border: none; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.8rem; color: white; transition: background 0.2s;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  background: ${props => {
    if (props.$variant === 'decrement') return props.$disabled ? '#ffb3b3' : '#ff4d4d';
    return props.$disabled ? '#a5d6a7' : '#4caf50';
  }};
`;

export default Cart;