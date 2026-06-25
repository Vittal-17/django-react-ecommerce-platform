import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import {toast, Toaster} from "react-hot-toast";

const AdminSelect = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
`;

const AdminButton = styled(motion.button)`
  padding: 12px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-right: 0.5rem;

  &:hover {
    background: #45a049;
  }
`;

const DeleteButton = styled(AdminButton)`
  background: #e74c3c;
  &:hover {
    background: #c0392b;
  }
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

const UsersSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axiosInstance.get('/api/users/').then(res => setUsers(res.data)).catch(() => setUsers([]));
  }, []);

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/users/${id}/`);
      toast.success('🗑️ User deleted');
      const res = await axiosInstance.get('/api/users/');
      setUsers(res.data);
    } catch {
      toast.error('❌ Failed to delete user');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await axiosInstance.patch(`/api/users/${id}/`, { role });
      toast.success('✅ Role updated');
      const res = await axiosInstance.get('/api/users/');
      setUsers(res.data);
    } catch {
      toast.error('❌ Failed to update role');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>👥 Users</SectionTitle>
      <ul>
        {users.map(u => (
          <ListItem key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div>
              <strong>{u.username}</strong> ({u.email}) — <span style={{ color: u.role === 'admin' ? '#e74c3c' : '#2ecc71', fontWeight: 'bold' }}>{u.role}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <AdminSelect value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </AdminSelect>
              <DeleteButton onClick={() => handleDelete(u.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Delete</DeleteButton>
            </div>
          </ListItem>
        ))}
      </ul>
    </motion.div>
  );
};

export default UsersSection;
