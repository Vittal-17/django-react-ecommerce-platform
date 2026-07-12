import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaServer, FaDatabase, FaLock, FaCheck } from 'react-icons/fa';

const ServerWakeup = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [isWaking, setIsWaking] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // 1. Initial Ping Logic
  useEffect(() => {
    let isMounted = true;
    
    // Show modal if server doesn't respond in 1.5s
    const timeout = setTimeout(() => {
      if (isMounted) setIsWaking(true);
    }, 1500);

    const pingServer = async () => {
      try {
        await axiosInstance.get('/api/categories/'); 
        clearTimeout(timeout);
        if (isMounted) setIsWaking(false);
      } catch (err) {
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

  // 2. Deployment Stepper Logic (Updates every 10 seconds)
  useEffect(() => {
    if (!isWaking) {
      setActiveStep(1); // Reset if closed
      return;
    }
    
    const timer1 = setTimeout(() => setActiveStep(2), 10000);
    const timer2 = setTimeout(() => setActiveStep(3), 20000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isWaking]);

  const steps = [
    { id: 1, title: "Waking Environment", desc: "Booting up the cloud instance from standby mode.", icon: <FaServer /> },
    { id: 2, title: "Restoring Database", desc: "Loading product catalog and user data into memory.", icon: <FaDatabase /> },
    { id: 3, title: "Securing Channels", desc: "Establishing encrypted connections for your session.", icon: <FaLock /> }
  ];

  return (
    <AnimatePresence>
      {isWaking && (
        <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ModalBox 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
          >
            
            <Header>
              <h2>Initializing EazyShop's Servers</h2>
              <p>Our eco-friendly servers are waking up from standby. This process takes about 30 seconds.</p>
            </Header>

            <StepList>
              {steps.map(step => {
                const isActive = step.id === activeStep;
                const isCompleted = step.id < activeStep;
                const isPending = step.id > activeStep;
                
                return (
                  <StepCard 
                    key={step.id} 
                    $active={isActive} 
                    $completed={isCompleted}
                    animate={{ opacity: isPending ? 0.4 : 1 }}
                  >
                    <StepIcon $active={isActive} $completed={isCompleted}>
                      {isCompleted ? <FaCheck /> : step.icon}
                    </StepIcon>
                    
                    <StepText>
                      <h4>{step.title}</h4>
                      <p>{step.desc}</p>
                    </StepText>
                    
                    {isActive && (
                      <ActivePing 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }} 
                        transition={{ repeat: Infinity, duration: 1.5 }} 
                      />
                    )}
                  </StepCard>
                );
              })}
            </StepList>

            <ProgressBarContainer>
              <ProgressFill 
                initial={{ width: "0%" }} 
                animate={{ width: "100%" }} 
                transition={{ duration: 30, ease: "linear" }} 
              />
            </ProgressBarContainer>

          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// UNIQUE STYLED COMPONENTS
// ==========================================
const Overlay = styled(motion.div)`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
  padding: 1rem;
`;

const ModalBox = styled(motion.div)`
  background: white; padding: 2.5rem 2rem; border-radius: 24px;
  max-width: 480px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.3);
`;

const Header = styled.div`
  text-align: center; margin-bottom: 2rem;
  h2 { color: #111; font-size: 1.6rem; margin: 0 0 0.5rem 0; font-weight: 800; }
  p { color: #666; font-size: 0.95rem; line-height: 1.5; margin: 0; padding: 0 1rem; }
`;

const StepList = styled.div`
  display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 2rem;
`;

const StepCard = styled(motion.div)`
  display: flex; align-items: center; gap: 1.2rem; padding: 1.2rem;
  border-radius: 16px;
  background: ${props => props.$active ? '#f1f8e9' : '#ffffff'};
  border: 1.5px solid ${props => props.$active ? '#81c784' : props.$completed ? '#e0e0e0' : 'transparent'};
  box-shadow: ${props => props.$completed ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'};
  transition: all 0.3s ease;
`;

const StepIcon = styled.div`
  width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
  background: ${props => props.$active ? '#4caf50' : props.$completed ? '#e8f5e9' : '#f5f5f5'};
  color: ${props => props.$active ? 'white' : props.$completed ? '#2e7d32' : '#bdbdbd'};
  transition: all 0.3s ease; flex-shrink: 0;
`;

const StepText = styled.div`
  text-align: left; flex: 1;
  h4 { margin: 0 0 0.2rem 0; color: #333; font-size: 1rem; font-weight: 700; }
  p { margin: 0; color: #757575; font-size: 0.85rem; line-height: 1.4; }
`;

const ActivePing = styled(motion.div)`
  width: 12px; height: 12px; border-radius: 50%;
  background: #4caf50; box-shadow: 0 0 10px #4caf50;
  margin-left: 0.5rem; flex-shrink: 0;
`;

const ProgressBarContainer = styled.div`
  width: 100%; height: 6px; background: #e0e0e0; border-radius: 10px; overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%; background: linear-gradient(90deg, #81c784, #2e7d32); border-radius: 10px;
`;

export default ServerWakeup;