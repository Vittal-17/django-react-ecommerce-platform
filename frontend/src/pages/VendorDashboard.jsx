import { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaBox } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';

// Import Modular Sections
import VendorSalesSection from '../sections/vendor/VendorSalesSection';
import VendorProductsSection from '../sections/vendor/VendorProductsSection';

const VendorDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sales');

  // Security Check: Kick out non-sellers
  useEffect(() => {
    if (user && user.role !== 'seller' && user.role !== 'admin') {
      navigate('/dashboard'); 
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'seller' && user.role !== 'admin')) return null;

  return (
    <DashboardContainer>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Header>
          <div>
            <h1>Vendor Portal</h1>
            <p>Welcome back, {user.username}. Manage your marketplace operations here.</p>
          </div>
        </Header>

        <TabBar>
          <Tab $active={activeTab === 'sales'} onClick={() => setActiveTab('sales')}>
            <FaChartLine /> Sales & Fulfillment
          </Tab>
          <Tab $active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
            <FaBox /> My Product Catalog
          </Tab>
        </TabBar>

        <ContentArea>
          {activeTab === 'sales' && <VendorSalesSection />}
          {activeTab === 'products' && <VendorProductsSection />}
        </ContentArea>
      </motion.div>
    </DashboardContainer>
  );
};

const DashboardContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 1100px; margin: 0 auto; min-height: 100vh; background: #f8fafc; @media (max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }`;
const Header = styled.div` display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; h1 { margin: 0; color: #0f172a; font-size: 2.2rem; } p { margin: 0.5rem 0 0 0; color: #64748b; font-size: 1.1rem; } `;
const TabBar = styled.div` display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 1rem; overflow-x: auto; scrollbar-width: none; `;
const Tab = styled.button` display: flex; align-items: center; gap: 0.5rem; background: ${props => props.$active ? '#2e7d32' : 'transparent'}; color: ${props => props.$active ? 'white' : '#616161'}; border: none; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s; white-space: nowrap; &:hover { background: ${props => props.$active ? '#1b5e20' : '#e0e0e0'}; }`;
const ContentArea = styled.div` min-height: 400px; `;

export default VendorDashboard;