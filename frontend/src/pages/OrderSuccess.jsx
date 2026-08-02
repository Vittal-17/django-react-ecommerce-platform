// src/pages/OrderSuccess.jsx
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaCheckCircle, FaReceipt, FaTruck, FaMapMarkerAlt, FaPhoneAlt, FaArrowRight, FaStore } from 'react-icons/fa';
import AppLayout from '../components/AppLayout';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { order, payment, userAddress, userPhone } = location.state || {};

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }
  };

  const checkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.5, duration: 0.8 } }
  };

  return (
      <AppLayout>
        {/* 🚀 Removed clashing TechGridBackground and AmbientGlows! */}
        <SuccessContainer variants={containerVariants} initial="hidden" animate="visible">
          
          <IconWrapper variants={checkVariants}>
            <div className="aura-ring" />
            <FaCheckCircle />
          </IconWrapper>
          
          <motion.h1 variants={itemVariants}>Payment Successful!</motion.h1>
          <motion.p variants={itemVariants} className="subtitle">
            Thank you for choosing EazyShop. Your secure transaction has been processed and order <strong>#{orderId}</strong> is confirmed.
          </motion.p>

          {order && payment && (
            <GridContainer variants={itemVariants}>
              <DetailCard>
                <h3><FaReceipt /> Transaction Details</h3>
                <Divider />
                <InfoRow><span>Payment Method:</span> <strong>{payment.payment_method.replace('_', ' ').toUpperCase()}</strong></InfoRow>
                <InfoRow><span>Transaction ID:</span> <strong className="mono">{payment.transaction_id}</strong></InfoRow>
                <InfoRow><span>Total Paid:</span> <strong className="highlight">${order.total_price}</strong></InfoRow>
              </DetailCard>

              <DetailCard>
                <h3><FaTruck /> Fulfillment Dispatch</h3>
                <Divider />
                <InfoRow className="address-row">
                  <FaMapMarkerAlt className="icon-sub" /> 
                  <span>{userAddress}</span>
                </InfoRow>
                <InfoRow style={{ marginTop: '0.8rem' }}>
                  <span className="label-flex"><FaPhoneAlt className="icon-sub" /> Contact Phone:</span> 
                  <strong>{userPhone}</strong>
                </InfoRow>
              </DetailCard>
            </GridContainer>
          )}

          <ActionButtons variants={itemVariants}>
            <PrimaryButton onClick={() => navigate('/dashboard')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              View Dashboard <FaArrowRight size={14} />
            </PrimaryButton>
            <SecondaryButton onClick={() => navigate('/products')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <FaStore /> Continue Shopping
            </SecondaryButton>
          </ActionButtons>

        </SuccessContainer>
      </AppLayout>
  );
};

export default OrderSuccess;

// ==========================================
// SAAS LEVEL STYLED COMPONENTS
// ==========================================

const SuccessContainer = styled(motion.div)`
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, #02a322 0%, #075E3E 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  max-width: 900px;
  width: 100%;
  border-radius: 32px;
  padding: 4rem 3rem;
  
  /* 🚀 FIX: margin: 3rem auto instantly centers the card inside the glass layout! */
  margin: 3rem auto; 
  
  box-shadow: 0 30px 60px -15px rgba(11, 132, 87, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.25);
  text-align: center;
  
  h1 { 
    color: #ffffff; 
    margin-bottom: 0.6rem; 
    font-size: 2.8rem; 
    font-weight: 900;
    letter-spacing: -1px;
  }
  
  .subtitle { 
    color: #E2E8F0; 
    font-size: 1.15rem; 
    margin-bottom: 3rem; 
    line-height: 1.6;
    max-width: 600px;
    margin-inline: auto;

    strong { color: #ffffff; }
  }

  @media(max-width: 768px) {
    margin-top: 5rem;
    padding: 2.5rem 1.5rem;
  }
`;

const IconWrapper = styled(motion.div)`
  position: relative;
  width: 95px;
  height: 95px;
  margin: 0 auto 1.5rem auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: #ffffff;
  background: #065F46;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);

  .aura-ring {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    animation: pulseAura 2.5s infinite ease-in-out;
  }

  @keyframes pulseAura {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.15); opacity: 0.1; }
    100% { transform: scale(1); opacity: 0.8; }
  }

  svg {
    position: relative;
    z-index: 2;
    color: #ffffff;
  }
`;

const GridContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 3rem;
  text-align: left;
  
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled.div`
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 1.8rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  
  h3 { 
    display: flex; 
    align-items: center; 
    gap: 0.6rem; 
    color: #0F172A; 
    font-size: 1.15rem; 
    font-weight: 800;
    margin: 0; 
    
    svg { color: #0B8457; }
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #F1F5F9;
  margin: 1.2rem 0;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  font-size: 0.98rem;
  color: #334155;
  
  span { color: #64748B; font-weight: 500; }
  strong { color: #0F172A; font-weight: 700; }
  .mono { font-family: monospace; font-size: 0.9rem; background: #F8FAFC; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid #E2E8F0; }
  .highlight { color: #0B8457; font-size: 1.25rem; font-weight: 900; }
  
  .icon-sub { color: #0B8457; margin-right: 0.6rem; flex-shrink: 0; }
  
  &.address-row {
    align-items: flex-start;
    text-align: left;
    span { color: #334155; line-height: 1.5; }
  }

  .label-flex {
    display: flex;
    align-items: center;
  }
`;

const ActionButtons = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 1.2rem;
  
  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled(motion.button)`
  background: #ffffff;
  color: #0B8457;
  border: none;
  padding: 1.1rem 2.2rem;
  border-radius: 16px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);

  &:hover {
    background: #F8FAFC;
  }
`;

const SecondaryButton = styled(motion.button)`
  background: rgba(7, 94, 62, 0.5);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 1.1rem 2.2rem;
  border-radius: 16px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(7, 94, 62, 0.8);
    border-color: rgba(255, 255, 255, 0.7);
  }
`;