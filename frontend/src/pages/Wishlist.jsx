import { useEffect, useState, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
// eslint-disable-next-line
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { FaTrashAlt, FaShoppingCart, FaArrowRight } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import { Link } from 'react-router-dom';

const Wishlist = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [wishlist, setWishlist] = useState([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  // eslint-disable-next-line
  useEffect(() => {
    fetchWishlist(); // eslint-disable-next-line
  }, []);

  const fetchWishlist = async () => {
    try {
      const res = await axiosInstance.get('/api/wishlist/');
      const validItems = res.data.filter(item => item.product && item.product.id && item.product.name);
      const formatted = validItems.map(item => ({
        ...item,
        product: {
          ...item.product,
          price: Number(item.product.price),
        }
      }));
      setWishlist(formatted);
    } catch (err) {
      console.error(err);
      toast.error('❌ Failed to load wishlist');
    }
  };

  const promptRemove = (id) => {
    setItemToRemove(id);
    setIsModalOpen(true);
  };

  const executeRemove = async () => {
    if (!itemToRemove) return;
    try {
      await axiosInstance.delete(`/api/wishlist/${itemToRemove}/`);
      toast.success('💔 Removed from wishlist');
      fetchWishlist();
    } catch (err) {
      toast.error('❌ Failed to remove item');
    } finally {
      setIsModalOpen(false);
      setItemToRemove(null);
    }
  };

  const addToCart = async (product) => {
    try {
      await axiosInstance.post('/api/cart-items/', {
        product: product.id,
        quantity: 1,
      });
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
  };

  return (
    <WishlistContainer>
      
      {/* --- Confirmation Modal --- */}
      <AnimatePresence>
        {isModalOpen && (
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3>Remove Item</h3>
              <p>Are you sure you want to remove this item from your wishlist?</p>
              <ButtonGroup>
                <ModalSecondaryButton onClick={() => setIsModalOpen(false)}>Cancel</ModalSecondaryButton>
                <ModalDangerButton onClick={executeRemove}>Yes, Remove</ModalDangerButton>
              </ButtonGroup>
            </ModalCard>
          </Overlay>
        )}
      </AnimatePresence>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        My Wishlist
      </motion.h1>

      {wishlist.length === 0 ? (
        <EmptyText>Your wishlist is empty.</EmptyText>
      ) : (
        <WishlistGrid>
          {wishlist.map((item, index) => (
            <WishlistCard
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }} // Added matching hover animation
            >
              <ImageWrapper>
                <Link to={`/products/${item.product.id}/`}>
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                  />
                </Link>
              </ImageWrapper>
              <Info>
                <h3>
                  <Link to={`/products/${item.product.id}/`} style={{ color: '#2e7d32', textDecoration: 'none' }}>
                    {item.product.name}
                  </Link>
                </h3>
                <p>${item.product.price.toFixed(2)}</p>
              </Info>
              <Actions>
                <ActionBtn 
                  $primary 
                  onClick={() => addToCart(item.product)}
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }}
                >
                  <FaShoppingCart /> Add to Cart
                </ActionBtn>
                <ActionBtn 
                  onClick={() => promptRemove(item.id)}
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }}
                >
                  <FaTrashAlt /> Remove
                </ActionBtn>
              </Actions>
            </WishlistCard>
          ))}
        </WishlistGrid>
      )}
    </WishlistContainer>
  );
};

// Styled Components
const WishlistContainer = styled.div`
  padding: 7rem 2rem 2rem 2rem;
  max-width: 1200px; margin: 0 auto; min-height: 100vh;
  background: linear-gradient(to right, #fdfbfb, #ebedee);
  h1 { text-align: center; color: #2e7d32; margin-bottom: 2rem; font-size: 2.2rem; }
  @media(max-width: 768px) { padding: 6rem 1rem 1rem 1rem; }
`;

const EmptyText = styled.p`
  text-align: center;
  font-size: 1.2rem;
  color: #888;
`;

const WishlistGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
`;

const WishlistCard = styled(motion.div)`
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ImageWrapper = styled.div`
  width: 100%;
  height: 200px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 1rem;

  a {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const Info = styled.div`
  width: 100%;
  text-align: center;
  
  h3 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
    overflow: hidden;
    
    a {
      transition: color 0.2s ease;
      &:hover { color: #1b5e20 !important; }
    }
  }

  p {
    color: #1b5e20;
    font-weight: bold;
    font-size: 1.1rem;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  width: 100%;
  justify-content: center;
`;

// Upgraded Action buttons to framer-motion components for animations
const ActionBtn = styled(motion.button)`
  background: ${props => props.$primary ? '#4CAF50' : '#e53935'};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;

  &:hover {
    background: ${props => props.$primary ? '#388e3c' : '#c62828'};
  }
`;

// --- Modal Styled Components ---
const Overlay = styled(motion.div)`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; padding: 1rem;
`;

const ModalCard = styled(motion.div)`
  background: white; padding: 2rem; border-radius: 16px;
  width: 100%; max-width: 400px; text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  h3 { margin-top: 0; color: #333; }
  p { color: #666; margin-bottom: 2rem; }
`;

const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;
const ModalDangerButton = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #d32f2f; color: #ffffff; &:hover { background: #b71c1c; } `;
const ModalSecondaryButton = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #757575; color: #ffffff; &:hover { background: #616161; } `;

export default Wishlist;