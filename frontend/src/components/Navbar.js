import { Link, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { 
  FaHome, FaShoppingCart, FaUser, 
  FaSignInAlt, FaStore, FaClipboardList, 
  FaUserShield, FaSignOutAlt, FaHeart,
  FaEdit, FaMapMarkerAlt, FaPhone, FaEnvelope,
  FaChevronDown, FaSpinner, FaLock
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import {toast, Toaster} from "react-hot-toast";

const Navbar = () => {
  const { user, logoutUser, axiosInstance } = useContext(AuthContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      address: user?.address || '',
      phone: user?.phone || '',
      current_password: '',
      new_password: ''
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user && isDropdownOpen) {
      fetchUserDetails();
    }
  }, [isDropdownOpen, user]);

  useEffect(() => {
  if (user) {
    setIsDropdownOpen(false);
    setIsEditing(false);
  }
}, [user]);

  const fetchUserDetails = async () => {
    try {
      const response = await axiosInstance.get(`/api/users/${user.id}/`);
      setUserDetails(response.data);
      reset({
        username: response.data.username,
        email: response.data.email,
        address: response.data.address || '',
        phone: response.data.phone || '',
        current_password: '',
        new_password: ''
      });
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      setUserDetails(user);
    }
  };

  const toggleDropdown = () => {
  console.log("toggleDropdown called");

  setIsDropdownOpen(!isDropdownOpen);

  if (!isDropdownOpen && !isEditing) {
    reset({
      username: user?.username || '',
      email: user?.email || '',
      address: user?.address || '',
      phone: user?.phone || '',
      current_password: '',
      new_password: ''
    });
  }
};

  const handleUpdateProfile = async (data) => {
    setIsLoading(true);
    try {
      await axiosInstance.patch(`/api/users/${user.id}/`, data);
      toast.success('👤 Profile updated successfully!', {
        position: "bottom-right",
        duration: 2000,
      });
      setIsEditing(false);
      await fetchUserDetails();
    } catch (error) {
      const err = error.response?.data || 'Update failed';
      toast.error(
        typeof err === 'object' ? Object.values(err).flat().join(' ') : err,
        { position: "bottom-right", duration: 2000 }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
  toast.success("🔒 Logged out successfully!", {
    position: "bottom-right",
    duration: 2000,
  });

  setTimeout(() => {
    logoutUser();
    navigate("/")
  }, 1000);
};

  return (
    <>
      <Toaster
  position="bottom-right"
  toastOptions={{
    duration: 2000,
  }}
/>
      <NavContainer 
        $isScrolled={isScrolled}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <NavContent>
          <LeftLinks>
            <CustomLink to="/" label="Home" icon={<FaHome />} />
            <CustomLink to="/products" label="Products" icon={<FaStore />} />
            <CustomLink to="/cart" label="Cart" icon={<FaShoppingCart />} />
            <CustomLink to="/dashboard" label="Dashboard" icon={<FaClipboardList />} />
            {user?.role === 'admin' && (
              <CustomLink to="/admin" label="Admin" icon={<FaUserShield />} />
            )}
          </LeftLinks>

          <RightLinks>
            {user ? (
              <>
                <CustomLink to="/wishlist" label="Wishlist" icon={<FaHeart />} />
                <UserDropdownContainer>
                  <UserButton onClick={toggleDropdown}>
                    <FaUser /> {user.username} <FaChevronDown size={12} />
                  </UserButton>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <DropdownMenu
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isEditing ? (
                          <EditForm onSubmit={handleSubmit(handleUpdateProfile)}>
                            <FormGroup>
                              <label>Username</label>
                              <Input type="text" {...register("username", { required: true })} />
                            </FormGroup>
                            <FormGroup>
                              <label>Email</label>
                              <Input type="email" {...register("email", { required: true })} />
                            </FormGroup>
                            <FormGroup>
                              <label>Address {userDetails?.address && `(Current: ${userDetails.address})`}</label>
                              <TextArea rows="2" {...register("address")} />
                            </FormGroup>
                            <FormGroup>
                              <label>Phone {userDetails?.phone && `(Current: ${userDetails.phone})`}</label>
                              <Input type="tel" {...register("phone")} />
                            </FormGroup>
                            <FormGroup>
                              <label><FaLock /> Current Password</label>
                              <Input type="password" {...register("current_password")} />
                            </FormGroup>
                            <FormGroup>
                              <label><FaLock /> New Password</label>
                              <Input type="password" {...register("new_password")} />
                            </FormGroup>
                            <ButtonGroup>
                              <SaveButton type="submit" disabled={isLoading}>
                                {isLoading ? <FaSpinner className="spin" /> : 'Save'}
                              </SaveButton>
                              <CancelButton type="button" onClick={() => setIsEditing(false)}>
                                Cancel
                              </CancelButton>
                            </ButtonGroup>
                          </EditForm>
                        ) : (
                          <>
                            <UserInfo>
                              <InfoItem><FaUser /> {userDetails?.username || user.username}</InfoItem>
                              <InfoItem><FaEnvelope /> {userDetails?.email || user.email}</InfoItem>
                              {(userDetails?.address || user.address) && (
                                <InfoItem><FaMapMarkerAlt /> {userDetails?.address || user.address}</InfoItem>
                              )}
                              {(userDetails?.phone || user.phone) && (
                                <InfoItem><FaPhone /> {userDetails?.phone || user.phone}</InfoItem>
                              )}
                            </UserInfo>
                            <DropdownButton onClick={() => setIsEditing(true)}>
                              <FaEdit /> Edit Profile
                            </DropdownButton>
                          </>
                        )}
                        <DropdownDivider />
                        <LogoutButton onClick={handleLogout}>
                          <FaSignOutAlt /> Logout
                        </LogoutButton>
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </UserDropdownContainer>
              </>
            ) : (
              <CustomLink to="/login" label="Login" icon={<FaSignInAlt />} />
            )}
          </RightLinks>
        </NavContent>
      </NavContainer>
    </>
  );
};
// Styled Components
const NavContainer = styled(motion.nav)`
  background: ${props => props.$isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.92)'};
  backdrop-filter: blur(12px);
  padding: ${props => props.$isScrolled ? '0.5rem 1rem' : '0.75rem 1.5rem'};
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
  box-shadow: ${props => props.$isScrolled 
    ? '0 4px 20px rgba(46, 125, 50, 0.15)' 
    : '0 4px 12px rgba(46, 125, 50, 0.1)'};
  border-bottom: 1px solid #e8f5e9;
  transition: all 0.3s ease;
`;

const NavContent = styled.div`
  display: flex;
  width: 100%;
  max-width: 1200px;
  align-items: center;
`;

const LeftLinks = styled.div`
  display: flex;
  gap: 1rem;
`;

const RightLinks = styled.div`
  margin-left: auto;
  display: flex;
  gap: 1rem;
  align-items: center;
  position: relative;
`;

const CustomLink = ({ to, label, icon, ...animationProps }) => (
  <NavLink 
    to={to} 
    component={motion(Link)}
    {...animationProps}
    whileHover={{ scale: 1.05, backgroundColor: '#f0fff0' }}
    whileTap={{ scale: 0.95 }}
  >
    {icon} {label}
  </NavLink>
);

const NavLink = styled(motion(Link))`
  color: #2e7d32;
  background: white;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
  border: 1px solid #e8f5e9;

  &:hover {
    color: #1b5e20;
  }
`;

const UserDropdownContainer = styled.div`
  position: relative;
`;

const UserButton = styled(motion.button)`
  color: #1b5e20;
  background: #e8f5e9;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #c8e6c9;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);

  &:hover {
    background: #c8e6c9;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 300px;
  padding: 1rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.5rem 0;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: #424242;
  font-size: 0.95rem;

  svg {
    color: #2e7d32;
    min-width: 16px;
  }
`;

const DropdownButton = styled(motion.button)`
  background: #f5f5f5;
  border: none;
  padding: 0.8rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  color: #424242;
  margin-top: 0.5rem;

  &:hover {
    background: #e0e0e0;
  }

  svg {
    color: #2e7d32;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: #e0e0e0;
  margin: 0.5rem 0;
`;

const LogoutButton = styled(motion.button)`
  color: white;
  background: #2e7d32;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.8rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    background: #1b5e20;
  }
`;

const EditForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  label {
    font-size: 0.9rem;
    color: #616161;
  }
`;

const Input = styled.input`
  padding: 0.6rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: #4CAF50;
  }
`;

const TextArea = styled.textarea`
  padding: 0.6rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #4CAF50;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const SaveButton = styled.button`
  flex: 1;
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: #388e3c;
  }

  &:disabled {
    background: #a5d6a7;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CancelButton = styled.button`
  flex: 1;
  background: #f5f5f5;
  color: #616161;
  border: none;
  padding: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: #e0e0e0;
  }
`;

export default Navbar;