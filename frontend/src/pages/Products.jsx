import { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaSearch, FaShoppingCart, FaArrowRight } from 'react-icons/fa';
// eslint-disable-next-line
import { toast, Toaster } from "react-hot-toast";
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
            stock: data.stock || 0
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
        toast.error('❌ Failed to load categories.', {duration: 2000 });
      });
  }, [axiosInstance]);

  useEffect(() => {
    let result = [...products];
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category) result = result.filter(p => p.category === parseInt(category));
    if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
    setFiltered(result);
  }, [search, category, sort, products]);

  const addToCart = async (product) => {
    const qty = quantities[product.id] || 1;
    
    if (qty > product.stock) {
      toast.error(`Only ${product.stock} in stock!`, {duration: 2000 });
      return;
    }

    if (user) {
      // Logged in: API Call
      try {
        await axiosInstance.post('/api/cart-items/', {
          product: product.id,
          quantity: qty,
        });
        
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
          // The beautiful Custom Error Toast with "Go to Cart" link
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
          // Standard fallback error
          toast.error(`❌ Failed to add ${product.name} to cart.`, {duration: 3000 });
        }
      }
    } else {
      // Logged out: Local Storage Temp Cart
      let tempCart = JSON.parse(localStorage.getItem('tempCart')) || [];
      const existingIndex = tempCart.findIndex(item => String(item.product) === String(product.id));
      
      if (existingIndex >= 0) {
        if (tempCart[existingIndex].quantity + qty > product.stock) {
          toast.error(`Cannot exceed stock limit of ${product.stock}`);
          return;
        }
        tempCart[existingIndex].quantity += qty;
      } else {
        tempCart.push({
          id: `temp_${product.id}`,
          product: product.id,
          product_name: product.name,
          product_image: product.image,
          price: product.price,
          quantity: qty,
          product_stock: product.stock
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

  return (
    <ProductsContainer>
      
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Our Products
      </motion.h1>

      <FilterContainer>
        <SearchBar>
          <FaSearch />
          <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </SearchBar>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} whileHover={{ scale: 1.01 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} whileHover={{ scale: 1.01 }}>
          <option value="">Sort By</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </Select>
      </FilterContainer>

      <ProductGrid>
        {filtered.map((product, index) => {
          const qty = quantities[product.id] || 1;
          const isAtLimit = qty >= product.stock;

          return (
            <ProductCard key={product.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }} whileHover={{ y: -4 }}>
              {product.image && (
                <ProductImage>
                  <Link to={`/products/${product.id}/`}>
                    <img src={product.image} alt={product.name} />
                  </Link>
                </ProductImage>
              )}
              <ProductInfo>
                <h3>
                  <Link to={`/products/${product.id}/`} style={{ color: '#2e7d32', textDecoration: 'none' }}>{product.name}</Link>
                </h3>
                <p>{product.description?.slice(0, 55)}...</p>
                <Price>${product.price.toFixed(2)}</Price>
                <QuantityControl>
                  <button onClick={() => setQuantities(prev => ({ ...prev, [product.id]: Math.max(1, prev[product.id] - 1) }))} disabled={qty <= 1}>-</button>
                  <span>{qty}</span>
                  <button disabled={isAtLimit} onClick={() => setQuantities(prev => ({ ...prev, [product.id]: Math.min(product.stock, prev[product.id] + 1) }))} style={{ opacity: isAtLimit ? 0.5 : 1, cursor: isAtLimit ? 'not-allowed' : 'pointer' }}>+</button>
                </QuantityControl>
                {isAtLimit && <LimitWarning>Only {product.stock} left in stock!</LimitWarning>}
                <AddToCartButton onClick={() => addToCart(product)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <FaShoppingCart /> Add to Cart
                </AddToCartButton>
              </ProductInfo>
            </ProductCard>
          );
        })}
      </ProductGrid>
    </ProductsContainer>
  );
};

// --- STYLED COMPONENTS ---
const ProductsContainer = styled.div`
  padding: 7rem 2rem 2rem 2rem; 
  max-width: 1200px; margin: 0 auto; min-height: 100vh; 
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
  h1 { color: #2e7d32; text-align: center; margin-bottom: 2rem; font-size: 2.2rem; }
  @media (max-width: 600px) { 
    padding: 6rem 0.75rem 1rem 0.75rem; 
    h1 { font-size: 1.75rem; margin-bottom: 1.25rem; } 
  }
`;
const FilterContainer = styled.div`
  display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; align-items: center; width: 100%;
  @media (min-width: 768px) { flex-direction: row; justify-content: center; gap: 1rem; }
`;
const SearchBar = styled.div` 
  display: flex; align-items: center; background: white; padding: 0.6rem 1.2rem; border-radius: 30px; box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1); width: 100%; max-width: 400px; box-sizing: border-box;
  input { border: none; margin-left: 0.5rem; font-size: 1rem; width: 100%; &:focus { outline: none; } } svg { color: #9e9e9e; }
`;
const Select = styled(motion.select)` 
  width: 100%; max-width: 400px; box-sizing: border-box; padding: 0.6rem 1.2rem; border-radius: 30px; border: 2px solid #e0e0e0; background: white; font-size: 1rem; cursor: pointer;
  @media (min-width: 768px) { width: auto; min-width: 180px; } &:focus { outline: none; border-color: #4CAF50; }
`;
const ProductGrid = styled.div` 
  display: grid; gap: 1.25rem; width: 100%; box-sizing: border-box; grid-template-columns: 1fr; 
  @media (min-width: 480px) { grid-template-columns: repeat(2, 1fr); } @media (min-width: 800px) { grid-template-columns: repeat(3, 1fr); } @media (min-width: 1100px) { grid-template-columns: repeat(4, 1fr); }
`;
const ProductCard = styled(motion.div)`
  background: white; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.08); display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box;
`;
const ProductImage = styled.div`
  width: 100%; aspect-ratio: 1 / 1; height: auto; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 12px; margin-bottom: 0.75rem; overflow: hidden;
  img { width: 100%; height: 100%; object-fit: contain; display: block; }
`;
const ProductInfo = styled.div`
  display: flex; flex-direction: column; flex-grow: 1;
  h3 { font-size: 1.1rem; line-height: 1.4; height: 48px; display: flex; align-items: center; margin: 0 0 0.5rem 0; overflow: hidden; } p { color: #616161; font-size: 0.85rem; height: 38px; overflow: hidden; margin: 0 0 0.75rem 0; line-height: 1.4; }
`;
const Price = styled.div` font-size: 1.25rem; font-weight: 700; color: #1b5e20; margin-bottom: 0.75rem; `;
const QuantityControl = styled.div`
  display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; margin-top: auto;
  button { background: #e8f5e9 !important; color: #2e7d32 !important; border: none; padding: 0.3rem 0.8rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s ease; &:hover:not(:disabled) { background: #c8e6c9 !important; } }
  span { min-width: 25px; text-align: center; font-size: 0.95rem; }
`;
const AddToCartButton = styled(motion.button)`
  width: 100%; padding: 0.75rem; background: #4CAF50 !important; color: #ffffff !important; border: none; border-radius: 12px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background-color 0.3s ease;
  &:hover { background: #388e3c !important; color: #ffffff !important; } &:active { background: #2e7d32 !important; color: #ffffff !important; }
`;
const LimitWarning = styled.p` color: #d32f2f; font-size: 0.75rem; margin: -0.25rem 0 0.75rem 0; font-weight: 600; height: auto !important; `;
export default Products;