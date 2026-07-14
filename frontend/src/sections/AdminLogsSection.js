import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FaUser, FaClock, FaInfoCircle, FaPlusCircle, FaEdit, FaTimesCircle, FaTruck } from 'react-icons/fa';

const getLogStyles = (actionText) => {
  const text = actionText.toLowerCase();
  if (text.includes('cancel') || text.includes('delete') || text.includes('removed')) return { color: '#e53935', icon: <FaTimesCircle /> }; 
  if (text.includes('shipped') || text.includes('delivered')) return { color: '#1e88e5', icon: <FaTruck /> }; 
  if (text.includes('update') || text.includes('renamed') || text.includes('status:')) return { color: '#fb8c00', icon: <FaEdit /> }; 
  if (text.includes('create') || text.includes('add') || text.includes('new order')) return { color: '#43a047', icon: <FaPlusCircle /> }; 
  return { color: '#757575', icon: <FaInfoCircle /> };
};

const AdminLogsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axiosInstance.get(`/api/admin-logs/?page=${currentPage}`);
        setLogs(res.data.results || res.data);
        if (res.data.count) setTotalPages(Math.ceil(res.data.count / 12));
      } catch (err) { console.error("Error fetching logs", err); } 
      finally { setLoading(false); }
    };
    fetchLogs();
  }, [axiosInstance, currentPage]);

  return (
    <LogContainer>
      <h2 style={{ color: '#2e7d32', marginBottom: '1.5rem', fontSize: '1.5rem' }}>🔐 System Audit Logs</h2>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Loading activity logs...</p>
      ) : logs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No logs found.</p>
      ) : (
        logs.map((log) => {
          const { color, icon } = getLogStyles(log.action);
          return (
            <LogItem key={log.id} $borderColor={color} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <LogHeader>
                <span className="user"><FaUser /> {log.admin?.username || 'System'}</span>
                <span className="time"><FaClock /> {new Date(log.timestamp).toLocaleString()}</span>
              </LogHeader>
              <LogBody $iconColor={color}>
                <span className="icon-wrapper">{icon}</span> <span className="text">{log.action}</span>
              </LogBody>
            </LogItem>
          );
        })
      )}

      {totalPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
          <PageButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}
    </LogContainer>
  );
};

export default AdminLogsSection;

// STYLED COMPONENTS
const LogContainer = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const LogItem = styled(motion.div)` background: white; padding: 1.2rem; border-radius: 12px; border-left: 6px solid ${props => props.$borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.04); transition: transform 0.2s ease; &:hover { transform: translateX(4px); } `;
const LogHeader = styled.div` display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.8rem; .user { font-weight: 700; color: #424242; display: flex; align-items: center; gap: 0.4rem; } .time { display: flex; align-items: center; gap: 0.4rem; color: #555; font-weight: 600; background-color: #f5f5f5; padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #eee; } `;
const LogBody = styled.div` display: flex; align-items: flex-start; gap: 0.8rem; color: #333; font-weight: 500; line-height: 1.4; .icon-wrapper { color: ${props => props.$iconColor}; font-size: 1.3rem; display: flex; margin-top: 2px; } .text { flex: 1; } `;
// Pagination Styles
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;