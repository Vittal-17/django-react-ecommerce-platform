import { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaBoxOpen, FaStar, FaUserShield, FaTimes } from 'react-icons/fa';
import { toast } from "react-hot-toast";

// Import Modular Sections
import OrdersSection from '../sections/dashboard/OrdersSection';
import ReviewsSection from '../sections/dashboard/ReviewsSection';
import ProfileSection from '../sections/dashboard/ProfileSection';

// Shared Global Modals
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
          <h3>Cancel Order</h3>
          <p>Are you sure you want to cancel this order? This will restore item inventory immediately.</p>
          <ButtonGroup style={{ marginTop: '1.5rem' }}>
            <ModalSecondaryButton onClick={onClose}>No, Keep it</ModalSecondaryButton>
            <ModalDangerButton onClick={onConfirm}>Yes, Cancel</ModalDangerButton>
          </ButtonGroup>
        </ModalCard>
      </Overlay>
    )}
  </AnimatePresence>
);

const ReviewModal = ({ isOpen, onClose, reviewData, onSubmit, isSubmitting }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen && reviewData) {
      setRating(reviewData.rating || 0);
      setComment(reviewData.comment || '');
    }
  }, [isOpen, reviewData]);

  if (!isOpen) return null;

  return (
    <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} style={{ maxWidth: '480px' }}>
        <CloseBtn onClick={onClose}><FaTimes /></CloseBtn>
        <h3>{reviewData.isEditing ? 'Edit Your Review' : 'Leave a Review'}</h3>
        <p style={{ color: '#2e7d32', fontWeight: 'bold', marginBottom: '0.5rem' }}>{reviewData.productName}</p>
        
        <Stars>
          {[...Array(5)].map((_, i) => {
            const starValue = i + 1;
            return (
              <label key={i}>
                <input type="radio" name="rating" value={starValue} onClick={() => setRating(starValue)} style={{ display: 'none' }} />
                <FaStar size={32} color={starValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'} onMouseEnter={() => setHover(starValue)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer', transition: 'color 200ms' }} />
              </label>
            );
          })}
        </Stars>

        <ModalContentWrapper>
          <textarea 
            placeholder="Share your thoughts about this product..." 
            value={comment} 
            onChange={e => setComment(e.target.value)}
          />

          <ButtonGroup>
            <ModalSecondaryButton onClick={onClose} disabled={isSubmitting}>Cancel</ModalSecondaryButton>
            <ModalPrimaryButton onClick={() => onSubmit({ rating, comment, productId: reviewData.productId, reviewId: reviewData.reviewId })} disabled={isSubmitting || rating === 0 || !comment.trim()}>
              {isSubmitting ? 'Saving...' : 'Submit Review'}
            </ModalPrimaryButton>
          </ButtonGroup>
        </ModalContentWrapper>
      </ModalCard>
    </Overlay>
  );
};

