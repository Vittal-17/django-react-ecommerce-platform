import { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserShield, FaLock, FaPhoneAlt, FaTimes } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import AuthContext from '../../context/AuthContext';
import AddressSection from './AddressSection';

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
        <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 9999, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{ width: '60px', height: '60px', border: '4px solid #e2e8f0', borderTopColor: '#2e7d32', borderRadius: '50%', marginBottom: '1.5rem' }}
          />
          <motion.h3 key={text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#0f172a', fontWeight: 'bold' }}>
            {text}
          </motion.h3>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

const ProfileSection = ({ addresses, setAddresses }) => {
  const { user, axiosInstance } = useContext(AuthContext);
  
  const [localPhone, setLocalPhone] = useState('');

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

  const handleVerifyCurrentPassword = async () => {
    if (!passwords.current) return toast.error('Please enter your current password.');
    
    setOverlayConfig({ isVisible: true, mode: 'requesting' });
    try {
      await axiosInstance.post('/api/users/verify-password/', { current_password: passwords.current });
      
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
      const apiCall = axiosInstance.post('/api/users/request-otp/');
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
      let payload = { otp: otpCode };
      if (activeUpdateType === 'contact') {
        payload.phone = phoneInput;
      } else {
        payload.current_password = passwords.current;
        payload.password = passwords.new;
      }

      const apiCall = axiosInstance.patch(`/api/users/${user.id}/`, payload);
      const minDelay = new Promise(res => setTimeout(res, 2500));
      await Promise.all([apiCall, minDelay]);

      toast.success('✅ Profile updated successfully!');
      
      if (activeUpdateType === 'contact') {
        setLocalPhone(phoneInput);
      }

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
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <CloseBtn onClick={() => setIsContactModalOpen(false)}><FaTimes /></CloseBtn>
              <FaPhoneAlt size={32} color="#2e7d32" style={{ marginBottom: '1rem' }} />
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
                <ModalPrimaryButton onClick={() => handleRequestOtp('contact')} style={{ background: '#2e7d32' }}>
                  Continue to Verification
                </ModalPrimaryButton>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
        )}
      </AnimatePresence>

      {/* --- PASSWORD STEP 1 MODAL --- */}
      <AnimatePresence>
        {isPassStep1Open && (
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <CloseBtn onClick={() => setIsPassStep1Open(false)}><FaTimes /></CloseBtn>
              <FaLock size={32} color="#2e7d32" style={{ marginBottom: '1rem' }} />
              <h3>Verify Current Password</h3>
              <p>Please enter your current password to continue.</p>

              <ModalContentWrapper>
                <InputField 
                  type="password" 
                  value={passwords.current} 
                  onChange={e => setPasswords({...passwords, current: e.target.value})} 
                  placeholder="Current Password" 
                />
                <ModalPrimaryButton onClick={handleVerifyCurrentPassword} style={{ background: '#2e7d32' }}>
                  Verify Password
                </ModalPrimaryButton>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
        )}
      </AnimatePresence>

      {/* --- PASSWORD STEP 2 MODAL --- */}
      <AnimatePresence>
        {isPassStep2Open && (
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <CloseBtn onClick={() => setIsPassStep2Open(false)}><FaTimes /></CloseBtn>
              <FaUserShield size={32} color="#2e7d32" style={{ marginBottom: '1rem' }} />
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
                <ModalPrimaryButton onClick={() => handleRequestOtp('password')} style={{ background: '#2e7d32' }}>
                  Save & Request OTP
                </ModalPrimaryButton>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
        )}
      </AnimatePresence>

      {/* --- OTP MODAL --- */}
      <AnimatePresence>
        {isOtpModalOpen && (
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <FaUserShield size={42} color="#2e7d32" style={{ marginBottom: '1rem' }} />
              <h3>Security Verification</h3>
              <p>We sent a 6-digit code to <strong>{user.email}</strong>.</p>

              <ModalContentWrapper>
                <OtpInput 
                  type="text" 
                  maxLength="6" 
                  placeholder="000000" 
                  value={otpCode} 
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                />
                
                <div style={{ fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                  <button onClick={() => handleRequestOtp(activeUpdateType)} disabled={resendTimer > 0} style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#94a3b8' : '#2e7d32', fontWeight: 'bold', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer' }}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>

                <ButtonGroup style={{ width: '100%' }}>
                  <ModalSecondaryButton onClick={() => setIsOtpModalOpen(false)}>Cancel</ModalSecondaryButton>
                  <ModalPrimaryButton onClick={handleVerifyAndSave} disabled={otpCode.length !== 6} style={{ background: '#2e7d32' }}>Verify Now</ModalPrimaryButton>
                </ButtonGroup>
              </ModalContentWrapper>
            </ModalCard>
          </Overlay>
        )}
      </AnimatePresence>

      {/* --- MAIN PROFILE VIEW & ADDRESS SECTION CONTAINER --- */}
      <ProfileCard>
        <ProfileHeader>
          <Avatar>{user.username?.charAt(0).toUpperCase()}</Avatar>
          <div><h2>{user.username}</h2><p>{user.email}</p></div>
        </ProfileHeader>
        
        <h3 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Account Security</h3>
        
        <SettingRow>
          <div className="info">
            <FaPhoneAlt color="#64748b" />
            <div><strong>Phone Number</strong><p>{localPhone || 'No phone added'}</p></div>
          </div>
          <PremiumButton onClick={() => { setPhoneInput(localPhone); setIsContactModalOpen(true); }}>Edit Info</PremiumButton>
        </SettingRow>

        <SettingRow>
          <div className="info">
            <FaLock color="#64748b" />
            <div><strong>Account Password</strong><p>Last changed recently</p></div>
          </div>
          <PremiumButton $dark onClick={() => { setPasswords({ current: '', new: '', confirm: '' }); setIsPassStep1Open(true); }}>Update Password</PremiumButton>
        </SettingRow>
      </ProfileCard>

      <AddressSection addresses={addresses} setAddresses={setAddresses} />
    </ProfileGrid>
  );
};

const ProfileGrid = styled.div` display: grid; grid-template-columns: 1fr; gap: 2rem; @media (min-width: 800px) { grid-template-columns: 1fr 1.2fr; } `;
const ProfileCard = styled.div` background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; `;
const ProfileHeader = styled.div` display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; h2 { margin: 0; color: #0f172a; } p { margin: 0; color: #64748b; } `;
const Avatar = styled.div` width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; `;
const SettingRow = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 0; border-bottom: 1px solid #f1f5f9; &:last-child { border-bottom: none; } .info { display: flex; gap: 1rem; align-items: center; strong { color: #1e293b; display: block; } p { margin: 0; font-size: 0.9rem; color: #64748b; } } @media (max-width: 600px) { flex-direction: column; align-items: flex-start; gap: 1rem; button { width: 100%; } } `;
const PremiumButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; border: none; background: ${props => props.$dark ? '#2e7d32' : '#f1f5f9'}; color: ${props => props.$dark ? 'white' : '#334155'}; &:hover { background: ${props => props.$dark ? '#1b5e20' : '#e2e8f0'}; } `;
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); flex-direction: column; `;
const ModalCard = styled(motion.div)` position: relative; background: white; padding: 2.5rem; border-radius: 20px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); h3 { margin: 0 0 0.5rem 0; color: #0f172a; } p { color: #64748b; margin-bottom: 1.5rem; font-size: 0.95rem; }`;
const CloseBtn = styled.button` position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; &:hover { color: #0f172a; } `;

// 🚀 FIXED: Standardized wrapper to keep input boxes perfectly sized and centered
const ModalContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-top: 1rem;
`;

const InputField = styled.input` 
  width: 100%; 
  padding: 0.9rem 1rem; 
  border: 2px solid #e2e8f0; 
  border-radius: 10px; 
  font-size: 1rem; 
  outline: none; 
  box-sizing: border-box;
  font-family: inherit;
  transition: 0.2s; 
  &:focus { 
    border-color: #2e7d32; 
  } 
`;

const OtpInput = styled.input` 
  width: 100%; 
  text-align: center; 
  font-size: 2rem; 
  letter-spacing: 0.5rem; 
  font-weight: bold; 
  padding: 0.9rem; 
  border: 2px solid #e2e8f0; 
  border-radius: 12px; 
  box-sizing: border-box;
  outline: none; 
  &:focus { 
    border-color: #2e7d32; 
    box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.1); 
  } 
`;

const ButtonGroup = styled.div` display: flex; gap: 1rem; width: 100%; justify-content: center; `;
const ModalPrimaryButton = styled.button` width: 100%; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; color: white; font-weight: bold; font-size: 1rem; transition: 0.2s; box-sizing: border-box; &:disabled { opacity: 0.6; cursor: not-allowed; } &:hover:not(:disabled) { filter: brightness(1.1); } `;
const ModalSecondaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #f1f5f9; color: #475569; font-weight: bold; font-size: 1rem; transition: 0.2s; box-sizing: border-box; &:hover { background: #e2e8f0; } `;

export default ProfileSection;