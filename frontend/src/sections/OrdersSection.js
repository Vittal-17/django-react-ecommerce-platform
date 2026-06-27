import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";

const AdminSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 15px;
  box-sizing: border-box;
  background-color: white;
  
  @media (min-width: 768px) {
    width: auto;
    min-width: 140px;
  }
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

const StatusBadge = styled.span`
  display: inline-block;
  font-weight: bold;
  margin-top: 0.5rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.85rem;
  text-transform: uppercase;
  background-color: ${props => props.$bg};
  color: ${props => props.$fg};
`;

const OrdersSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      const [ordersRes, usersRes] = await Promise.all([
        axiosInstance.get('/api/orders/'),
        axiosInstance.get('/api/users/')
      ]);
      const ordersWithUsers = ordersRes.data.map(o => ({
        ...o,
        username: usersRes.data.find(u => u.id === o.user)?.username || 'Unknown'
      }));
      setOrders(ordersWithUsers);
    } catch {
      toast.error('❌ Failed to fetch order lifecycle histories');
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await axiosInstance.patch(`/api/orders/${id}/`, { status });
      toast.success('✅ Order status updated');
      fetchOrders();
    } catch {
      toast.error('❌ Failed to update order');
    }
  };

  const getStatusColors = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fef9c3', fg: '#713f12' };
      case 'shipped': return { bg: '#dbeafe', fg: '#1e40af' };
      case 'delivered': return { bg: '#dcfce7', fg: '#166534' };
      default: return { bg: '#fee2e2', fg: '#991b1b' };
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>📋 Orders</SectionTitle>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {orders.map(o => {
          const colors = getStatusColors(o.status);
          return (
            <ListItem key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div>
                <div><strong>Order #{o.id}</strong> by <strong>{o.username}</strong></div>
                <div style={{ marginTop: '0.25rem', color: '#555' }}>Total: ${Number(o.total_price).toFixed(2)}</div>
                <div>
                  <StatusBadge $bg={colors.bg} $fg={colors.fg}>
                    Status: {o.status}
                  </StatusBadge>
                </div>
              </div>
              <AdminSelect value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </AdminSelect>
            </ListItem>
          );
        })}
      </ul>
    </motion.div>
  );
};

export default OrdersSection;