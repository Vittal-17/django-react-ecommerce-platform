import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaTimes, FaClock, FaShippingFast, FaCheckCircle, FaTimesCircle, FaEdit } from 'react-icons/fa';

const OrdersSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrdersAndProducts = async () => {
    try {
      // 🚨 Pagination applied ONLY to orders. Users and Products must fetch all to map names properly.
      const [ordersRes, usersRes, productsRes] = await Promise.all([
        axiosInstance.get(`/api/orders/?page=${currentPage}`), 
        axiosInstance.get('/api/users/?page_size=1000'),
        axiosInstance.get('/api/products/?page_size=1000') 
      ]);

      const fetchedOrders = ordersRes.data.results || ordersRes.data;
      const fetchedUsers = usersRes.data.results || usersRes.data;
      
      setProducts(productsRes.data.results || productsRes.data);

      if (ordersRes.data.count) {
        setTotalPages(Math.ceil(ordersRes.data.count / 12));
      }

      const ordersWithUsers = fetchedOrders.map(o => ({
        ...o,
        username: fetchedUsers.find(u => u.id === o.user)?.username || 'Unknown'
      }));

      setOrders(ordersWithUsers.sort((a, b) => b.id - a.id));
    } catch {
      toast.error('❌ Failed to fetch order data');
    }
  };

  useEffect(() => {
    fetchOrdersAndProducts();
    // eslint-disable-next-line
  }, [currentPage]); // Re-runs instantly when page changes

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'cancelled' && !window.confirm('Cancel this order? This will restore the items to the inventory.')) return;
    try {
      await axiosInstance.patch(`/api/orders/${orderId}/`, { status: newStatus });
      toast.success(`✅ Order #${orderId} marked as ${newStatus.toUpperCase()}`);
      setActiveOrder(null); 
      fetchOrdersAndProducts();
    } catch { toast.error('❌ Failed to update order status'); }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fef9c3', fg: '#713f12', border: '#eab308', icon: <FaClock />, label: 'Pending' };
      case 'shipped': return { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6', icon: <FaShippingFast />, label: 'Shipped' };
      case 'delivered': return { bg: '#dcfce7', fg: '#166534', border: '#22c55e', icon: <FaCheckCircle />, label: 'Delivered' };
      case 'cancelled': return { bg: '#fee2e2', fg: '#991b1b', border: '#ef4444', icon: <FaTimesCircle />, label: 'Cancelled' };
      default: return { bg: '#f3f4f6', fg: '#374151', border: '#9ca3af', icon: <FaClock />, label: 'Unknown' };
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>📋 Manage Orders</SectionTitle>
      
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {orders.map(o => {
          const config = getStatusConfig(o.status);
          const isLocked = o.status === 'cancelled' || o.status === 'delivered';

          return (
            <ListItem key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <OrderDetails>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '1.2rem' }}><strong>Order #{o.id}</strong></div>
                    <div style={{ color: '#555', marginTop: '0.3rem' }}>Customer: <strong>{o.username}</strong></div>
                    <div style={{ color: '#2e7d32', fontWeight: 'bold', marginTop: '0.3rem', fontSize: '1.1rem' }}>Total: ${Number(o.total_price).toFixed(2)}</div>
                  </div>
                  <StatusTriggerButton 
                    $bg={config.bg} $fg={config.fg} onClick={() => setActiveOrder(o)}
                    disabled={isLocked} whileHover={!isLocked ? { scale: 1.05 } : {}} whileTap={!isLocked ? { scale: 0.95 } : {}}
                  >
                    {config.icon} {config.label} {!isLocked && <FaEdit style={{ marginLeft: '4px', fontSize: '0.8rem' }}/>}
                  </StatusTriggerButton>
                </div>
                <ItemsContainer>
                  {o.order_items?.map((item, index) => {
                    const productInfo = products.find(p => p.id === item.product);
                    return (
                      <ProductRow key={index}>
                        <ProductImage>{productInfo?.image_url ? <img src={productInfo.image_url} alt={productInfo.name} /> : <span>No Img</span>}</ProductImage>
                        <ProductInfo><span className="name">{productInfo?.name || `Product #${item.product}`}</span><span className="details">Qty: {item.quantity} | ${Number(item.price).toFixed(2)} each</span></ProductInfo>
                      </ProductRow>
                    );
                  })}
                </ItemsContainer>
              </OrderDetails>
            </ListItem>
          );
        })}
      </ul>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
          <PageButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}

      {/* Modals */}
      <AnimatePresence>
        {activeOrder && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveOrder(null)}>
            <ModalCard initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }} onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setActiveOrder(null)}><FaTimes /></CloseButton>
              <ModalTitle>Update Order #{activeOrder.id}</ModalTitle>
              <StatusOptionList>
                {['pending', 'shipped', 'delivered', 'cancelled'].map(statusType => {
                  const optConfig = getStatusConfig(statusType);
                  const isActive = activeOrder.status === statusType;
                  return (
                    <StatusOptionBtn key={statusType} $bg={optConfig.bg} $fg={optConfig.fg} $borderColor={optConfig.border} $active={isActive} onClick={() => !isActive && handleStatusChange(activeOrder.id, statusType)} whileHover={!isActive ? { scale: 1.02 } : {}}>
                      {optConfig.icon} <span style={{ flex: 1, textAlign: 'left' }}>{optConfig.label}</span> {isActive && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Current)</span>}
                    </StatusOptionBtn>
                  );
                })}
              </StatusOptionList>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrdersSection;

