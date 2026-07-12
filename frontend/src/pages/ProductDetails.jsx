import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaStar, FaShoppingCart, FaArrowRight } from 'react-icons/fa';

const ProductDetail = () => {
  const { id } = useParams();
  const { axiosInstance, user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    axiosInstance.get(`/api/products/${id}/`)
      .then(res => setProduct(res.data))
      .catch(err => {
        toast.error('❌ Failed to load product.');
        console.error(err);
      });
  }, [id, axiosInstance]);

  useEffect(() => {
    axiosInstance.get(`/api/reviews/?product=${id}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
  }, [id, axiosInstance]);

  const isAtLimit = product && quantity >= (product.stock || 0);

  const handleAddToCart = async () => {
    if (quantity > (product.stock || 0)) {
      toast.error(`Only ${product.stock} in stock!`);
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
          )
        );
      } catch (err) {
        const serverMessage = err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || err.response?.data?.detail;
        if (serverMessage && serverMessage.toLowerCase().includes('already')) {
          toast(
            (t) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>⚠️ <b>{product.name}</b> is already in your cart.</span>
                <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#d32f2f', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>
                  Go to Cart <FaArrowRight size={12} />
                </Link>
              </div>
            )
          );
        } else {
          toast.error(`❌ Failed to add ${product.name} to cart.`);
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
          id: `temp_${id}`, product: id, product_name: product.name,
          product_image: product.image_url, price: product.price,
          quantity: quantity, product_stock: product.stock || 0
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
        )
      );
    }
  };

  if (!product) return null;

  return (
    <DetailContainer>
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

      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ color: '#2e7d32', textAlign: 'center', marginBottom: '2rem' }}>Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>No reviews yet. Verified buyers can review this product from their Dashboard!</p>
        ) : (
          <ReviewsGrid>
            {reviews.map(review => (
              <ReviewCard key={review.id}>
                <strong>{review.username}</strong>
                <div style={{ margin: '0.5rem 0' }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <FaStar key={i} size={16} color={i < review.rating ? '#ffc107' : '#e4e5e9'} />
                  ))}
                </div>
                <p>"{review.comment}"</p>
              </ReviewCard>
            ))}
          </ReviewsGrid>
        )}
      </div>
    </DetailContainer>
  );
};

export default ProductDetail;

// --- STYLED COMPONENTS ---
// Note the 7rem top padding in DetailContainer!
const DetailContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); min-height: 100vh; h1 { text-align: center; color: #2e7d32; margin-bottom: 2rem; } @media (max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }`;
const ProductWrapper = styled.div` display: flex; flex-direction: column; align-items: center; img { width: 100%; max-width: 400px; border-radius: 16px; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2); } p { font-size: 1.1rem; color: #424242; text-align: center; line-height: 1.6; }`;
const ActionArea = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem;`;
const QuantityControl = styled.div` display: flex; align-items: center; gap: 0.8rem; button { background: #e8f5e9 !important; color: #2e7d32 !important; border: none; padding: 0.4rem 1rem; border-radius: 8px; cursor: pointer; font-size: 1.2rem; font-weight: bold; transition: all 0.2s ease; &:hover:not(:disabled) { background: #c8e6c9 !important; } } span { min-width: 30px; text-align: center; font-size: 1.1rem; font-weight: bold; }`;
const LimitWarning = styled.p` color: #d32f2f !important; font-size: 0.85rem !important; margin: -0.5rem 0 0 0 !important; font-weight: 600; text-align: center; `;
const AddToCartButton = styled(motion.button)` padding: 0.8rem 2.5rem; background: #4CAF50 !important; color: white !important; border: none; border-radius: 12px; font-weight: 600; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.6rem; transition: background-color 0.3s ease; &:hover { background: #388e3c !important; } &:active { background: #2e7d32 !important; }`;
const ReviewsGrid = styled.div` display: grid; gap: 1.5rem; grid-template-columns: 1fr; @media (min-width: 600px) { grid-template-columns: 1fr 1fr; }`;
const ReviewCard = styled.div` background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.08); strong { font-size: 1.1rem; color: #333; } p { color: #555; font-style: italic; line-height: 1.5; margin-top: 0.5rem; }`;