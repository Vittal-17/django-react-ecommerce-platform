// src/pages/Checkout.jsx
import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaCreditCard, FaPaypal, FaWallet, FaMapMarkerAlt, FaLock, FaCheckCircle, FaExclamationCircle, FaPhoneAlt, FaShieldAlt, FaArrowLeft, FaBoxOpen } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import { useNavigate, Link } from 'react-router-dom';
import { SkeletonRow } from '../components/SkeletonLoader';
import { PageHeader } from '../styles/SharedPageStyles';
import AppLayout from '../components/AppLayout';

const Checkout = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [contactPhone, setContactPhone] = useState(''); 
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false); 
  const [isFetching, setIsFetching] = useState(true); 

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
      setIsFetching(true); 
      try {
        const cartRes = await axiosInstance.get('/api/cart-items/');
        setCartItems(cartRes.data);

        const profileRes = await axiosInstance.get(`/api/users/${user.id}/`);
        if (profileRes.data.phone) {
          setContactPhone(formatPhoneNumber(profileRes.data.phone));
        }

        const addrRes = await axiosInstance.get('/api/addresses/');
        setAddresses(addrRes.data);
        
        const defaultAddr = addrRes.data.find(a => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (addrRes.data.length > 0) setSelectedAddressId(addrRes.data[0].id);

      } catch (err) {
        toast.error('❌ Failed to load checkout data');
      } finally {
        setIsFetching(false); 
      }
    };

    fetchCheckoutData();
  }, [axiosInstance, user, navigate]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return toast.error('⚠️ Please select a delivery address!');
    if (!contactPhone.trim()) return toast.error('⚠️ A contact phone number is compulsory!');
    if (cartItems.length === 0) return toast.error('⚠️ Your cart is empty!');

    setLoading(true);
    try {
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);
      const addressSnapshot = `${selectedAddr.label}: ${selectedAddr.full_address}`;

      const orderRes = await axiosInstance.post('/api/orders/', {
        shipping_address: addressSnapshot,
        contact_phone: contactPhone,
        total_price: cartTotal.toFixed(2),
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  if (cartItems.length === 0 && !isFetching) {
    return (
      <AppLayout>
        <CheckoutContainer>
          <EmptyState
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="emoji">🛒</span>
            <h3>Checkout Unavailable</h3>
            <p>Your cart is currently empty. Add some items to proceed.</p>
            <Link to="/products" className="action-btn"><FaArrowLeft /> Back to Store</Link>
          </EmptyState>
        </CheckoutContainer>
      </AppLayout>
    );
  }

  // 🚀 The Modal is now OUTSIDE AppLayout so it breaks free from the frosted glass boundaries
  return (
    <>
      {/* --- PREMIUM PAYMENT PROCESSING MODAL --- */}
      <AnimatePresence>
        {loading && (
          <Overlay 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
          >
            <ModalBox 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <IconWrapper>
                <Ring 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                />
                <FaLock size={26} color="#0B8457" />
              </IconWrapper>
              <h2>Authorizing Payment</h2>
              <h4>SECURE 256-BIT ENCRYPTION</h4>
              <p>Please do not close this window or refresh your browser while we verify your transaction.</p>
              <ProgressBarContainer>
                <ProgressFill 
                  initial={{ width: "0%" }} 
                  animate={{ width: "100%" }} 
                  transition={{ duration: 2.4, ease: "easeInOut" }} 
                />
              </ProgressBarContainer>
            </ModalBox>
          </Overlay>
        )}
      </AnimatePresence>

      {/* --- NORMAL PAGE CONTENT --- */}
      <AppLayout>
        <CheckoutContainer>
          <PageHeader
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <BadgeTag><FaShieldAlt /> 256-bit Encryption</BadgeTag>
            <h1>Secure Checkout</h1>
            <p>Review your details and complete your order.</p>
          </PageHeader>

          {isFetching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <SkeletonRow style={{ height: '200px', borderRadius: '24px' }} />
              <SkeletonRow style={{ height: '250px', borderRadius: '24px' }} />
              <SkeletonRow style={{ height: '150px', borderRadius: '24px' }} />
            </div>
          ) : (
            <ContentGrid
              as={motion.div}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* --- CART REVIEW SECTION --- */}
              <GlassSection variants={itemVariants}>
                <SectionHeader><FaBoxOpen color="#0B8457" /> Order Summary</SectionHeader>
                <CartItems>
                  {cartItems.map(item => (
                    <CartItem key={item.id}>
                      <ProductImage>
                        {item.product_image ? <img src={item.product_image} alt={item.product_name} /> : <div className="placeholder" />}
                      </ProductImage>
                      <div className="details">
                        <ProductName>{item.product_name}</ProductName>
                        <ProductQty>Qty: {item.quantity} <span>•</span> ${Number(item.price).toFixed(2)} each</ProductQty>
                      </div>
                      <ItemTotal>${(item.quantity * Number(item.price)).toFixed(2)}</ItemTotal>
                    </CartItem>
                  ))}
                </CartItems>
              </GlassSection>

              {/* --- ADDRESS SECTION --- */}
              <GlassSection variants={itemVariants}>
                <SectionHeader><FaMapMarkerAlt color="#0B8457" /> Delivery Details</SectionHeader>
                
                {addresses.length === 0 ? (
                  <WarningBox>
                    <FaExclamationCircle size={24} />
                    <div>
                      <strong>No addresses found</strong>
                      <p>Please go to your <Link to="/dashboard">Dashboard</Link> to add a delivery address.</p>
                    </div>
                  </WarningBox>
                ) : (
                  <AddressGrid>
                    {addresses.map(addr => (
                      <AddressCard 
                        key={addr.id} 
                        $selected={selectedAddressId === addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <AnimatePresence>
                          {selectedAddressId === addr.id && (
                            <SelectedBadge
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                              <FaCheckCircle />
                            </SelectedBadge>
                          )}
                        </AnimatePresence>
                        
                        <div className="card-header">
                          <div className="icon-box"><FaMapMarkerAlt /></div>
                          <div className="label-row">
                            <strong>{addr.label}</strong>
                            {addr.is_default && <span className="default-pill">Default</span>}
                          </div>
                        </div>
                        <p className="address-text">{addr.full_address}</p>
                      </AddressCard>
                    ))}
                  </AddressGrid>
                )}

                <ContactInputWrapper>
                  <div className="label-container">
                    <label><FaPhoneAlt color="#0B8457" /> Delivery Contact Number</label>
                    <span className="verified-badge"><FaLock size={10} /> Verified</span>
                  </div>
                  <LockedField>
                    <FaLock className="lock-icon" />
                    {contactPhone || 'No verified phone number linked'}
                  </LockedField>
                  <p className="helper-text">This number is pulled securely from your verified account profile.</p>
                </ContactInputWrapper>
              </GlassSection>

              {/* --- PAYMENT SECTION --- */}
              <GlassSection variants={itemVariants}>
                <SectionHeader><FaCreditCard color="#0B8457" /> Payment Method</SectionHeader>
                <PaymentOptions>
                  <PaymentOption 
                    $active={paymentMethod === 'credit_card'} 
                    onClick={() => setPaymentMethod('credit_card')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FaCreditCard className="icon" /> <span>Credit Card</span>
                  </PaymentOption>
                  <PaymentOption 
                    $active={paymentMethod === 'paypal'} 
                    onClick={() => setPaymentMethod('paypal')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FaPaypal className="icon" /> <span>PayPal</span>
                  </PaymentOption>
                  <PaymentOption 
                    $active={paymentMethod === 'wallet'} 
                    onClick={() => setPaymentMethod('wallet')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FaWallet className="icon" /> <span>Digital Wallet</span>
                  </PaymentOption>
                </PaymentOptions>
              </GlassSection>

              {/* --- FINAL TOTAL & SUBMIT --- */}
              <TotalSection variants={itemVariants}>
                <div className="total-row">
                  <span>Total to Pay</span>
                  <TotalAmount>${cartTotal.toFixed(2)}</TotalAmount>
                </div>
                <PlaceOrderButton 
                  onClick={handlePlaceOrder} 
                  disabled={loading || cartItems.length === 0 || addresses.length === 0 || !contactPhone} 
                  whileHover={{ scale: loading || cartItems.length === 0 || addresses.length === 0 || !contactPhone ? 1 : 1.02 }} 
                  whileTap={{ scale: loading || cartItems.length === 0 || addresses.length === 0 || !contactPhone ? 1 : 0.98 }}
                >
                  {loading ? 'Processing...' : 'Place Secure Order'}
                </PlaceOrderButton>
              </TotalSection>
            </ContentGrid>
          )}
        </CheckoutContainer>
      </AppLayout>
    </>
  );
};

export default Checkout;

// ==========================================
// SAAS LEVEL STYLED COMPONENTS
// ==========================================

const CheckoutContainer = styled.div`
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const BadgeTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(11, 132, 87, 0.1);
  color: #0B8457;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.4rem 1rem;
  border-radius: 50px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  border: 1px solid rgba(11, 132, 87, 0.2);
`;

const ContentGrid = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const GlassSection = styled(motion.section)`
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 2rem;
  border: 1px solid rgba(11, 132, 87, 0.12);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.05);
`;

const SectionHeader = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.4rem;
  font-weight: 800;
  color: #0F172A;
  margin-top: 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding-bottom: 1rem;
`;

// Cart Items
const CartItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CartItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #F1F5F9;
  border-radius: 16px;
  transition: background 0.2s;
  
  &:hover { background: #F8FAFC; }
`;

const ProductImage = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 12px;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0.5rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    mix-blend-mode: multiply;
  }
  
  .placeholder { width: 100%; height: 100%; background: #E2E8F0; }
`;

const ProductName = styled.div`
  font-weight: 700;
  color: #0F172A;
  font-size: 1.05rem;
  margin-bottom: 0.3rem;
`;

const ProductQty = styled.div`
  font-size: 0.9rem;
  color: #64748B;
  font-weight: 500;
  
  span { margin: 0 0.4rem; color: #CBD5E1; }
`;

const ItemTotal = styled.div`
  margin-left: auto;
  font-weight: 800;
  color: #0B8457;
  font-size: 1.15rem;
`;

// Addresses
const AddressGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
`;

const AddressCard = styled(motion.div)`
  position: relative;
  background: ${props => props.$selected ? 'rgba(11, 132, 87, 0.04)' : '#ffffff'};
  border: 2px solid ${props => props.$selected ? '#0B8457' : '#E2E8F0'};
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    border-color: ${props => props.$selected ? '#0B8457' : '#CBD5E1'};
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 1rem;
    
    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: ${props => props.$selected ? '#0B8457' : '#F1F5F9'};
      color: ${props => props.$selected ? '#ffffff' : '#64748B'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .label-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      strong { color: #0F172A; font-size: 1.05rem; }
      
      .default-pill {
        background: #E2E8F0;
        color: #334155;
        font-size: 0.7rem;
        padding: 0.2rem 0.6rem;
        border-radius: 50px;
        text-transform: uppercase;
        font-weight: 800;
      }
    }
  }

  .address-text {
    color: #475569;
    line-height: 1.6;
    margin: 0;
    font-size: 0.95rem;
  }
`;

const SelectedBadge = styled(motion.div)`
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: #0B8457;
  font-size: 1.4rem;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(11, 132, 87, 0.2);
`;

const ContactInputWrapper = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
  
  .label-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 400px;
    margin-bottom: 0.8rem;
    
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      color: #334155;
      font-size: 0.95rem;
    }
    
    .verified-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      background: #ECFDF5;
      color: #059669;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 50px;
      text-transform: uppercase;
    }
  }

  .helper-text {
    font-size: 0.85rem;
    color: #94A3B8;
    margin-top: 0.6rem;
    display: block;
  }
`;

const LockedField = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 1rem 1.2rem;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  font-size: 1.05rem;
  color: #64748B;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  cursor: not-allowed;
  user-select: none;
  
  .lock-icon {
    color: #94A3B8;
  }
`;

// Payment
const PaymentOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const PaymentOption = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 1.5rem 1rem;
  background: ${props => props.$active ? 'rgba(11, 132, 87, 0.04)' : '#ffffff'};
  border: 2px solid ${props => props.$active ? '#0B8457' : '#E2E8F0'};
  border-radius: 16px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  
  .icon { font-size: 2rem; color: ${props => props.$active ? '#0B8457' : '#64748B'}; transition: color 0.2s; }
  span { color: ${props => props.$active ? '#0F172A' : '#475569'}; font-weight: 700; font-size: 0.95rem; }
  
  &:hover { border-color: ${props => props.$active ? '#0B8457' : '#CBD5E1'}; .icon { color: ${props => props.$active ? '#0B8457' : '#334155'}; } }
`;

// Total & Submit
const TotalSection = styled(GlassSection)`
  padding: 2rem;
  
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    
    span:first-child { font-size: 1.2rem; font-weight: 700; color: #475569; }
  }
`;

const TotalAmount = styled.div`
  font-size: 2.2rem;
  font-weight: 900;
  color: #0F172A;
  letter-spacing: -1px;
`;

const PlaceOrderButton = styled(motion.button)`
  width: 100%; 
  padding: 1.2rem; 
  background: linear-gradient(135deg, #0B8457 0%, #075E3E 100%);
  color: #ffffff; 
  border: none; 
  border-radius: 16px; 
  font-weight: 800; 
  font-size: 1.15rem; 
  cursor: pointer; 
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(11, 132, 87, 0.25);
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
    transform: skewX(-25deg);
    animation: shimmer 4s infinite;
  }
  
  @keyframes shimmer { 0% { left: -150%; } 20% { left: 200%; } 100% { left: 200%; } }
  
  &:hover:not(:disabled) { box-shadow: 0 8px 25px rgba(11, 132, 87, 0.4); }
  &:disabled { background: #CBD5E1; box-shadow: none; cursor: not-allowed; &::after { display: none; } }
`;

const WarningBox = styled.div`
  display: flex; align-items: center; gap: 1rem; background: #FEF3C7; color: #B45309; padding: 1.5rem; border-radius: 16px; border: 1px solid #FDE68A;
  strong { display: block; font-size: 1.05rem; margin-bottom: 0.2rem; }
  p { margin: 0; font-size: 0.95rem; }
  a { color: #92400E; font-weight: 700; text-decoration: underline; }
`;

const EmptyState = styled(motion.div)`
  text-align: center; padding: 6rem 2rem; background: #ffffff; border-radius: 24px; border: 1px dashed #CBD5E1; margin-top: 2rem;
  .emoji { font-size: 4rem; display: block; margin-bottom: 1rem; }
  h3 { color: #0F172A; font-size: 1.8rem; font-weight: 900; margin-bottom: 0.5rem; }
  p { color: #64748B; font-size: 1.1rem; margin-bottom: 2rem; }
  .action-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: #0B8457; color: white; text-decoration: none; padding: 0.9rem 2rem; border-radius: 50px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 4px 14px rgba(11, 132, 87, 0.2); &:hover { background: #086341; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(11, 132, 87, 0.3); } }
`;

// Terminal Modal
const Overlay = styled(motion.div)`
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;
`;

const ModalBox = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95); padding: 3rem 2rem; border-radius: 24px; text-align: center; max-width: 420px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.5);
  h2 { color: #0F172A; font-size: 1.5rem; margin: 1.5rem 0 0.4rem 0; font-weight: 900; letter-spacing: -0.5px; } 
  h4 { color: #0B8457; font-size: 0.85rem; margin: 0 0 1.5rem 0; font-weight: 800; letter-spacing: 1px; } 
  p { color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem; }
`;

const IconWrapper = styled.div`
  position: relative; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: #ECFDF5; border-radius: 50%; box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.1);
`;

const Ring = styled(motion.div)`
  position: absolute; inset: -4px; border: 3px solid transparent; border-top-color: #10B981; border-right-color: #10B981; border-radius: 50%;
`;

const ProgressBarContainer = styled.div`
  width: 100%; height: 6px; background: #E2E8F0; border-radius: 10px; overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%; background: linear-gradient(90deg, #10B981, #0B8457); border-radius: 10px;
`;