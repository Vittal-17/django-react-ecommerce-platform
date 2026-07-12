import { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaBoxOpen, FaBox, FaTruck, FaCheckCircle, FaTimesCircle, FaBan, FaStar, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from "react-hot-toast";

// ==========================================
// CANCEL ORDER MODAL
// ==========================================
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <ModalCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
          <h3>Cancel Order</h3>
          <p>Are you sure you want to cancel this order? This will restore item inventory immediately.</p>
          <ButtonGroup>
            <ModalSecondaryButton onClick={onClose}>No, Keep it</ModalSecondaryButton>
            <ModalDangerButton onClick={onConfirm}>Yes, Cancel</ModalDangerButton>
          </ButtonGroup>
        </ModalCard>
      </Overlay>
    )}
  </AnimatePresence>
);

// ==========================================
// REVIEW MODAL
// ==========================================
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
      <ModalCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '500px' }}>
        <h3>{reviewData.isEditing ? 'Edit Your Review' : 'Leave a Review'}</h3>
        <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>{reviewData.productName}</p>
        
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

        <textarea 
          placeholder="Share your thoughts about this product..." 
          value={comment} 
          onChange={e => setComment(e.target.value)}
          style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '1rem', resize: 'none' }}
        />

        <ButtonGroup style={{ marginTop: '1.5rem' }}>
          <ModalSecondaryButton onClick={onClose} disabled={isSubmitting}>Cancel</ModalSecondaryButton>
          <ModalPrimaryButton 
            onClick={() => onSubmit({ rating, comment, productId: reviewData.productId, reviewId: reviewData.reviewId })} 
            disabled={isSubmitting || rating === 0 || !comment.trim()}
          >
            {isSubmitting ? 'Saving...' : 'Submit Review'}
          </ModalPrimaryButton>
        </ButtonGroup>
      </ModalCard>
    </Overlay>
  );
};


// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
const Dashboard = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Modals State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  
  const [reviewModalData, setReviewModalData] = useState({ isOpen: false });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const ordersRes = await axiosInstance.get('/api/orders/');
        setOrders(ordersRes.data.filter(order => order.user === user.id));
        
        const reviewsRes = await axiosInstance.get('/api/reviews/');
        setUserReviews(reviewsRes.data.filter(r => r.username === user.username));
      } catch (error) { toast.error('❌ Failed to load dashboard data'); } 
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [axiosInstance, user]);

  const fetchOrderItems = async (orderId) => {
    if (orderItems[orderId]) return;
    setLoadingItems(true);
    try {
      const res = await axiosInstance.get(`/api/order-items/?order=${orderId}`);
      const itemsWithImages = await Promise.all(res.data.map(async (item) => {
        try {
          const productRes = await axiosInstance.get(`/api/products/${item.product}/`);
          return { ...item, image_url: productRes.data.image_url, name: productRes.data.name };
        } catch (err) { return { ...item, image_url: null }; }
      }));
      setOrderItems(prev => ({ ...prev, [orderId]: itemsWithImages }));
    } catch (error) { toast.error('❌ Failed to load order items'); } 
    finally { setLoadingItems(false); }
  };

  const executeCancelOrder = async () => {
    const orderId = orderToCancel;
    setIsCancelModalOpen(false);
    setCancellingId(orderId);
    try {
      // eslint-disable-next-line
      const res = await axiosInstance.post(`/api/orders/${orderId}/cancel/`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success(`🛑 Order cancelled successfully!`);
    } catch (error) {
      toast.error(`❌ Failed to cancel order.`);
    } finally {
      setCancellingId(null);
      setOrderToCancel(null);
    }
  };

  const openReviewModal = (productInfo, existingReview = null) => {
    setReviewModalData({
      isOpen: true,
      productId: productInfo.product,
      productName: productInfo.name || productInfo.product_name,
      isEditing: !!existingReview,
      reviewId: existingReview?.id,
      rating: existingReview?.rating || 0,
      comment: existingReview?.comment || ''
    });
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
      const reviewsRes = await axiosInstance.get('/api/reviews/');
      setUserReviews(reviewsRes.data.filter(r => r.username === user.username));
      setReviewModalData({ isOpen: false });
    } catch (err) {
      toast.error('❌ Failed to save review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axiosInstance.delete(`/api/reviews/${reviewId}/`);
      toast.success('🗑️ Review deleted');
      setUserReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch {
      toast.error('❌ Failed to delete review');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaBoxOpen style={{ color: '#FFA000' }} />;
      case 'shipped': return <FaTruck style={{ color: '#1976D2' }} />;
      case 'delivered': return <FaCheckCircle style={{ color: '#388E3C' }} />;
      case 'cancelled': return <FaTimesCircle style={{ color: '#D32F2F' }} />;
      default: return <FaBox style={{ color: '#616161' }} />;
    }
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
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Your Orders
      </motion.h1>

      {isLoading ? (
        <LoadingWrapper><Spinner /><LoadingText>Loading...</LoadingText></LoadingWrapper>
      ) : orders.length === 0 ? (
        <EmptyState><FaBoxOpen size={48} color="#9E9E9E" /><p>No orders yet</p></EmptyState>
      ) : (
        <OrdersList>
          {orders.map((order) => (
            <OrderCard key={order.id}>
              <OrderHeader>
                <div><h3>Order #{order.id}</h3><OrderDate>{new Date(order.created_at).toLocaleDateString()}</OrderDate></div>
                <StatusBadge status={order.status}>{getStatusIcon(order.status)} <span>{order.status}</span></StatusBadge>
              </OrderHeader>

              <OrderTotal>Total: ${Number(order.total_price)?.toFixed(2)}</OrderTotal>

              <ActionGroup>
                <button onClick={() => { if(expandedOrderId === order.id) setExpandedOrderId(null); else { setExpandedOrderId(order.id); fetchOrderItems(order.id); } }} style={viewItemsButtonStyle}>
                  {expandedOrderId === order.id ? 'Hide Items' : 'View Order Items'}
                </button>

                {order.status === 'pending' && (
                  <DashboardCancelButton disabled={cancellingId === order.id} onClick={() => { setOrderToCancel(order.id); setIsCancelModalOpen(true); }}>
                    <FaBan /> {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                  </DashboardCancelButton>
                )}
              </ActionGroup>

              {expandedOrderId === order.id && (
                <ItemsList>
                  {loadingItems ? <LoadingWrapper><Spinner size="small" /></LoadingWrapper> : orderItems[order.id]?.map(item => {
                    const existingReview = userReviews.find(r => r.product === item.product);

                    return (
                      <Item key={item.id}>
                        <ItemImage>{item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaBoxOpen size={30} color="#BDBDBD" />}</ItemImage>
                        <ItemDetails>
                          <h4>{item.name}</h4>
                          <div><span>Qty: {item.quantity}</span><span>${Number(item.price)?.toFixed(2)} each</span></div>
                        </ItemDetails>
                        
                        {order.status === 'delivered' && (
                           <ReviewTriggerButton $isEdit={!!existingReview} onClick={() => openReviewModal(item, existingReview)}>
                             {existingReview ? <><FaEdit /> Edit Review</> : <><FaStar /> Leave Review</>}
                           </ReviewTriggerButton>
                        )}
                      </Item>
                    )
                  })}
                </ItemsList>
              )}
            </OrderCard>
          ))}
        </OrdersList>
      )}

      {/* --- MY REVIEWS SECTION --- */}
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '4rem', color: '#2e7d32' }}>
        My Reviews
      </motion.h2>
      
      {!isLoading && userReviews.length === 0 ? (
        <p style={{ color: '#757575', fontStyle: 'italic' }}>You haven't reviewed any products yet.</p>
      ) : (
        <OrdersList style={{ marginTop: '1rem' }}>
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
                <ModalSecondaryButton onClick={() => openReviewModal({ product: review.product, product_name: review.product_name }, review)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FaEdit /> Edit
                </ModalSecondaryButton>
                <ModalDangerButton onClick={() => deleteReview(review.id)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FaTrash /> Delete
                </ModalDangerButton>
              </ReviewActions>
            </ReviewItemCard>
          ))}
        </OrdersList>
      )}

    </DashboardContainer>
  );
};

// ==========================================
// ARMORED STYLED COMPONENTS
// ==========================================
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px);`;
const ModalCard = styled(motion.div)` background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;
const Stars = styled.div` display: flex; justify-content: center; margin: 1rem 0; gap: 4px; `;

