import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaStar, FaTrash } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";

const SectionTitle = styled.h2`
  color: #2e7d32;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
`;

const ListItem = styled(motion.li)`
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.05);
  border: 1px solid #e8f5e9;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const ReviewDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const StarsContainer = styled.div`
  display: flex;
  gap: 0.2rem;
  color: #f1c40f;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const DeleteButton = styled(motion.button)`
  padding: 0.6rem 1rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  
  &:hover { background: #c0392b; }
`;

const ReviewsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/reviews/');
      setReviews(res.data);
    } catch (err) {
      toast.error('❌ Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review? It cannot be recovered.')) return;
    try {
      await axiosInstance.delete(`/api/reviews/${id}/`);
      toast.success('🗑️ Review deleted');
      fetchReviews();
    } catch {
      toast.error('❌ Failed to delete review');
    }
  };

  // Helper to render stars based on rating out of 5
  const renderStars = (rating) => {
    const validRating = rating || 5; // Fallback to 5 if undefined in older data
    return [...Array(5)].map((_, i) => (
      <FaStar key={i} color={i < validRating ? "#f1c40f" : "#e0e0e0"} />
    ));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>⭐ Customer Reviews</SectionTitle>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontStyle: 'italic' }}>
          No reviews have been posted yet.
        </div>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {reviews.map(review => (
            <ListItem key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ReviewDetails>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
                  {review.username || 'Anonymous User'}
                </div>
                
                <StarsContainer>
                  {renderStars(review.rating)}
                </StarsContainer>
                
                <div style={{ fontStyle: 'italic', color: '#555', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  "{review.comment}"
                </div>
              </ReviewDetails>
              
              <DeleteButton onClick={() => handleDelete(review.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <FaTrash /> Delete
              </DeleteButton>
            </ListItem>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

export default ReviewsSection;