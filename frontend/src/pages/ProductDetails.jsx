import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaStar, FaShoppingCart, FaArrowRight, FaCheckCircle, FaBoxOpen } from 'react-icons/fa';

const ProductDetail = () => {
  const { id } = useParams();
  const { axiosInstance, user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  
  // Review Pagination State
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState(null);

  useEffect(() => {
    axiosInstance.get(`/api/products/${id}/`)
      .then(res => setProduct(res.data))
      .catch(err => toast.error('❌ Failed to load product.', { duration: 2000 }));
  }, [id, axiosInstance]);

  // Fetch Paginated Reviews (Read Only)
  const fetchReviews = () => {
    axiosInstance.get(`/api/reviews/?product=${id}&page=${reviewPage}`)
      .then(res => {
        setReviews(res.data.results || res.data);
        if (res.data.count) setTotalReviewPages(Math.ceil(res.data.count / 12));
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line
  }, [id, axiosInstance, reviewPage]);

  // Check purchase history
  useEffect(() => {
    if (user) {
      const checkPurchaseHistory = async () => {
        try {
          const ordersRes = await axiosInstance.get('/api/orders/?page_size=100');
          const deliveredOrders = (ordersRes.data.results || ordersRes.data).filter(o => o.status === 'delivered');
          for (let order of deliveredOrders) {
            const itemsRes = await axiosInstance.get(`/api/order-items/?order=${order.id}`);
            const foundItem = itemsRes.data.find(item => String(item.product) === String(id));
            if (foundItem) {
              setPurchaseDate(new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
              break;
            }
          }
        } catch (err) { console.error("History check failed"); }
      };
      checkPurchaseHistory();
    }
  }, [id, user, axiosInstance]);

  const isAtLimit = product && quantity >= (product.stock || 0);

  const handleAddToCart = async () => {
    if (quantity > (product.stock || 0)) return toast.error(`Only ${product.stock} in stock!`);
    
    if (user) {
      try {
        await axiosInstance.post('/api/cart-items/', { product: id, quantity });
        toast.success(t => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>🛒 <b>{product.name}</b> added to cart!</span>
            <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>Go to Cart <FaArrowRight size={12} /></Link>
          </div>
        ));
      } catch (err) {
        toast.error(`❌ Failed to add to cart.`);
      }
    } else {
      let tempCart = JSON.parse(localStorage.getItem('tempCart')) || [];
      const existing = tempCart.findIndex(item => String(item.product) === String(id));
      if (existing >= 0) {
        if (tempCart[existing].quantity + quantity > (product.stock || 0)) return toast.error(`Cannot exceed stock limit`);
        tempCart[existing].quantity += quantity;
      } else {
        tempCart.push({ id: `temp_${id}`, product: id, product_name: product.name, product_image: product.image_url, price: product.price, quantity: quantity, product_stock: product.stock || 0 });
      }
      localStorage.setItem('tempCart', JSON.stringify(tempCart));
      toast.success('🛒 Added to guest cart!');
    }
  };

  if (!product) return null;

  return (
    <DetailContainer>
      <AnimatePresence>
        {purchaseDate && (
          <PurchaseBanner initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <FaCheckCircle size={20} />
            <div><strong>You purchased this item</strong><p>Delivered on {purchaseDate}</p></div>
          </PurchaseBanner>
        )}
      </AnimatePresence>

      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>{product.name}</motion.h1>
      
      

      <ProductWrapper>
        <motion.img src={product.image_url} alt={product.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{product.description}</motion.p>
      </ProductWrapper>
        {/* PRICE DISPLAYED HERE */}
      <PriceDisplay>${Number(product.price).toFixed(2)}</PriceDisplay>
      <ActionArea>
        <QuantityControl>
          <button onClick={() => setQuantity(prev => Math.max(1, prev - 1))} disabled={quantity <= 1}>-</button>
          <span>{quantity}</span>
          <button disabled={isAtLimit} onClick={() => setQuantity(prev => Math.min(product.stock || 0, prev + 1))} style={{ opacity: isAtLimit ? 0.5 : 1 }}>+</button>
        </QuantityControl>
        <AddToCartButton onClick={handleAddToCart} disabled={product.stock === 0}><FaShoppingCart /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</AddToCartButton>
      </ActionArea>

      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ color: '#2e7d32', textAlign: 'center' }}>Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>No reviews yet.</p>
        ) : (
          reviews.map(review => (
            <ReviewCard key={review.id}>
              <strong>{review.username}</strong>
              <StarsContainer>{Array.from({ length: 5 }, (_, i) => <FaStar key={i} size={16} color={i < review.rating ? '#ffc107' : '#e4e5e9'} />)}</StarsContainer>
              <p>"{review.comment}"</p>
            </ReviewCard>
          ))
        )}

        {totalReviewPages > 1 && (
          <PaginationWrapper>
            <PageButton onClick={() => setReviewPage(p => Math.max(p - 1, 1))} disabled={reviewPage === 1}>&larr; Previous</PageButton>
            <PageInfo>Page {reviewPage} of {totalReviewPages}</PageInfo>
            <PageButton onClick={() => setReviewPage(p => Math.min(p + 1, totalReviewPages))} disabled={reviewPage === totalReviewPages}>Next &rarr;</PageButton>
          </PaginationWrapper>
        )}
      </div>
    </DetailContainer>
  );
};

export default ProductDetail;

// --- STYLED COMPONENTS ---
const DetailContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 800px; margin: 0 auto; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); h1 { text-align: center; color: #2e7d32; margin-bottom: 0.5rem; }`;
const PriceDisplay = styled.div` font-size: 2rem; font-weight: 800; color: #1b5e20; text-align: center; margin-bottom: 2rem; `;
const PurchaseBanner = styled(motion.div)` display: flex; align-items: center; gap: 1rem; background: #e8f5e9; border: 1px solid #81c784; padding: 1rem 1.5rem; border-radius: 12px; margin-bottom: 2rem; color: #2e7d32; `;
const ProductWrapper = styled.div` display: flex; flex-direction: column; align-items: center; img { width: 100%; max-width: 400px; border-radius: 16px; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); } p { font-size: 1.1rem; color: #424242; text-align: center; line-height: 1.6; }`;
const ActionArea = styled.div` display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 1.5rem;`;
const QuantityControl = styled.div` display: flex; align-items: center; gap: 0.8rem; button { background: #e8f5e9; color: #2e7d32; border: none; padding: 0.4rem 1rem; border-radius: 8px; cursor: pointer; font-weight: bold; } span { font-weight: bold; }`;
const AddToCartButton = styled.button` padding: 0.8rem 2.5rem; background: #4CAF50; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; &:hover { background: #388e3c; } &:disabled { background: #a5d6a7; cursor: not-allowed; }`;
const ReviewCard = styled.div` background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 1rem; strong { display: block; color: #333; } p { color: #555; margin-top: 0.5rem; }`;
const StarsContainer = styled.div` display: flex; gap: 0.2rem; margin: 0.3rem 0; `;
// Pagination
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; `;
const PageButton = styled.button` padding: 0.5rem 1rem; border-radius: 8px; border: none; background: #4caf50; color: white; cursor: pointer; &:disabled { background: #ccc; cursor: not-allowed; }`;
const PageInfo = styled.span` font-weight: bold; color: #555; `;