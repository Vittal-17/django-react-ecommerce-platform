import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../components/Home/Home.css';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate(); 
  // eslint-disable-next-line
  const { user } = useContext(AuthContext);

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="content-wrapper">
        <div className="space-y-8">
          <h1 className="hero-heading text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-900">
            Welcome to EazyShop
          </h1>
          
          <p className="subtitle text-gray-800">
            Discover curated collections and experience effortless shopping 
            with our seamless platform
          </p>
        </div>
        <CTAButton 
  onClick={() => navigate('/products')}
  whileHover={{ scale: 1.05, y: -2 }}
  whileTap={{ scale: 0.95 }}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
>
  <span className="icon">🛍️</span> Start Shopping
</CTAButton>
      </div>
    </div>
  );
};

const CTAButton = styled(motion.button)`
  background: linear-gradient(135deg, #4CAF50 0%, #2e7d32 100%);
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  border-radius: 50px; /* Perfect pill shape */
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(46, 125, 50, 0.3);
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-inline: auto; /* Centers the button */
  text-transform: capitalize;
  letter-spacing: 0.5px;
  
  .icon {
    font-size: 1.4rem;
  }
  
  /* The hover state smoothly intensifies the glow */
  &:hover {
    box-shadow: 0 12px 25px rgba(46, 125, 50, 0.5);
  }
`;

export default Home;