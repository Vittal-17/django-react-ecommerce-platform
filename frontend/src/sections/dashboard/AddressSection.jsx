import { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaPlus, FaStar, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import AuthContext from '../../context/AuthContext';

const AddressModal = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
  const [label, setLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLabel(initialData?.label || 'Home');
      setFullAddress(initialData?.full_address || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
        <CloseBtn onClick={onClose}><FaTimes /></CloseBtn>
        <h3>{initialData ? 'Edit Address' : 'Add New Address'}</h3>
        <p>Enter your shipping destination details below.</p>
        
        <ModalContentWrapper>
          <FormGroup>
            <label>Address Label</label>
            <select value={label} onChange={e => setLabel(e.target.value)}>
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
          </FormGroup>

          <FormGroup>
            <label>Full Delivery Address</label>
            <textarea rows="4" placeholder="House/Apt Number, Street, City, ZIP Code..." value={fullAddress} onChange={e => setFullAddress(e.target.value)} />
          </FormGroup>

          <ButtonGroup>
            <ModalSecondaryButton onClick={onClose} disabled={isSubmitting}>Cancel</ModalSecondaryButton>
            <ModalPrimaryButton onClick={() => onSubmit({ label, full_address: fullAddress })} disabled={isSubmitting || !fullAddress.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Address'}
            </ModalPrimaryButton>
          </ButtonGroup>
        </ModalContentWrapper>
      </ModalCard>
    </Overlay>
  );
};

const AddressSection = ({ addresses, setAddresses }) => {
  const { axiosInstance } = useContext(AuthContext);
  const [addressModalData, setAddressModalData] = useState({ isOpen: false, initialData: null });
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  const openAddressModal = (address = null) => setAddressModalData({ isOpen: true, initialData: address });
  const closeAddressModal = () => setAddressModalData({ isOpen: false, initialData: null });

  const handleSaveAddress = async (data) => {
    setIsSubmittingAddress(true);
    try {
      if (addressModalData.initialData) {
        await axiosInstance.patch(`/api/addresses/${addressModalData.initialData.id}/`, data);
        toast.success('📍 Address updated successfully!');
      } else {
        await axiosInstance.post('/api/addresses/', data);
        toast.success('📍 Address added successfully!');
      }
      const res = await axiosInstance.get('/api/addresses/');
      setAddresses(res.data.results || res.data);
      closeAddressModal();
    } catch (err) { toast.error('❌ Failed to save address'); } 
    finally { setIsSubmittingAddress(false); }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await axiosInstance.patch(`/api/addresses/${id}/`, { is_default: true });
      toast.success('⭐ Default address updated!');
      const res = await axiosInstance.get('/api/addresses/');
      setAddresses(res.data.results || res.data);
    } catch (err) { toast.error('❌ Failed to update address'); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await axiosInstance.delete(`/api/addresses/${id}/`);
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success('🗑️ Address deleted');
    } catch (err) { toast.error('❌ Failed to delete address'); }
  };

  return (
    <>
      <AnimatePresence>
        {addressModalData.isOpen && (
          <AddressModal 
            isOpen={addressModalData.isOpen} 
            onClose={closeAddressModal} 
            onSubmit={handleSaveAddress} 
            initialData={addressModalData.initialData} 
            isSubmitting={isSubmittingAddress} 
          />
        )}
      </AnimatePresence>

      <ProfileCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaMapMarkerAlt color="#2e7d32" /> Address Book
          </h3>
          <AddButton onClick={() => openAddressModal()}><FaPlus /> Add New</AddButton>
        </div>
        
        <AddressList>
          {addresses.map(addr => (
            <AddressCard key={addr.id} $isDefault={addr.is_default}>
              <div className="info">
                <strong>{addr.label} {addr.is_default && <span className="badge">Default</span>}</strong>
                <p>{addr.full_address}</p>
              </div>
              <div className="actions">
                {!addr.is_default && <button className="star" onClick={() => handleSetDefaultAddress(addr.id)} title="Set as Default"><FaStar /></button>}
                <button className="edit" onClick={() => openAddressModal(addr)} title="Edit Address"><FaEdit /></button>
                <button className="delete" onClick={() => handleDeleteAddress(addr.id)} title="Delete Address"><FaTrash /></button>
              </div>
            </AddressCard>
          ))}
          {addresses.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No addresses saved yet.</p>}
        </AddressList>
      </ProfileCard>
    </>
  );
};

const ProfileCard = styled.div` background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; `;
const AddButton = styled.button` display: flex; align-items: center; gap: 0.5rem; background: #e8f5e9; color: #2e7d32; border: 1px solid #81c784; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; &:hover { background: #c8e6c9; } `;
const AddressList = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const AddressCard = styled.div` display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem; border: 2px solid ${props => props.$isDefault ? '#2e7d32' : '#f1f5f9'}; border-radius: 12px; background: ${props => props.$isDefault ? '#f1f8e9' : 'white'}; .info strong { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; } .info p { margin: 0.5rem 0 0 0; color: #64748b; font-size: 0.95rem; line-height: 1.4; white-space: pre-wrap; } .badge { background: #2e7d32; color: white; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 12px; text-transform: uppercase; } .actions { display: flex; gap: 0.2rem; } .actions button { background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; } .actions .star { color: #f59e0b; &:hover { background: #fef3c7; } } .actions .edit { color: #2e7d32; &:hover { background: #e8f5e9; } } .actions .delete { color: #ef4444; &:hover { background: #fee2e2; } } `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 0.5rem; text-align: left; width: 100%; box-sizing: border-box; label { font-weight: 600; color: #1e293b; font-size: 0.95rem; } select, textarea { width: 100%; padding: 0.9rem 1rem; border-radius: 10px; border: 2px solid #e2e8f0; font-size: 1rem; outline: none; font-family: inherit; box-sizing: border-box; transition: 0.2s; &:focus { border-color: #2e7d32; } } select { background: white; } `;
const ModalContentWrapper = styled.div` display: flex; flex-direction: column; gap: 1.2rem; width: 100%; margin-top: 1.5rem; box-sizing: border-box; `;
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); `;
const ModalCard = styled(motion.div)` position: relative; background: white; padding: 2.5rem; border-radius: 20px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); h3 { margin: 0 0 0.5rem 0; color: #0f172a; } p { color: #64748b; margin-bottom: 0; font-size: 0.95rem; }`;
const CloseBtn = styled.button` position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; &:hover { color: #0f172a; } `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; width: 100%; justify-content: center; box-sizing: border-box; `;
const ModalPrimaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #2e7d32; color: white; font-weight: bold; font-size: 1rem; box-sizing: border-box; &:hover:not(:disabled) { filter: brightness(1.1); } &:disabled { opacity: 0.6; cursor: not-allowed; } `;
const ModalSecondaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #f1f5f9; color: #475569; font-weight: bold; font-size: 1rem; box-sizing: border-box; &:hover { background: #e2e8f0; } `;

export default AddressSection;