import { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { FaSearch, FaShoppingCart, FaArrowRight, FaFilter, FaTimes } from 'react-icons/fa';
import { toast } from "react-hot-toast";
import { Link } from 'react-router-dom';

const Products = () => {
  const { axiosInstance, user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quantities, setQuantities] = useState({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Core Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  
  // UI Slider State
  const [highestPrice, setHighestPrice] = useState(1000);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounced Engine State
  const [debouncedMin, setDebouncedMin] = useState(0);
  const [debouncedMax, setDebouncedMax] = useState(1000);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMin(minPrice);
      setDebouncedMax(maxPrice);
    }, 500); 
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await axiosInstance.get(`/api/products/?page=${currentPage}`);
        const items = res.data.results || res.data;

        if (res.data.count) {
          setTotalPages(Math.ceil(res.data.count / 12));
        }

        const productsData = await Promise.all(items.map(async p => {
          const { data } = await axiosInstance.get(`/api/products/${p.id}/`);
          return { ...p, price: Number(p.price), image: data.image_url, stock: data.stock || 0 };
        }));
        
        setProducts(productsData);
            
        const calculatedMaxPrice = Math.ceil(Math.max(...productsData.map(p => p.price), 100));
        setHighestPrice(calculatedMaxPrice);
        setMaxPrice(calculatedMaxPrice);
        setDebouncedMax(calculatedMaxPrice); 
        
        const initialQuantities = {};
        productsData.forEach(p => initialQuantities[p.id] = 1);
        setQuantities(initialQuantities);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    };

    fetchCatalog();

    axiosInstance.get('/api/categories/')
      .then(res => setCategories(res.data.results || res.data))
      .catch(() => toast.error('❌ Failed to load categories.'));
      
  }, [axiosInstance, currentPage]); 

  // Unified Filtering Logic
  useEffect(() => {
    let result = [...products];
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category) result = result.filter(p => p.category === parseInt(category));
    if (inStockOnly) result = result.filter(p => p.stock > 0);
    result = result.filter(p => p.price >= debouncedMin && p.price <= debouncedMax);

    if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
    
    setFiltered(result);
  }, [search, category, sort, debouncedMin, debouncedMax, inStockOnly, products]);

  const clearFilters = () => {
    setSearch(''); setCategory(''); setSort(''); setMinPrice(0); setMaxPrice(highestPrice); setInStockOnly(false);
  };

  const filtersActive = search || category || sort || minPrice > 0 || maxPrice < highestPrice || inStockOnly;

  const addToCart = async (product) => {
    const qty = quantities[product.id] || 1;
    if (qty > product.stock) return toast.error(`Only ${product.stock} in stock!`);

    if (user) {
      try {
        await axiosInstance.post('/api/cart-items/', { product: product.id, quantity: qty });
        toast.success(t => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>🛒 <b>{product.name}</b> added to cart!</span>
            <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>
              Go to Cart <FaArrowRight size={12} />
            </Link>
          </div>
        ));
      } catch (err) {
        const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || '';
        if (msg.toLowerCase().includes('already')) toast.error(`⚠️ ${product.name} is already in your cart.`);
        else toast.error(`❌ Failed to add to cart.`);
      }
    } else {
      let tempCart = JSON.parse(localStorage.getItem('tempCart')) || [];
      const existing = tempCart.find(item => String(item.product) === String(product.id));
      if (existing) {
        if (existing.quantity + qty > product.stock) return toast.error(`Cannot exceed stock limit`);
        existing.quantity += qty;
      } else {
        tempCart.push({ id: `temp_${product.id}`, product: product.id, product_name: product.name, product_image: product.image, price: product.price, quantity: qty, product_stock: product.stock });
      }
      localStorage.setItem('tempCart', JSON.stringify(tempCart));
      toast.success(t => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span>🛒 <b>{product.name}</b> added to guest cart!</span>
          <Link to="/cart/" onClick={() => toast.dismiss(t.id)} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginTop: '4px' }}>Go to Cart <FaArrowRight size={12} /></Link>
        </div>
      ));
    }
  };

  return (
    <ProductsContainer>
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>Our Products</motion.h1>

      <FilterSection>
        <FilterRow>
          <SearchBar><FaSearch /><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} /></SearchBar>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Sort By</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </Select>
          <AdvancedToggle onClick={() => setShowFilters(!showFilters)} $active={showFilters}><FaFilter /> Filters</AdvancedToggle>
        </FilterRow>

        <AnimatePresence>
          {showFilters && (
            <AdvancedFilterPanel initial={{ opacity: 0, height: 0, padding: 0 }} animate={{ opacity: 1, height: 'auto', padding: '1.5rem 2rem' }} exit={{ opacity: 0, height: 0, padding: 0 }}>
              <FilterColumn $justify="flex-end">
                <PriceSliderContainer>
                  <label>Price Range:</label>
                  <SliderTrack>
                    <TrackFill $min={(minPrice / highestPrice) * 100} $max={(maxPrice / highestPrice) * 100} />
                    <ThumbInput type="range" min="0" max={highestPrice} value={minPrice} onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 1))} style={{ zIndex: minPrice > highestPrice * 0.9 ? 5 : 3 }} />
                    <ThumbInput type="range" min="0" max={highestPrice} value={maxPrice} onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 1))} />
                  </SliderTrack>
                  <PriceLabel>${minPrice} - ${maxPrice}</PriceLabel>
                </PriceSliderContainer>
              </FilterColumn>
              <FilterColumn $justify="center">
                <ToggleSwitch><input type="checkbox" id="stockToggle" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /><label htmlFor="stockToggle">In Stock Only</label></ToggleSwitch>
              </FilterColumn>
              <FilterColumn $justify="flex-start">
                <ClearButtonWrapper>
                  <AnimatePresence>
                    {filtersActive && <ClearButton onClick={clearFilters} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><FaTimes /> Clear All</ClearButton>}
                  </AnimatePresence>
                </ClearButtonWrapper>
              </FilterColumn>
            </AdvancedFilterPanel>
          )}
        </AnimatePresence>
      </FilterSection>

      {filtered.length === 0 ? (
        <EmptyState>No products match your filters.</EmptyState>
      ) : (
        <ProductGrid>
          {filtered.map((product, index) => {
            const qty = quantities[product.id] || 1;
            const isAtLimit = qty >= product.stock;

            return (
              <ProductCard key={product.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }} whileHover={{ y: -4 }}>
                {product.image && (
                  <ProductImage><Link to={`/products/${product.id}/`}><img src={product.image} alt={product.name} /></Link></ProductImage>
                )}
                <ProductInfo>
                  <h3><Link to={`/products/${product.id}/`} style={{ color: '#2e7d32', textDecoration: 'none' }}>{product.name}</Link></h3>
                  <p>{product.description?.slice(0, 55)}...</p>
                  <Price>${product.price.toFixed(2)}</Price>
                  
                  <QuantityControl>
                    <button onClick={() => setQuantities(prev => ({ ...prev, [product.id]: Math.max(1, prev[product.id] - 1) }))} disabled={qty <= 1}>-</button>
                    <span>{qty}</span>
                    <button disabled={isAtLimit} onClick={() => setQuantities(prev => ({ ...prev, [product.id]: Math.min(product.stock, prev[product.id] + 1) }))} style={{ opacity: isAtLimit ? 0.5 : 1, cursor: isAtLimit ? 'not-allowed' : 'pointer' }}>+</button>
                  </QuantityControl>
                  
                  {isAtLimit ? <LimitWarning>Only {product.stock} left!</LimitWarning> : product.stock === 0 ? <LimitWarning>Out of Stock</LimitWarning> : null}
                  <AddToCartButton onClick={() => addToCart(product)} disabled={product.stock === 0} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ opacity: product.stock === 0 ? 0.6 : 1 }}>
                    <FaShoppingCart /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </AddToCartButton>
                </ProductInfo>
              </ProductCard>
            );
          })}
        </ProductGrid>
      )}

      {totalPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
          <PageButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}
    </ProductsContainer>
  );
};