const Dashboard = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('orders'); 

  // Segregated States
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [totalOrderPages, setTotalOrderPages] = useState(1);

  const [userReviews, setUserReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);

  const [addresses, setAddresses] = useState([]); 

  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [reviewModalData, setReviewModalData] = useState({ isOpen: false });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch Addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const addressRes = await axiosInstance.get('/api/addresses/');
        setAddresses(addressRes.data.results || addressRes.data);
      } catch (error) { toast.error('Failed to load addresses'); }
    };
    fetchAddresses();
  }, [axiosInstance]);

  // Fetch Orders
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await axiosInstance.get(`/api/orders/?page=${orderPage}`);
      setOrders(res.data.results || res.data);
      if (res.data.count) setTotalOrderPages(Math.ceil(res.data.count / 12));
    } catch (error) { toast.error('Failed to load orders'); } 
    finally { setIsLoadingOrders(false); }
  };
  useEffect(() => { fetchOrders(); }, [orderPage, axiosInstance]);

  // Fetch Reviews
  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const res = await axiosInstance.get(`/api/reviews/?user=${user.id}&page=${reviewPage}`);
      setUserReviews(res.data.results || res.data);
      if (res.data.count) setTotalReviewPages(Math.ceil(res.data.count / 12));
    } catch (error) { toast.error('Failed to load reviews'); } 
    finally { setIsLoadingReviews(false); }
  };
  useEffect(() => { fetchReviews(); }, [reviewPage, axiosInstance, user.id]);

  const executeCancelOrder = async () => {
    const orderId = orderToCancel;
    setIsCancelModalOpen(false);
    try {
      await axiosInstance.post(`/api/orders/${orderId}/cancel/`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success(`🛑 Order cancelled successfully!`);
    } catch (error) { toast.error(`❌ Failed to cancel order.`); } 
    finally { setOrderToCancel(null); }
  };

  const handleReviewSubmit = async (data) => {
    setIsSubmittingReview(true);
    try {
      if (reviewModalData.isEditing) {
        await axiosInstance.put(`/api/reviews/${data.reviewId}/`, { product: data.productId, rating: data.rating, comment: data.comment });
        toast.success('✅ Review updated successfully!');
      } else {
        await axiosInstance.post('/api/reviews/', { product: data.productId, rating: data.rating, comment: data.comment });
        toast.success('⭐ Review submitted successfully!');
      }
      fetchReviews(); 
      setReviewModalData({ isOpen: false });
    } catch (err) { toast.error('❌ Failed to save review.'); } 
    finally { setIsSubmittingReview(false); }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axiosInstance.delete(`/api/reviews/${reviewId}/`);
      toast.success('🗑️ Review deleted');
      fetchReviews();
    } catch { toast.error('❌ Failed to delete review'); }
  };

  return (
    <DashboardContainer>
      <ConfirmationModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} onConfirm={executeCancelOrder} />
      
      <AnimatePresence>
        {reviewModalData.isOpen && (
          <ReviewModal 
            isOpen={reviewModalData.isOpen} 
            onClose={() => setReviewModalData({ isOpen: false })} 
            reviewData={reviewModalData} 
            onSubmit={handleReviewSubmit} 
            isSubmitting={isSubmittingReview} 
          />
        )}
      </AnimatePresence>
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>My Dashboard</motion.h1>

      <TabBar>
        <Tab $active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}><FaBoxOpen /> Orders</Tab>
        <Tab $active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}><FaStar /> Reviews</Tab>
        <Tab $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}><FaUserShield /> Profile Settings</Tab>
      </TabBar>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <OrdersSection 
          orders={orders}
          isLoadingOrders={isLoadingOrders}
          orderPage={orderPage}
          totalOrderPages={totalOrderPages}
          setOrderPage={setOrderPage}
          userReviews={userReviews}
          openReviewModal={(productInfo, review) => setReviewModalData({ isOpen: true, productId: productInfo.product, productName: productInfo.name || productInfo.product_name, isEditing: !!review, reviewId: review?.id, rating: review?.rating, comment: review?.comment })}
          onCancelOrderClick={(orderId) => { setOrderToCancel(orderId); setIsCancelModalOpen(true); }}
        />
      )}

      {/* TAB 2: REVIEWS */}
      {activeTab === 'reviews' && (
        <ReviewsSection 
          userReviews={userReviews}
          isLoadingReviews={isLoadingReviews}
          reviewPage={reviewPage}
          totalReviewPages={totalReviewPages}
          setReviewPage={setReviewPage}
          openReviewModal={(productInfo, review) => setReviewModalData({ isOpen: true, productId: productInfo.product, productName: productInfo.product_name, isEditing: true, reviewId: review?.id, rating: review?.rating, comment: review?.comment })}
          onDeleteReview={deleteReview}
        />
      )}

      {/* TAB 3: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <ProfileSection 
          addresses={addresses} 
          setAddresses={setAddresses} 
        />
      )}
    </DashboardContainer>
  );
};

const DashboardContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 1000px; margin: 0 auto; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); @media (max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }`;
const TabBar = styled.div` display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 1rem; overflow-x: auto; scrollbar-width: none; `;
const Tab = styled.button` display: flex; align-items: center; gap: 0.5rem; background: ${props => props.$active ? '#2e7d32' : 'transparent'}; color: ${props => props.$active ? 'white' : '#616161'}; border: none; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s; white-space: nowrap; &:hover { background: ${props => props.$active ? '#1b5e20' : '#e0e0e0'}; }`;
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px);`;
const ModalCard = styled(motion.div)` position: relative; background: white; padding: 2.5rem; border-radius: 20px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); h3 { margin: 0 0 0.5rem 0; color: #0f172a; } p { color: #64748b; margin-bottom: 0; font-size: 0.95rem; }`;
const CloseBtn = styled.button` position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; &:hover { color: #0f172a; } `;
const ModalContentWrapper = styled.div` display: flex; flex-direction: column; gap: 1.2rem; width: 100%; margin-top: 1.2rem; box-sizing: border-box; textarea { width: 100%; height: 110px; padding: 0.9rem 1rem; border-radius: 10px; border: 2px solid #e2e8f0; font-size: 1rem; outline: none; font-family: inherit; box-sizing: border-box; resize: none; transition: 0.2s; &:focus { border-color: #2e7d32; } } `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; width: 100%; justify-content: center; box-sizing: border-box; `;
const Stars = styled.div` display: flex; justify-content: center; margin: 1rem 0; gap: 4px; `;
const ModalPrimaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #2e7d32; color: white; font-weight: bold; font-size: 1rem; box-sizing: border-box; &:hover:not(:disabled) { filter: brightness(1.1); } &:disabled { opacity: 0.6; cursor: not-allowed; } `;
const ModalDangerButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #d32f2f; color: white; font-weight: bold; font-size: 1rem; box-sizing: border-box; &:hover { background: #b71c1c; } `;
const ModalSecondaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #f1f5f9; color: #475569; font-weight: bold; font-size: 1rem; box-sizing: border-box; &:hover { background: #e2e8f0; } `;

export default Dashboard;