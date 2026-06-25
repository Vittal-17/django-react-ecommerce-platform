import { useEffect, useState, useContext } from 'react';
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

const AdminTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
`;

const AdminSelect = styled.select`
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

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
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

const ProductsSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    axiosInstance.get('/api/products/').then(res => setProducts(res.data)).catch(() => setProducts([]));
    axiosInstance.get('/api/categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  const handleSubmit = async () => {
    try {
      if (editId) {
        await axiosInstance.put(`/api/products/${editId}/`, form);
        toast.success('✏️ Product updated successfully');
      } else {
        await axiosInstance.post('/api/products/', form);
        toast.success('✅ Product added successfully');
      }
      setForm({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
      setEditId(null);
      const res = await axiosInstance.get('/api/products/');
      setProducts(res.data);
    } catch (err) {
      toast.error('❌ Error saving product');
    }
  };

  const handleEdit = (product) => {
    setForm({ 
      name: product.name, 
      description: product.description, 
      price: product.price, 
      stock: product.stock, 
      category: product.category, 
      image_url: product.image_url 
    });
    setEditId(product.id);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/products/${id}/`);
      toast.success('🗑️ Product deleted successfully');
      const res = await axiosInstance.get('/api/products/');
      setProducts(res.data);
    } catch (err) {
      toast.error('❌ Error deleting product');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SectionTitle>📦 Products</SectionTitle>
      <div>
        <AdminInput placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <AdminTextarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <AdminInput placeholder="Price" type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || '' })} />
        <AdminInput placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || '' })} />
        <AdminSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          <option value="">Select Category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </AdminSelect>
        <AdminInput placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
        <AdminButton onClick={handleSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {editId ? 'Update Product' : 'Add Product'}
        </AdminButton>
        {editId && (
          <AdminButton onClick={() => {
            setEditId(null);
            setForm({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
          }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ background: '#f39c12' }}>
            Cancel
          </AdminButton>
        )}
      </div>

      <ul style={{ marginTop: '2rem' }}>
        {products.map(p => (
          <ListItem key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div>
              <strong>{p.name}</strong> - ${p.price} ({p.stock} in stock)
              <div style={{ fontSize: '0.9rem', color: '#666' }}>{p.description.substring(0, 50)}...</div>
            </div>
            <div>
              <AdminButton onClick={() => handleEdit(p)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: '#3498db' }}>Edit</AdminButton>
              <DeleteButton onClick={() => handleDelete(p.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Delete</DeleteButton>
            </div>
          </ListItem>
        ))}
      </ul>
    </motion.div>
  );
};

export default ProductsSection;