// Buttons
const ModalPrimaryButton = styled.button` padding: 0.8rem 1.5rem; border: none !important; border-radius: 8px; cursor: pointer; background: #4caf50 !important; color: white !important; font-weight: bold; &:hover:not(:disabled) { background: #388e3c !important; } &:disabled { background: #a5d6a7 !important; cursor: not-allowed; } `;
const ModalDangerButton = styled.button` padding: 0.8rem 1.5rem; border: none !important; border-radius: 8px; cursor: pointer; background: #d32f2f !important; color: white !important; font-weight: bold; &:hover { background: #b71c1c !important; } `;
const ModalSecondaryButton = styled.button` padding: 0.8rem 1.5rem; border: none !important; border-radius: 8px; cursor: pointer; background: #757575 !important; color: white !important; font-weight: bold; &:hover:not(:disabled) { background: #616161 !important; } &:disabled { opacity: 0.7; cursor: not-allowed; } `;
const DashboardCancelButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: #d32f2f !important; color: white !important; border: none !important; border-radius: 8px; cursor: pointer; font-weight: bold; &:hover { background-color: #c62828 !important; } &:disabled { background-color: #ef9a9a !important; cursor: not-allowed; } `;
const ReviewTriggerButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: ${props => props.$isEdit ? '#FFF9C4' : '#E8F5E9'}; color: ${props => props.$isEdit ? '#F57F17' : '#2e7d32'}; border: 1px solid ${props => props.$isEdit ? '#FBC02D' : '#81C784'}; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s ease; &:hover { filter: brightness(0.95); } @media (max-width: 600px) { width: 100%; justify-content: center; margin-top: 10px; }`;

const DashboardContainer = styled.div` 
  padding: 7rem 2rem 2rem 2rem; 
  max-width: 900px; margin: 0 auto; min-height: 100vh; 
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); 
  @media (max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }
`;
const LoadingWrapper = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4rem; `;
const Spinner = styled.div` width: 50px; height: 50px; border: 5px solid #e0e0e0; border-top: 5px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; @keyframes spin { to { transform: rotate(360deg); } } `;
const LoadingText = styled.div` font-size: 1.3rem; font-weight: 600; color: #4caf50; `;
const EmptyState = styled(motion.div)` display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const OrdersList = styled.ul` display: flex; flex-direction: column; gap: 1.5rem; list-style: none; padding: 0; `;
const OrderCard = styled(motion.li)` background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const OrderHeader = styled.div` display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; `;
const OrderDate = styled.p` color: #757575; font-size: 0.9rem; `;
const StatusBadge = styled.div` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 500; background: ${props => props.status === 'pending' ? '#FFF3E0' : props.status === 'delivered' ? '#E8F5E9' : props.status === 'cancelled' ? '#FFEBEE' : '#E3F2FD'}; color: #333; `;
const OrderTotal = styled.p` font-size: 1.1rem; font-weight: 600; color: #2e7d32; margin-top: 1rem; `;
const ActionGroup = styled.div` display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 10px; `;
const viewItemsButtonStyle = { backgroundColor: "#4caf50", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const ItemsList = styled.ul` list-style: none; padding: 0; margin-top: 1.5rem; border-top: 1px solid #eee; padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem; `;
const Item = styled.li` display: flex; align-items: center; gap: 1rem; background: #f9f9f9; border-radius: 8px; padding: 1rem; flex-wrap: wrap; `;
const ItemImage = styled.div` width: 60px; height: 60px; background: #e0e0e0; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; `;
const ItemDetails = styled.div` flex: 1; min-width: 200px; h4 { margin: 0 0 0.5rem 0; color: #333; } div { display: flex; gap: 1rem; font-size: 0.9rem; color: #555; } `;

// New Styled Components for Review Cards
const ReviewItemCard = styled.li`
  background: white; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
  display: flex; flex-direction: column; gap: 1.5rem;
  @media (min-width: 600px) {
    flex-direction: row; justify-content: space-between; align-items: flex-start;
  }
`;
const ReviewContent = styled.div` flex: 1; min-width: 0; `;
const ReviewActions = styled.div` display: flex; gap: 0.5rem; align-items: flex-start; white-space: nowrap; `;

export default Dashboard;