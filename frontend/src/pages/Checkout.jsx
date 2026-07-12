import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaCreditCard, FaPaypal, FaWallet, FaMapMarkerAlt, FaPhoneAlt, FaLock } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);
  
  const [userAddress, setUserAddress] = useState('');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const res = await axiosInstance.get('/api/cart-items/');
        setCartItems(res.data);
      } catch (err) {
        console.error('Failed to load cart items:', err);
        toast.error('❌ Failed to load cart items');
      }
    };
    fetchCartItems();
  }, [axiosInstance]);

  useEffect(() => {
    if (user && user.id) {
      const fetchUserProfile = async () => {
        try {
          const res = await axiosInstance.get(`/api/users/${user.id}/`);
          setUserAddress(res.data.address || '');
          setUserPhone(res.data.phone || ''); 
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          toast.error('❌ Failed to load baseline user profile settings');
        }
      };
      fetchUserProfile();
    }
  }, [axiosInstance, user]);

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, ''); 
    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return value;
    return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
  };

  const handlePlaceOrder = async () => {
    if (!userAddress.trim()) {
      toast.error('⚠️ Shipping Address is strictly required!');
      return;
    }
    if (!userPhone.trim()) {
      toast.error('⚠️ Phone Number is strictly required!');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.patch(`/api/users/${user.id}/`, {
        address: userAddress,
        phone: userPhone
      });

      const orderRes = await axiosInstance.post('/api/orders/', {
        order_items: cartItems.map(item => ({
          product: item.product?.id || item.product,
          quantity: item.quantity,
          price: Number(item.price),
        })),
      });
  
      const order = orderRes.data;
  
      setTimeout(async () => {
        try {
          const paymentRes = await axiosInstance.post('/api/payments/', {
            order: order.id,
            payment_method: paymentMethod,
            transaction_id: `txn_${Date.now()}`,
            amount: order.total_price,
            status: 'completed',
          });
  
          toast.success('📦 Order placed successfully!');
          navigate(`/order-success/${order.id}`, {
            state: { order, payment: paymentRes.data, userAddress, userPhone }
          });
          
        } catch (err) {
          console.error('Payment failed:', err);
          toast.error('❌ Payment processing failed');
          setLoading(false);
        } 
      }, 2500); 
    } catch (err) {
      console.error('Order failed:', err);
      const serverMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to place order';
      toast.error(`❌ ${serverMsg}`);
      setLoading(false);
    }
  };  

  const total = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0).toFixed(2);

  return (
    <CheckoutContainer>
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Checkout
      </motion.h1>

      <CartSection>
        <h2>Your Cart</h2>
        {cartItems.length > 0 ? (
          <CartItems>
            {cartItems.map(item => (
              <CartItem key={item.id}>
                <ProductImage>
                  {item.product_image ? <img src={item.product_image} alt={item.product_name} /> : <div className="placeholder" />}
                </ProductImage>
                <div>
                  <ProductName>{item.product_name}</ProductName>
                  <ProductQty>{item.quantity} × ${item.price}</ProductQty>
                </div>
              </CartItem>
            ))}
          </CartItems>
        ) : (
          <EmptyCart>Your cart is empty</EmptyCart>
        )}
      </CartSection>

      <AddressSection>
        <h2>Shipping & Fulfillment Details</h2>
        <FormGroup>
          <label><FaMapMarkerAlt /> Shipping Address <span style={{color: '#d32f2f'}}>*</span></label>
          <InputArea 
            type="text" 
            placeholder="Enter full address details (House No, Street, City, Pincode)"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
          />
        </FormGroup>
        <FormGroup style={{ marginTop: '1rem' }}>
          <label><FaPhoneAlt /> Phone Number <span style={{color: '#d32f2f'}}>*</span></label>
          <InputField 
            type="tel" 
            placeholder="(XXX) XXX-XXXX"
            value={userPhone}
            onChange={(e) => setUserPhone(formatPhoneNumber(e.target.value))}
            maxLength="14"
          />
        </FormGroup>
      </AddressSection>

      <PaymentSection>
        <h2>Payment Method</h2>
        <PaymentOptions>
          <PaymentOption $active={paymentMethod === 'credit_card'} onClick={() => setPaymentMethod('credit_card')} whileHover={{ scale: 1.02 }}>
            <FaCreditCard /> <span>Credit Card</span>
          </PaymentOption>
          <PaymentOption $active={paymentMethod === 'paypal'} onClick={() => setPaymentMethod('paypal')} whileHover={{ scale: 1.02 }}>
            <FaPaypal /> <span>PayPal</span>
          </PaymentOption>
          <PaymentOption $active={paymentMethod === 'wallet'} onClick={() => setPaymentMethod('wallet')} whileHover={{ scale: 1.02 }}>
            <FaWallet /> <span>Wallet</span>
          </PaymentOption>
        </PaymentOptions>
      </PaymentSection>

      <TotalSection>
        <h2>Order Total:&nbsp;</h2>
        <TotalAmount>${total}</TotalAmount>
      </TotalSection>

      <PlaceOrderButton onClick={handlePlaceOrder} disabled={loading || cartItems.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        {loading ? 'Processing...' : 'Place Order'}
      </PlaceOrderButton>

      {/* --- Upgraded Payment Processing Overlay --- */}
      <AnimatePresence>
        {loading && (
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalBox initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              
              <IconWrapper>
                <Ring animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                <FaLock size={28} color="#2e7d32" />
              </IconWrapper>
              
              <h2>Processing Payment</h2>
              <h4>SECURE CHECKOUT</h4>
              
              <p>
                Securely verifying your transaction. Please do not close or refresh this page.
              </p>

              <ProgressBarContainer>
                <ProgressFill 
                  initial={{ width: "0%" }} 
                  animate={{ width: "100%" }} 
                  transition={{ duration: 2.5, ease: "easeInOut" }} 
                />
              </ProgressBarContainer>

            </ModalBox>
          </Overlay>
        )}
      </AnimatePresence>
    </CheckoutContainer>
  );
};

