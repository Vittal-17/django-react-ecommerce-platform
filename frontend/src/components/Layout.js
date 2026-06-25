// src/components/Layout.js
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <>
      <Navbar />
      <main style={{
        paddingTop: '1000px',     // Enough top space for sticky navbar
        minHeight: 'calc(100vh - 1000px)', // Prevent content from being short
        animation: 'fadeIn 0.5s ease'
      }}>
        <Outlet />
      </main>

      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Layout;