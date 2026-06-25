import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {toast, Toaster} from "react-hot-toast";

import styled from 'styled-components';
const API_URL = process.env.REACT_APP_API_URL;
// Styled Components
const RegisterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
`;

const RegisterCard = styled(motion.div)`
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
  margin-bottom: 15px;
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
  margin-top: 10px;

  &:hover {
    background: #45a049;
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const LoginLink = styled.div`
  margin-top: 20px;
  color: #666;
  font-size: 14px;

  a {
    color: #4CAF50;
    text-decoration: none;
    font-weight: 600;
    margin-left: 5px;
    transition: color 0.3s ease;

    &:hover {
      color: #3d8b40;
      text-decoration: underline;
    }
  }
`;

const PasswordRules = styled(motion.div)`
  text-align: left;
  margin: 10px 0;
  font-size: 13px;
  color: #666;
  display: ${props => props.$show ? 'block' : 'none'};
`;

const PasswordRule = styled(motion.div)`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  color: ${props => props.$valid ? '#4CAF50' : '#666'};
`;

const RuleIcon = styled.span`
  margin-right: 8px;
  font-size: 16px;
`;

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    password2: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    notNumeric: false,
    notSimilar: false,
    matches: false
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordFocus = () => {
    setShowPasswordRules(true);
    setPasswordFocused(true);
  };

  const handlePasswordBlur = () => {
    setPasswordFocused(false);
    if (form.password === '' && form.password2 === '') {
      setShowPasswordRules(false);
    }
  };

  useEffect(() => {
    if (passwordFocused) {
      setPasswordValidation({
        length: form.password.length >= 8,
        notNumeric: !/^\d+$/.test(form.password),
        notSimilar: !form.password.toLowerCase().includes(form.username.toLowerCase()) && 
                   !form.password.toLowerCase().includes(form.email.split('@')[0].toLowerCase()),
        matches: form.password === form.password2 && form.password2 !== ''
      });
    }
  }, [form.password, form.password2, passwordFocused]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const passwordErrors = validatePassword();
    if (passwordErrors.length > 0) {
      passwordErrors.forEach(error => {
        toast.error(error, {
          position: "top-center",
          duration: 5000,
        });
      });
      setIsLoading(false);
      return;
    }

    if (form.password !== form.password2) {
      toast.error("❌ Passwords don't match", {
        position: "top-center",
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/register/`, form);
      if (res.status === 201) {
        toast.success('✅Registration successful! Redirecting to login...', {
          position: "top-center",
          duration: 2000,
        });
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      let errorMessage = 'Registration failed';
      if (err.response) {
        if (err.response.data.email) {
          errorMessage = err.response.data.email[0];
        } else if (err.response.data.username) {
          errorMessage = err.response.data.username[0];
        } else if (err.response.data.password) {
          errorMessage = err.response.data.password[0];
        }
      }
      toast.error(errorMessage, {
        position: "top-center",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = () => {
    const errors = [];
    
    if (form.password.length < 8) {
      errors.push('Your password must contain at least 8 characters.');
    }
    if (/^\d+$/.test(form.password)) {
      errors.push('Your password can\'t be entirely numeric.');
    }
    if (form.password.toLowerCase().includes(form.username.toLowerCase()) || 
        form.password.toLowerCase().includes(form.email.split('@')[0].toLowerCase())) {
      errors.push('Your password can\'t be too similar to your other personal information.');
    }
    
    return errors;
  };

  return (
    <RegisterContainer>
      <RegisterCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>Create Account</Title>
        <form onSubmit={handleSubmit}>
          <InputField
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
            whileFocus={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
          <InputField
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            whileFocus={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
          <InputField
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            onFocus={handlePasswordFocus}
            onBlur={handlePasswordBlur}
            required
            whileFocus={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
          
          <PasswordRules $show={showPasswordRules}>
            <PasswordRule $valid={passwordValidation.length}>
              <RuleIcon>{passwordValidation.length ? '✓' : '•'}</RuleIcon>
              At least 8 characters
            </PasswordRule>
            <PasswordRule $valid={passwordValidation.notNumeric}>
              <RuleIcon>{passwordValidation.notNumeric ? '✓' : '•'}</RuleIcon>
              Not entirely numeric
            </PasswordRule>
            <PasswordRule $valid={passwordValidation.notSimilar}>
              <RuleIcon>{passwordValidation.notSimilar ? '✓' : '•'}</RuleIcon>
              Not similar to personal info
            </PasswordRule>
          </PasswordRules>
          
          <InputField
            type="password"
            name="password2"
            placeholder="Confirm Password"
            value={form.password2}
            onChange={handleChange}
            onFocus={handlePasswordFocus}
            onBlur={handlePasswordBlur}
            required
            whileFocus={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
          
          <PasswordRule $valid={passwordValidation.matches} style={{ 
            display: showPasswordRules ? 'flex' : 'none',
            marginBottom: '15px'
          }}>
            <RuleIcon>{passwordValidation.matches ? '✓' : '•'}</RuleIcon>
            Passwords match
          </PasswordRule>

          <SubmitButton
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </SubmitButton>
        </form>
        
        <LoginLink>
          Already have an account? <Link to="/login">Login now</Link>
        </LoginLink>
      </RegisterCard>
      <Toaster />
    </RegisterContainer>
  );
};

export default Register;