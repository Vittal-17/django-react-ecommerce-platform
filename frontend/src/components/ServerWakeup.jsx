import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';

const ServerWakeup = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Set a timer: If the server doesn't respond in 1.5 seconds, show the overlay
    const timeout = setTimeout(() => {
      if (isMounted) setIsWaking(true);
    }, 1500);

    // Ping a lightweight endpoint to wake the server
    const pingServer = async () => {
      try {
        await axiosInstance.get('/api/categories/'); // A fast, lightweight endpoint
        clearTimeout(timeout);
        if (isMounted) setIsWaking(false);
      } catch (err) {
        // If it fails, we still clear it so it doesn't spin forever
        clearTimeout(timeout);
        if (isMounted) setIsWaking(false);
      }
    };

    pingServer();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [axiosInstance]);

  return (
    <AnimatePresence>
      {isWaking && (
        <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ModalBox initial={{ y: 20 }} animate={{ y: 0 }}>
            <Spinner />
            <h3>Waking up the server...</h3>
            <p>Please wait a few seconds. Our free-tier hosting goes to sleep when inactive to save energy! ☕</p>
          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

const Overlay = styled(motion.div)`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
`;
const ModalBox = styled(motion.div)`
  background: white; padding: 2rem; border-radius: 16px; text-align: center; max-width: 400px; width: 90%;
  h3 { color: #2e7d32; margin-top: 1rem; }
  p { color: #666; font-size: 0.95rem; line-height: 1.5; }
`;
const Spinner = styled.div`
  width: 50px; height: 50px; border: 5px solid #e8f5e9; border-top-color: #4CAF50;
  border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default ServerWakeup;