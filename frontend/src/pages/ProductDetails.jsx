import { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import {toast, Toaster} from "react-hot-toast";
import { FaStar } from 'react-icons/fa';

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

  useEffect(() => {
    axiosInstance.get(`/api/products/${id}/`)
      .then(res => setProduct(res.data))
      .catch(err => {
        toast.error('❌ Failed to load product.', { position: 'bottom-right', duration: 2000 });
        console.error(err);
      });
  }, [id, axiosInstance]);

  useEffect(() => {
    axiosInstance.get(`/api/reviews/?product=${id}`)
      .then(res => setReviews(res.data))
      .catch(err => {
        toast.error('❌ Failed to fetch reviews.', { position: 'bottom-right' });
        console.error(err);
      });
  }, [id, axiosInstance]);

  const handleAddToCart = async () => {
    try {
      await axiosInstance.post('/api/cart-items/', {
        product: id,
        quantity,
      });
      toast.success('🛒 Added to cart!', { position: 'bottom-right' });
    } catch (err) {
      toast.error('❌ Failed to add to cart.', { position: 'bottom-right' });
    }
  };

  const submitReview = async () => {
    if (!rating || !comment) {
      toast.warning('Please fill out all fields.', { position: 'bottom-right' });
      return;
    }

    try {
      setSubmitting(true);
      if (editingReviewId) {
        await axiosInstance.put(`/api/reviews/${editingReviewId}/`, {
          product: id,
          rating,
          comment,
        });
        toast.success('✅ Review updated!', { position: 'bottom-right' });
      } else {
        await axiosInstance.post('/api/reviews/', {
          product: id,
          rating,
          comment,
        });
        toast.success('✅ Review submitted!', { position: 'bottom-right' });
      }

      // Refresh reviews
      axiosInstance.get(`/api/reviews/?product=${id}`)
        .then(res => setReviews(res.data));

      setComment('');
      setRating(0);
      setEditingReviewId(null);
    } catch (err) {
      toast.error('❌ Failed to submit review.', { position: 'bottom-right' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <DetailContainer>
      <Toaster />
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {product.name}
      </motion.h1>

      <ProductWrapper>
        <motion.img
          src={product.image_url}
          alt={product.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {product.description}
        </motion.p>
      </ProductWrapper>

      <div style={{ marginTop: '1rem' }}>
        <label>Quantity:</label>
        <QuantitySelector
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(parseInt(e.target.value))}
        />
        <SubmitButton
          onClick={handleAddToCart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ marginLeft: '1rem', width: 'auto' }}
        >
          Add to Cart
        </SubmitButton>
      </div>

      <ReviewSection>
        <h2>Leave a Review</h2>
        <Stars>
          {[...Array(5)].map((_, i) => {
            const starValue = i + 1;
            return (
              <label key={i}>
                <input
                  type="radio"
                  name="rating"
                  value={starValue}
                  onClick={() => setRating(starValue)}
                />
                <FaStar
                  size={28}
                  color={starValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
                  onMouseEnter={() => setHover(starValue)}
                  onMouseLeave={() => setHover(null)}
                />
              </label>
            );
          })}
        </Stars>
        <textarea
          placeholder="Write your review here..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <SubmitButton
          onClick={submitReview}
          disabled={submitting}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ width: 'auto' }}
        >
          Submit Review
        </SubmitButton>
      </ReviewSection>

      <div style={{ marginTop: '2rem' }}>
        <h2>Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} style={{ marginBottom: '1.5rem' }}>
              <strong>{review.username}</strong> –{' '}
              {Array.from({ length: 5 }, (_, i) => (
                <FaStar
                  key={i}
                  size={16}
                  color={i < review.rating ? '#ffc107' : '#e4e5e9'}
                />
              ))}
              <p>{review.comment}</p>
              {user?.username === review.username && (
                <SubmitButton
                  onClick={() => {
                    setRating(review.rating);
                    setComment(review.comment);
                    setEditingReviewId(review.id);
                  }}
                  style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
                >
                  Edit
                </SubmitButton>
              )}
            </div>
          ))
        )}
      </div>
    </DetailContainer>
  );
};

export default ProductDetail;

// Styled components
const DetailContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
  min-height: 100vh;

  h1 {
    text-align: center;
    color: #2e7d32;
    margin-bottom: 2rem;
  }
`;

const ProductWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  img {
    width: 100%;
    max-width: 400px;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
  }

  p {
    font-size: 1.1rem;
    color: #424242;
    text-align: center;
    line-height: 1.6;
  }
`;

const ReviewSection = styled.div`
  margin-top: 3rem;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);

  h2 {
    color: #2e7d32;
    margin-bottom: 1rem;
    text-align: center;
  }

  textarea {
    width: 100%;
    height: 120px;
    border: 2px solid #c8e6c9;
    border-radius: 12px;
    padding: 1rem;
    font-size: 1rem;
    margin-top: 1rem;
    resize: none;

    &:focus {
      outline: none;
      border-color: #4caf50;
    }
  }
`;

const Stars = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;

  input {
    display: none;
  }

  svg {
    cursor: pointer;
    transition: color 200ms;
  }
`;

const QuantitySelector = styled.input`
  width: 60px;
  padding: 0.5rem;
  border-radius: 8px;
  border: 2px solid #c8e6c9;
  margin-left: 0.5rem;
  font-size: 1rem;
  text-align: center;
  transition: border 0.3s ease;

  &:hover {
    border-color: #4caf50;
  }

  &:focus {
    outline: none;
    border-color: #4caf50;
  }
`;

const SubmitButton = styled(motion.button)`
  width: auto;
  padding: 0.8rem 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.3s ease;

  &:hover {
    background: #388e3c;
  }

  &:disabled {
    background: #a5d6a7;
    cursor: not-allowed;
  }
`;
