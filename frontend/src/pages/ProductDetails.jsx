import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
// eslint-disable-next-line
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaStar, FaShoppingCart, FaArrowRight, FaCheckCircle, FaHistory } from 'react-icons/fa';

const ProductDetail = () => {
  const { id } = useParams();
  const { axiosInstance, user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [editingReviewId, setEditingReviewId] = useState(null);
  
  // NEW: Purchase History State
  const [purchaseDate, setPurchaseDate] = useState(null);

  useEffect(() => {
    axiosInstance.get(`/api/products/${id}/`)
      .then(res => setProduct(res.data))
      .catch(err => {
        toast.error('❌ Failed to load product.', {duration: 2000 });
        console.error(err);
      });
  }, [id, axiosInstance]);

  useEffect(() => {
    axiosInstance.get(`/api/reviews/?product=${id}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
  }, [id, axiosInstance]);

  // NEW: Smart "Previously Purchased" Checker
  useEffect(() => {
    if (user) {
      const checkPurchaseHistory = async () => {
        try {
          const ordersRes = await axiosInstance.get('/api/orders/');
          const deliveredOrders = ordersRes.data.filter(o => o.status === 'delivered');
          
          for (let order of deliveredOrders) {
            const itemsRes = await axiosInstance.get(`/api/order-items/?order=${order.id}`);
            const foundItem = itemsRes.data.find(item => String(item.product) === String(id));
            if (foundItem) {
              setPurchaseDate(new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              }));
              break; 
            }
          }
        } catch (err) {
          console.error("Failed to fetch purchase history", err);
        }
      };
      checkPurchaseHistory();
    }
  }, [id, user, axiosInstance]);

  const isAtLimit = product && quantity >= (product.stock || 0);

  const handleAddToCart = async () => {
    if (quantity > (product.stock || 0)) {
      toast.error(`Only ${product.stock} in stock!`, {duration: 2000 });
      return;
    }

    if (user) {
      try {
        await axiosInstance.post('/api/cart-items/', { product: id, quantity });
        toast.success(
          (t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span>🛒 <b>{product.name}</b> added to cart!</span>
              <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>
                Go to Cart <FaArrowRight size={12} />
              </Link>
            </div>
          ), {duration: 5000 }
        );
      } catch (err) {
        const serverMessage = err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || err.response?.data?.detail;
        if (serverMessage && serverMessage.toLowerCase().includes('already')) {
          toast(
            (t) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>⚠️ <b>{product.name}</b> is already in your cart.</span>
                <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>
                  Go to Cart <FaArrowRight size={12} />
                </Link>
              </div>
            ), { position: "bottom-right", duration: 5000 }
          );
        } else {
          toast.error(`❌ Failed to add ${product.name} to cart.`, {duration: 3000 });
        }
      }
    } else {
      let tempCart = JSON.parse(localStorage.getItem('tempCart')) || [];
      const existingIndex = tempCart.findIndex(item => String(item.product) === String(id));
      
      if (existingIndex >= 0) {
        if (tempCart[existingIndex].quantity + quantity > (product.stock || 0)) {
          toast.error(`Cannot exceed stock limit of ${product.stock}`);
          return;
        }
        tempCart[existingIndex].quantity += quantity;
      } else {
        tempCart.push({
          id: `temp_${id}`, product: id, product_name: product.name, product_image: product.image_url,
          price: product.price, quantity: quantity, product_stock: product.stock || 0
        });
      }
      localStorage.setItem('tempCart', JSON.stringify(tempCart));
      
      toast.success(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>🛒 <b>{product.name}</b> added to guest cart!</span>
            <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>
              Go to Cart <FaArrowRight size={12} />
            </Link>
          </div>
        ), {duration: 5000 }
      );
    }
  };

  const submitReview = async () => {
    if (!rating || !comment) {
      toast.warning('Please fill out all fields.');
      return;
    }
    try {
      setSubmitting(true);
      if (editingReviewId) {
        await axiosInstance.put(`/api/reviews/${editingReviewId}/`, { product: id, rating, comment });
        toast.success('✅ Review updated!');
      } else {
        await axiosInstance.post('/api/reviews/', { product: id, rating, comment });
        toast.success('✅ Review submitted!');
      }
      axiosInstance.get(`/api/reviews/?product=${id}`).then(res => setReviews(res.data));
      setComment(''); setRating(0); setEditingReviewId(null);
    } catch (err) { toast.error('❌ Failed to submit review.'); } 
    finally { setSubmitting(false); }
  };

  if (!product) return null;

  return (
    <DetailContainer>
      
      {/* NEW: Smart Purchase Banner */}
      <AnimatePresence>
        {purchaseDate && (
          <PurchaseBanner initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <FaCheckCircle size={20} />
            <div>
              <strong>You purchased this item</strong>
              <p>Last ordered on {purchaseDate}</p>
            </div>
          </PurchaseBanner>
        )}
      </AnimatePresence>

      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {product.name}
      </motion.h1>

      <ProductWrapper>
        <motion.img src={product.image_url} alt={product.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {product.description}
        </motion.p>
      </ProductWrapper>

      <ActionArea>
        <QuantityControl>
          <button onClick={() => setQuantity(prev => Math.max(1, prev - 1))} disabled={quantity <= 1}>-</button>
          <span>{quantity}</span>
          <button disabled={isAtLimit} onClick={() => setQuantity(prev => Math.min(product.stock || 0, prev + 1))} style={{ opacity: isAtLimit ? 0.5 : 1, cursor: isAtLimit ? 'not-allowed' : 'pointer' }}>+</button>
        </QuantityControl>
        {isAtLimit && <LimitWarning>Only {product.stock} left in stock!</LimitWarning>}
        
        <AddToCartButton onClick={handleAddToCart} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <FaShoppingCart /> Add to Cart
        </AddToCartButton>
      </ActionArea>

      <ReviewSection>
        <h2>Leave a Review</h2>
        <Stars>
          {[...Array(5)].map((_, i) => {
            const starValue = i + 1;
            return (
              <label key={i}>
                <input type="radio" name="rating" value={starValue} onClick={() => setRating(starValue)} />
                <FaStar size={28} color={starValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'} onMouseEnter={() => setHover(starValue)} onMouseLeave={() => setHover(null)} />
              </label>
            );
          })}
        </Stars>
        <textarea placeholder="Write your review here..." value={comment} onChange={e => setComment(e.target.value)} />
        <SubmitButton onClick={submitReview} disabled={submitting} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ width: 'auto' }}>
          Submit Review
        </SubmitButton>
      </ReviewSection>

      <div style={{ marginTop: '2rem' }}>
        <h2>Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No reviews yet. Verified buyers can review this product from their Dashboard!</p>
        ) : (
          reviews.map(review => (
            <ReviewCard key={review.id} style={{ marginBottom: '1.5rem' }}>
              <strong>{review.username}</strong>
              <div style={{ margin: '0.3rem 0' }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <FaStar key={i} size={16} color={i < review.rating ? '#ffc107' : '#e4e5e9'} />
                ))}
              </div>
              <p>"{review.comment}"</p>
              {user?.username === review.username && (
                <SubmitButton onClick={() => { setRating(review.rating); setComment(review.comment); setEditingReviewId(review.id); }} style={{ width: 'auto', padding: '0.4rem 0.8rem', marginTop: '10px' }}>
                  <FaHistory style={{marginRight: '5px'}}/> Edit Review
                </SubmitButton>
              )}
            </ReviewCard>
          ))
        )}
      </div>
    </DetailContainer>
  );
};

export default ProductDetail;

// --- STYLED COMPONENTS ---
const DetailContainer = styled.div`
  padding: 7rem 2rem 2rem 2rem; max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); min-height: 100vh;
  h1 { text-align: center; color: #2e7d32; margin-bottom: 2rem; }
  @media (max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }
`;

// NEW: Styled Component for the Purchase Banner
const PurchaseBanner = styled(motion.div)`
  display: flex; align-items: center; gap: 1rem; background: #e8f5e9; border: 1px solid #81c784; padding: 1rem 1.5rem; border-radius: 12px; margin-bottom: 2rem; color: #2e7d32;
  strong { display: block; font-size: 1.05rem; margin-bottom: 0.2rem; }
  p { margin: 0; font-size: 0.9rem; color: #388e3c; }
`;

const ProductWrapper = styled.div`
  display: flex; flex-direction: column; align-items: center;
  img { width: 100%; max-width: 400px; border-radius: 16px; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2); }
  p { font-size: 1.1rem; color: #424242; text-align: center; line-height: 1.6; }
`;
const ActionArea = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem;
`;
const QuantityControl = styled.div`
  display: flex; align-items: center; gap: 0.8rem;
  button { background: #e8f5e9 !important; color: #2e7d32 !important; border: none; padding: 0.4rem 1rem; border-radius: 8px; cursor: pointer; font-size: 1.2rem; font-weight: bold; transition: all 0.2s ease; &:hover:not(:disabled) { background: #c8e6c9 !important; } }
  span { min-width: 30px; text-align: center; font-size: 1.1rem; font-weight: bold; }
`;
const LimitWarning = styled.p` color: #d32f2f !important; font-size: 0.85rem !important; margin: -0.5rem 0 0 0 !important; font-weight: 600; text-align: center; `;
const AddToCartButton = styled(motion.button)`
  padding: 0.8rem 2.5rem; background: #4CAF50 !important; color: #ffffff !important; border: none; border-radius: 12px; font-weight: 600; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.6rem; transition: background-color 0.3s ease;
  &:hover { background: #388e3c !important; color: #ffffff !important; } &:active { background: #2e7d32 !important; color: #ffffff !important; }
`;
const ReviewSection = styled.div`
  margin-top: 3rem; padding: 2rem; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
  h2 { color: #2e7d32; margin-bottom: 1rem; text-align: center; }
  textarea { width: 100%; height: 120px; border: 2px solid #c8e6c9; border-radius: 12px; padding: 1rem; font-size: 1rem; margin-top: 1rem; resize: none; &:focus { outline: none; border-color: #4caf50; } }
`;
const Stars = styled.div` display: flex; justify-content: center; margin-bottom: 1rem; input { display: none; } svg { cursor: pointer; transition: color 200ms; } `;
const SubmitButton = styled(motion.button)`
  width: auto; display: flex; align-items: center; justify-content: center; padding: 0.8rem 1.5rem; background: #4caf50; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; margin-top: 1rem; transition: background 0.3s ease;
  &:hover { background: #388e3c; } &:disabled { background: #a5d6a7; cursor: not-allowed; }
`;
const ReviewCard = styled.div` background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.08); strong { font-size: 1.1rem; color: #333; } p { color: #555; font-style: italic; line-height: 1.5; margin-top: 0.5rem; }`;