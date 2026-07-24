import { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaTruck, FaCheckCircle, FaBoxOpen, FaMoneyBillWave } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import AuthContext from '../../context/AuthContext';

const VendorSalesSection = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get('/api/vendor-sales/');
      setSales(res.data.results || res.data);
    } catch (error) {
      toast.error('❌ Failed to load your sales data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, []);

  const handleUpdateStatus = async (itemId, newStatus) => {
    setUpdatingId(itemId);
    try {
      await axiosInstance.patch(`/api/vendor-sales/${itemId}/update_status/`, { status: newStatus });
      toast.success(`📦 Item marked as ${newStatus}!`);
      // Optimistic UI Update
      setSales(prev => prev.map(sale => sale.id === itemId ? { ...sale, status: newStatus } : sale));
    } catch (error) {
      toast.error('❌ Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculate Total Earnings
  const totalEarnings = sales.reduce((sum, item) => {
    if (item.status !== 'cancelled') {
      return sum + parseFloat(item.seller_earnings || 0);
    }
    return sum;
  }, 0);

  if (isLoading) {
    return <LoadingWrapper><Spinner /><p style={{ color: '#2e7d32', fontWeight: 'bold' }}>Loading Sales Data...</p></LoadingWrapper>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* 🚀 Beautiful Green Theme Gradient */}
      <StatsCard>
        <div className="stat-info">
          <p>Total Net Earnings</p>
          <h2>${totalEarnings.toFixed(2)}</h2>
        </div>
        <FaMoneyBillWave size={48} color="#ffffff" opacity={0.2} />
      </StatsCard>

      {sales.length === 0 ? (
        <EmptyState>
          <FaBoxOpen size={48} color="#94a3b8" />
          <p>You haven't made any sales yet. Keep listing great products!</p>
        </EmptyState>
      ) : (
        <SalesList>
          {sales.map((sale) => (
            <SaleCard key={sale.id}>
              <SaleHeader>
                <div>
                  <h3>Order #{sale.order}</h3>
                  {/* 🚀 FIXED: Added Fallback to prevent toUpperCase crash */}
                  <span className={`status-badge ${sale.status || 'pending'}`}>
                    {(sale.status || 'pending').toUpperCase()}
                  </span>
                </div>
                <EarningsBadge>+ ${Number(sale.seller_earnings || 0).toFixed(2)}</EarningsBadge>
              </SaleHeader>
              
              <SaleBody>
                <div className="product-info">
                  <img src={sale.image_url} alt={sale.name} />
                  <div>
                    <h4>{sale.name}</h4>
                    <p>Qty: {sale.quantity} | Price: ${sale.price}</p>
                  </div>
                </div>

                <ActionGroup>
                  {sale.status === 'pending' && (
                    <StatusButton 
                      className="ship-btn" 
                      onClick={() => handleUpdateStatus(sale.id, 'shipped')}
                      disabled={updatingId === sale.id}
                    >
                      <FaTruck /> {updatingId === sale.id ? 'Updating...' : 'Mark as Shipped'}
                    </StatusButton>
                  )}
                  {sale.status === 'shipped' && (
                    <StatusButton 
                      className="deliver-btn" 
                      onClick={() => handleUpdateStatus(sale.id, 'delivered')}
                      disabled={updatingId === sale.id}
                    >
                      <FaCheckCircle /> {updatingId === sale.id ? 'Updating...' : 'Mark as Delivered'}
                    </StatusButton>
                  )}
                  {(sale.status === 'delivered' || sale.status === 'cancelled') && (
                    <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {sale.status === 'delivered' ? '✅ Fulfillment Complete' : '🚫 Cancelled'}
                    </p>
                  )}
                </ActionGroup>
              </SaleBody>
            </SaleCard>
          ))}
        </SalesList>
      )}
    </motion.div>
  );
};

const LoadingWrapper = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 0; `;
const Spinner = styled.div` width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top: 4px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; @keyframes spin { to { transform: rotate(360deg); } } `;
const StatsCard = styled.div` background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); color: white; padding: 2rem; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; box-shadow: 0 10px 25px rgba(46, 125, 50, 0.2); .stat-info p { margin: 0; color: #a5d6a7; font-weight: bold; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px; } .stat-info h2 { margin: 0.5rem 0 0 0; font-size: 2.5rem; color: #ffffff; } `;
const EmptyState = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; color: #64748b; p { margin-top: 1rem; font-weight: 500; } `;
const SalesList = styled.div` display: flex; flex-direction: column; gap: 1.5rem; `;
const SaleCard = styled.div` background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; `;
const SaleHeader = styled.div` display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1rem; h3 { margin: 0 0 0.5rem 0; color: #0f172a; } .status-badge { font-size: 0.75rem; font-weight: bold; padding: 0.3rem 0.8rem; border-radius: 20px; text-transform: uppercase; } .status-badge.pending { background: #fef3c7; color: #d97706; } .status-badge.shipped { background: #e0f2fe; color: #2563eb; } .status-badge.delivered { background: #e8f5e9; color: #2e7d32; } .status-badge.cancelled { background: #fee2e2; color: #dc2626; } `;
const EarningsBadge = styled.div` background: #e8f5e9; color: #2e7d32; font-weight: 900; padding: 0.5rem 1rem; border-radius: 8px; font-size: 1.1rem; `;
const SaleBody = styled.div` display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; .product-info { display: flex; align-items: center; gap: 1rem; img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; } h4 { margin: 0 0 0.3rem 0; color: #1e293b; } p { margin: 0; color: #64748b; font-size: 0.9rem; } } `;
const ActionGroup = styled.div` display: flex; align-items: center; `;
const StatusButton = styled.button` display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; color: white; &:disabled { opacity: 0.6; cursor: not-allowed; } &.ship-btn { background: #2563eb; &:hover:not(:disabled) { background: #1d4ed8; } } &.deliver-btn { background: #2e7d32; &:hover:not(:disabled) { background: #1b5e20; } } `;

export default VendorSalesSection;