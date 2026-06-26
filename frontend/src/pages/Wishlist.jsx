import { useEffect, useState, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { FaTrashAlt, FaShoppingCart } from 'react-icons/fa';
import {toast, Toaster} from "react-hot-toast";

const Wishlist = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const res = await axiosInstance.get('/api/wishlist/');
      const validItems = res.data.filter(item => item.product && item.product.id && item.product.name);
      const formatted = validItems.map(item => ({
        ...item,
        product: {
          ...item.product,
          price: Number(item.product.price), // Ensure number
        }
      }));
      setWishlist(formatted);
    } catch (err) {
      console.error(err);
      toast.error('❌ Failed to load wishlist', {
        position: 'bottom-right',
        duration: 2000,
      });
    }
  };

  const removeFromWishlist = async (id) => {
    try {
      await axiosInstance.delete(`/api/wishlist/${id}/`);
      toast.success('💔 Removed from wishlist', {
        position: 'bottom-right',
        duration: 2000,
      });
      fetchWishlist();
    } catch (err) {
      toast.error('❌ Failed to remove item', {
        position: 'bottom-right',
        duration: 2000,
      });
    }
  };

  const addToCart = async (productId) => {
    try {
      await axiosInstance.post('/api/cart-items/', {
        product: productId,
        quantity: 1,
      });
      toast.success('🛒 Added to cart', {
        position: 'bottom-right',
        duration: 2000,
      });
    } catch (err) {
      toast.error('❌ Failed to add to cart', {
        position: 'bottom-right',
        duration: 2000,
      });
    }
  };

  return (
    <WishlistContainer>
      <Toaster />
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
            >
              <ImageWrapper>
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                />
              </ImageWrapper>
              <Info>
                <h3>{item.product.name}</h3>
                <p>${item.product.price.toFixed(2)}</p>
              </Info>
              <Actions>
                <button onClick={() => addToCart(item.product.id)}>
                  <FaShoppingCart /> Add to Cart
                </button>
                <button onClick={() => removeFromWishlist(item.id)}>
                  <FaTrashAlt /> Remove
                </button>
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
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(to right, #fdfbfb, #ebedee);

  h1 {
    text-align: center;
    color: #2e7d32;
    margin-bottom: 2rem;
    font-size: 2.2rem;
  }
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
  background: #ffffff; /* Added white background to match products page */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px; /* Added padding so the image doesn't touch the edges */
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 1rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain; /* Changed from 'cover' to 'contain' */
  }
`;

const Info = styled.div`
  h3 {
    color: #2e7d32;
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
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
  margin-top: 1rem;

  button {
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 0.6rem 1rem;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;

    &:hover {
      background: #388e3c;
    }

    &:last-child {
      background: #e53935;

      &:hover {
        background: #c62828;
      }
    }
  }
`;

export default Wishlist;
