import { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import {toast, Toaster} from "react-hot-toast";

const AdminInput = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  &:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
`;

const AdminButton = styled(motion.button)`
  padding: 12px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-right: 0.5rem;
  &:hover {
    background: #45a049;
  }
`;

const DeleteButton = styled(AdminButton)`
  background: #e74c3c;
  &:hover {
    background: #c0392b;
  }
`;

const ListItem = styled(motion.li)`
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
`;

const SectionTitle = styled.h2`
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  }, []);

  const handleSubmit = async () => {
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <AdminInput
          placeholder="Category Name"
          value={form.name}
          onChange={e => setForm({ name: e.target.value })}
          style={{ flex: 1 }}
        />
        <AdminButton onClick={handleSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {editId ? 'Update Category' : 'Add Category'}
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
      </div>
      <ul style={{ marginTop: '1rem' }}>
        {categories.map(c => (
          <ListItem key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ fontWeight: 'bold' }}>{c.name}</div>
            <div>
              <AdminButton onClick={() => handleEdit(c)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: '#3498db' }}>Edit</AdminButton>
              <DeleteButton onClick={() => handleDelete(c.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Delete</DeleteButton>
            </div>
          </ListItem>
        ))}
      </ul>
    </motion.div>
  );
};

export default CategoriesSection;
