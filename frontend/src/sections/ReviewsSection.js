import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaTrash } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";

const ReviewsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/reviews/?page=${currentPage}`);
      setReviews(res.data.results || res.data);
      if (res.data.count) setTotalPages(Math.ceil(res.data.count / 12));
    } catch (err) { toast.error('❌ Failed to load reviews'); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line
  }, [currentPage]);

  const executeDelete = async () => {
    if (!reviewToDelete) return;
    try {
      await axiosInstance.delete(`/api/reviews/${reviewToDelete}/`);
      toast.success('🗑️ Review deleted');
      fetchReviews();
    } catch { toast.error('❌ Failed to delete review'); } 
    finally { setIsDeleteModalOpen(false); setReviewToDelete(null); }
  };

  const renderStars = (rating) => {
    const validRating = rating || 5; 
    return [...Array(5)].map((_, i) => <FaStar key={i} color={i < validRating ? "#f1c40f" : "#e0e0e0"} />);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>⭐ Customer Reviews</SectionTitle>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontStyle: 'italic' }}>No reviews have been posted yet.</div>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {reviews.map(review => (
            <ListItem key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ReviewDetails>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
                  {review.username || 'Anonymous User'} <span style={{ color: '#777', fontWeight: 'normal', fontSize: '0.9rem' }}> on </span>
                  <span style={{ color: '#2e7d32' }}>{review.product_name || 'Product'}</span>
                </div>
                <StarsContainer>{renderStars(review.rating)}</StarsContainer>
                <div style={{ fontStyle: 'italic', color: '#555', marginTop: '0.5rem', lineHeight: '1.4' }}>"{review.comment}"</div>
              </ReviewDetails>
              <DeleteButton onClick={() => { setReviewToDelete(review.id); setIsDeleteModalOpen(true); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <FaTrash /> Delete
              </DeleteButton>
            </ListItem>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
          <PageButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}

      <AnimatePresence>
        {isDeleteModalOpen && (
          <ConfirmOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfirmCard>
              <h3>Delete Review</h3><p>Are you sure you want to delete this review? It cannot be recovered.</p>
              <ButtonGroup>
                <CancelBtn onClick={() => setIsDeleteModalOpen(false)}>Cancel</CancelBtn>
                <ConfirmDeleteBtn onClick={executeDelete}>Yes, Delete</ConfirmDeleteBtn>
              </ButtonGroup>
            </ConfirmCard>
          </ConfirmOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReviewsSection;

// STYLED COMPONENTS
const SectionTitle = styled.h2` color: #2e7d32; margin-bottom: 1.5rem; font-size: 1.5rem; `;
const ListItem = styled(motion.li)` background: #ffffff; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 12px rgba(46,125,50,0.05); border: 1px solid #e8f5e9; @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; } `;
const ReviewDetails = styled.div` flex: 1; min-width: 0; `;
const StarsContainer = styled.div` display: flex; gap: 0.2rem; color: #f1c40f; margin-bottom: 0.5rem; font-size: 1.1rem; `;
const DeleteButton = styled(motion.button)` padding: 0.6rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; &:hover { background: #c0392b; } `;
// Pagination Styles
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;
// Confirm Modal
const ConfirmOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem; `;
const ConfirmCard = styled(motion.div)` background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); h3 { margin-top: 0; color: #333; } p { color: #666; margin-bottom: 2rem; } `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;
const ConfirmDeleteBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #d32f2f; color: #ffffff; &:hover { background: #b71c1c; } `;
const CancelBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #757575; color: #ffffff; &:hover { background: #616161; } `;