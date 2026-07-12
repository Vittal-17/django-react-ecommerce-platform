import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaCreditCard, FaPaypal, FaWallet, FaMapMarkerAlt, FaLock, FaCheckCircle, FaExclamationCircle, FaPhoneAlt } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import { useNavigate, Link } from 'react-router-dom';

const Checkout = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [contactPhone, setContactPhone] = useState(''); // NEW: Dedicated Contact Phone State
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);

  // Phone Number Formatter
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, ''); 
    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return value;
    return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
  };

  useEffect(() => {
    if (!user) {
      toast.error("Please login to checkout.");
      navigate('/login');
      return;
    }

    const fetchCheckoutData = async () => {
      try {
        // 1. Fetch Cart
        const cartRes = await axiosInstance.get('/api/cart-items/');
        setCartItems(cartRes.data);

        // 2. Fetch User Profile to get default phone number
        const profileRes = await axiosInstance.get(`/api/users/${user.id}/`);
        if (profileRes.data.phone) {
          setContactPhone(formatPhoneNumber(profileRes.data.phone));
        }

        // 3. Fetch Addresses
        const addrRes = await axiosInstance.get('/api/addresses/');
        setAddresses(addrRes.data);
        
        // Auto-select default address
        const defaultAddr = addrRes.data.find(a => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (addrRes.data.length > 0) setSelectedAddressId(addrRes.data[0].id);

      } catch (err) {
        toast.error('❌ Failed to load checkout data');
      }
    };

    fetchCheckoutData();
  }, [axiosInstance, user, navigate]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      return toast.error('⚠️ Please select a delivery address!');
    }
    if (!contactPhone.trim()) {
      return toast.error('⚠️ A contact phone number is compulsory!');
    }
    if (cartItems.length === 0) {
      return toast.error('⚠️ Your cart is empty!');
    }

    setLoading(true);
    try {
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);
      const addressSnapshot = `${selectedAddr.label}: ${selectedAddr.full_address}`;

      // 1. Create Order (Passing the address AND phone snapshots directly to the Order table)
      const orderRes = await axiosInstance.post('/api/orders/', {
        shipping_address: addressSnapshot,
        contact_phone: contactPhone, // Matches our new serializers.py requirement
        total_price: cartTotal.toFixed(2),
        order_items: cartItems.map(item => ({
          product: item.product?.id || item.product,
          quantity: item.quantity,
          price: Number(item.price),
        })),
      });
  
      const order = orderRes.data;
  
      // 2. Simulate Payment
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
            state: { order, payment: paymentRes.data, userAddress: addressSnapshot, userPhone: contactPhone }
          });
          
        } catch (err) {
          console.error('Payment failed:', err);
          toast.error('❌ Payment processing failed');
          setLoading(false);
        } 
      }, 2500); 

    } catch (err) {
      const serverMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to place order';
      toast.error(`❌ ${serverMsg}`);
      setLoading(false);
    }
  };  

  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);

  if (cartItems.length === 0 && !loading) {
    return (
      <CheckoutContainer>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h2>Your cart is empty</h2>
          <Link to="/products" style={{ color: '#2e7d32' }}>Continue Shopping</Link>
        </div>
      </CheckoutContainer>
    );
  }

  return (
    <CheckoutContainer>
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Secure Checkout
      </motion.h1>

      <CartSection>
        <h2>Your Cart</h2>
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
      </CartSection>

      <AddressSection>
        <h2><FaMapMarkerAlt /> Delivery Address</h2>
        
        {addresses.length === 0 ? (
          <WarningBox>
            <FaExclamationCircle size={24} />
            <div>
              <strong>No addresses found</strong>
              <p>Please go to your <Link to="/dashboard">Dashboard</Link> to add a delivery address before checking out.</p>
            </div>
          </WarningBox>
        ) : (
          <AddressList>
            {addresses.map(addr => (
              <AddressOption 
                key={addr.id} 
                $selected={selectedAddressId === addr.id}
                onClick={() => setSelectedAddressId(addr.id)}
              >
                <div className="radio">
                  {selectedAddressId === addr.id && <FaCheckCircle color="#4caf50" />}
                </div>
                <div>
                  <strong>{addr.label} {addr.is_default && <span className="badge">Default</span>}</strong>
                  <p>{addr.full_address}</p>
                </div>
              </AddressOption>
            ))}
          </AddressList>
        )}

        {/* NEW: Explicit Delivery Phone Input */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#111' }}>
            <FaPhoneAlt /> Delivery Contact Number
          </h2>
          <InputField 
            type="tel" 
            placeholder="(XXX) XXX-XXXX"
            value={contactPhone}
            onChange={(e) => setContactPhone(formatPhoneNumber(e.target.value))}
            maxLength="14"
            style={{ width: '100%', maxWidth: '350px' }}
          />
        </div>
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
        <TotalAmount>${cartTotal.toFixed(2)}</TotalAmount>
      </TotalSection>

      <PlaceOrderButton onClick={handlePlaceOrder} disabled={loading || cartItems.length === 0 || addresses.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        {loading ? 'Processing...' : 'Place Order Now'}
      </PlaceOrderButton>

      {/* --- Payment Processing Overlay --- */}
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
              <p>Securely verifying your transaction. Please do not close or refresh this page.</p>
              <ProgressBarContainer>
                <ProgressFill initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2.5, ease: "easeInOut" }} />
              </ProgressBarContainer>
            </ModalBox>
          </Overlay>
        )}
      </AnimatePresence>
    </CheckoutContainer>
  );
};

