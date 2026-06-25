import { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { FaSearch, FaShoppingCart } from 'react-icons/fa';
import {toast, Toaster} from "react-hot-toast";
import { Link } from 'react-router-dom';


const Products = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    axiosInstance.get('/api/products/')
      .then(async res => {
        const productsData = await Promise.all(res.data.map(async p => {
          const { data } = await axiosInstance.get(`/api/products/${p.id}/`);
          return {
            ...p,
            price: Number(p.price),
            image: data.image_url,
          };
        }));

        setProducts(productsData);
        setFiltered(productsData);

        const initialQuantities = {};
        productsData.forEach(p => initialQuantities[p.id] = 1);
        setQuantities(initialQuantities);
      });

    axiosInstance.get('/api/categories/')
      .then(res => setCategories(res.data))
      .catch(err => {
        console.error(err);
        toast.error('❌ Failed to load categories.', { position: 'bottom-right', duration: 2000 });
      });
  }, [axiosInstance]);

  useEffect(() => {
    let result = [...products];

    if (search) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      result = result.filter(p => p.category === parseInt(category));
    }

    if (sort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    }

    setFiltered(result);
  }, [search, category, sort, products]);

  const addToCart = async (product) => {
    try {
      await axiosInstance.post('/api/cart-items/', {
        product: product.id,
        quantity: quantities[product.id] || 1,
      });
      toast.success(`🛒 ${product.name} added to cart!`, {
        position: "bottom-right",
        duration: 2000,
      });
    } catch (err) {
      toast.error('❌ Failed to add to cart', {
        position: "bottom-right",
        duration: 2000,
      });
    }
  };

  return (
    <ProductsContainer>
      <Toaster />
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Our Products
      </motion.h1>

      <FilterContainer>
        <SearchBar>
          <FaSearch />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBar>

        <Select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          whileHover={{ scale: 1.02 }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Select 
          value={sort} 
          onChange={(e) => setSort(e.target.value)}
          whileHover={{ scale: 1.02 }}
        >
          <option value="">Sort By</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </Select>
      </FilterContainer>

      <ProductGrid>
        {filtered.map((product, index) => (
          <ProductCard
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            {product.image && (
              <ProductImage>
                <Link to={`/products/${product.id}/`}>
                  <img src={product.image} alt={product.name} />
                </Link>
              </ProductImage>
            )}
            
            <ProductInfo>
              <h3>
                <Link to={`/products/${product.id}/`} style={{ color: '#2e7d32', textDecoration: 'none' }}>
                  {product.name}
                </Link>
              </h3>
              <p>{product.description?.slice(0, 60)}...</p>
              <Price>${product.price.toFixed(2)}</Price>
              
              <QuantityControl>
                <button 
                  onClick={() => setQuantities(prev => ({
                    ...prev,
                    [product.id]: Math.max(1, prev[product.id] - 1)
                  }))}
                >
                  -
                </button>
                <span>{quantities[product.id] || 1}</span>
                <button 
                  onClick={() => setQuantities(prev => ({
                    ...prev,
                    [product.id]: prev[product.id] + 1
                  }))}
                >
                  +
                </button>
              </QuantityControl>

              <AddToCartButton 
                onClick={() => addToCart(product)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaShoppingCart /> Add to Cart
              </AddToCartButton>
            </ProductInfo>
          </ProductCard>
        ))}
      </ProductGrid>
    </ProductsContainer>
  );
};

// Styled Components
const ProductsContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);

  h1 {
    color: #2e7d32;
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2.2rem;
  }
`;

const FilterContainer = styled(motion.div)`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 30px;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
  width: 300px;

  input {
    border: none;
    margin-left: 0.5rem;
    font-size: 1rem;
    width: 100%;

    &:focus {
      outline: none;
    }
  }

  svg {
    color: #9e9e9e;
  }
`;

const Select = styled(motion.select)`
  padding: 0.5rem 1rem;
  border-radius: 30px;
  border: 2px solid #e0e0e0;
  background: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4CAF50;
  }
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  padding: 1rem;
`;

const ProductCard = styled(motion.div)`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
  transition: all 0.3s ease;
`;

const ProductImage = styled.div`
  width: 100%;
  height: 260px;
  background: #ffffff;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 16px;

  border-radius: 12px;
  margin-bottom: 1rem;

  overflow: hidden;

  img {
    width: 100%;
    height: 100%;

    object-fit: contain;

    transition: transform .3s ease;
  }

  &:hover img{
    transform: scale(1.05);
  }
`;

const ProductInfo = styled.div`
  h3{

height:56px;

display:flex;

align-items:center;

}

  p{
    color:#616161;

    font-size:.9rem;

    height:42px;

    overflow:hidden;

    margin-bottom:1rem;
}
`;

const Price = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #1b5e20;
  margin-bottom: 1rem;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;

  button {
    background: #e8f5e9;
    border: none;
    padding: 0.3rem 0.8rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    color: #2e7d32;
    transition: all 0.2s ease;

    &:hover {
      background: #c8e6c9;
    }
  }

  span {
    min-width: 30px;
    text-align: center;
  }
`;

const AddToCartButton = styled(motion.button)`
  width: 100%;
  padding: 0.8rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: #388e3c;
  }
`;

export default Products;