// STYLED COMPONENTS
const SectionTitle = styled.h2` color: #2e7d32; margin-bottom: 1.5rem; font-size: 1.5rem; `;
const ListItem = styled(motion.li)` background: #ffffff; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.05); border: 1px solid #e8f5e9; `;
const OrderDetails = styled.div` flex: 1; width: 100%; `;
const StatusTriggerButton = styled(motion.button)` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; text-transform: uppercase; border: 2px solid transparent; cursor: pointer; background-color: ${props => props.$bg}; color: ${props => props.$fg}; min-width: 160px; justify-content: center; &:hover:not(:disabled) { filter: brightness(0.95); box-shadow: 0 4px 8px rgba(0,0,0,0.1); } &:disabled { cursor: not-allowed; opacity: 0.7; } `;
const ItemsContainer = styled.div` margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 1rem; `;
const ProductRow = styled.div` display: flex; align-items: center; gap: 1rem; background: #f9fbf9; padding: 0.8rem; border-radius: 8px; border: 1px solid #e0e0e0; `;
const ProductImage = styled.div` width: 60px; height: 60px; background: white; border-radius: 8px; padding: 4px; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; img { max-width: 100%; max-height: 100%; object-fit: contain; } span { font-size: 0.7rem; color: #aaa; } `;
const ProductInfo = styled.div` display: flex; flex-direction: column; gap: 0.2rem; .name { font-weight: 600; color: #333; } .details { font-size: 0.9rem; color: #666; } `;
// Pagination Styles
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;
// Modal Styles
const ModalOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; `;
const ModalCard = styled(motion.div)` background: white; width: 100%; max-width: 400px; border-radius: 20px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.2); position: relative; `;
const CloseButton = styled.button` position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; font-size: 1.2rem; color: #999; cursor: pointer; &:hover { color: #333; } `;
const ModalTitle = styled.h3` margin: 0 0 1.5rem 0; color: #2c3e50; text-align: center; font-size: 1.3rem; `;
const StatusOptionList = styled.div` display: flex; flex-direction: column; gap: 0.8rem; `;
const StatusOptionBtn = styled(motion.button)` display: flex; align-items: center; gap: 1rem; width: 100%; padding: 1rem 1.5rem; border: 2px solid ${props => props.$active ? props.$borderColor : 'transparent'}; border-radius: 12px; background-color: ${props => props.$bg}; color: ${props => props.$fg}; font-size: 1.1rem; font-weight: 600; cursor: pointer; &:hover { filter: brightness(0.95); } `;