const CheckoutContainer = styled.div` 
  padding: 7rem 2rem 2rem 2rem; 
  max-width: 800px; margin: 0 auto; min-height: 100vh; box-sizing: border-box; 
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); 
  @media(max-width: 768px) { padding: 6rem 1rem 1rem 1rem; } 
`;
const CartSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const AddressSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const PaymentSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const TotalSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); display: flex; justify-content: space-between; align-items: center; `;
const ProductImage = styled.div` width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #e0e0e0; display: flex; align-items: center; justify-content: center; img { width: 100%; height: 100%; object-fit: contain; } `;
const CartItems = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const CartItem = styled.div` display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 12px; `;
const EmptyCart = styled.div` text-align: center; padding: 2rem; color: #757575; font-style: italic; `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 0.5rem; label { font-weight: 600; color: #2e7d32; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; } `;
const InputField = styled.input` padding: 0.8rem 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s; &:focus { border-color: #4CAF50; } `;
const InputArea = styled.textarea` padding: 0.8rem 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none; resize: vertical; min-height: 80px; font-family: inherit; transition: border-color 0.2s; &:focus { border-color: #4CAF50; } `;
const PaymentOptions = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; `;
const PaymentOption = styled(motion.button)` display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem 1rem; background: ${props => props.$active ? '#e8f5e9' : '#f5f5f5'}; border: 2px solid ${props => props.$active ? '#4CAF50' : '#e0e0e0'}; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; svg { font-size: 2rem; color: ${props => props.$active ? '#2e7d32' : '#757575'}; } span { color: ${props => props.$active ? '#2e7d32' : '#424242'}; font-weight: ${props => props.$active ? '600' : '500'}; } `;
const TotalAmount = styled.div` font-size: 1.5rem; font-weight: 700; color: #1b5e20; `;
const PlaceOrderButton = styled(motion.button)` width: 100%; padding: 1rem; background: #4CAF50; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; &:hover { background: #388e3c; } &:disabled { background: #a5d6a7; cursor: not-allowed; } `;
const ProductName = styled.div` font-weight: 600; color: #424242; `;
const ProductQty = styled.div` font-size: 0.9rem; color: #757575; `;

// --- Checkout Modal Styled Components ---
const Overlay = styled(motion.div)`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
  padding: 1rem;
`;
const ModalBox = styled(motion.div)`
  background: white; padding: 2.5rem 2rem; border-radius: 20px; text-align: center; 
  max-width: 420px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  h2 { color: #111; font-size: 1.6rem; margin: 1.5rem 0 0.2rem 0; font-weight: 800; }
  h4 { color: #4CAF50; font-size: 0.9rem; margin: 0 0 1.5rem 0; font-weight: 700; letter-spacing: 1px; }
  p { color: #666; font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem; }
`;
const IconWrapper = styled.div`
  position: relative; width: 80px; height: 80px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
  background: #f1f8e9; border-radius: 50%;
`;
const Ring = styled(motion.div)`
  position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px;
  border: 3px solid transparent; border-top-color: #4CAF50; border-right-color: #4CAF50;
  border-radius: 50%;
`;
const ProgressBarContainer = styled.div`
  width: 100%; height: 6px; background: #e0e0e0; border-radius: 10px; overflow: hidden;
`;
const ProgressFill = styled(motion.div)`
  height: 100%; background: #4CAF50; border-radius: 10px;
`;

export default Checkout;