import { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaBoxOpen, FaBox, FaTruck, FaCheckCircle, FaTimesCircle, FaBan } from 'react-icons/fa';
import { toast, Toaster } from "react-hot-toast";

// ==========================================
// CUSTOM CONFIRMATION MODAL
// ==========================================
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  return (
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
};

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
const Dashboard = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchOrders = async () => {
      try {
        const res = await axiosInstance.get('/api/orders/');
        const userOrders = res.data.filter(order => order.user === user.id);
        setOrders(userOrders);
      } catch (error) { toast.error('❌ Failed to load orders'); } 
      finally { setIsLoading(false); }
    };
    fetchOrders();
  }, [axiosInstance, user]);

  const fetchOrderItems = async (orderId) => {
    if (orderItems[orderId]) return;
    setLoadingItems(true);
    try {
      const res = await axiosInstance.get(`/api/order-items/?order=${orderId}`);
      const itemsWithImages = await Promise.all(res.data.map(async (item) => {
        try {
          const productRes = await axiosInstance.get(`/api/products/${item.product}/`);
          return { ...item, image_url: productRes.data.image_url };
        } catch (err) { return { ...item, image_url: null }; }
      }));
      setOrderItems(prev => ({ ...prev, [orderId]: itemsWithImages }));
    } catch (error) { toast.error('❌ Failed to load order items'); } 
    finally { setLoadingItems(false); }
  };

  const promptCancelOrder = (orderId) => {
    setOrderToCancel(orderId);
    setIsModalOpen(true);
  };

  const executeCancelOrder = async () => {
    const orderId = orderToCancel;
    setIsModalOpen(false);
    setCancellingId(orderId);
    try {
      const res = await axiosInstance.post(`/api/orders/${orderId}/cancel/`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success(`🛑 ${res.data.message || 'Order cancelled successfully!'}`);
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.error || 'Failed to cancel order.'}`);
    } finally {
      setCancellingId(null);
      setOrderToCancel(null);
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
      <Toaster position="bottom-right" />
      <ConfirmationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={executeCancelOrder} />
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Your Orders
      </motion.h1>

      {isLoading ? (
        <LoadingWrapper><Spinner /><LoadingText>Loading your orders...</LoadingText></LoadingWrapper>
      ) : orders.length === 0 ? (
        <EmptyState><FaBoxOpen size={48} color="#9E9E9E" /><p>No orders yet</p></EmptyState>
      ) : (
        <OrdersList>
          {orders.map((order, index) => (
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
                  <DashboardCancelButton
                    disabled={cancellingId === order.id}
                    onClick={() => promptCancelOrder(order.id)}
                  >
                    <FaBan /> {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                  </DashboardCancelButton>
                )}
              </ActionGroup>

              {expandedOrderId === order.id && (
                <ItemsList>
                  {loadingItems ? <LoadingWrapper><Spinner size="small" /></LoadingWrapper> : orderItems[order.id]?.map(item => (
                    <Item key={item.id}>
                      <ItemImage>{item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaBoxOpen size={30} color="#BDBDBD" />}</ItemImage>
                      <ItemDetails><h4>{item.name}</h4><div><span>Qty: {item.quantity}</span><span>${Number(item.price)?.toFixed(2)} each</span></div></ItemDetails>
                    </Item>
                  ))}
                </ItemsList>
              )}
            </OrderCard>
          ))}
        </OrdersList>
      )}
    </DashboardContainer>
  );
};

// ==========================================
// ARMORED STYLED COMPONENTS
// ==========================================
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; `;
const ModalCard = styled(motion.div)` background: white; padding: 2rem; border-radius: 16px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;

// Modal Specific Buttons
const ModalDangerButton = styled.button` padding: 0.8rem 1.5rem; border: none !important; border-radius: 8px; cursor: pointer; background: #d32f2f !important; color: white !important; &:hover { background: #b71c1c !important; } `;
const ModalSecondaryButton = styled.button` padding: 0.8rem 1.5rem; border: none !important; border-radius: 8px; cursor: pointer; background: #757575 !important; color: white !important; &:hover { background: #616161 !important; } `;

// Dashboard Action Button
const DashboardCancelButton = styled.button` 
  display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; 
  background-color: #d32f2f !important; color: white !important; 
  border: none !important; border-radius: 8px; cursor: pointer; font-weight: bold; 
  &:hover { background-color: #c62828 !important; } 
  &:disabled { background-color: #ef9a9a !important; cursor: not-allowed; } 
`;

const DashboardContainer = styled.div` padding: 2rem; max-width: 900px; margin: 0 auto; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); `;
const LoadingWrapper = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4rem; `;
const Spinner = styled.div` width: 50px; height: 50px; border: 5px solid #e0e0e0; border-top: 5px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; @keyframes spin { to { transform: rotate(360deg); } } `;
const LoadingText = styled.div` font-size: 1.3rem; font-weight: 600; color: #4caf50; `;
const EmptyState = styled(motion.div)` display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const OrdersList = styled.ul` display: flex; flex-direction: column; gap: 1.5rem; list-style: none; padding: 0; `;
const OrderCard = styled(motion.li)` background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const OrderHeader = styled.div` display: flex; justify-content: space-between; align-items: center; `;
const OrderDate = styled.p` color: #757575; font-size: 0.9rem; `;
const StatusBadge = styled.div` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 500; background: ${props => props.status === 'pending' ? '#FFF3E0' : '#E8F5E9'}; `;
const OrderTotal = styled.p` font-size: 1.1rem; font-weight: 600; color: #2e7d32; margin-top: 1rem; `;
const ActionGroup = styled.div` display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 10px; `;
const viewItemsButtonStyle = { backgroundColor: "#4caf50", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const ItemsList = styled.ul` list-style: none; padding: 0; margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem; `;
const Item = styled.li` display: flex; align-items: center; gap: 1rem; background: #f9f9f9; border-radius: 8px; padding: 0.8rem; `;
const ItemImage = styled.div` width: 60px; height: 60px; background: #e0e0e0; border-radius: 6px; overflow: hidden; `;
const ItemDetails = styled.div` flex: 1; h4 { margin: 0; } div { display: flex; gap: 1rem; font-size: 0.9rem; } `;

export default Dashboard;