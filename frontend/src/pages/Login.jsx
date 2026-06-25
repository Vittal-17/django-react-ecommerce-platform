import { useContext, useState } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {toast, Toaster} from "react-hot-toast";
import styled from 'styled-components';

const Login = () => {
  const { loginUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!email || !password) {
      toast.error("❌ Please fill in all fields", { 
        position: "top-center",
        duration: 3000,
        id: 'empty-fields'
      });
      setIsLoading(false);
      return;
    }

    try {
      const success = await loginUser(email, password);

      if (success === true) {
        toast.success('✅ Login successful! Redirecting...', {
          position: "bottom-right",
          duration: 2000,
          id: 'login-success',
        });

        setTimeout(() => {
  navigate("/");
}, 2000);


      } else if (typeof success === 'object') {
        const messages = Object.values(success).flat().join(' ');
        toast.error(messages || '❌ Login failed', {
          position: "bottom-right",
          duration: 3000,
          id: 'login-error'
        });
        setErrorMsg(messages);
      } else {
        toast.error('❌ Invalid credentials', {
          position: "top-center",
          duration: 3000,
          id: 'invalid-creds'
        });
        setErrorMsg('Invalid credentials');
      }
    } catch (err) {
      toast.error('❌ An unexpected error occurred', {
        position: "top-center",
        duration: 3000,
        id: 'unexpected-error'
      });
      setErrorMsg('Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <Toaster />
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
            whileFocus={{ scale: 1.02 }}
          />
          <InputField
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            whileFocus={{ scale: 1.02 }}
          />
          <SubmitButton
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
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
          Don't have an account? <Link to="/register">Register now</Link>
        </RegisterLink>
      </LoginCard>
    </LoginContainer>
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