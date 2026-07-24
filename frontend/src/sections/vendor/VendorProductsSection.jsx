import { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBox, FaPlus, FaEdit, FaTrash, FaTimes, FaTag, FaImage } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import AuthContext from '../../context/AuthContext';

// ==========================================
// PRODUCT ADD/EDIT MODAL
// ==========================================
const ProductModal = ({ isOpen, onClose, onSubmit, initialData, categories, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
          price: initialData.price || '',
          stock: initialData.stock || '',
          category: initialData.category || '',
          image_url: initialData.image_url || ''
        });
      } else {
        setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.stock || !formData.category || !formData.image_url) {
      return toast.error("Please fill in all required fields.");
    }
    onSubmit(formData);
  };

  return (
    <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ModalCard initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} style={{ maxWidth: '550px' }}>
        <CloseBtn onClick={onClose}><FaTimes /></CloseBtn>
        <FaBox size={32} color="#2e7d32" style={{ marginBottom: '1rem' }} />
        <h3>{initialData ? 'Edit Product' : 'Add New Product'}</h3>
        <p>{initialData ? 'Update your listing details.' : 'List a new product on the marketplace.'}</p>
        
        <ModalContentWrapper>
          <FormGroup>
            <label>Product Name</label>
            <InputField type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Wireless Noise-Cancelling Headphones" />
          </FormGroup>

          <GridRow>
            <FormGroup>
              <label>Price ($)</label>
              <InputField type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" />
            </FormGroup>
            <FormGroup>
              <label>Stock Quantity</label>
              <InputField type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" />
            </FormGroup>
          </GridRow>

          <FormGroup>
            <label>Category</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              <option value="">-- Select a Category --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup>
            <label>Image URL</label>
            <InputField type="url" name="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://example.com/image.jpg" />
          </FormGroup>

          <FormGroup>
            <label>Description</label>
            <textarea name="description" rows="3" value={formData.description} onChange={handleChange} placeholder="Describe the product's features and benefits..." />
          </FormGroup>

          <ButtonGroup style={{ marginTop: '0.5rem' }}>
            <ModalSecondaryButton onClick={onClose} disabled={isSubmitting}>Cancel</ModalSecondaryButton>
            <ModalPrimaryButton onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </ModalPrimaryButton>
          </ButtonGroup>
        </ModalContentWrapper>
      </ModalCard>
    </Overlay>
  );
};

// ==========================================
// VENDOR PRODUCTS SECTION COMPONENT
// ==========================================
const VendorProductsSection = () => {
  const { user, axiosInstance } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, initialData: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        axiosInstance.get(`/api/products/?vendor=${user.id}`),
        axiosInstance.get('/api/categories/')
      ]);
      
      setProducts(prodRes.data.results || prodRes.data);
      setCategories(catRes.data.results || catRes.data);
    } catch (error) {
      toast.error('❌ Failed to load catalog data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
    // eslint-disable-next-line
  }, []);

  const handleOpenModal = (product = null) => {
    setModalConfig({ isOpen: true, initialData: product });
  };

  const handleCloseModal = () => {
    setModalConfig({ isOpen: false, initialData: null });
  };

  const handleSaveProduct = async (formData) => {
    setIsSubmitting(true);
    try {
      if (modalConfig.initialData) {
        await axiosInstance.patch(`/api/products/${modalConfig.initialData.id}/`, formData);
        toast.success('📦 Product updated successfully!');
      } else {
        await axiosInstance.post('/api/products/', formData);
        toast.success('📦 Product submitted for approval!');
      }
      fetchCatalogData();
      handleCloseModal();
    } catch (err) {
      toast.error('❌ Failed to save product. Please check the fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await axiosInstance.delete(`/api/products/${id}/`);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('🗑️ Product removed.');
    } catch (err) {
      toast.error('❌ Failed to delete product.');
    }
  };

  const getCategoryName = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'Uncategorized';
  };

  if (isLoading) {
    return <LoadingWrapper><Spinner /><p style={{ color: '#2e7d32', fontWeight: 'bold' }}>Loading Catalog...</p></LoadingWrapper>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <AnimatePresence>
        {modalConfig.isOpen && (
          <ProductModal 
            isOpen={modalConfig.isOpen} 
            onClose={handleCloseModal} 
            onSubmit={handleSaveProduct} 
            initialData={modalConfig.initialData} 
            categories={categories}
            isSubmitting={isSubmitting} 
          />
        )}
      </AnimatePresence>

      <SectionHeader>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>My Catalog</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Manage your inventory and track approval statuses.</p>
        </div>
        <AddButton onClick={() => handleOpenModal()}><FaPlus /> Add New Product</AddButton>
      </SectionHeader>

      {products.length === 0 ? (
        <EmptyState>
          <FaTag size={48} color="#94a3b8" />
          <p>Your catalog is empty. Start listing products to make sales!</p>
        </EmptyState>
      ) : (
        <ProductGrid>
          {products.map((product) => (
            <ProductCard key={product.id}>
              <div className="img-container">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <div className="no-img"><FaImage size={32} color="#cbd5e1" /></div>
                )}
                {/* 🚀 FIXED: Added Fallback to prevent toUpperCase crash */}
                <span className={`status-badge ${product.approval_status || 'pending'}`}>
                  {(product.approval_status || 'pending').toUpperCase()}
                </span>
              </div>
              
              <div className="details">
                <h4 className="truncate">{product.name}</h4>
                <div className="meta">
                  <span className="price">${Number(product.price).toFixed(2)}</span>
                  <span className="stock">Stock: {product.stock}</span>
                </div>
                <p className="category"><FaTag size={12} /> {getCategoryName(product.category)}</p>
                
                <div className="actions">
                  <button className="edit" onClick={() => handleOpenModal(product)}><FaEdit /> Edit</button>
                  <button className="delete" onClick={() => handleDeleteProduct(product.id, product.name)}><FaTrash /></button>
                </div>
              </div>
            </ProductCard>
          ))}
        </ProductGrid>
      )}
    </motion.div>
  );
};

