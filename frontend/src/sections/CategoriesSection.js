import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";
import { FaTimes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const CategoriesSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const fetchCategories = async () => {
    const res = await axiosInstance.get('/api/categories/');
    setCategories(res.data);
  };
  
  // eslint-disable-next-line
  useEffect(() => { fetchCategories(); }, []);

  const handleOpenModal = (category = null) => {
    if (category) { setForm({ name: category.name }); setEditId(category.id); } 
    else { setForm({ name: '' }); setEditId(null); }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Category name cannot be empty');
    try {
      if (editId) {
        await axiosInstance.put(`/api/categories/${editId}/`, form);
        toast.success('✏️ Category updated');
      } else {
        await axiosInstance.post('/api/categories/', form);
        toast.success('📂 Category added');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch { toast.error('❌ Failed to save category'); }
  };

  const promptDelete = (id) => {
    setCategoryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await axiosInstance.delete(`/api/categories/${categoryToDelete}/`);
      toast.success('✅ Category deleted');
      fetchCategories();
    } catch { 
      toast.error('❌ Failed to delete category'); 
    } finally {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>
        <span>📂 Manage Categories</span>
        <AddNewButton onClick={() => handleOpenModal()} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <FaPlus /> Add Category
        </AddNewButton>
      </SectionTitle>

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {categories.map(c => (
          <ListItem key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#333' }}>{c.name}</div>
            <ActionRow>
              <ActionButton $bg="#3498db" onClick={() => handleOpenModal(c)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><FaEdit/> Edit</ActionButton>
              <ActionButton $bg="#e74c3c" onClick={() => promptDelete(c.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><FaTrash/> Delete</ActionButton>
            </ActionRow>
          </ListItem>
        ))}
      </ul>

      {/* --- Delete Confirmation Modal --- */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <ConfirmOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfirmCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3>Delete Category</h3>
              <p>Delete this category? This might break product assignments.</p>
              <ButtonGroup>
                <CancelBtn onClick={() => setIsDeleteModalOpen(false)}>Cancel</CancelBtn>
                <ConfirmDeleteBtn onClick={executeDelete}>Yes, Delete</ConfirmDeleteBtn>
              </ButtonGroup>
            </ConfirmCard>
          </ConfirmOverlay>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)}>
            <ModalCard initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setIsModalOpen(false)}><FaTimes /></CloseButton>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#2c3e50', fontSize: '1.4rem' }}>{editId ? 'Update Category' : 'Add Category'}</h3>
              <AdminInput placeholder="Enter Category Name" value={form.name} onChange={e => setForm({ name: e.target.value })} autoFocus />
              <SaveButton onClick={handleSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                {editId ? 'Save Changes' : 'Create Category'}
              </SaveButton>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CategoriesSection;

// --- Styled Components ---
const SectionTitle = styled.h2` color: #2e7d32; margin-bottom: 1.5rem; font-size: 1.5rem; display: flex; justify-content: space-between; align-items: center; `;
const AddNewButton = styled(motion.button)` background: #2e7d32; color: white; border: none; padding: 0.8rem 1.2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2); &:hover { background: #1b5e20; } `;
const ListItem = styled(motion.li)` background: #ffffff; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.05); border: 1px solid #e8f5e9; @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; } `;
const ActionRow = styled.div` display: flex; gap: 0.5rem; `;
const ActionButton = styled(motion.button)` padding: 0.6rem 1rem; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; color: white; background: ${props => props.$bg || '#3498db'}; &:hover { filter: brightness(0.9); } `;
const ModalOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; `;
const ModalCard = styled(motion.div)` background: white; width: 90%; max-width: 400px; border-radius: 20px; padding: 2rem; position: relative; `;
const CloseButton = styled.button` position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; font-size: 1.2rem; color: #999; cursor: pointer; `;
const AdminInput = styled.input` width: 100%; padding: 12px; margin-bottom: 1.5rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; &:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2); } `;
const SaveButton = styled(motion.button)` width: 100%; padding: 12px; background: #2e7d32; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; `;

// Confirm Modal Styling
const ConfirmOverlay = styled(motion.div)` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem; `;
const ConfirmCard = styled(motion.div)` background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); h3 { margin-top: 0; color: #333; } p { color: #666; margin-bottom: 2rem; } `;
const ButtonGroup = styled.div` display: flex; gap: 1rem; justify-content: center; `;
const ConfirmDeleteBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #d32f2f; color: #ffffff; &:hover { background: #b71c1c; } `;
const CancelBtn = styled.button` padding: 0.8rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #757575; color: #ffffff; &:hover { background: #616161; } `;