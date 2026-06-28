import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import styled from 'styled-components';

// ==========================================
// CUSTOM CONFIRMATION MODAL
// ==========================================
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ModalCard
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h3>Remove Item</h3>
            <p>Are you sure you want to remove this product from your cart?</p>
            <ButtonGroup>
              <CancelButton onClick={onClose}>No, Keep it</CancelButton>
              <ConfirmButton onClick={onConfirm}>Yes, Remove</ConfirmButton>
            </ButtonGroup>
          </ModalCard>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

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
    if (val === '') { setLocalQuantity(''); return; }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setLocalQuantity(Math.min(parsed, stockLimit));
    }
  };

  const handleBlur = () => {
    if (localQuantity === '' || localQuantity < 1) setLocalQuantity(initialQuantity);
  };

  return (
    <QuantityWrapper>
      <ControlButton type="button" onClick={handleDecrement} disabled={localQuantity <= 1} $disabled={localQuantity <= 1} $variant="decrement">➖</ControlButton>
      <QuantityInput type="number" min="1" value={localQuantity} onChange={handleManualInput} onBlur={handleBlur} />
      <ControlButton type="button" onClick={handleIncrement} disabled={isAtLimit} $disabled={isAtLimit} $variant="increment">➕</ControlButton>
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
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/cart-items/');
      setCartItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const res = await axiosInstance.get('/api/wishlist/');
      setWishlistIds(res.data.map(item => item.product.id));
    } catch (err) { console.error(err); }
  };

  const handleAddToWishlist = async (productId) => {
    if (!user) { navigate('/login'); return; }
    if (wishlistIds.includes(productId)) return;
    try {
      await axiosInstance.post('/api/wishlist/', { product_id: productId });
      setWishlistIds(prev => [...prev, productId]);
    } catch (err) { console.error(err); }
  };

  const handleQuantityChange = async (id, quantity) => {
    try {
      setCartItems(prevItems => prevItems.map(item => item.id === id ? { ...item, quantity } : item));
      await axiosInstance.patch(`/api/cart-items/${id}/`, { quantity });
    } catch (err) {
      fetchCartItems(); 
    }
  };

  // Logic to trigger modal
  const promptRemoveItem = (id) => {
    setItemToRemove(id);
    setIsModalOpen(true);
  };

  // Logic to execute deletion
  const executeRemoveItem = async () => {
    try {
      await axiosInstance.delete(`/api/cart-items/${itemToRemove}/`);
      fetchCartItems();
    } catch (err) { console.error(err); } 
    finally {
      setIsModalOpen(false);
      setItemToRemove(null);
    }
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;
    navigate(`/checkout/`);
  };

  useEffect(() => {
    fetchCartItems();
    fetchWishlist();
  }, [axiosInstance]);

  return (
    <CartContainer>
      <h1>🛒 Your Cart</h1>

      <ConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={executeRemoveItem}
      />

      {loading ? (
        <SpinnerContainer><div className="spinner"></div></SpinnerContainer>
      ) : cartItems.length === 0 ? (
        <EmptyMessage>Your cart is empty 🛒</EmptyMessage>
      ) : (
        <CartList>
          {cartItems.map(item => (
            <CartItemCard key={item.id}>
              <ProductImage src={item.product_image} alt={item.product_name} />
              <ProductDetails>
                <ProductTitle>{item.product_name}</ProductTitle>
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
                <RemoveButton onClick={() => promptRemoveItem(item.id)}>Remove</RemoveButton>
                <WishlistButton onClick={() => handleAddToWishlist(item.product)} disabled={wishlistIds.includes(item.product)}>
                  {wishlistIds.includes(item.product) ? '❤️' : '🤍'}
                </WishlistButton>
              </ActionColumn>
            </CartItemCard>
          ))}
        </CartList>
      )}
      
      {cartItems.length > 0 && (
        <CheckoutSection>
          <h3>Total: ${cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0).toFixed(2)}</h3>
          <CheckoutButton onClick={handleProceedToCheckout}>✅ Proceed to Checkout</CheckoutButton>
        </CheckoutSection>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spinner { border: 6px solid #f3f3f3; border-top: 6px solid #4caf50; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: auto; }
      `}</style>
    </CartContainer>
  );
};

// ==========================================
// STYLED COMPONENTS (Retained Responsive Logic)
// ==========================================
const Overlay = styled(motion.div)`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 1rem;
`;
const ModalCard = styled(motion.div)`
  background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px;
  text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  h3 { margin-top: 0; color: #333; } p { color: #666; margin-bottom: 2rem; }
`;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;

const ConfirmButton = styled.button` 
  padding: 0.8rem 1.5rem; 
  border: none !important; 
  border-radius: 8px; 
  cursor: pointer; 
  font-weight: 600; 
  background: #d32f2f !important; 
  color: #ffffff !important; 
  &:hover { background: #d32f2f !important; color: #ffffff !important; }
  &:active { background: #b71c1c !important; color: #ffffff !important; }
`;

const CancelButton = styled.button` 
  padding: 0.8rem 1.5rem; 
  border: none !important; 
  border-radius: 8px; 
  cursor: pointer; 
  font-weight: 600; 
  background: #757575 !important; 
  color: #ffffff !important; 
  &:hover { background: #757575 !important; color: #ffffff !important; }
  &:active { background: #616161 !important; color: #ffffff !important; }
`;

const CartContainer = styled.div` max-width: 800px; margin: auto; padding: 1rem; h1 { text-align: center; font-size: clamp(1.8rem, 4vw, 2.5rem); margin-bottom: 2rem; } `;
const SpinnerContainer = styled.div` text-align: center; margin-top: 2rem; `;
const EmptyMessage = styled.p` text-align: center; font-size: 1.2rem; color: #666; `;
const CartList = styled.ul` list-style: none; padding: 0; display: flex; flex-direction: column; gap: 1.5rem; `;
const CartItemCard = styled.li`
  background: #ffffff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  display: flex; flex-direction: column; align-items: center; gap: 1.5rem; text-align: center;
  @media (min-width: 600px) { flex-direction: row; align-items: center; text-align: left; }
`;
const ProductImage = styled.img` width: 100px; height: 100px; object-fit: contain; border-radius: 8px; `;
const ProductDetails = styled.div` flex-grow: 1; display: flex; flex-direction: column; gap: 0.8rem; width: 100%; `;
const ProductTitle = styled.strong` font-size: 1.1rem; color: #333; `;
const ControlsRow = styled.div` display: flex; align-items: center; justify-content: center; gap: 15px; @media (min-width: 600px) { justify-content: flex-start; } `;
const UnitPrice = styled.span` color: #666; font-size: 0.95rem; `;
const ActionColumn = styled.div` display: flex; flex-direction: column; align-items: center; gap: 0.8rem; width: 100%; @media (min-width: 600px) { align-items: flex-end; width: auto; } `;
const TotalPrice = styled.strong` font-size: 1.2rem; color: #1b5e20; `;
const RemoveButton = styled.button` 
  background: #ff4d4d !important; 
  color: #ffffff !important; 
  border: none !important; 
  padding: 0.5rem 1.2rem; 
  border-radius: 6px; 
  cursor: pointer; 
  font-weight: bold; 
  width: 100%;
  &:hover { background: #ff4d4d !important; color: #ffffff !important; }
  &:active { background: #e60000 !important; color: #ffffff !important; }
  @media (min-width: 600px) { width: auto; }
`;

const WishlistButton = styled.button` background: none; border: none; cursor: ${props => props.disabled ? 'default' : 'pointer'}; font-size: 1.5rem; `;
const CheckoutSection = styled.div` margin-top: 2rem; text-align: right; border-top: 2px solid #eee; padding-top: 1.5rem; h3 { font-size: 1.5rem; margin-bottom: 1rem; color: #333; } `;
const CheckoutButton = styled.button` 
  width: 100%; 
  padding: 1rem; 
  background: #4caf50 !important; 
  color: #ffffff !important; 
  border: none !important; 
  border-radius: 8px; 
  cursor: pointer; 
  font-size: 1.1rem; 
  font-weight: bold;
  &:hover { background: #4caf50 !important; color: #ffffff !important; }
  &:active { background: #388e3c !important; color: #ffffff !important; }
  @media (min-width: 600px) { width: auto; padding: 1rem 2.5rem; }
`;
const QuantityWrapper = styled.div` display: flex; align-items: center; gap: 4px; `;
const QuantityInput = styled.input` width: 50px; text-align: center; padding: 0.4rem; border: 1px solid #ccc; border-radius: 6px; font-weight: bold; `;
const ControlButton = styled.button`
  border: none !important; 
  padding: 0.4rem 0.6rem; 
  border-radius: 6px; 
  font-size: 0.8rem; 
  color: #ffffff !important; 
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  background: ${props => { 
    if (props.$variant === 'decrement') return props.$disabled ? '#ffb3b3 !important' : '#ff4d4d !important'; 
    return props.$disabled ? '#a5d6a7 !important' : '#4caf50 !important'; 
  }};
  &:hover { 
    background: ${props => { 
        if (props.$variant === 'decrement') return props.$disabled ? '#ffb3b3 !important' : '#ff4d4d !important'; 
        return props.$disabled ? '#a5d6a7 !important' : '#4caf50 !important'; 
    }};
  }
`;

export default Cart;