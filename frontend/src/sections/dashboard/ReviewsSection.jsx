import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaStar, FaEdit, FaTrash } from 'react-icons/fa';

const ReviewsSection = ({ userReviews, isLoadingReviews, reviewPage, totalReviewPages, setReviewPage, openReviewModal, onDeleteReview }) => {
  if (isLoadingReviews) {
    return <LoadingWrapper><Spinner /><LoadingText>Loading reviews...</LoadingText></LoadingWrapper>;
  }

  if (userReviews.length === 0) {
    return <EmptyState><FaStar size={48} color="#9E9E9E" /><p>You haven't reviewed any products yet.</p></EmptyState>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <ReviewsList>
        {userReviews.map(review => (
          <ReviewItemCard key={review.id}>
            <ReviewContent>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{review.product_name || `Product ID: ${review.product}`}</h4>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem' }}>
                {[...Array(5)].map((_, i) => <FaStar key={i} size={14} color={i < review.rating ? '#ffc107' : '#e4e5e9'} />)}
              </div>
              <p style={{ margin: 0, color: '#666', fontStyle: 'italic', fontSize: '0.95rem' }}>"{review.comment}"</p>
            </ReviewContent>
            <ReviewActions>
              <ModalSecondaryButton onClick={() => openReviewModal({ product: review.product, product_name: review.product_name }, review)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}><FaEdit /> Edit</ModalSecondaryButton>
              <ModalDangerButton onClick={() => onDeleteReview(review.id)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}><FaTrash /> Delete</ModalDangerButton>
            </ReviewActions>
          </ReviewItemCard>
        ))}
      </ReviewsList>
      {totalReviewPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setReviewPage(p => Math.max(p - 1, 1))} disabled={reviewPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {reviewPage} of {totalReviewPages}</PageInfo>
          <PageButton onClick={() => setReviewPage(p => Math.min(p + 1, totalReviewPages))} disabled={reviewPage === totalReviewPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}
    </motion.div>
  );
};

const LoadingWrapper = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4rem; `;
const Spinner = styled.div` width: 50px; height: 50px; border: 5px solid #e0e0e0; border-top: 5px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; @keyframes spin { to { transform: rotate(360deg); } } `;
const LoadingText = styled.div` font-size: 1.3rem; font-weight: 600; color: #4caf50; `;
const EmptyState = styled(motion.div)` display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const ReviewsList = styled.ul` display: flex; flex-direction: column; gap: 1.5rem; list-style: none; padding: 0; `;
const ReviewItemCard = styled.li` background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); display: flex; flex-direction: column; gap: 1.5rem; @media (min-width: 600px) { flex-direction: row; justify-content: space-between; align-items: flex-start; }`;
const ReviewContent = styled.div` flex: 1; min-width: 0; `;
const ReviewActions = styled.div` display: flex; gap: 0.5rem; align-items: flex-start; white-space: nowrap; `;
const ModalDangerButton = styled.button` padding: 0.8rem 0; border: none; border-radius: 8px; cursor: pointer; background: #d32f2f; color: white; font-weight: bold; &:hover { background: #b71c1c; } `;
const ModalSecondaryButton = styled.button` padding: 0.8rem 0; border: none; border-radius: 8px; cursor: pointer; background: #f5f5f5; color: #424242; font-weight: bold; &:hover { background: #e0e0e0; } `;
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;

export default ReviewsSection;