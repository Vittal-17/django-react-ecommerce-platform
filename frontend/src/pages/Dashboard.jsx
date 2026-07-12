import { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { 
  FaBoxOpen, FaBox, FaTruck, FaCheckCircle, FaTimesCircle, FaBan, FaStar, 
  FaEdit, FaTrash, FaUserShield, FaLock, FaMapMarkerAlt, FaPhoneAlt, FaPlus 
} from 'react-icons/fa';
import { toast } from "react-hot-toast";

// ==========================================
// SECURE PROCESSING OVERLAY
// ==========================================
const SecureProcessingOverlay = ({ isVisible }) => {
  const [text, setText] = useState('Securing Connection...');

  useEffect(() => {
    if (isVisible) {
      setText('Securing Connection...');
      const t1 = setTimeout(() => setText('Generating One-Time Password...'), 800);
      const t2 = setTimeout(() => setText('Dispatching Email...'), 1600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 9999, flexDirection: 'column', gap: '1.5rem', background: 'rgba(255, 255, 255, 0.95)' }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotateY: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', background: '#e8f5e9', borderRadius: '50%', boxShadow: '0 4px 15px rgba(46, 125, 50, 0.2)' }}
          >
            <FaLock size={40} color="#2e7d32" />
          </motion.div>
          <div style={{ height: '30px', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.h3 key={text} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} style={{ color: '#2e7d32', margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>
                {text}
              </motion.h3>
            </AnimatePresence>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// CANCEL ORDER MODAL 
// ==========================================
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <ModalCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
          <h3>Cancel Order</h3>
          <p>Are you sure you want to cancel this order? This will restore item inventory immediately.</p>
          <ButtonGroup>
            <ModalSecondaryButton onClick={onClose}>No, Keep it</ModalSecondaryButton>
            <ModalDangerButton onClick={onConfirm}>Yes, Cancel</ModalDangerButton>
          </ButtonGroup>
        </ModalCard>
      </Overlay>
    )}
  </AnimatePresence>
);

// ==========================================
// REVIEW MODAL 
// ==========================================
const ReviewModal = ({ isOpen, onClose, reviewData, onSubmit, isSubmitting }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen && reviewData) {
      setRating(reviewData.rating || 0);
      setComment(reviewData.comment || '');
    }
  }, [isOpen, reviewData]);

  if (!isOpen) return null;

  return (
    <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ModalCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '500px' }}>
        <h3>{reviewData.isEditing ? 'Edit Your Review' : 'Leave a Review'}</h3>
        <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>{reviewData.productName}</p>
        
        <Stars>
          {[...Array(5)].map((_, i) => {
            const starValue = i + 1;
            return (
              <label key={i}>
                <input type="radio" name="rating" value={starValue} onClick={() => setRating(starValue)} style={{ display: 'none' }} />
                <FaStar size={32} color={starValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'} onMouseEnter={() => setHover(starValue)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer', transition: 'color 200ms' }} />
              </label>
            );
          })}
        </Stars>

        <textarea 
          placeholder="Share your thoughts about this product..." 
          value={comment} 
          onChange={e => setComment(e.target.value)}
          style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '1rem', resize: 'none', fontFamily: 'inherit' }}
        />

        <ButtonGroup style={{ marginTop: '1.5rem' }}>
          <ModalSecondaryButton onClick={onClose} disabled={isSubmitting}>Cancel</ModalSecondaryButton>
          <ModalPrimaryButton onClick={() => onSubmit({ rating, comment, productId: reviewData.productId, reviewId: reviewData.reviewId })} disabled={isSubmitting || rating === 0 || !comment.trim()}>
            {isSubmitting ? 'Saving...' : 'Submit Review'}
          </ModalPrimaryButton>
        </ButtonGroup>
      </ModalCard>
    </Overlay>
  );
};

// ==========================================
// OTP VERIFICATION MODAL
// ==========================================
const OtpModal = ({ isOpen, onClose, onVerify, isVerifying, userEmail }) => {
  const [otp, setOtp] = useState('');
  if (!isOpen) return null;

  return (
    <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ModalCard initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}>
        <FaUserShield size={48} color="#2e7d32" style={{ marginBottom: '1rem' }} />
        <h3>Security Verification</h3>
        <p>To protect your account, we just sent a 6-digit code to <strong>{userEmail}</strong>.</p>
        
        <OtpInput 
          type="text" 
          maxLength="6" 
          placeholder="000000" 
          value={otp} 
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
        />

        <ButtonGroup style={{ marginTop: '1.5rem' }}>
          <ModalSecondaryButton onClick={onClose} disabled={isVerifying}>Cancel</ModalSecondaryButton>
          <ModalPrimaryButton onClick={() => onVerify(otp)} disabled={isVerifying || otp.length !== 6}>
            {isVerifying ? 'Verifying...' : 'Verify & Save'}
          </ModalPrimaryButton>
        </ButtonGroup>
      </ModalCard>
    </Overlay>
  );
};

