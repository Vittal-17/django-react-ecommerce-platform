// src/pages/Dashboard.js
import { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaBoxOpen, FaBox, FaTruck, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import {toast, Toaster} from "react-hot-toast";


const Dashboard = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const fetchOrders = async () => {
      try {
        const res = await axiosInstance.get('/api/orders/');
        const userOrders = res.data.filter(order => order.user === user.id);
        setOrders(userOrders);
      } catch (error) {
        console.error(error);
        toast.error('❌ Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [axiosInstance, user]);

  const fetchOrderItems = async (orderId) => {
    if (orderItems[orderId]) return;
    setLoadingItems(true);
    try {
      const res = await axiosInstance.get(`/api/order-items/?order=${orderId}`);
      const itemsWithImages = await Promise.all(
        res.data.map(async (item) => {
          try {
            const productRes = await axiosInstance.get(`/api/products/${item.product}/`);
            return {
              ...item,
              image_url: productRes.data.image_url
            };
          } catch (err) {
            return { ...item, image_url: null };
          }
        })
      );
      setOrderItems(prev => ({ ...prev, [orderId]: itemsWithImages }));
    } catch (error) {
      console.error(error);
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

  const toggleExpandedOrder = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      await fetchOrderItems(orderId);
    }
  };

  return (
    <DashboardContainer>
      <Toaster
  position="bottom-right"
/>
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Your Orders
      </motion.h1>

      {isLoading ? (
        <LoadingWrapper>
          <Spinner />
          <LoadingText>Loading your orders...</LoadingText>
        </LoadingWrapper>
      ) : orders.length === 0 ? (
        <EmptyState initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <FaBoxOpen size={48} color="#9E9E9E" />
          <p>No orders yet</p>
        </EmptyState>
      ) : (
        <OrdersList>
          {orders.map((order, index) => (
            <OrderCard
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <OrderHeader>
                <div>
                  <h3>Order #{order.id}</h3>
                  <OrderDate>{new Date(order.created_at).toLocaleDateString()}</OrderDate>
                </div>
                <StatusBadge status={order.status}>
                  {getStatusIcon(order.status)}
                  <span>{order.status}</span>
                </StatusBadge>
              </OrderHeader>

              <OrderTotal>Total: ${Number(order.total_price)?.toFixed(2)}</OrderTotal>

              <button onClick={() => toggleExpandedOrder(order.id)} style={{ marginTop: '10px', padding: '8px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {expandedOrderId === order.id ? 'Hide Items' : 'View Order Items'}
              </button>

              {expandedOrderId === order.id && (
                <ItemsList>
                  {loadingItems ? (
                    <LoadingWrapper>
                      <Spinner size="small" />
                    </LoadingWrapper>
                  ) : (
                    orderItems[order.id]?.map(item => (
                      <Item key={item.id}>
                        <ItemImage>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                          ) : (
                            <FaBoxOpen size={30} color="#BDBDBD" />
                          )}
                        </ItemImage>
                        <ItemDetails>
                          <h4>{item.name}</h4>
                          <p>{item.description?.slice(0, 50)}...</p>
                          <div>
                            <span>Qty: {item.quantity}</span>
                            <span>${Number(item.price)?.toFixed(2)} each</span>
                          </div>
                        </ItemDetails>
                      </Item>
                    ))
                  )}
                </ItemsList>
              )}
            </OrderCard>
          ))}
        </OrdersList>
      )}
    </DashboardContainer>
  );
};

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 4rem;
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  border: 6px solid #e0e0e0;
  border-top: 6px solid #2e7d32;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: 1.3rem;
  font-weight: 600;
  color: #4caf50;
`;

const OrdersList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  list-style: none;
  padding: 0;
`;

const EmptyState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
`;

const OrderCard = styled(motion.li)`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const OrderDate = styled.p`
  color: #757575;
  font-size: 0.9rem;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props =>
    props.status === 'pending' ? '#FFF3E0' :
    props.status === 'shipped' ? '#E3F2FD' :
    props.status === 'delivered' ? '#E8F5E9' : '#FFEBEE'};
  color: ${props =>
    props.status === 'pending' ? '#E65100' :
    props.status === 'shipped' ? '#0D47A1' :
    props.status === 'delivered' ? '#1B5E20' : '#C62828'};
  padding: 0.5rem 1rem;
  border-radius: 20px;
`;

const OrderTotal = styled.p`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2e7d32;
  margin-top: 1rem;
`;

const viewItemsButtonStyle = {
  marginTop: "1rem",
  backgroundColor: "#4caf50",
  color: "white",
  border: "none",
  padding: "0.5rem 1rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold"
};

const ItemsList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 0.8rem;
`;

const ItemImage = styled.div`
  width: 60px;
  height: 60px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
`;

const ItemDetails = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 0.3rem 0;
    font-size: 1rem;
  }

  p {
    margin: 0 0 0.5rem 0;
    font-size: 0.8rem;
    color: #616161;
  }

  div {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
  }
`;

export default Dashboard;
