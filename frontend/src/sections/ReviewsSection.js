import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import {toast, Toaster} from "react-hot-toast";

const DeleteButton = styled(motion.button)`
  padding: 12px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;

  &:hover {
    background: #c0392b;
  }
`;

const ListItem = styled(motion.li)`
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
`;

const StarsContainer = styled.div`
  display: flex;
  align-items: center;
  color: #f39c12;
  gap: 2px;
`;

const SectionTitle = styled.h2`
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
`;

const ReviewsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  const fetchReviews = async () => {
    const [reviewsRes, usersRes, productsRes] = await Promise.all([
      axiosInstance.get('/api/reviews/'),
      axiosInstance.get('/api/users/'),
      axiosInstance.get('/api/products/')
    ]);
    setReviews(reviewsRes.data);
    setUsers(usersRes.data);
    setProducts(productsRes.data);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/reviews/${id}/`);
      toast.success('🗑️ Review deleted');
      fetchReviews();
    } catch {
      toast.error('❌ Failed to delete review');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>⭐ Reviews</SectionTitle>
      {(!users.length || !products.length) ? <div>Loading...</div> : (
        <ul>
          {reviews.map(review => {
            const user = users.find(u => String(u.id) === String(review.user));
            const product = products.find(p => String(p.id) === String(review.product));
            return (
              <ListItem key={review.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{user?.username || 'Unknown User'}</div>
                    <StarsContainer>
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} color={i < review.rating ? '#f39c12' : '#e0e0e0'} size={14} />
                      ))}
                    </StarsContainer>
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>
                    "{review.comment}"
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    On: {product?.name || 'Unknown Product'}
                  </div>
                </div>
                <DeleteButton onClick={() => handleDelete(review.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Delete</DeleteButton>
              </ListItem>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
};

export default ReviewsSection;