// ==========================================
// NEW: ADDRESS BOOK MODAL
// ==========================================
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
      <ModalCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '450px' }}>
        <h3>{initialData ? 'Edit Address' : 'Add New Address'}</h3>
        
        <div style={{ textAlign: 'left', marginTop: '1.5rem' }}>
          <FormGroup>
            <label>Address Label</label>
            <select 
              value={label} 
              onChange={e => setLabel(e.target.value)} 
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', outline: 'none' }}
            >
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
          </FormGroup>

          <FormGroup>
            <label>Full Delivery Address</label>
            <textarea 
              rows="4" 
              placeholder="House/Apt Number, Street, City, ZIP Code..." 
              value={fullAddress} 
              onChange={e => setFullAddress(e.target.value)} 
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical', fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }} 
            />
          </FormGroup>
        </div>

        <ButtonGroup style={{ marginTop: '1.5rem' }}>
          <ModalSecondaryButton onClick={onClose} disabled={isSubmitting}>Cancel</ModalSecondaryButton>
          <ModalPrimaryButton onClick={() => onSubmit({ label, full_address: fullAddress })} disabled={isSubmitting || !fullAddress.trim()}>
            {isSubmitting ? 'Saving...' : 'Save Address'}
          </ModalPrimaryButton>
        </ButtonGroup>
      </ModalCard>
    </Overlay>
  );
};


// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
const Dashboard = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('orders'); 

  // Data States
  const [orders, setOrders] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [addresses, setAddresses] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Profile & Address States
  const [profileForm, setProfileForm] = useState({ phone: '', newPassword: '' });
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  
  // Address Modal State
  const [addressModalData, setAddressModalData] = useState({ isOpen: false, initialData: null });
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // General Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [reviewModalData, setReviewModalData] = useState({ isOpen: false });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const [ordersRes, reviewsRes, profileRes, addressRes] = await Promise.all([
          axiosInstance.get('/api/orders/'),
          axiosInstance.get('/api/reviews/'),
          axiosInstance.get(`/api/users/${user.id}/`),
          axiosInstance.get('/api/addresses/') 
        ]);

        setOrders(ordersRes.data.filter(order => order.user === user.id));
        setUserReviews(reviewsRes.data.filter(r => r.username === user.username));
        setAddresses(addressRes.data);
        setProfileForm({ phone: profileRes.data.phone || '', newPassword: '' });

      } catch (error) { toast.error('❌ Failed to load dashboard data'); } 
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [axiosInstance, user]);

  // --- Address Book Logic ---
  const openAddressModal = (address = null) => {
    setAddressModalData({ isOpen: true, initialData: address });
  };

  const closeAddressModal = () => {
    setAddressModalData({ isOpen: false, initialData: null });
  };

  const handleSaveAddress = async (data) => {
    setIsSubmittingAddress(true);
    try {
      if (addressModalData.initialData) {
        // Edit existing address
        await axiosInstance.patch(`/api/addresses/${addressModalData.initialData.id}/`, data);
        toast.success('📍 Address updated successfully!');
      } else {
        // Add new address
        await axiosInstance.post('/api/addresses/', data);
        toast.success('📍 Address added successfully!');
      }
      const res = await axiosInstance.get('/api/addresses/');
      setAddresses(res.data);
      closeAddressModal();
    } catch (err) { 
      toast.error('❌ Failed to save address'); 
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await axiosInstance.patch(`/api/addresses/${id}/`, { is_default: true });
      toast.success('⭐ Default address updated!');
      const res = await axiosInstance.get('/api/addresses/');
      setAddresses(res.data);
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

  // --- Order & Review Logic ---
  const fetchOrderItems = async (orderId) => {
    if (orderItems[orderId]) return;
    setLoadingItems(true);
    try {
      const res = await axiosInstance.get(`/api/order-items/?order=${orderId}`);
      const itemsWithImages = await Promise.all(res.data.map(async (item) => {
        try {
          const productRes = await axiosInstance.get(`/api/products/${item.product}/`);
          return { ...item, image_url: productRes.data.image_url, name: productRes.data.name };
        } catch (err) { return { ...item, image_url: null }; }
      }));
      setOrderItems(prev => ({ ...prev, [orderId]: itemsWithImages }));
    } catch (error) { toast.error('❌ Failed to load order items'); } 
    finally { setLoadingItems(false); }
  };

  const executeCancelOrder = async () => {
    const orderId = orderToCancel;
    setIsCancelModalOpen(false);
    setCancellingId(orderId);
    try {
      await axiosInstance.post(`/api/orders/${orderId}/cancel/`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success(`🛑 Order cancelled successfully!`);
    } catch (error) { toast.error(`❌ Failed to cancel order.`); } 
    finally { setCancellingId(null); setOrderToCancel(null); }
  };

  const openReviewModal = (productInfo, existingReview = null) => {
    setReviewModalData({
      isOpen: true, productId: productInfo.product, productName: productInfo.name || productInfo.product_name,
      isEditing: !!existingReview, reviewId: existingReview?.id, rating: existingReview?.rating || 0, comment: existingReview?.comment || ''
    });
  };

  const handleReviewSubmit = async (data) => {
    setIsSubmittingReview(true);
    try {
      if (reviewModalData.isEditing) {
        await axiosInstance.put(`/api/reviews/${data.reviewId}/`, { product: data.productId, rating: data.rating, comment: data.comment });
        toast.success('✅ Review updated successfully!');
      } else {
        await axiosInstance.post('/api/reviews/', { product: data.productId, rating: data.rating, comment: data.comment });
        toast.success('⭐ Review submitted successfully!');
      }
      const reviewsRes = await axiosInstance.get('/api/reviews/');
      setUserReviews(reviewsRes.data.filter(r => r.username === user.username));
      setReviewModalData({ isOpen: false });
    } catch (err) { toast.error('❌ Failed to save review.'); } 
    finally { setIsSubmittingReview(false); }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axiosInstance.delete(`/api/reviews/${reviewId}/`);
      toast.success('🗑️ Review deleted');
      setUserReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch { toast.error('❌ Failed to delete review'); }
  };

  // --- Profile & OTP Logic ---
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, ''); 
    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return value;
    return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
  };

  const handleProfileUpdateInitiate = async () => {
    if (!profileForm.phone.trim()) return toast.error('⚠️ Phone is required.');
    setIsRequestingOtp(true);
    try {
      await axiosInstance.post('/api/users/request-otp/');
      toast.success('📧 Verification code sent!');
      setIsOtpModalOpen(true);
    } catch (err) { toast.error('❌ Failed to send OTP.'); } 
    finally { setIsRequestingOtp(false); }
  };

  const verifyAndSaveProfile = async (otpCode) => {
    try {
      const payload = { phone: profileForm.phone, otp: otpCode };
      if (profileForm.newPassword) payload.password = profileForm.newPassword;

      await axiosInstance.patch(`/api/users/${user.id}/`, payload);
      toast.success('✅ Security Profile updated!');
      setIsOtpModalOpen(false);
      setProfileForm(prev => ({ ...prev, newPassword: '' }));
    } catch (err) { toast.error('❌ Invalid OTP or update failed.'); }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaBoxOpen style={{ color: '#FFA000' }} />;
      case 'shipped': return <FaTruck style={{ color: '#1976D2' }} />;
      case 'delivered': return <FaCheckCircle style={{ color: '#388E3C' }} />;
      case 'cancelled': return <FaTimesCircle style={{ color: '#D32F2F' }} />;
      default: return <FaBox style={{ color: '#616161' }} />;
    }
  };

  return (
    <DashboardContainer>
      
      {/* Modals */}
      <ConfirmationModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} onConfirm={executeCancelOrder} />
      <OtpModal isOpen={isOtpModalOpen} onClose={() => setIsOtpModalOpen(false)} onVerify={verifyAndSaveProfile} userEmail={user.email || "your registered email"} />
      <SecureProcessingOverlay isVisible={isRequestingOtp} />
      
      <AnimatePresence>
        {reviewModalData.isOpen && (
          <ReviewModal isOpen={reviewModalData.isOpen} onClose={() => setReviewModalData({ isOpen: false })} reviewData={reviewModalData} onSubmit={handleReviewSubmit} isSubmitting={isSubmittingReview} />
        )}
      </AnimatePresence>

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
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        My Dashboard
      </motion.h1>

      <TabBar>
        <Tab $active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}><FaBoxOpen /> Orders</Tab>
        <Tab $active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}><FaStar /> Reviews</Tab>
        <Tab $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}><FaUserShield /> Profile Settings</Tab>
      </TabBar>

      {isLoading ? (
        <LoadingWrapper><Spinner /><LoadingText>Loading...</LoadingText></LoadingWrapper>
      ) : (
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            orders.length === 0 ? (
              <EmptyState><FaBoxOpen size={48} color="#9E9E9E" /><p>No orders yet</p></EmptyState>
            ) : (
              <OrdersList>
                {orders.map((order) => (
                  <OrderCard key={order.id}>
                    <OrderHeader>
                      <div><h3>Order #{order.id}</h3><OrderDate>{new Date(order.created_at).toLocaleDateString()}</OrderDate></div>
                      <StatusBadge status={order.status}>{getStatusIcon(order.status)} <span>{order.status}</span></StatusBadge>
                    </OrderHeader>
                    
                    {order.shipping_address && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
                        <strong><FaMapMarkerAlt /> Shipped To: </strong> {order.shipping_address}
                      </div>
                    )}
                    
                    <OrderTotal>Total: ${Number(order.total_price)?.toFixed(2)}</OrderTotal>
                    
                    <ActionGroup>
                      <button onClick={() => { if(expandedOrderId === order.id) setExpandedOrderId(null); else { setExpandedOrderId(order.id); fetchOrderItems(order.id); } }} style={viewItemsButtonStyle}>
                        {expandedOrderId === order.id ? 'Hide Items' : 'View Order Items'}
                      </button>
                      {order.status === 'pending' && (
                        <DashboardCancelButton disabled={cancellingId === order.id} onClick={() => { setOrderToCancel(order.id); setIsCancelModalOpen(true); }}>
                          <FaBan /> {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                        </DashboardCancelButton>
                      )}
                    </ActionGroup>

                    {expandedOrderId === order.id && (
                      <ItemsList>
                        {loadingItems ? <LoadingWrapper><Spinner size="small" /></LoadingWrapper> : orderItems[order.id]?.map(item => {
                          const existingReview = userReviews.find(r => r.product === item.product);
                          return (
                            <Item key={item.id}>
                              <ItemImage>{item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaBoxOpen size={30} color="#BDBDBD" />}</ItemImage>
                              <ItemDetails><h4>{item.name}</h4><div><span>Qty: {item.quantity}</span><span>${Number(item.price)?.toFixed(2)} each</span></div></ItemDetails>
                              {order.status === 'delivered' && (
                                 <ReviewTriggerButton $isEdit={!!existingReview} onClick={() => openReviewModal(item, existingReview)}>
                                   {existingReview ? <><FaEdit /> Edit Review</> : <><FaStar /> Leave Review</>}
                                 </ReviewTriggerButton>
                              )}
                            </Item>
                          )
                        })}
                      </ItemsList>
                    )}
                  </OrderCard>
                ))}
              </OrdersList>
            )
          )}

          {/* TAB 2: REVIEWS */}
          {activeTab === 'reviews' && (
            userReviews.length === 0 ? (
              <EmptyState><FaStar size={48} color="#9E9E9E" /><p>You haven't reviewed any products yet.</p></EmptyState>
            ) : (
              <OrdersList>
                {userReviews.map(review => (
                  <ReviewItemCard key={review.id}>
                    <ReviewContent>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{review.product_name || `Product ID: ${review.product}`}</h4>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem' }}>
                        {[...Array(5)].map((_, i) => <FaStar key={i} size={14} color={i < review.rating ? '#ffc107' : '#e4e5e9'} />)}
                      </div>
                      <p style={{ margin: 0, color: '#666', fontStyle: 'italic', fontSize: '0.95rem' }}>"{review.comment}"</p>
                    </ReviewContent>
                    <ReviewActions>
                      <ModalSecondaryButton onClick={() => openReviewModal({ product: review.product, product_name: review.product_name }, review)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}><FaEdit /> Edit</ModalSecondaryButton>
                      <ModalDangerButton onClick={() => deleteReview(review.id)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '5px' }}><FaTrash /> Delete</ModalDangerButton>
                    </ReviewActions>
                  </ReviewItemCard>
                ))}
              </OrdersList>
            )
          )}

          {/* TAB 3: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <ProfileGrid>
              
              {/* Left Column: Secure Info */}
              <ProfileCard>
                <ProfileHeader>
                  <Avatar>{user.username?.charAt(0).toUpperCase()}</Avatar>
                  <div><h2>{user.username}</h2><p>{user.email}</p></div>
                </ProfileHeader>

                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}><FaUserShield /> Security & Contact</h3>
                <p style={{ color: '#757575', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Changes here require email OTP verification.</p>
                
                <FormGroup>
                  <label><FaPhoneAlt /> Phone Number</label>
                  <InputField type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: formatPhoneNumber(e.target.value)})} placeholder="(XXX) XXX-XXXX" maxLength="14" />
                </FormGroup>

                <FormGroup>
                  <label><FaLock /> Update Password</label>
                  <InputField type="password" value={profileForm.newPassword} onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})} placeholder="Leave blank to keep current" />
                </FormGroup>

                <SaveProfileButton onClick={handleProfileUpdateInitiate} disabled={isRequestingOtp}>
                  {isRequestingOtp ? 'Requesting Code...' : 'Save Security Changes'}
                </SaveProfileButton>
              </ProfileCard>

              {/* Right Column: Address Book */}
              <ProfileCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}><FaMapMarkerAlt /> Address Book</h3>
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
                  {addresses.length === 0 && <p style={{ color: '#9e9e9e', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No addresses saved yet.</p>}
                </AddressList>
              </ProfileCard>

            </ProfileGrid>
          )}

        </motion.div>
      )}
    </DashboardContainer>
  );
};

