import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import {toast} from "react-hot-toast";

const AdminSelect = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
`;

const ListItem = styled(motion.li)`
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
`;

const SectionTitle = styled.h2`
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
`;

const OrdersSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  // eslint-disable-next-line
  const [users, setUsers] = useState([]);

  const fetchOrders = async () => {
    const [ordersRes, usersRes] = await Promise.all([
      axiosInstance.get('/api/orders/'),
      axiosInstance.get('/api/users/')
    ]);
    const ordersWithUsers = ordersRes.data.map(o => ({
      ...o,
      username: usersRes.data.find(u => u.id === o.user)?.username || 'Unknown'
    }));
    setOrders(ordersWithUsers);
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>📋 Orders</SectionTitle>
      <ul>
        {orders.map(o => (
          <ListItem key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div>
              <div><strong>Order #{o.id}</strong> by <strong>{o.username}</strong></div>
              <div>Total: ${o.total_price}</div>
              <div style={{
                color: o.status === 'pending' ? '#f39c12' : o.status === 'shipped' ? '#3498db' : o.status === 'delivered' ? '#2ecc71' : '#e74c3c',
                marginTop: '0.5rem'
              }}>Status: {o.status}</div>
            </div>
            <AdminSelect value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}>
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </AdminSelect>
          </ListItem>
        ))}
      </ul>
    </motion.div>
  );
};

export default OrdersSection;
