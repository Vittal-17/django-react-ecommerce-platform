import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FaUser, FaClock, FaInfoCircle, FaPlusCircle, FaEdit, FaTimesCircle, FaTruck } from 'react-icons/fa';

// --- Smart Style Parser ---
const getLogStyles = (actionText) => {
  const text = actionText.toLowerCase();
  
  // 1. Destructive Actions (Red)
  if (text.includes('cancel') || text.includes('delete') || text.includes('removed')) {
    return { color: '#e53935', icon: <FaTimesCircle /> }; 
  }
  
  // 2. Shipping/Fulfillment (Blue)
  if (text.includes('shipped') || text.includes('delivered')) {
    return { color: '#1e88e5', icon: <FaTruck /> }; 
  }

  // 3. Updates/Edits (Orange)
  if (text.includes('update') || text.includes('renamed') || text.includes('status:')) {
    return { color: '#fb8c00', icon: <FaEdit /> }; 
  }
  
  // 4. Creation/New (Green)
  if (text.includes('create') || text.includes('add') || text.includes('new order')) {
    return { color: '#43a047', icon: <FaPlusCircle /> }; 
  }
  
  // Default Fallback (Gray)
  return { color: '#757575', icon: <FaInfoCircle /> };
};

const AdminLogsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axiosInstance.get('/api/admin-logs/');
        setLogs(res.data);
      } catch (err) {
        console.error("Error fetching logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [axiosInstance]);

  return (
    <LogContainer>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Loading activity logs...</p>
      ) : logs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No logs found.</p>
      ) : (
        logs.map((log) => {
          const { color, icon } = getLogStyles(log.action);
          
          return (
            <LogItem 
              key={log.id} 
              $borderColor={color} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
            >
              <LogHeader>
                <span className="user"><FaUser /> {log.admin?.username || 'System'}</span>
                <span className="time"><FaClock /> {new Date(log.timestamp).toLocaleString()}</span>
              </LogHeader>
              <LogBody $iconColor={color}>
                <span className="icon-wrapper">{icon}</span> 
                <span className="text">{log.action}</span>
              </LogBody>
            </LogItem>
          );
        })
      )}
    </LogContainer>
  );
};

// --- STYLED COMPONENTS ---
const LogContainer = styled.div` display: flex; flex-direction: column; gap: 1rem; `;

const LogItem = styled(motion.div)` 
  background: white; 
  padding: 1.2rem; 
  border-radius: 12px; 
  border-left: 6px solid ${props => props.$borderColor}; 
  box-shadow: 0 4px 10px rgba(0,0,0,0.04); 
  transition: transform 0.2s ease;
  &:hover {
    transform: translateX(4px);
  }
`;

const LogHeader = styled.div` 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  font-size: 0.85rem; 
  margin-bottom: 0.8rem; 
  .user { 
    font-weight: 700; 
    color: #424242; 
    display: flex;
    align-items: center;
    gap: 0.4rem;
  } 
  .time {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #555555;            /* Darkened text for high contrast */
    font-weight: 600;          /* Bolded for readability */
    background-color: #f5f5f5; /* Subtle gray background pill */
    padding: 0.3rem 0.8rem;    /* Padding to create the badge look */
    border-radius: 20px;       /* Smooth rounded edges */
    border: 1px solid #eeeeee; /* Crisp border */
  }
`;

const LogBody = styled.div` 
  display: flex; 
  align-items: flex-start; 
  gap: 0.8rem; 
  color: #333; 
  font-weight: 500; 
  line-height: 1.4;
  .icon-wrapper {
    color: ${props => props.$iconColor};
    font-size: 1.3rem;
    display: flex;
    margin-top: 2px;
  }
  .text {
    flex: 1;
  }
`;

export default AdminLogsSection;