// ==========================================
// STYLED COMPONENTS
// ==========================================
const DashboardContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 1000px; margin: 0 auto; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); @media (max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }`;
const TabBar = styled.div` display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 1rem; overflow-x: auto; scrollbar-width: none; `;
const Tab = styled.button` display: flex; align-items: center; gap: 0.5rem; background: ${props => props.$active ? '#2e7d32' : 'transparent'}; color: ${props => props.$active ? 'white' : '#616161'}; border: none; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s; white-space: nowrap; &:hover { background: ${props => props.$active ? '#1b5e20' : '#e0e0e0'}; }`;

// Profile Specific (Split Layout)
const ProfileGrid = styled.div` display: grid; grid-template-columns: 1fr; gap: 2rem; @media (min-width: 800px) { grid-template-columns: 1fr 1.2fr; } `;
const ProfileCard = styled.div` background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const ProfileHeader = styled.div` display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #eee; h2 { margin: 0; color: #111; } p { margin: 0; color: #757575; } `;
const Avatar = styled.div` width: 70px; height: 70px; border-radius: 50%; background: #4caf50; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; label { font-weight: 600; color: #2e7d32; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; } `;
const InputField = styled.input` padding: 0.8rem 1rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s; &:focus { border-color: #4CAF50; } `;
const SaveProfileButton = styled(motion.button)` width: 100%; padding: 1rem; background: #4CAF50; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; &:disabled { background: #a5d6a7; cursor: not-allowed; } `;