// ==========================================
// STYLED COMPONENTS 
// ==========================================
const LoadingWrapper = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 0; `;
const Spinner = styled.div` width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top: 4px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; @keyframes spin { to { transform: rotate(360deg); } } `;

const SectionHeader = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; background: white; padding: 1.5rem 2rem; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; `;
const AddButton = styled.button` display: flex; align-items: center; gap: 0.5rem; background: #e8f5e9; color: #2e7d32; border: 1px solid #81c784; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; &:hover { background: #c8e6c9; } `;
const EmptyState = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; color: #64748b; p { margin-top: 1rem; font-weight: 500; } `;

const ProductGrid = styled.div` display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; `;
const ProductCard = styled.div` 
  background: white; 
  border-radius: 16px; 
  overflow: hidden; 
  box-shadow: 0 4px 15px rgba(0,0,0,0.03); 
  border: 1px solid #f1f5f9; 
  display: flex; 
  flex-direction: column; 
  
  .img-container { 
    position: relative; 
    height: 200px;
    background: #ffffff;
    border-bottom: 1px solid #f1f5f9; 
    padding: 1rem;
    box-sizing: border-box;

    img { 
      width: 100%; 
      height: 100%; 
      object-fit: contain; 
    } 
    .no-img { 
      width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
    } 
    .status-badge { 
      position: absolute; top: 10px; right: 10px; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
    }
    .status-badge.approved { background: #e8f5e9; color: #16a34a; border: 1px solid #86efac; }
    .status-badge.pending { background: #fef3c7; color: #d97706; border: 1px solid #fde047; }
    .status-badge.rejected { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
  }
  .details { 
    padding: 1.5rem; display: flex; flex-direction: column; flex: 1; 
    h4 { margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1.1rem; } 
    .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; .price { font-size: 1.2rem; font-weight: 900; color: #2e7d32; } .stock { font-size: 0.9rem; color: #64748b; font-weight: 600; } }
    .category { color: #94a3b8; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin: 0 0 1.5rem 0; }
    .actions { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: auto; 
      button { flex: 1; padding: 0.6rem; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 0.4rem; }
      .edit { background: #f1f5f9; color: #334155; &:hover { background: #e2e8f0; } }
      .delete { background: #fee2e2; color: #dc2626; &:hover { background: #fca5a5; } }
    }
  }
`;

// MODAL UI
const Overlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); `;
const ModalCard = styled(motion.div)` position: relative; background: white; padding: 2.5rem; border-radius: 20px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); h3 { margin: 0 0 0.5rem 0; color: #0f172a; } p { color: #64748b; margin-bottom: 0; font-size: 0.95rem; }`;
const CloseBtn = styled.button` position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; &:hover { color: #0f172a; } `;

const ModalContentWrapper = styled.div` display: flex; flex-direction: column; gap: 1rem; width: 100%; margin-top: 1.5rem; box-sizing: border-box; `;
const GridRow = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; box-sizing: border-box; `;

const FormGroup = styled.div` display: flex; flex-direction: column; gap: 0.4rem; text-align: left; width: 100%; box-sizing: border-box; 
  label { font-weight: 600; color: #1e293b; font-size: 0.9rem; } 
  select, textarea { width: 100%; padding: 0.8rem 1rem; border-radius: 10px; border: 2px solid #e2e8f0; font-size: 1rem; outline: none; font-family: inherit; box-sizing: border-box; transition: 0.2s; &:focus { border-color: #2e7d32; } } 
  select { background: white; cursor: pointer; } 
  textarea { resize: vertical; min-height: 80px; }
`;

const InputField = styled.input` width: 100%; padding: 0.8rem 1rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; outline: none; box-sizing: border-box; font-family: inherit; transition: 0.2s; &:focus { border-color: #2e7d32; } `;

const ButtonGroup = styled.div` display: flex; gap: 1rem; width: 100%; justify-content: center; box-sizing: border-box; `;
const ModalPrimaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #2e7d32; color: white; font-weight: bold; font-size: 1rem; box-sizing: border-box; transition: 0.2s; &:hover:not(:disabled) { filter: brightness(1.1); } &:disabled { opacity: 0.6; cursor: not-allowed; } `;
const ModalSecondaryButton = styled.button` flex: 1; padding: 0.9rem 0; border: none; border-radius: 10px; cursor: pointer; background: #f1f5f9; color: #475569; font-weight: bold; font-size: 1rem; box-sizing: border-box; transition: 0.2s; &:hover { background: #e2e8f0; } `;

export default VendorProductsSection;