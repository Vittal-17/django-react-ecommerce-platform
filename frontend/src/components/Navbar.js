import { Link, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { 
  FaHome, FaShoppingCart, FaUser, 
  FaSignInAlt, FaStore, FaClipboardList, 
  FaUserShield, FaSignOutAlt, FaHeart,
  FaEdit, FaMapMarkerAlt, FaPhone, FaEnvelope,
  FaChevronDown, FaSpinner, FaLock, FaBars, FaTimes
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { toast, Toaster } from "react-hot-toast";

const Navbar = () => {
  const { user, logoutUser, axiosInstance } = useContext(AuthContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // NEW: Track mobile menu state
  const [editMode, setEditMode] = useState('none');
  const [isLoading, setIsLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      address: user?.address || '',
      phone: user?.phone || '',
      current_password: '',
      new_password: ''
    }
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user && isDropdownOpen) fetchUserDetails();
  }, [isDropdownOpen, user]);

  useEffect(() => {
    if (user) {
      setIsDropdownOpen(false);
      setEditMode('none');
    }
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      const response = await axiosInstance.get(`/api/users/${user.id}/`);
      setUserDetails(response.data);
      reset({
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
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen && editMode === 'none') {
      reset({
        address: user?.address || '',
        phone: user?.phone || '',
        current_password: '',
        new_password: ''
      });
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleUpdateProfile = async (data) => {
    setIsLoading(true);
    try {
      await axiosInstance.patch(`/api/users/${user.id}/`, {
        address: data.address,
        phone: data.phone
      });
      toast.success('👤 Profile updated successfully!');
      setEditMode('none');
      await fetchUserDetails();
    } catch (error) {
      const err = error.response?.data || 'Update failed';
      toast.error(typeof err === 'object' ? Object.values(err).flat().join(' ') : err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (data) => {
    setIsLoading(true);
    try {
      await axiosInstance.put(`/api/users/change-password/`, {
        current_password: data.current_password,
        new_password: data.new_password
      });
      toast.success('🔒 Password updated successfully!');
      setEditMode('none');
      reset(prev => ({ ...prev, current_password: '', new_password: '' })); 
    } catch (error) {
      const err = error.response?.data || 'Password update failed';
      toast.error(typeof err === 'object' ? Object.values(err).flat().join(' ') : err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    toast.success("🔒 Logged out successfully!");
    closeMobileMenu();
    setTimeout(() => {
      logoutUser();
      navigate("/");
    }, 1000);
  };

  // Helper component to render the standard links so we don't repeat code
  const NavLinksContent = ({ isMobile }) => (
    <>
      <CustomLink to="/" label="Home" icon={<FaHome />} onClick={isMobile ? closeMobileMenu : undefined} />
      <CustomLink to="/products" label="Products" icon={<FaStore />} onClick={isMobile ? closeMobileMenu : undefined} />
      <CustomLink to="/cart" label="Cart" icon={<FaShoppingCart />} onClick={isMobile ? closeMobileMenu : undefined} />
      <CustomLink to="/dashboard" label="Dashboard" icon={<FaClipboardList />} onClick={isMobile ? closeMobileMenu : undefined} />
      {user?.role === 'admin' && (
        <CustomLink to="/admin" label="Admin" icon={<FaUserShield />} onClick={isMobile ? closeMobileMenu : undefined} />
      )}
      
      {/* On mobile, we place the RightLinks items inline with the rest */}
      {isMobile && user && (
        <CustomLink to="/wishlist" label="Wishlist" icon={<FaHeart />} onClick={closeMobileMenu} />
      )}
      {isMobile && !user && (
        <CustomLink to="/login" label="Login" icon={<FaSignInAlt />} onClick={closeMobileMenu} />
      )}
    </>
  );

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ duration: 2000 }} />
      
      {/* Changing NavContainer to a div instead of a nav, and using a CSS column layout
        allows the expanding mobile menu to stay structurally sound below the top bar 
      */}
      <NavContainer 
        $isScrolled={isScrolled}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <NavContent>
          {/* MOBILE TOGGLE (Visible only on small screens) */}
          <MobileToggleButton onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </MobileToggleButton>

          {/* DESKTOP LEFT LINKS (Hidden on small screens) */}
          <DesktopLeftLinks>
            <NavLinksContent isMobile={false} />
          </DesktopLeftLinks>

          {/* RIGHT SIDE USER PROFILE (Always visible) */}
          <RightLinks>
            {user ? (
              <>
                {/* Wishlist only shows on desktop right side, mobile has it in the menu */}
                <DesktopWishlist>
                  <CustomLink to="/wishlist" label="Wishlist" icon={<FaHeart />} />
                </DesktopWishlist>
                
                <UserDropdownContainer>
                  <UserButton onClick={toggleDropdown}>
                    <FaUser /> <UsernameText>{user.username}</UsernameText> <FaChevronDown size={12} />
                  </UserButton>
                  
                  {/* DROPDOWN REMAINS UNTOUCHED */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <DropdownMenu
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {editMode === 'profile' && (
                          <EditForm onSubmit={handleSubmit(handleUpdateProfile)}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Edit Details</h4>
                            <FormGroup>
                              <label>Address {userDetails?.address && `(Current: ${userDetails.address})`}</label>
                              <TextArea rows="2" {...register("address")} />
                            </FormGroup>
                            <FormGroup>
                              <label>Phone {userDetails?.phone && `(Current: ${userDetails.phone})`}</label>
                              <Input type="tel" {...register("phone")} />
                            </FormGroup>
                            <ButtonGroup>
                              <SaveButton type="submit" disabled={isLoading}>{isLoading ? <FaSpinner className="spin" /> : 'Save'}</SaveButton>
                              <CancelButton type="button" onClick={() => setEditMode('none')}>Cancel</CancelButton>
                            </ButtonGroup>
                          </EditForm>
                        )}
                        {editMode === 'password' && (
                          <EditForm onSubmit={handleSubmit(handleChangePassword)}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Change Password</h4>
                            <FormGroup>
                              <label><FaLock /> Current Password</label>
                              <Input type="password" {...register("current_password", { required: true })} />
                            </FormGroup>
                            <FormGroup>
                              <label><FaLock /> New Password</label>
                              <Input type="password" {...register("new_password", { required: true })} />
                            </FormGroup>
                            <ButtonGroup>
                              <SaveButton type="submit" disabled={isLoading}>{isLoading ? <FaSpinner className="spin" /> : 'Update'}</SaveButton>
                              <CancelButton type="button" onClick={() => setEditMode('none')}>Cancel</CancelButton>
                            </ButtonGroup>
                          </EditForm>
                        )}
                        {editMode === 'none' && (
                          <>
                            <UserInfo>
                              <InfoItem><FaUser /> {userDetails?.username || user.username}</InfoItem>
                              <InfoItem><FaEnvelope /> {userDetails?.email || user.email}</InfoItem>
                              {(userDetails?.address || user.address) && <InfoItem><FaMapMarkerAlt /> {userDetails?.address || user.address}</InfoItem>}
                              {(userDetails?.phone || user.phone) && <InfoItem><FaPhone /> {userDetails?.phone || user.phone}</InfoItem>}
                            </UserInfo>
                            <DropdownButton onClick={() => setEditMode('profile')}><FaEdit /> Edit Details</DropdownButton>
                            <DropdownButton onClick={() => setEditMode('password')}><FaLock /> Change Password</DropdownButton>
                          </>
                        )}
                        <DropdownDivider />
                        <LogoutButton onClick={handleLogout}><FaSignOutAlt /> Logout</LogoutButton>
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </UserDropdownContainer>
              </>
            ) : (
              <DesktopWishlist>
                <CustomLink to="/login" label="Login" icon={<FaSignInAlt />} />
              </DesktopWishlist>
            )}
          </RightLinks>
        </NavContent>

        {/* MOBILE MENU DROPDOWN (Visible only when toggled on small screens) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <MobileMenuContainer
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MobileLinksWrapper>
                <NavLinksContent isMobile={true} />
              </MobileLinksWrapper>
            </MobileMenuContainer>
          )}
        </AnimatePresence>
      </NavContainer>
    </>
  );
};

// ==========================================
// STYLED COMPONENTS
// ==========================================

const NavContainer = styled(motion.div)`
  background: ${props => props.$isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.92)'};
  backdrop-filter: blur(12px);
  position: fixed;
  top: 0;
  width: 100%;
  box-sizing: border-box; /* THE FIX: Keeps width strictly inside the screen */
  z-index: 1000;
  display: flex;
  flex-direction: column; 
  box-shadow: ${props => props.$isScrolled ? '0 4px 20px rgba(46, 125, 50, 0.15)' : '0 4px 12px rgba(46, 125, 50, 0.1)'};
  border-bottom: 1px solid #e8f5e9;
  transition: background 0.3s ease, box-shadow 0.3s ease;
`;

const NavContent = styled.div`
  display: flex;
  width: 100%;
  box-sizing: border-box; /* THE FIX: Stops right-side bleeding */
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
  }
`;

// --- DESKTOP STYLES ---
const DesktopLeftLinks = styled.div`
  display: none;
  @media (min-width: 768px) {
    display: flex;
    gap: 1rem;
  }
`;

const DesktopWishlist = styled.div`
  display: none;
  @media (min-width: 768px) {
    display: block;
  }
`;

// --- MOBILE STYLES ---
const MobileToggleButton = styled.button`
  display: flex;
  background: none;
  border: none;
  color: #2e7d32;
  cursor: pointer;
  padding: 0.5rem;
  
  @media (min-width: 768px) {
    display: none; /* Hide on desktop */
  }
`;

const MobileMenuContainer = styled(motion.div)`
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid #e8f5e9;
  overflow: hidden; /* Crucial for Framer Motion height animation */
  
  @media (min-width: 768px) {
    display: none; /* Failsafe to hide on desktop */
  }
`;

const MobileLinksWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.5rem;
`;

// --- UNIVERSAL STYLES ---
const RightLinks = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  position: relative;
`;

const CustomLink = ({ to, label, icon, onClick, ...animationProps }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
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

  /* MOBILE FIX: Tighter padding and gap */
  @media (max-width: 480px) {
    padding: 0.4rem 0.5rem;
    gap: 0.3rem;
    font-size: 0.9rem;
  }

  &:hover {
    background: #c8e6c9;
  }
`;

const UsernameText = styled.span`
  max-width: 80px; /* Forces truncation earlier on small phones */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (min-width: 480px) {
    max-width: 120px;
  }
  
  @media (min-width: 768px) {
    max-width: 200px;
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
  
  /* MOBILE FIX: Slimmer width to leave breathing room */
  @media (max-width: 480px) {
    right: 0; 
    width: 250px; 
  }
`;

const UserInfo = styled.div` display: flex; flex-direction: column; gap: 0.8rem; padding: 0.5rem 0; `;
const InfoItem = styled.div` display: flex; align-items: center; gap: 0.8rem; color: #424242; font-size: 0.95rem; svg { color: #2e7d32; min-width: 16px; } `;
const DropdownButton = styled(motion.button)` background: #f5f5f5; border: none; padding: 0.8rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; color: #424242; margin-top: 0.5rem; &:hover { background: #e0e0e0; } svg { color: #2e7d32; } `;
const DropdownDivider = styled.div` height: 1px; background: #e0e0e0; margin: 0.5rem 0; `;
const LogoutButton = styled(motion.button)` color: white; background: #2e7d32; border: none; font-size: 0.95rem; font-weight: 600; padding: 0.8rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: all 0.3s ease; margin-top: 0.5rem; &:hover { background: #1b5e20; } `;

const EditForm = styled.form` display: flex; flex-direction: column; gap: 1rem; `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 0.3rem; label { font-size: 0.9rem; color: #616161; } `;
const Input = styled.input` padding: 0.6rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.95rem; &:focus { outline: none; border-color: #4CAF50; } `;
const TextArea = styled.textarea` padding: 0.6rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.95rem; resize: vertical; &:focus { outline: none; border-color: #4CAF50; } `;
const ButtonGroup = styled.div` display: flex; gap: 0.5rem; margin-top: 0.5rem; `;
const SaveButton = styled.button` flex: 1; background: #4CAF50; color: white; border: none; padding: 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; &:hover { background: #388e3c; } &:disabled { background: #a5d6a7; cursor: not-allowed; } .spin { animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `;
const CancelButton = styled.button` flex: 1; background: #f5f5f5; color: #616161; border: none; padding: 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; &:hover { background: #e0e0e0; } `;

export default Navbar;