// --- STYLED COMPONENTS ---
const CheckoutContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 800px; margin: 0 auto; min-height: 100vh; box-sizing: border-box; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); @media(max-width: 768px) { padding: 6rem 1rem 1rem 1rem; } `;
const CartSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const AddressSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); h2 { display: flex; align-items: center; gap: 0.5rem; margin-top:0; }`;
const PaymentSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const TotalSection = styled.section` background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); display: flex; justify-content: space-between; align-items: center; `;
const ProductImage = styled.div` width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #e0e0e0; display: flex; align-items: center; justify-content: center; img { width: 100%; height: 100%; object-fit: contain; } `;
const CartItems = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const CartItem = styled.div` display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 12px; `;
const PaymentOptions = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; `;
const PaymentOption = styled(motion.button)` display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem 1rem; background: ${props => props.$active ? '#e8f5e9' : '#f5f5f5'}; border: 2px solid ${props => props.$active ? '#4CAF50' : '#e0e0e0'}; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; svg { font-size: 2rem; color: ${props => props.$active ? '#2e7d32' : '#757575'}; } span { color: ${props => props.$active ? '#2e7d32' : '#424242'}; font-weight: ${props => props.$active ? '600' : '500'}; } `;
const TotalAmount = styled.div` font-size: 1.5rem; font-weight: 700; color: #1b5e20; `;
const PlaceOrderButton = styled(motion.button)` width: 100%; padding: 1rem; background: #4CAF50; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; &:hover { background: #388e3c; } &:disabled { background: #a5d6a7; cursor: not-allowed; } `;
const ProductName = styled.div` font-weight: 600; color: #424242; `;
const ProductQty = styled.div` font-size: 0.9rem; color: #757575; `;
const InputField = styled.input` padding: 0.8rem 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s; &:focus { border-color: #4CAF50; } `;

// Address Selection Styles
const AddressList = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const AddressOption = styled.div` display: flex; gap: 1rem; padding: 1.5rem; border: 2px solid ${props => props.$selected ? '#4caf50' : '#e0e0e0'}; border-radius: 12px; background: ${props => props.$selected ? '#f1f8e9' : 'white'}; cursor: pointer; transition: all 0.2s; &:hover { border-color: #4caf50; } .radio { width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${props => props.$selected ? '#4caf50' : '#ccc'}; display: flex; align-items: center; justify-content: center; margin-top: 2px; } strong { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: #333; } p { margin: 0.5rem 0 0 0; color: #666; line-height: 1.4; } .badge { background: #e0e0e0; color: #555; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 12px; text-transform: uppercase; }`;
const WarningBox = styled.div` display: flex; align-items: center; gap: 1rem; background: #fff3e0; color: #e65100; padding: 1.5rem; border-radius: 12px; border: 1px solid #ffcc80; a { color: #d84315; font-weight: bold; }`;

// Checkout Modal Styled Components
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; `;
const ModalBox = styled(motion.div)` background: white; padding: 2.5rem 2rem; border-radius: 20px; text-align: center; max-width: 420px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2); h2 { color: #111; font-size: 1.6rem; margin: 1.5rem 0 0.2rem 0; font-weight: 800; } h4 { color: #4CAF50; font-size: 0.9rem; margin: 0 0 1.5rem 0; font-weight: 700; letter-spacing: 1px; } p { color: #666; font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem; } `;
const IconWrapper = styled.div` position: relative; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: #f1f8e9; border-radius: 50%; `;
const Ring = styled(motion.div)` position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px; border: 3px solid transparent; border-top-color: #4CAF50; border-right-color: #4CAF50; border-radius: 50%; `;
const ProgressBarContainer = styled.div` width: 100%; height: 6px; background: #e0e0e0; border-radius: 10px; overflow: hidden; `;
const ProgressFill = styled(motion.div)` height: 100%; background: #4CAF50; border-radius: 10px; `;

export default Checkout;