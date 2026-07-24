import { useContext, useState } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link , useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// eslint-disable-next-line
import {toast, Toaster} from "react-hot-toast";
import styled from 'styled-components';
import GreenSpinner from '../components/GreenSpinner';
import FullScreenSpinner from '../components/FullScreenSpinner';

const Login = () => {
  const { loginUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true); // 🚀 Screen locks instantly

    if (!email || !password) {
      setIsLoading(false);
      setTimeout(() => toast.error("❌ Please fill in all fields", { id: 'empty-fields' }), 250);
      return;
    }

    try {
      const success = await loginUser(email, password);

      if (success === true) {
        // Wait 1.5 seconds to show off the secure animation
        setTimeout(() => {
          // 🚀 1. Fire the toast
          toast.success('✅ Login successful!', { duration: 2000, id: 'login-success' });
          
          // 🚀 2. Navigate immediately! 
          // Notice we DO NOT set isLoading to false here. 
          // Changing the route destroys the login page and the spinner simultaneously, 
          // completely eliminating that awkward flash!
          navigate(from);
        }, 1500); 

      } else if (typeof success === 'object') {
        const messages = Object.values(success).flat().join(' ');
        setErrorMsg(messages);
        setIsLoading(false);
        setTimeout(() => toast.error(messages || '❌ Login failed', { id: 'login-error' }), 250);
      } else {
        setErrorMsg('Invalid credentials');
        setIsLoading(false);
        setTimeout(() => toast.error('❌ Invalid credentials', { id: 'invalid-creds' }), 250);
      }
    } catch (err) {
      setErrorMsg('Unexpected error occurred');
      setIsLoading(false);
      setTimeout(() => toast.error('❌ An unexpected error occurred', { id: 'unexpected-error' }), 250);
    }
  };

  return (
    <>
      {/* 🚀 Placed at the absolute root to guarantee it covers the whole screen */}
      <AnimatePresence>
        {isLoading && <FullScreenSpinner message="Signing you into EazyShop..." />}
      </AnimatePresence>

      <LoginContainer>
        <LoginCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Title>Welcome Back</Title>
          <form onSubmit={handleSubmit}>
            <InputField
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              whileFocus={{ scale: 1.02 }}
            />
            <InputField
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              whileFocus={{ scale: 1.02 }}
            />
            <SubmitButton
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? <GreenSpinner /> : 'Login'}
            </SubmitButton>
          </form>

          {errorMsg && (
            <ErrorText
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errorMsg}
            </ErrorText>
          )}

          <RegisterLink>
            Don't have an account? <Link to="/register" state={{ from }}>Register now</Link>
          </RegisterLink>
        </LoginCard>
      </LoginContainer>
    </>
  );
};

// Styled Components
const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
`;

const LoginCard = styled(motion.div)`
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 28px;
`;

const InputField = styled(motion.input)`
  width: 100%;
  padding: 15px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
`;

const SubmitButton = styled(motion.button)`
  width: 100%;
  padding: 15px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #45a049;
  }

  &:disabled {
    background: #a5d6a7;
    cursor: not-allowed;
  }
`;

const RegisterLink = styled.div`
  margin-top: 20px;
  color: #666;
  font-size: 14px;

  a {
    color: #4CAF50;
    text-decoration: none;
    font-weight: 600;
    margin-left: 5px;

    &:hover {
      color: #3d8b40;
      text-decoration: underline;
    }
  }
`;

const ErrorText = styled(motion.p)`
  color: #e74c3c;
  margin-top: 15px;
`;

export default Login;