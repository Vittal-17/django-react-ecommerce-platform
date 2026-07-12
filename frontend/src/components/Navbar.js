import { Link, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { 
  FaHome, FaShoppingCart, FaUser, 
  FaSignInAlt, FaStore, FaClipboardList, 
  FaUserShield, FaSignOutAlt, FaHeart,
  FaChevronDown, FaBars, FaTimes, FaEnvelope
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { toast } from "react-hot-toast";

const Navbar = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown if user changes (e.g., logs out)
  useEffect(() => {
    if (!user) {
      setIsDropdownOpen(false);
    }
  }, [user]);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    toast.success("👋 Logged out successfully!");
    closeMobileMenu();
    setTimeout(() => {
      logoutUser();
      navigate("/");
    }, 1000);
  };

  const NavLinksContent = ({ isMobile }) => (
    <>
      <CustomLink to="/" label="Home" icon={<FaHome />} onClick={isMobile ? closeMobileMenu : undefined} />
      <CustomLink to="/products" label="Products" icon={<FaStore />} onClick={isMobile ? closeMobileMenu : undefined} />
      <CustomLink to="/cart" label="Cart" icon={<FaShoppingCart />} onClick={isMobile ? closeMobileMenu : undefined} />
      <CustomLink to="/dashboard" label="Dashboard" icon={<FaClipboardList />} onClick={isMobile ? closeMobileMenu : undefined} />
      {user?.role === 'admin' && (
        <CustomLink to="/admin" label="Admin" icon={<FaUserShield />} onClick={isMobile ? closeMobileMenu : undefined} />
      )}
      
      {isMobile && user && (
        <CustomLink to="/wishlist" label="Wishlist" icon={<FaHeart />} onClick={closeMobileMenu} />
      )}
      {isMobile && !user && (
        <CustomLink to="/login" label="Login" icon={<FaSignInAlt />} onClick={closeMobileMenu} />
      )}
    </>
  );

  return (
    <NavContainer 
      $isScrolled={isScrolled}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <NavContent>
        <MobileToggleButton onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </MobileToggleButton>

        <DesktopLeftLinks>
          <NavLinksContent isMobile={false} />
        </DesktopLeftLinks>

        <RightLinks>
          {user ? (
            <>
              <DesktopWishlist>
                <CustomLink to="/wishlist" label="Wishlist" icon={<FaHeart />} />
              </DesktopWishlist>
              
              <UserDropdownContainer>
                <UserButton onClick={toggleDropdown}>
                  <FaUser /> <UsernameText>{user.username}</UsernameText> <FaChevronDown size={12} />
                </UserButton>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <DropdownMenu
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <UserInfo>
                        <InfoItem><FaUser /> {user.username}</InfoItem>
                        <InfoItem><FaEnvelope /> {user.email}</InfoItem>
                      </UserInfo>
                      
                      <DropdownButton onClick={() => { setIsDropdownOpen(false); navigate('/dashboard'); }}>
                        <FaUserShield /> Manage Profile
                      </DropdownButton>
                      
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
  box-sizing: border-box;
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
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  
  @media (max-width: 768px) { padding: 0.5rem 1rem; }
`;

const DesktopLeftLinks = styled.div`
  display: none;
  @media (min-width: 768px) { display: flex; gap: 1rem; }
`;

const DesktopWishlist = styled.div`
  display: none;
  @media (min-width: 768px) { display: block; }
`;

const MobileToggleButton = styled.button`
  display: flex; background: none; border: none; color: #2e7d32; cursor: pointer; padding: 0.5rem;
  @media (min-width: 768px) { display: none; }
`;

const MobileMenuContainer = styled(motion.div)`
  width: 100%; background: rgba(255, 255, 255, 0.98); border-top: 1px solid #e8f5e9; overflow: hidden;
  @media (min-width: 768px) { display: none; }
`;

const MobileLinksWrapper = styled.div` display: flex; flex-direction: column; padding: 1rem; gap: 0.5rem; `;
const RightLinks = styled.div` display: flex; gap: 1rem; align-items: center; position: relative; `;

const CustomLink = ({ to, label, icon, onClick, ...animationProps }) => (
  <NavLink 
    to={to} onClick={onClick} component={motion(Link)} {...animationProps}
    whileHover={{ scale: 1.05, backgroundColor: '#f0fff0' }} whileTap={{ scale: 0.95 }}
  >
    {icon} {label}
  </NavLink>
);

const NavLink = styled(motion(Link))`
  color: #2e7d32; background: white; text-decoration: none; font-size: 1rem; font-weight: 600; padding: 0.5rem 1.1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1); border: 1px solid #e8f5e9;
  &:hover { color: #1b5e20; }
`;

const UserDropdownContainer = styled.div` position: relative; `;

const UserButton = styled(motion.button)`
  color: #1b5e20; background: #e8f5e9; font-size: 1rem; font-weight: 600; padding: 0.5rem 1.1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; border: 1px solid #c8e6c9; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
  @media (max-width: 480px) { padding: 0.4rem 0.5rem; gap: 0.3rem; font-size: 0.9rem; }
  &:hover { background: #c8e6c9; }
`;

const UsernameText = styled.span`
  max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  @media (min-width: 480px) { max-width: 120px; }
  @media (min-width: 768px) { max-width: 200px; }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute; right: 0; top: calc(100% + 0.5rem); background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); width: 300px; padding: 1rem; z-index: 100; display: flex; flex-direction: column; gap: 0.5rem;
  @media (max-width: 480px) { right: 0; width: 250px; }
`;

const UserInfo = styled.div` display: flex; flex-direction: column; gap: 0.8rem; padding: 0.5rem 0; `;
const InfoItem = styled.div`
  display: flex; align-items: center; gap: 0.8rem; color: #424242; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  svg { color: #2e7d32; min-width: 16px; }
`;
const DropdownButton = styled(motion.button)` background: #f5f5f5; border: none; padding: 0.8rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; color: #424242; margin-top: 0.5rem; &:hover { background: #e0e0e0; } svg { color: #2e7d32; } `;
const DropdownDivider = styled.div` height: 1px; background: #e0e0e0; margin: 0.5rem 0; `;
const LogoutButton = styled(motion.button)` color: white; background: #2e7d32; border: none; font-size: 0.95rem; font-weight: 600; padding: 0.8rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: all 0.3s ease; margin-top: 0.5rem; &:hover { background: #1b5e20; } `;

export default Navbar;