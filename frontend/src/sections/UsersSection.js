import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";

const AdminSelect = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  background-color: white;
  @media (min-width: 768px) {
    width: auto;
    min-width: 120px;
  }
`;

const AdminButton = styled(motion.button)`
  padding: 12px 20px;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: #1b5e20;
  }
`;

const DeleteButton = styled(AdminButton)`
  background: #e74c3c;
  &:hover {
    background: #c0392b;
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

const ControlsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  
  @media (min-width: 768px) {
    flex-direction: row;
    width: auto;
    align-items: center;
  }
  
  select, button {
    flex: 1;
    @media (min-width: 768px) {
      flex: initial;
    }
  }
`;

const UsersSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axiosInstance.get('/api/users/').then(res => setUsers(res.data)).catch(() => setUsers([]));
  }, [axiosInstance]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this user profile?')) return;
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
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {users.map(u => (
          <ListItem key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ wordBreak: 'break-all' }}>
              <strong>{u.username}</strong> ({u.email}) — <span style={{ color: u.role === 'admin' ? '#e74c3c' : '#2e7d32', fontWeight: 'bold' }}>{u.role}</span>
            </div>
            <ControlsWrapper>
              <AdminSelect value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </AdminSelect>
              <DeleteButton onClick={() => handleDelete(u.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Delete</DeleteButton>
            </ControlsWrapper>
          </ListItem>
        ))}
      </ul>
    </motion.div>
  );
};

export default UsersSection;