// Address Book Specific
const AddButton = styled.button` display: flex; align-items: center; gap: 0.5rem; background: #e8f5e9; color: #2e7d32; border: 1px solid #81c784; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; &:hover { background: #c8e6c9; } `;
const AddressList = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const AddressCard = styled.div` display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem; border: 2px solid ${props => props.$isDefault ? '#4caf50' : '#eee'}; border-radius: 12px; background: ${props => props.$isDefault ? '#f1f8e9' : 'white'}; 
  .info strong { display: flex; align-items: center; gap: 0.5rem; color: #333; } 
  .info p { margin: 0.5rem 0 0 0; color: #666; font-size: 0.95rem; line-height: 1.4; white-space: pre-wrap; } 
  .badge { background: #4caf50; color: white; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 12px; text-transform: uppercase; } 
  .actions { display: flex; gap: 0.2rem; } 
  .actions button { background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; } 
  .actions .star { color: #fbc02d; &:hover { background: #fff9c4; } } 
  .actions .edit { color: #1976D2; &:hover { background: #E3F2FD; } } 
  .actions .delete { color: #d32f2f; &:hover { background: #ffebee; } } 
`;

// OTP Modal Specific
const OtpInput = styled.input` width: 100%; text-align: center; font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-top: 1rem; outline: none; &:focus { border-color: #4caf50; box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.1); } `;

