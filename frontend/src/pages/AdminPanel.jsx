import { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
// eslint-disable-next-line
import toast, { Toaster } from "react-hot-toast";
import AuthContext from '../context/AuthContext';

import ProductsSection from '../sections/ProductsSection';
import CategoriesSection from '../sections/CategoriesSection';
import UsersSection from '../sections/UsersSection';
import OrdersSection from '../sections/OrdersSection';
import ReviewsSection from '../sections/ReviewsSection';

const AdminContainer = styled.div`
  padding: 6rem 1rem 1rem 1rem; /* Adjusted for mobile navbar */
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  box-sizing: border-box;
  background: #f4f7f6; /* Cleaner background */

  @media (min-width: 768px) {
    padding: 7rem 2rem 2rem 2rem; /* Adjusted for desktop navbar */
  }
`;

const NavTabs = styled.div`
  display: flex;
  flex-wrap: wrap; /* Allows buttons to stack on small screens */
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 2rem;
  
  @media (min-width: 768px) {
    gap: 1rem;
  }
`;

const TabButton = styled(motion.button)`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #c8e6c9;
  transition: all 0.3s ease;
  
  /* Remove default motion/button shadows that cause white overlays */
  box-shadow: none !important;

  /* Explicitly define styles for all interaction states */
  background: ${({ $active }) => ($active ? '#2e7d32' : '#e8f5e9')} !important;
  color: ${({ $active }) => ($active ? '#ffffff' : '#2e7d32')} !important;

  &:hover {
    background: ${({ $active }) => ($active ? '#1b5e20' : '#c8e6c9')} !important;
    color: ${({ $active }) => ($active ? '#ffffff' : '#1b5e20')} !important;
  }

  &:focus, &:active {
    outline: none !important;
    /* Force the button to stay green regardless of click state */
    background: ${({ $active }) => ($active ? '#2e7d32' : '#e8f5e9')} !important;
    color: ${({ $active }) => ($active ? '#ffffff' : '#2e7d32')} !important;
  }
`;

const SectionWrapper = styled(motion.div)`
  width: 100%;
`;

const AdminPanel = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  // eslint-disable-next-line
  const [products, setProducts] = useState([]);
  // eslint-disable-next-line
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeSection, setActiveSection] = useState('products');

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
// eslint-disable-next-line
  useEffect(() => {
    // eslint-disable-next-line
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
        <TabButton onClick={() => setActiveSection('products')} $active={activeSection === 'products'}>Products</TabButton>
        <TabButton onClick={() => setActiveSection('categories')} $active={activeSection === 'categories'}>Categories</TabButton>
        <TabButton onClick={() => setActiveSection('users')} $active={activeSection === 'users'}>Users</TabButton>
        <TabButton onClick={() => setActiveSection('orders')} $active={activeSection === 'orders'}>Orders</TabButton>
        <TabButton onClick={() => setActiveSection('reviews')} $active={activeSection === 'reviews'}>Reviews</TabButton>
      </NavTabs>

      <AnimatePresence mode="wait">
        {activeSection === 'products' && (
          <SectionWrapper
            key="products"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ProductsSection />
          </SectionWrapper>
        )}

        {activeSection === 'categories' && (
          <SectionWrapper
            key="categories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <CategoriesSection />
          </SectionWrapper>
        )}

        {activeSection === 'users' && (
          <SectionWrapper
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <UsersSection users={users} refetch={fetchData} />
          </SectionWrapper>
        )}

        {activeSection === 'orders' && (
          <SectionWrapper
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <OrdersSection orders={orders} refetch={fetchData} />
          </SectionWrapper>
        )}

        {activeSection === 'reviews' && (
          <SectionWrapper
            key="reviews"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ReviewsSection reviews={reviews} users={users} products={products} refetch={fetchData} />
          </SectionWrapper>
        )}
      </AnimatePresence>
    </AdminContainer>
  );
};

export default AdminPanel;
