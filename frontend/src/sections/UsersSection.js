import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaTimes, FaUser, FaUserShield, FaTrash, FaEdit } from 'react-icons/fa';

const UsersSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null); 
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get(`/api/users/?page=${currentPage}`);
      setUsers(res.data.results || res.data);
      if (res.data.count) setTotalPages(Math.ceil(res.data.count / 12));
    } catch { setUsers([]); }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [axiosInstance, currentPage]);

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await axiosInstance.delete(`/api/users/${userToDelete}/`);
      toast.success('🗑️ User deleted');
      fetchUsers();
    } catch { toast.error('❌ Failed to delete user'); } 
    finally { setIsDeleteModalOpen(false); setUserToDelete(null); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await axiosInstance.patch(`/api/users/${id}/`, { role });
      toast.success(`✅ Role updated to ${role.toUpperCase()}`);
      setActiveUser(null);
      fetchUsers();
    } catch { toast.error('❌ Failed to update role'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>👥 Manage Users</SectionTitle>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {users.map(u => (
          <ListItem key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{u.username}</div>
              <div style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.2rem' }}>{u.email}</div>
            </div>
            <ControlsWrapper>
              <RoleTriggerButton $isAdmin={u.role === 'admin'} onClick={() => setActiveUser(u)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {u.role === 'admin' ? <FaUserShield /> : <FaUser />} {u.role} <FaEdit style={{ marginLeft: '4px' }} />
              </RoleTriggerButton>
              <DeleteButton onClick={() => { setUserToDelete(u.id); setIsDeleteModalOpen(true); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <FaTrash /> Delete
              </DeleteButton>
            </ControlsWrapper>
          </ListItem>
        ))}
      </ul>

      {totalPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
          <PageButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <ConfirmOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfirmCard>
              <h3>Delete User</h3><p>Delete this user profile entirely? They will lose all access.</p>
              <ButtonGroup>
                <CancelBtn onClick={() => setIsDeleteModalOpen(false)}>Cancel</CancelBtn>
                <ConfirmDeleteBtn onClick={executeDelete}>Yes, Delete</ConfirmDeleteBtn>
              </ButtonGroup>
            </ConfirmCard>
          </ConfirmOverlay>
        )}
        {activeUser && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveUser(null)}>
            <ModalCard onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setActiveUser(null)}><FaTimes /></CloseButton>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#2c3e50', textAlign: 'center' }}>Set Role for {activeUser.username}</h3>
              <StatusOptionBtn $bg="#e8f5e9" $fg="#2e7d32" $borderColor="#4CAF50" $active={activeUser.role === 'user'} onClick={() => handleRoleChange(activeUser.id, 'user')}>
                <FaUser /> <span style={{ flex: 1, textAlign: 'left' }}>Standard User</span> {activeUser.role === 'user' && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Current)</span>}
              </StatusOptionBtn>
              <StatusOptionBtn $bg="#fee2e2" $fg="#991b1b" $borderColor="#ef4444" $active={activeUser.role === 'admin'} onClick={() => handleRoleChange(activeUser.id, 'admin')}>
                <FaUserShield /> <span style={{ flex: 1, textAlign: 'left' }}>Administrator</span> {activeUser.role === 'admin' && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Current)</span>}
              </StatusOptionBtn>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UsersSection;

// STYLED COMPONENTS
const SectionTitle = styled.h2` color: #2e7d32; margin-bottom: 1.5rem; font-size: 1.5rem; `;
const ListItem = styled(motion.li)` background: #ffffff; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 12px rgba(46,125,50,0.05); border: 1px solid #e8f5e9; @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; } `;
const ControlsWrapper = styled.div` display: flex; gap: 0.8rem; width: 100%; @media (min-width: 768px) { width: auto; align-items: center; } `;
const RoleTriggerButton = styled(motion.button)` display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; border: none; cursor: pointer; flex: 1; background-color: ${props => props.$isAdmin ? '#fee2e2' : '#e8f5e9'}; color: ${props => props.$isAdmin ? '#991b1b' : '#2e7d32'}; &:hover { filter: brightness(0.95); } @media (min-width: 768px) { flex: initial; min-width: 140px; } `;
const DeleteButton = styled(motion.button)` padding: 0.6rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; flex: 1; gap: 0.4rem; &:hover { background: #c0392b; } @media (min-width: 768px) { flex: initial; } `;
// Pagination Styles
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;
// Modals
const ModalOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; `;
const ModalCard = styled(motion.div)` background: white; width: 90%; max-width: 400px; border-radius: 20px; padding: 2rem; position: relative; `;
const CloseButton = styled.button` position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; font-size: 1.2rem; color: #999; cursor: pointer; `;
const StatusOptionBtn = styled(motion.button)` display: flex; align-items: center; gap: 1rem; width: 100%; padding: 1rem 1.5rem; margin-bottom: 0.8rem; border: 2px solid ${props => props.$active ? props.$borderColor : 'transparent'}; border-radius: 12px; background-color: ${props => props.$bg}; color: ${props => props.$fg}; font-size: 1.1rem; font-weight: 600; cursor: pointer; &:hover { filter: brightness(0.95); } `;
const ConfirmOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem; `;
const ConfirmCard = styled(motion.div)` background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;
const ConfirmDeleteBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #d32f2f; color: #ffffff; &:hover { background: #b71c1c; } `;
const CancelBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #757575; color: #ffffff; &:hover { background: #616161; } `;