export default Products;

// --- STYLED COMPONENTS ---
const ProductsContainer = styled.div` padding: 7rem 2rem 2rem 2rem; max-width: 1200px; margin: 0 auto; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); h1 { color: #2e7d32; text-align: center; margin-bottom: 2rem; font-size: 2.2rem; } @media (max-width: 600px) { padding: 6rem 0.75rem 1rem 0.75rem; h1 { font-size: 1.75rem; margin-bottom: 1.25rem; } }`;
const FilterSection = styled.div` display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; width: 100%; `;
const FilterRow = styled.div` display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: center; width: 100%; `;
const SearchBar = styled.div` display: flex; align-items: center; background: white; padding: 0.6rem 1.2rem; border-radius: 30px; box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1); flex: 1; min-width: 250px; max-width: 400px; input { border: none; margin-left: 0.5rem; font-size: 1rem; width: 100%; &:focus { outline: none; } } svg { color: #9e9e9e; }`;
const Select = styled.select` padding: 0.6rem 1.2rem; border-radius: 30px; border: 2px solid #e0e0e0; background: white; font-size: 1rem; cursor: pointer; flex: 1; min-width: 160px; max-width: 200px; &:focus { outline: none; border-color: #4CAF50; }`;
const AdvancedToggle = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 30px; border: 2px solid ${props => props.$active ? '#4CAF50' : '#e0e0e0'}; background: ${props => props.$active ? '#e8f5e9' : 'white'}; color: ${props => props.$active ? '#2e7d32' : '#333'}; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; &:hover { border-color: #4CAF50; }`;
const AdvancedFilterPanel = styled(motion.div)` display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 2rem; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(46,125,50,0.08); overflow: hidden; @media (max-width: 900px) { grid-template-columns: 1fr; justify-items: center; gap: 1.5rem; }`;
const FilterColumn = styled.div` display: flex; align-items: center; justify-content: ${props => props.$justify}; width: 100%; @media (max-width: 900px) { justify-content: center; }`;
const ClearButtonWrapper = styled.div` width: 120px; display: flex; align-items: center;`;
const PriceSliderContainer = styled.div` display: flex; align-items: center; gap: 1rem; width: 100%; max-width: 450px; label { font-weight: 600; color: #424242; white-space: nowrap; } @media (max-width: 600px) { flex-direction: column; align-items: stretch; max-width: 100%; }`;
const SliderTrack = styled.div` position: relative; height: 6px; background: #e0e0e0; border-radius: 4px; flex: 1; margin: 0 10px; display: flex; align-items: center;`;
const TrackFill = styled.div` position: absolute; height: 100%; background: #4CAF50; border-radius: 4px; left: ${props => props.$min}%; right: ${props => 100 - props.$max}%;`;
const ThumbInput = styled.input` position: absolute; width: 100%; -webkit-appearance: none; background: transparent; pointer-events: none; outline: none; &::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 20px; height: 20px; background: white; border: 3px solid #4CAF50; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15); } &::-moz-range-thumb { pointer-events: auto; width: 20px; height: 20px; background: white; border: 3px solid #4CAF50; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }`;
const PriceLabel = styled.div` font-weight: 700; color: #2e7d32; font-size: 1rem; min-width: 90px; text-align: center; white-space: nowrap;`;
const ToggleSwitch = styled.div` display: flex; align-items: center; gap: 0.5rem; margin-left: 1rem; label { font-weight: 600; color: #424242; cursor: pointer; } input[type="checkbox"] { width: 18px; height: 18px; accent-color: #4CAF50; cursor: pointer; } @media (max-width: 600px) { margin-left: 0; justify-content: center; }`;
const ClearButton = styled(motion.button)` display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #ffebee; color: #d32f2f; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; &:hover { background: #ffcdd2; }`;
const EmptyState = styled.div` text-align: center; padding: 3rem; color: #757575; font-size: 1.2rem; font-style: italic; background: white; border-radius: 16px; `;
const ProductGrid = styled.div` display: grid; gap: 1.25rem; width: 100%; box-sizing: border-box; grid-template-columns: 1fr; @media (min-width: 480px) { grid-template-columns: repeat(2, 1fr); } @media (min-width: 800px) { grid-template-columns: repeat(3, 1fr); } @media (min-width: 1100px) { grid-template-columns: repeat(4, 1fr); }`;
const ProductCard = styled(motion.div)` background: white; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.08); display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box;`;
const ProductImage = styled.div` width: 100%; aspect-ratio: 1 / 1; height: auto; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 12px; margin-bottom: 0.75rem; overflow: hidden; img { width: 100%; height: 100%; object-fit: contain; display: block; }`;
const ProductInfo = styled.div` display: flex; flex-direction: column; flex-grow: 1; h3 { font-size: 1.1rem; line-height: 1.4; height: 48px; display: flex; align-items: center; margin: 0 0 0.5rem 0; overflow: hidden; } p { color: #616161; font-size: 0.85rem; height: 38px; overflow: hidden; margin: 0 0 0.75rem 0; line-height: 1.4; }`;
const Price = styled.div` font-size: 1.25rem; font-weight: 700; color: #1b5e20; margin-bottom: 0.75rem; `;
const QuantityControl = styled.div` display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; margin-top: auto; button { background: #e8f5e9 !important; color: #2e7d32 !important; border: none; padding: 0.3rem 0.8rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s ease; &:hover:not(:disabled) { background: #c8e6c9 !important; } } span { min-width: 25px; text-align: center; font-size: 0.95rem; }`;
const AddToCartButton = styled(motion.button)` width: 100%; padding: 0.75rem; background: #4CAF50 !important; color: #ffffff !important; border: none; border-radius: 12px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background-color 0.3s ease; &:hover:not(:disabled) { background: #388e3c !important; color: #ffffff !important; } &:active:not(:disabled) { background: #2e7d32 !important; color: #ffffff !important; }`;
const LimitWarning = styled.p` color: #d32f2f; font-size: 0.75rem; margin: -0.25rem 0 0.75rem 0; font-weight: 600; height: auto !important; `;
// Pagination Styles
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;