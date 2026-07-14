import { useEffect, useState, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaTimes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const ProductsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const emptyForm = { name: '', description: '', price: '', stock: '', category: '', image_url: '' };
  const [form, setForm] = useState(emptyForm);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await axiosInstance.get(`/api/products/?page=${currentPage}`);
      setProducts(res.data.results || res.data);
      if (res.data.count) setTotalPages(Math.ceil(res.data.count / 12));
    } catch { setProducts([]); }
  };

  useEffect(() => {
    fetchProducts();
    axiosInstance.get('/api/categories/').then(res => setCategories(res.data.results || res.data)).catch(() => setCategories([]));
    // eslint-disable-next-line
  }, [axiosInstance, currentPage]);

  const handleOpenModal = (product = null) => {
    if (product) {
      setForm({ name: product.name, description: product.description, price: product.price, stock: product.stock, category: product.category, image_url: product.image_url });
      setEditId(product.id);
    } else {
      setForm(emptyForm);
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await axiosInstance.put(`/api/products/${editId}/`, form);
        toast.success('✏️ Product updated successfully');
      } else {
        await axiosInstance.post('/api/products/', form);
        toast.success('✅ Product added successfully');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch { toast.error('❌ Error saving product'); }
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    try {
      await axiosInstance.delete(`/api/products/${productToDelete}/`);
      toast.success('🗑️ Product deleted successfully');
      fetchProducts();
    } catch { toast.error('❌ Error deleting product'); } 
    finally { setIsDeleteModalOpen(false); setProductToDelete(null); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>
        <span>📦 Manage Products</span>
        <AddNewButton onClick={() => handleOpenModal()} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><FaPlus /> Add Product</AddNewButton>
      </SectionTitle>

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {products.map(p => (
          <ListItem key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ContentColumn>
              <div style={{ fontSize: '1.1rem' }}><strong>{p.name}</strong> - <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>${Number(p.price).toFixed(2)}</span></div>
              <div style={{ color: p.stock > 0 ? '#555' : '#e74c3c', fontSize: '0.9rem', fontWeight: 'bold' }}>Inventory: {p.stock} units</div>
              <div style={{ fontSize: '0.9rem', color: '#757575', maxWidth: '100%' }}>{p.description ? `${p.description.substring(0, 80)}...` : 'No description provided.'}</div>
            </ContentColumn>
            <ActionRow>
              <ActionButton $bg="#3498db" onClick={() => handleOpenModal(p)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><FaEdit /> Edit</ActionButton>
              <ActionButton $bg="#e74c3c" onClick={() => { setProductToDelete(p.id); setIsDeleteModalOpen(true); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><FaTrash /> Delete</ActionButton>
            </ActionRow>
          </ListItem>
        ))}
      </ul>

      {totalPages > 1 && (
        <PaginationWrapper>
          <PageButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Previous</PageButton>
          <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
          <PageButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next &rarr;</PageButton>
        </PaginationWrapper>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <ConfirmOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfirmCard>
              <h3>Delete Product</h3>
              <p>Are you sure you want to delete this product? This action cannot be undone.</p>
              <ButtonGroup>
                <CancelBtn onClick={() => setIsDeleteModalOpen(false)}>Cancel</CancelBtn>
                <ConfirmDeleteBtn onClick={executeDelete}>Yes, Delete</ConfirmDeleteBtn>
              </ButtonGroup>
            </ConfirmCard>
          </ConfirmOverlay>
        )}
        {isModalOpen && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)}>
            <ModalCard onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setIsModalOpen(false)}><FaTimes /></CloseButton>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#2c3e50', fontSize: '1.4rem' }}>{editId ? 'Update Product' : 'Add New Product'}</h3>
              <AdminInput placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <AdminTextarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <AdminInput placeholder="Price ($)" type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || '' })} />
                <AdminInput placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || '' })} />
              </div>
              <AdminSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </AdminSelect>
              <AdminInput placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
              <SaveButton onClick={handleSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>{editId ? 'Save Changes' : 'Create Product'}</SaveButton>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductsSection;

// STYLED COMPONENTS
const SectionTitle = styled.h2` color: #2e7d32; margin-bottom: 1.5rem; font-size: 1.5rem; display: flex; justify-content: space-between; align-items: center; `;
const AddNewButton = styled(motion.button)` background: #2e7d32; color: white; border: none; padding: 0.8rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(46,125,50,0.2); &:hover { background: #1b5e20; } `;
const ListItem = styled(motion.li)` background: #ffffff; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 12px rgba(46,125,50,0.05); border: 1px solid #e8f5e9; @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; } `;
const ContentColumn = styled.div` display: flex; flex-direction: column; gap: 0.4rem; `;
const ActionRow = styled.div` display: flex; gap: 0.5rem; `;
const ActionButton = styled(motion.button)` padding: 0.6rem 1rem; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; color: white; background: ${props => props.$bg}; &:hover { filter: brightness(0.9); } `;
// Pagination Styles
const PaginationWrapper = styled.div` display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; padding-bottom: 1rem; `;
const PageButton = styled.button` padding: 0.6rem 1.2rem; border-radius: 8px; border: none; font-weight: bold; background: ${props => props.disabled ? '#e0e0e0' : '#4caf50'}; color: ${props => props.disabled ? '#9e9e9e' : 'white'}; cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'}; transition: 0.2s; &:hover:not(:disabled) { background: #388e3c; } `;
const PageInfo = styled.span` font-weight: bold; color: #555; background: #f5f5f5; padding: 0.6rem 1rem; border-radius: 8px; `;
// Modal Styling
const ModalOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; `;
const ModalCard = styled(motion.div)` background: white; width: 100%; max-width: 500px; border-radius: 20px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.2); position: relative; max-height: 90vh; overflow-y: auto; `;
const CloseButton = styled.button` position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; font-size: 1.2rem; color: #999; cursor: pointer; &:hover { color: #333; } `;
const AdminInput = styled.input` width: 100%; padding: 12px; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; &:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 2px rgba(46,125,50,0.2); } `;
const AdminTextarea = styled.textarea` width: 100%; padding: 12px; margin-bottom: 1rem; min-height: 100px; resize: vertical; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; &:focus { outline: none; border-color: #2e7d32; } `;
const AdminSelect = styled.select` width: 100%; padding: 12px; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; &:focus { outline: none; border-color: #2e7d32; } `;
const SaveButton = styled(motion.button)` width: 100%; padding: 12px; background: #2e7d32; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; &:hover { background: #1b5e20; } `;
// Confirm Modal
const ConfirmOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem; `;
const ConfirmCard = styled(motion.div)` background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;`;
const ConfirmDeleteBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #d32f2f; color: #ffffff; &:hover { background: #b71c1c; } `;
const CancelBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #757575; color: #ffffff; &:hover { background: #616161; } `;