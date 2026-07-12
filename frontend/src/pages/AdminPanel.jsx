import { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaShieldAlt, FaListUl, FaBoxOpen, FaUsers, FaTags, FaCommentAlt } from 'react-icons/fa';
import React from 'react';

// Import your modular sections
import ProductsSection from '../sections/ProductsSection';
import CategoriesSection from '../sections/CategoriesSection';
import UsersSection from '../sections/UsersSection';
import OrdersSection from '../sections/OrdersSection';
import ReviewsSection from '../sections/ReviewsSection';
import AdminLogsSection from '../sections/AdminLogsSection';

const AdminContainer = styled.div`
  padding: 6rem 1rem 1rem 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  box-sizing: border-box;
  background: #f4f7f6;

  @media (min-width: 768px) {
    padding: 7rem 2rem 2rem 2rem;
  }
`;

const NavTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 2rem;
  @media (min-width: 768px) { gap: 1rem; }
`;

const TabButton = styled(motion.button)`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #c8e6c9;
  transition: all 0.3s ease;
  display: flex; align-items: center; gap: 8px;
  background: ${({ $active }) => ($active ? '#2e7d32' : '#e8f5e9')} !important;
  color: ${({ $active }) => ($active ? '#ffffff' : '#2e7d32')} !important;

  &:hover {
    background: ${({ $active }) => ($active ? '#1b5e20' : '#c8e6c9')} !important;
    color: ${({ $active }) => ($active ? '#ffffff' : '#1b5e20')} !important;
  }
`;

const SectionWrapper = styled(motion.div)` width: 100%; `;

const AdminPanel = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  // eslint-disable-next-line
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeSection, setActiveSection] = useState('logs'); // Default to logs

  const fetchData = async () => {
    try {
      const [usersRes, productsRes, categoriesRes, reviewsRes, ordersRes] = await Promise.all([
        axiosInstance.get('/api/users/'),
        axiosInstance.get('/api/products/'),
        axiosInstance.get('/api/categories/'),
        axiosInstance.get('/api/reviews/'),
        axiosInstance.get('/api/orders/')
      ]);

      setUsers(usersRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setReviews(reviewsRes.data);
      setOrders(ordersRes.data.map(order => ({
        ...order,
        username: usersRes.data.find(u => u.id === order.user)?.username || 'Unknown'
      })));
    } catch (err) {
      console.error('Failed to load admin data', err);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  return (
    <AdminContainer>
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}
      >
        🛠️ Admin Dashboard
      </motion.h1>

      <NavTabs>
        <TabButton onClick={() => setActiveSection('logs')} $active={activeSection === 'logs'}><FaListUl /> Activity Logs</TabButton>
        <TabButton onClick={() => setActiveSection('products')} $active={activeSection === 'products'}><FaShieldAlt /> Products</TabButton>
        <TabButton onClick={() => setActiveSection('categories')} $active={activeSection === 'categories'}><FaTags /> Categories</TabButton>
        <TabButton onClick={() => setActiveSection('users')} $active={activeSection === 'users'}><FaUsers /> Users</TabButton>
        <TabButton onClick={() => setActiveSection('orders')} $active={activeSection === 'orders'}><FaBoxOpen /> Orders</TabButton>
        <TabButton onClick={() => setActiveSection('reviews')} $active={activeSection === 'reviews'}><FaCommentAlt /> Reviews</TabButton>
      </NavTabs>

      <AnimatePresence mode="wait">
        {activeSection === 'logs' && (
          <SectionWrapper key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <AdminLogsSection />
          </SectionWrapper>
        )}
        {activeSection === 'products' && (
          <SectionWrapper key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ProductsSection />
          </SectionWrapper>
        )}
        {activeSection === 'categories' && (
          <SectionWrapper key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <CategoriesSection />
          </SectionWrapper>
        )}
        {activeSection === 'users' && (
          <SectionWrapper key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <UsersSection users={users} refetch={fetchData} />
          </SectionWrapper>
        )}
        {activeSection === 'orders' && (
          <SectionWrapper key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <OrdersSection orders={orders} refetch={fetchData} />
          </SectionWrapper>
        )}
        {activeSection === 'reviews' && (
          <SectionWrapper key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ReviewsSection reviews={reviews} users={users} products={products} refetch={fetchData} />
          </SectionWrapper>
        )}
      </AnimatePresence>
    </AdminContainer>
  );
};

export default AdminPanel;