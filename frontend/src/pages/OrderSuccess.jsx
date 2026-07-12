import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaCheckCircle, FaReceipt, FaTruck, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safely extract the state passed from Checkout
  const { order, payment, userAddress, userPhone } = location.state || {};

  // Framer Motion staggered animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const checkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.5, duration: 0.8 } }
  };

  return (
    <PageWrapper>
      <SuccessContainer variants={containerVariants} initial="hidden" animate="visible">
        
        <IconWrapper variants={checkVariants}>
          <FaCheckCircle />
        </IconWrapper>
        
        <motion.h1 variants={itemVariants}>Payment Successful!</motion.h1>
        <motion.p variants={itemVariants} className="subtitle">
          Thank you for shopping with us. Your order <strong>#{orderId}</strong> has been confirmed.
        </motion.p>

        {/* Only render the details if we successfully got the state from Checkout */}
        {order && payment && (
          <GridContainer variants={itemVariants}>
            {/* Column 1: Order Info */}
            <DetailCard>
              <h3><FaReceipt /> Transaction Details</h3>
              <Divider />
              <InfoRow><span>Payment Method:</span> <strong>{payment.payment_method.replace('_', ' ').toUpperCase()}</strong></InfoRow>
              <InfoRow><span>Transaction ID:</span> <strong>{payment.transaction_id}</strong></InfoRow>
              <InfoRow><span>Total Amount:</span> <strong className="highlight">${order.total_price}</strong></InfoRow>
            </DetailCard>

            {/* Column 2: Shipping Info */}
            <DetailCard>
              <h3><FaTruck /> Fulfillment</h3>
              <Divider />
              <InfoRow>
                <FaMapMarkerAlt className="icon-sub" /> 
                <span>{userAddress}</span>
              </InfoRow>
              <InfoRow style={{ marginTop: '0.8rem' }}>
                <FaPhoneAlt className="icon-sub" /> 
                <span>{userPhone}</span>
              </InfoRow>
            </DetailCard>
          </GridContainer>
        )}

        <ActionButtons variants={itemVariants}>
          <PrimaryButton onClick={() => navigate('/dashboard')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            View Dashboard
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate('/products')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            Continue Shopping
          </SecondaryButton>
        </ActionButtons>

      </SuccessContainer>
    </PageWrapper>
  );
};

// Styled Components
const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding: 2rem;
`;

const SuccessContainer = styled(motion.div)`
  background: white;
  max-width: 700px;
  width: 100%;
  border-radius: 24px;
  padding: 3rem 2rem;
  margin: 7rem auto 2rem auto; /* Pushes the card down from the navbar */
  box-shadow: 0 20px 40px rgba(46, 125, 50, 0.15);
  text-align: center;
  
  h1 { color: #2e7d32; margin-bottom: 0.5rem; font-size: 2.2rem; }
  .subtitle { color: #555; font-size: 1.1rem; margin-bottom: 2rem; }

  @media(max-width: 768px) {
    margin: 6rem auto 2rem auto;
  }
`;

const IconWrapper = styled(motion.div)`
  font-size: 5rem;
  color: #4CAF50;
  margin-bottom: 1rem;
`;

const GridContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  text-align: left;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled.div`
  background: #f9fbf9;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 1.5rem;
  
  h3 { 
    display: flex; align-items: center; gap: 0.5rem; 
    color: #1b5e20; font-size: 1.1rem; margin: 0; 
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 1rem 0;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  color: #424242;
  
  span { color: #757575; }
  .highlight { color: #2e7d32; font-size: 1.1rem; }
  .icon-sub { color: #4CAF50; margin-right: 0.5rem; }
`;

const ActionButtons = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 1rem;
  
  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled(motion.button)`
  background: #4CAF50;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
`;

const SecondaryButton = styled(motion.button)`
  background: white;
  color: #2e7d32;
  border: 2px solid #4CAF50;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
`;

export default OrderSuccess;