// Existing Modals & Orders
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px);`;
const ModalCard = styled(motion.div)` background: white; padding: 2.5rem; border-radius: 20px; width: 100%; max-width: 420px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); h3 { margin-top:0; color:#111; } p { color: #666; }`;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;
const Stars = styled.div` display: flex; justify-content: center; margin: 1rem 0; gap: 4px; `;

const ModalPrimaryButton = styled.button` flex: 1; padding: 0.8rem 0; border: none !important; border-radius: 8px; cursor: pointer; background: #4caf50 !important; color: white !important; font-weight: bold; &:hover:not(:disabled) { background: #388e3c !important; } &:disabled { background: #a5d6a7 !important; cursor: not-allowed; } `;
const ModalDangerButton = styled.button` flex: 1; padding: 0.8rem 0; border: none !important; border-radius: 8px; cursor: pointer; background: #d32f2f !important; color: white !important; font-weight: bold; &:hover { background: #b71c1c !important; } `;
const ModalSecondaryButton = styled.button` flex: 1; padding: 0.8rem 0; border: none !important; border-radius: 8px; cursor: pointer; background: #f5f5f5 !important; color: #424242 !important; font-weight: bold; &:hover:not(:disabled) { background: #e0e0e0 !important; } &:disabled { opacity: 0.7; cursor: not-allowed; } `;

const LoadingWrapper = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4rem; `;
const Spinner = styled.div` width: 50px; height: 50px; border: 5px solid #e0e0e0; border-top: 5px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; @keyframes spin { to { transform: rotate(360deg); } } `;
const LoadingText = styled.div` font-size: 1.3rem; font-weight: 600; color: #4caf50; `;
const EmptyState = styled(motion.div)` display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const OrdersList = styled.ul` display: flex; flex-direction: column; gap: 1.5rem; list-style: none; padding: 0; `;
const OrderCard = styled(motion.li)` background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); `;
const OrderHeader = styled.div` display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; `;
const OrderDate = styled.p` color: #757575; font-size: 0.9rem; `;
const StatusBadge = styled.div` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 500; background: ${props => props.status === 'pending' ? '#FFF3E0' : props.status === 'delivered' ? '#E8F5E9' : props.status === 'cancelled' ? '#FFEBEE' : '#E3F2FD'}; color: #333; `;
const OrderTotal = styled.p` font-size: 1.1rem; font-weight: 600; color: #2e7d32; margin-top: 1rem; `;
const ActionGroup = styled.div` display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 10px; `;
const viewItemsButtonStyle = { backgroundColor: "#4caf50", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const DashboardCancelButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: #d32f2f !important; color: white !important; border: none !important; border-radius: 8px; cursor: pointer; font-weight: bold; &:hover { background-color: #c62828 !important; } &:disabled { background-color: #ef9a9a !important; cursor: not-allowed; } `;
const ItemsList = styled.ul` list-style: none; padding: 0; margin-top: 1.5rem; border-top: 1px solid #eee; padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem; `;
const Item = styled.li` display: flex; align-items: center; gap: 1rem; background: #f9f9f9; border-radius: 8px; padding: 1rem; flex-wrap: wrap; `;
const ItemImage = styled.div` width: 60px; height: 60px; background: #e0e0e0; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; `;
const ItemDetails = styled.div` flex: 1; min-width: 200px; h4 { margin: 0 0 0.5rem 0; color: #333; } div { display: flex; gap: 1rem; font-size: 0.9rem; color: #555; } `;
const ReviewTriggerButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: ${props => props.$isEdit ? '#FFF9C4' : '#E8F5E9'}; color: ${props => props.$isEdit ? '#F57F17' : '#2e7d32'}; border: 1px solid ${props => props.$isEdit ? '#FBC02D' : '#81C784'}; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s ease; &:hover { filter: brightness(0.95); } @media (max-width: 600px) { width: 100%; justify-content: center; margin-top: 10px; }`;
const ReviewItemCard = styled.li` background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1); display: flex; flex-direction: column; gap: 1.5rem; @media (min-width: 600px) { flex-direction: row; justify-content: space-between; align-items: flex-start; }`;
const ReviewContent = styled.div` flex: 1; min-width: 0; `;
const ReviewActions = styled.div` display: flex; gap: 0.5rem; align-items: flex-start; white-space: nowrap; `;

export default Dashboard;