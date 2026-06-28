import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaCreditCard, FaPaypal, FaWallet, FaCheckCircle, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);
  
  // Compulsory Fields State Integration
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
          setUserPhone(res.data.phone_number || '');
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          toast.error('❌ Failed to load baseline user profile settings');
        }
      };
      fetchUserProfile();
    }
  }, [axiosInstance, user]);

  const handlePlaceOrder = async () => {
    // 1. Strict Front-end Validation Layer Check
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
      // 2. Synchronize user profile fields onto the DB instance prior to launching transaction boundaries
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
  
          setConfirmation({ order, payment: paymentRes.data });
          toast.success('📦 Order placed successfully! Redirecting...');
          
          setTimeout(() => {
            navigate('/dashboard/');
          }, 5000);
          
        } catch (err) {
          console.error('Payment failed:', err);
          toast.error('❌ Payment processing failed');
        } finally {
          setLoading(false);
        }
      }, 5000); 
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
      <Toaster position="bottom-right" />
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Checkout
      </motion.h1>

      {confirmation ? (
        <ConfirmationCard initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <SuccessIcon><FaCheckCircle /></SuccessIcon>
          <h2>Order Confirmed!</h2>
          <ConfirmationGrid>
            <div>
              <h3>Order Details</h3>
              <DetailItem><strong>Order ID:</strong> {confirmation.order.id}</DetailItem>
              <DetailItem><strong>Payment Method:</strong> {confirmation.payment.payment_method}</DetailItem>
              <DetailItem><strong>Transaction ID:</strong> {confirmation.payment.transaction_id}</DetailItem>
              <DetailItem><strong>Delivery Address:</strong> {userAddress}</DetailItem>
              <DetailItem><strong>Contact Number:</strong> {userPhone}</DetailItem>
              <DeliveryEstimate>Your order will arrive in 3-5 business days</DeliveryEstimate>
            </div>
            <div>
              <h3>Order Summary</h3>
              {confirmation.order.order_items.map((item, index) => (
                <OrderItem key={index}>
                  <ProductImage>
                    {item.image_url ? <img src={item.image_url} alt={item.name} /> : <div className="placeholder" />}
                  </ProductImage>
                  <div>
                    <ProductName>{item.name}</ProductName>
                    <ProductQty>{item.quantity} × ${item.price}</ProductQty>
                  </div>
                </OrderItem>
              ))}
              <TotalPrice><strong>Total:</strong> ${confirmation.order.total_price}</TotalPrice>
            </div>
          </ConfirmationGrid>
        </ConfirmationCard>
      ) : (
        <>
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

          {/* Form inputs for address validation */}
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
                placeholder="Enter 10-digit mobile number"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
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

          <AnimatePresence>
            {loading && (
              <LoadingOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Spinner />
                <LoadingMessage>Verifying your payment, do not refresh or close this page....</LoadingMessage>
              </LoadingOverlay>
            )}
          </AnimatePresence>
        </>
      )}
    </CheckoutContainer>
  );
};

const CheckoutContainer = styled.div`
  max-width: 800px; margin: 0 auto; padding: 2rem; min-height: 100vh; box-sizing: border-box;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
  @media(max-width: 768px) { padding: 1rem; }
`;
const CartSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); box-sizing: border-box; `;
const AddressSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); box-sizing: border-box; `;
const PaymentSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); box-sizing: border-box; `;
const TotalSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; `;
const LoadingOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; color: white; `;
const LoadingMessage = styled.p` margin-top: 1rem; font-size: 1.1rem; text-align: center; padding: 0 2rem; line-height: 1.5; max-width: 400px; `;
const ProductImage = styled.div` width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #e0e0e0; display: flex; align-items: center; justify-content: center; img { width: 100%; height: 100%; object-fit: contain; } `;
const ConfirmationCard = styled(motion.div)` background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); text-align: center; `;
const SuccessIcon = styled.div` color: #4CAF50; font-size: 4rem; margin-bottom: 1rem; `;
const ConfirmationGrid = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem; text-align: left; @media (max-width: 768px) { grid-template-columns: 1fr; } `;
const DetailItem = styled.p` margin-bottom: 0.8rem; color: #424242; `;
const DeliveryEstimate = styled.p` margin-top: 1.5rem; padding: 0.8rem; background: #e8f5e9; border-radius: 8px; color: #1b5e20; font-weight: 500; `;
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
const Spinner = styled.div` width: 50px; height: 50px; border: 5px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; `;
const ProductName = styled.div` font-weight: 600; color: #424242; `;
const ProductQty = styled.div` font-size: 0.9rem; color: #757575; `;
const OrderItem = styled.div` display: flex; align-items: center; gap: 1rem; padding: 0.8rem; margin-bottom: 0.8rem; background: #f9f9f9; border-radius: 8px; `;
const TotalPrice = styled.div` font-size: 1.5rem; font-weight: 700; color: #1b5e20; `;

export default Checkout;