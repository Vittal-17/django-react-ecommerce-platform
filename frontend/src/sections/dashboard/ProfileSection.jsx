// src/sections/dashboard/ProfileSection.jsx
import { useState, useContext, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserShield, FaLock, FaPhoneAlt, FaTimes, FaCamera, FaSpinner } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import AuthContext from '../../context/AuthContext';
import AddressSection from './AddressSection';
import ModalPortal from '../../components/ModalPortal';

const SecureProcessingOverlay = ({ isVisible, mode }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isVisible) {
      if (mode === 'requesting') {
        setText('Securing Connection...');
        setTimeout(() => setText('Generating One-Time Password...'), 800);
      } else if (mode === 'verifying') {
        setText('Validating Credentials & Saving...');
        setTimeout(() => setText('Applying Encryption...'), 1000);
      }
    }
  }, [isVisible, mode]);

  return (
    <AnimatePresence>
      {isVisible && (
        <ModalPortal>
        <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{ width: '60px', height: '60px', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#10B981', borderRadius: '50%', marginBottom: '1.5rem' }}
          />
          <motion.h3 key={text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#ffffff', fontWeight: '800', fontSize: '1.2rem' }}>
            {text}
          </motion.h3>
        </Overlay>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};

const ProfileSection = ({ addresses, setAddresses }) => {
  const { user, setUser, axiosInstance } = useContext(AuthContext); 
  const [localPhone, setLocalPhone] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axiosInstance.get(`/api/users/${user.id}/`);
        setLocalPhone(res.data.phone || '');
      } catch (err) {
        setLocalPhone(user?.phone || '');
      }
    };
    if (user?.id) fetchUserData();
  }, [axiosInstance, user]);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPassStep1Open, setIsPassStep1Open] = useState(false);
  const [isPassStep2Open, setIsPassStep2Open] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  
  const [overlayConfig, setOverlayConfig] = useState({ isVisible: false, mode: 'requesting' });
  const [resendTimer, setResendTimer] = useState(0);

  const [phoneInput, setPhoneInput] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [otpCode, setOtpCode] = useState('');
  const [activeUpdateType, setActiveUpdateType] = useState(null);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    } else clearInterval(interval);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, ''); 
    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return val;
    return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_picture', file);

    setIsUploadingAvatar(true);
    try {
      const response = await axiosInstance.patch(`/api/users/${user.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('✨ Profile picture updated successfully!');
      
      const updatedUser = { 
        ...user, 
        ...(response.data || {}), 
        id: user.id 
      };

      if (setUser) setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('❌ Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleVerifyCurrentPassword = async () => {
    if (!passwords.current) return toast.error('Please enter your current password.');
    
    setOverlayConfig({ isVisible: true, mode: 'requesting' });
    try {
      // 🚀 FIX: Wrap text payload in FormData to bypass Django's strict multipart parser
      const formData = new FormData();
      formData.append('current_password', passwords.current);

      await axiosInstance.post('/api/users/verify-password/', formData);
      
      setIsPassStep1Open(false);
      setIsPassStep2Open(true);
      toast.success('🔒 Password verified successfully!');
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.error || 'Incorrect current password.'}`);
    } finally {
      setOverlayConfig({ isVisible: false, mode: 'requesting' });
    }
  };

  const handleRequestOtp = async (type) => {
    if (type === 'password') {
      if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match!');
      if (passwords.new.length < 8) return toast.error('Password must be 8+ characters.');
      setIsPassStep2Open(false);
    } else {
      if (!phoneInput.trim()) return toast.error('Phone is required.');
      setIsContactModalOpen(false);
    }

    setActiveUpdateType(type);
    setOverlayConfig({ isVisible: true, mode: 'requesting' });

    try {
      // 🚀 FIX: Sending an empty FormData payload ensures Content-Type matches multipart requirements
      const emptyFormData = new FormData();
      const apiCall = axiosInstance.post('/api/users/request-otp/', emptyFormData);
      const minDelay = new Promise(res => setTimeout(res, 1500));
      await Promise.all([apiCall, minDelay]);

      toast.success('📧 Security code sent!');
      setResendTimer(60);
      setIsOtpModalOpen(true);
    } catch (err) {
      toast.error(err.response?.status === 429 ? `⏳ ${err.response.data.error}` : '❌ Failed to send OTP.');
    } finally {
      setOverlayConfig({ isVisible: false, mode: 'requesting' });
    }
  };

  const handleVerifyAndSave = async () => {
    if (otpCode.length !== 6) return toast.error('Enter a valid 6-digit code.');
    
    setIsOtpModalOpen(false);
    setOverlayConfig({ isVisible: true, mode: 'verifying' });

    try {
      // 🚀 FIX: Package all fields into FormData
      const formData = new FormData();
      formData.append('otp', otpCode);
      
      if (activeUpdateType === 'contact') {
        formData.append('phone', phoneInput);
      } else {
        formData.append('current_password', passwords.current);
        formData.append('password', passwords.new);
      }

      const apiCall = axiosInstance.patch(`/api/users/${user.id}/`, formData);
      const minDelay = new Promise(res => setTimeout(res, 2500));
      await Promise.all([apiCall, minDelay]);

      toast.success('✅ Profile updated successfully!');
      if (activeUpdateType === 'contact') setLocalPhone(phoneInput);

      setPasswords({ current: '', new: '', confirm: '' });
      setOtpCode('');
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.error || 'Invalid OTP or update failed.'}`);
      setIsOtpModalOpen(true);
    } finally {
      setOverlayConfig({ isVisible: false, mode: 'verifying' });
    }
  };

  return (
    <ProfileGrid>
      <SecureProcessingOverlay isVisible={overlayConfig.isVisible} mode={overlayConfig.mode} />

      {/* --- CONTACT MODAL --- */}
      <AnimatePresence>
        {isContactModalOpen && (
          <ModalPortal>
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}>
              <CloseBtn onClick={() => setIsContactModalOpen(false)}><FaTimes /></CloseBtn>
              <ModalIconWrapper><FaPhoneAlt size={22} color="#0B8457" /></ModalIconWrapper>
              <h3>Update Contact Info</h3>
              <p>Keep your phone number up to date for delivery alerts.</p>
              
              <ModalContentWrapper>
                <InputField 
                  type="tel" 
                  value={phoneInput} 
                  onChange={e => setPhoneInput(formatPhone(e.target.value))} 
                  placeholder="(XXX) XXX-XXXX" 
                  maxLength="14" 
                />
                <ModalPrimaryButton onClick={() => handleRequestOtp('contact')}>
                  Continue to Verification
                </ModalPrimaryButton>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* --- PASSWORD STEP 1 MODAL --- */}
      <AnimatePresence>
        {isPassStep1Open && (
          <ModalPortal>
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}>
              <CloseBtn onClick={() => setIsPassStep1Open(false)}><FaTimes /></CloseBtn>
              <ModalIconWrapper><FaLock size={22} color="#0B8457" /></ModalIconWrapper>
              <h3>Verify Current Password</h3>
              <p>Please enter your current password to continue.</p>

              <ModalContentWrapper>
                <InputField 
                  type="password" 
                  value={passwords.current} 
                  onChange={e => setPasswords({...passwords, current: e.target.value})} 
                  placeholder="Current Password" 
                />
                <ModalPrimaryButton onClick={handleVerifyCurrentPassword}>
                  Verify Password
                </ModalPrimaryButton>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* --- PASSWORD STEP 2 MODAL --- */}
      <AnimatePresence>
        {isPassStep2Open && (
          <ModalPortal>
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}>
              <CloseBtn onClick={() => setIsPassStep2Open(false)}><FaTimes /></CloseBtn>
              <ModalIconWrapper><FaUserShield size={22} color="#0B8457" /></ModalIconWrapper>
              <h3>Create New Password</h3>
              <p>Must be at least 8 characters long.</p>

              <ModalContentWrapper>
                <InputField 
                  type="password" 
                  value={passwords.new} 
                  onChange={e => setPasswords({...passwords, new: e.target.value})} 
                  placeholder="New Password" 
                />
                <InputField 
                  type="password" 
                  value={passwords.confirm} 
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                  placeholder="Confirm New Password" 
                />
                <ModalPrimaryButton onClick={() => handleRequestOtp('password')}>
                  Save & Request OTP
                </ModalPrimaryButton>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* --- OTP MODAL --- */}
      <AnimatePresence>
        {isOtpModalOpen && (
          <ModalPortal>
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}>
              <ModalIconWrapper><FaUserShield size={24} color="#0B8457" /></ModalIconWrapper>
              <h3>Security Verification</h3>
              <p>We sent a 6-digit code to <strong>{user?.email}</strong>.</p>

              <ModalContentWrapper>
                <OtpInput 
                  type="text" 
                  maxLength="6" 
                  placeholder="000000" 
                  value={otpCode} 
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                />
                
                <div style={{ fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                  <button onClick={() => handleRequestOtp(activeUpdateType)} disabled={resendTimer > 0} style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#94A3B8' : '#0B8457', fontWeight: '700', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer' }}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>

                <ButtonGroup style={{ width: '100%' }}>
                  <ModalSecondaryButton onClick={() => setIsOtpModalOpen(false)}>Cancel</ModalSecondaryButton>
                  <ModalPrimaryButton onClick={handleVerifyAndSave} disabled={otpCode.length !== 6}>Verify Now</ModalPrimaryButton>
                </ButtonGroup>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* --- MAIN PROFILE VIEW --- */}
      <ProfileCard>
        <ProfileHeader>
          <AvatarContainer htmlFor="avatar-upload">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Avatar" />
            ) : (
              <span>{user?.username?.charAt(0).toUpperCase()}</span>
            )}
            
            <HoverOverlay className={isUploadingAvatar ? 'uploading' : ''}>
              {isUploadingAvatar ? <SpinningIcon /> : <FaCamera size={24} />}
            </HoverOverlay>
            
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
              disabled={isUploadingAvatar}
            />
          </AvatarContainer>

          <div><h2>{user?.username}</h2><p>{user?.email}</p></div>
        </ProfileHeader>
        
        <h3 style={{ marginBottom: '1.5rem', color: '#0F172A', fontSize: '1.2rem', fontWeight: '800' }}>Account Security</h3>
        
        <SettingRow>
          <div className="info">
            <div className="icon-box"><FaPhoneAlt /></div>
            <div><strong>Phone Number</strong><p>{localPhone || 'No phone added'}</p></div>
          </div>
          <PremiumButton onClick={() => { setPhoneInput(localPhone); setIsContactModalOpen(true); }} whileTap={{ scale: 0.97 }}>Edit Info</PremiumButton>
        </SettingRow>

        <SettingRow>
          <div className="info">
            <div className="icon-box"><FaLock /></div>
            <div><strong>Account Password</strong><p>Last changed recently</p></div>
          </div>
          <PremiumButton $dark onClick={() => { setPasswords({ current: '', new: '', confirm: '' }); setIsPassStep1Open(true); }} whileTap={{ scale: 0.97 }}>Update Password</PremiumButton>
        </SettingRow>
      </ProfileCard>

      <AddressSection addresses={addresses} setAddresses={setAddresses} />
    </ProfileGrid>
  );
};

export default ProfileSection;

// ==========================================
// SAAS LEVEL STYLED COMPONENTS
// ==========================================

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinningIcon = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
  font-size: 24px;
`;

const ProfileGrid = styled.div` 
  display: grid; grid-template-columns: 1fr; gap: 2rem; 
  @media (min-width: 900px) { grid-template-columns: 1fr 1.2fr; } 
`;

const ProfileCard = styled.div` 
  background: #ffffff; border-radius: 24px; padding: 2.2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid rgba(11, 132, 87, 0.08); 
`;

const ProfileHeader = styled.div` 
  display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #F1F5F9; 
  h2 { margin: 0 0 0.2rem 0; color: #0F172A; font-weight: 800; font-size: 1.4rem; } 
  p { margin: 0; color: #64748B; font-size: 0.95rem; } 
`;

const HoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  &.uploading {
    opacity: 1;
    background: rgba(11, 132, 87, 0.7);
  }
`;

const AvatarContainer = styled.label` 
  position: relative;
  width: 75px; 
  height: 75px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, #0B8457 0%, #075E3E 100%); 
  color: white; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 2rem; 
  font-weight: 900; 
  box-shadow: 0 8px 20px rgba(11, 132, 87, 0.25);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover {
    transform: scale(1.05);
  }

  &:hover ${HoverOverlay}:not(.uploading) {
    opacity: 1;
  }
`;

const SettingRow = styled.div` 
  display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 0; border-bottom: 1px solid #F1F5F9; 
  &:last-child { border-bottom: none; } 
  .info { 
    display: flex; gap: 1rem; align-items: center; 
    .icon-box { width: 40px; height: 40px; border-radius: 12px; background: #ECFDF5; color: #0B8457; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    strong { color: #0F172A; display: block; font-size: 1.05rem; font-weight: 700; margin-bottom: 0.2rem; } 
    p { margin: 0; font-size: 0.9rem; color: #64748B; font-weight: 500; } 
  } 
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; gap: 1rem; button { width: 100%; } } 
`;

const PremiumButton = styled(motion.button)` 
  padding: 0.6rem 1.4rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border: ${props => props.$dark ? 'none' : '1px solid #E2E8F0'}; background: ${props => props.$dark ? 'linear-gradient(135deg, #0B8457 0%, #075E3E 100%)' : '#ffffff'}; color: ${props => props.$dark ? 'white' : '#334155'}; box-shadow: ${props => props.$dark ? '0 4px 12px rgba(11, 132, 87, 0.2)' : 'none'};
  &:hover { background: ${props => props.$dark ? '#086341' : '#F8FAFC'}; color: ${props => props.$dark ? 'white' : '#0F172A'}; } 
`;

const Overlay = styled(motion.div)` 
  position: fixed; 
  inset: 0; 
  background: rgba(15, 23, 42, 0.6); 
  backdrop-filter: blur(8px); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 1000; 
  padding: 1rem; 
  flex-direction: column; 
  box-sizing: border-box; 
`;

const ModalCard = styled(motion.div)` 
  position: relative; 
  background: #ffffff; 
  padding: 2.5rem; 
  border-radius: 24px; 
  width: 100%; 
  max-width: 440px; 
  text-align: center; 
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); 
  border: 1px solid rgba(11, 132, 87, 0.1);
  box-sizing: border-box; 
  
  h3 { margin: 0 0 0.5rem 0; color: #0F172A; font-size: 1.5rem; font-weight: 800; } 
  p { color: #64748B; margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5; }

  @media (max-width: 768px) {
    padding: 1.5rem 1.25rem;
    border-radius: 20px;
    
    h3 {
      font-size: 1.3rem;
    }
  }
`;

const ModalIconWrapper = styled.div`
  width: 55px; height: 55px; background: #ECFDF5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;
`;

const CloseBtn = styled.button` 
  position: absolute; top: 1.2rem; right: 1.2rem; background: none; border: none; font-size: 1.2rem; color: #94A3B8; cursor: pointer; transition: color 0.2s;
  &:hover { color: #0F172A; } 
`;

const ModalContentWrapper = styled.div` 
  display: flex; flex-direction: column; gap: 1rem; width: 100%; margin-top: 1rem; 
`;

const InputField = styled.input` 
  width: 100%; padding: 0.9rem 1.2rem; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 1rem; outline: none; box-sizing: border-box; font-family: inherit; background: #F8FAFC; color: #0F172A; transition: all 0.2s; 
  &:focus { border-color: #0B8457; background: #ffffff; box-shadow: 0 0 0 3px rgba(11, 132, 87, 0.1); } 
`;

const OtpInput = styled.input` 
  width: 100%; text-align: center; font-size: 2rem; letter-spacing: 0.5rem; font-weight: 800; padding: 0.9rem; border: 1px solid #E2E8F0; border-radius: 12px; box-sizing: border-box; outline: none; background: #F8FAFC; color: #0F172A;
  &:focus { border-color: #0B8457; background: #ffffff; box-shadow: 0 0 0 3px rgba(11, 132, 87, 0.1); } 
`;

const ButtonGroup = styled.div` display: flex; gap: 1rem; width: 100%; justify-content: center; `;

const ModalPrimaryButton = styled(motion.button)`
  width: 100%; padding: 0.9rem 0; border: none; border-radius: 12px; cursor: pointer; color: white; font-weight: 700; font-size: 1rem; transition: all 0.2s; box-sizing: border-box; background: linear-gradient(135deg, #0B8457 0%, #075E3E 100%); box-shadow: 0 4px 12px rgba(11, 132, 87, 0.25);
  &:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; } 
  &:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(11, 132, 87, 0.35); } 
`;

const ModalSecondaryButton = styled(motion.button)`
  flex: 1; padding: 0.9rem 0; border: 1px solid #E2E8F0; border-radius: 12px; cursor: pointer; background: #ffffff; color: #475569; font-weight: 700; font-size: 1rem; transition: all 0.2s; box-sizing: border-box; 
  &:hover { background: #F8FAFC; color: #0F172A; } 
`;