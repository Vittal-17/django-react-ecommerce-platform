import { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../../context/AuthContext';
import { FaBoxOpen, FaBox, FaTruck, FaCheckCircle, FaTimesCircle, FaBan, FaStar, FaEdit, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import { toast } from "react-hot-toast";

const OrdersSection = ({ orders, isLoadingOrders, orderPage, totalOrderPages, setOrderPage, userReviews, openReviewModal, onCancelOrderClick }) => {
  const { axiosInstance } = useContext(AuthContext);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchOrderItems = async (orderId) => {
    if (orderItems[orderId]) return;
    setLoadingItems(true);
    try {
      const res = await axiosInstance.get(`/api/order-items/?order=${orderId}`);
      // OrderItemSerializer already includes image_url and name directly[cite: 10]
      const items = res.data.results || res.data;
      
      const formattedItems = items.map(item => {
        let rawImg = item.image_url || '';
        if (rawImg && rawImg.startsWith('/')) {
          rawImg = `http://127.0.0.1:8000${rawImg}`;
        }
        return { ...item, image_url: rawImg };
      });

      setOrderItems(prev => ({ ...prev, [orderId]: formattedItems }));
    } catch (error) { 
      toast.error('❌ Failed to load order items'); 
    } finally { 
      setLoadingItems(false); 
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

  if (isLoadingOrders) {
    return <LoadingWrapper><Spinner /><LoadingText>Loading orders...</LoadingText></LoadingWrapper>;
  }

  if (orders.length === 0) {
    return <EmptyState><FaBoxOpen size={48} color="#9E9E9E" /><p>No orders yet</p></EmptyState>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <OrdersList>
        {orders.map((order) => (
          <OrderCard key={order.id}>
            <OrderHeader>
              <div><h3>Order #{order.id}</h3><OrderDate>{new Date(order.created_at).toLocaleDateString()}</OrderDate></div>
              <StatusBadge status={order.status}>{getStatusIcon(order.status)} <span>{order.status}</span></StatusBadge>
            </OrderHeader>
            {order.shipping_address && <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}><strong><FaMapMarkerAlt /> Shipped To: </strong> {order.shipping_address}</div>}
            <OrderTotal>Total: ${Number(order.total_price)?.toFixed(2)}</OrderTotal>
            <ActionGroup>
              <button onClick={() => { if(expandedOrderId === order.id) setExpandedOrderId(null); else { setExpandedOrderId(order.id); fetchOrderItems(order.id); } }} style={viewItemsButtonStyle}>
                {expandedOrderId === order.id ? 'Hide Items' : 'View Order Items'}
              </button>
              {order.status === 'pending' && (
                <DashboardCancelButton onClick={() => onCancelOrderClick(order.id)}>
                  <FaBan /> Cancel Order
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
                      <ItemDetails><h4>{item.name}</h4><div><span>Qty: {item.quantity}</span><span>${Number(item.price)?.toFixed(2)} each</span></div></ItemDetails>
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
      {totalOrderPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setOrderPage(p => Math.max(p - 1, 1))} disabled={orderPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {orderPage} of {totalOrderPages}</PageInfo>
          <PageButton onClick={() => setOrderPage(p => Math.min(p + 1, totalOrderPages))} disabled={orderPage === totalOrderPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}
    </motion.div>
  );
};

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
const DashboardCancelButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: #d32f2f !important; color: white !important; border: none !important; border-radius: 8px; cursor: pointer; font-weight: bold; &:hover { background-color: #c62828 !important; } `;
const ItemsList = styled.ul` list-style: none; padding: 0; margin-top: 1.5rem; border-top: 1px solid #eee; padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem; `;
const Item = styled.li` display: flex; align-items: center; gap: 1rem; background: #f9f9f9; border-radius: 8px; padding: 1rem; flex-wrap: wrap; `;
const ItemImage = styled.div` width: 60px; height: 60px; background: #e0e0e0; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; `;
const ItemDetails = styled.div` flex: 1; min-width: 200px; h4 { margin: 0 0 0.5rem 0; color: #333; } div { display: flex; gap: 1rem; font-size: 0.9rem; color: #555; } `;
const ReviewTriggerButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: ${props => props.$isEdit ? '#FFF9C4' : '#E8F5E9'}; color: ${props => props.$isEdit ? '#F57F17' : '#2e7d32'}; border: 1px solid ${props => props.$isEdit ? '#FBC02D' : '#81C784'}; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s ease; &:hover { filter: brightness(0.95); } @media (max-width: 600px) { width: 100%; justify-content: center; margin-top: 10px; }`;
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;

export default OrdersSection;