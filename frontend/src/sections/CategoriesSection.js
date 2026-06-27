import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { toast } from "react-hot-toast";

const AdminInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  transition: all 0.3s ease;
  &:focus {
    outline: none;
    border-color: #2e7d32;
    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
  }
`;

const AdminButton = styled(motion.button)`
  padding: 12px 20px;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  white-space: nowrap;
  &:hover {
    background: #1b5e20;
  }
`;

const DeleteButton = styled(AdminButton)`
  background: #e74c3c;
  &:hover {
    background: #c0392b;
  }
`;

const ListItem = styled(motion.li)`
  background: #ffffff;
  padding: 1.25rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.05);
  border: 1px solid #e8f5e9;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const SectionTitle = styled.h2`
  color: #2e7d32;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
  
  @media (min-width: 768px) {
    width: auto;
  }
  
  button {
    flex: 1;
    @media (min-width: 768px) {
      flex: initial;
    }
  }
`;

const CategoriesSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState(null);

  const fetchCategories = async () => {
    const res = await axiosInstance.get('/api/categories/');
    setCategories(res.data);
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line
  }, []);

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
      setForm({ name: '' });
      setEditId(null);
      fetchCategories();
    } catch {
      toast.error('❌ Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setForm({ name: category.name });
    setEditId(category.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Profile or product assignments may break.')) return;
    try {
      await axiosInstance.delete(`/api/categories/${id}/`);
      toast.success('✅ Category deleted');
      fetchCategories();
    } catch {
      toast.error('❌ Failed to delete category');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>📂 Categories</SectionTitle>
      <FormContainer>
        <AdminInput
          placeholder="Category Name"
          value={form.name}
          onChange={e => setForm({ name: e.target.value })}
        />
        <ActionRow>
          <AdminButton onClick={handleSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {editId ? 'Update' : 'Add Category'}
          </AdminButton>
          {editId && (
            <AdminButton
              onClick={() => {
                setEditId(null);
                setForm({ name: '' });
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ background: '#f39c12' }}
            >
              Cancel
            </AdminButton>
          )}
        </ActionRow>
      </FormContainer>
      <ul style={{ marginTop: '1rem', padding: 0, listStyle: 'none' }}>
        {categories.map(c => (
          <ListItem key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{c.name}</div>
            <ActionRow>
              <AdminButton onClick={() => handleEdit(c)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: '#3498db' }}>Edit</AdminButton>
              <DeleteButton onClick={() => handleDelete(c.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Delete</DeleteButton>
            </ActionRow>
          </ListItem>
        ))}
      </ul>
    </motion.div>
  );
};

export default CategoriesSection;