import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";

const DeleteButton = styled(motion.button)`
  padding: 12px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  white-space: nowrap;
  &:hover { background: #c0392b; }
  @media (min-width: 768px) { width: auto; }
`;

const ListItem = styled(motion.li)`
  background: #ffffff;
  padding: 1.25rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
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

const SectionTitle = styled.h2`
  color: #2e7d32;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
`;

const ReviewsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // Now we only need to fetch reviews. 
      // The username is already inside each review object thanks to the Serializer!
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
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading reviews...</div>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {reviews.map(review => (
            <ListItem key={review.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {review.username || 'Anonymous'}
                </div>
                <div style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>
                  "{review.comment}"
                </div>
                {/* You can add logic for rating stars here using review.rating */}
              </div>
              <DeleteButton onClick={() => handleDelete(review.id)}>Delete</DeleteButton>
            </ListItem>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

export default ReviewsSection;