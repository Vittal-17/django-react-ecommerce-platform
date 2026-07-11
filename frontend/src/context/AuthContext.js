import { createContext, useEffect, useState, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 1. INITIALIZE USE-NAVIGATE
  const navigate = useNavigate();

  // 2. CREATE AXIOS INSTANCE FIRST (So useEffect can use it)
  const axiosInstance = useMemo(() => {
    const instance = axios.create({ baseURL: API_URL });

    instance.interceptors.request.use(async (config) => {
      const access = localStorage.getItem('access');
      const refresh = localStorage.getItem('refresh');

      if (access) {
        const decoded = jwtDecode(access);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired && refresh) {
          try {
            const response = await axios.post(`${API_URL}/api/token/refresh/`, { refresh });
            localStorage.setItem('access', response.data.access);
            config.headers.Authorization = `Bearer ${response.data.access}`;
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
            // Optional: If refresh token dies, you can wipe storage here too
          }
        } else {
          config.headers.Authorization = `Bearer ${access}`;
        }
      }
      return config;
    });

    return instance;
  }, []);

  // 3. HYDRATION AND 401 INTERCEPTOR
  useEffect(() => {
    const token = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setAuthTokens({ access: token, refresh });
    }
    setLoading(false);

    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response, 
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          localStorage.removeItem('user');
          
          setUser(null);
          setAuthTokens(null);
          
          toast.error('⏳ Session Expired, Please Log in Again', {
            duration: 4000,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
              fontWeight: 'bold',
            },
          });
          
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, [navigate, axiosInstance]);

  const loginUser = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/token/`, { email, password });
      
      if (res.status === 200) {
        const { access, refresh, user: userData } = res.data;

        localStorage.setItem('access', access);
        localStorage.setItem('refresh', refresh);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setAuthTokens({ access, refresh });
        setUser(userData);

        // ==========================================
        // THE MERGE ALGORITHM
        // ==========================================
        const tempCart = JSON.parse(localStorage.getItem('tempCart')) || [];
        
        if (tempCart.length > 0) {
          toast('Syncing your guest cart...', { icon: '🔄' });
          
          for (const item of tempCart) {
            try {
              // FIX 1 & 2: Correct endpoint (/cart-items/) and correct payload (product: item.product)
              await axios.post(`${API_URL}/api/cart-items/`, {
                product: item.product, 
                quantity: item.quantity
              }, {
                headers: { Authorization: `Bearer ${access}` }
              });
            } catch (err) {
              console.error(`Failed to sync product ${item.product}`, err);
            }
          }
          
          localStorage.removeItem('tempCart');
          toast.success('✨ Cart synced successfully!');
        }

        return true;
      }
    } catch (err) {
      console.error('Login failed:', err.response?.data || err.message);
    }
    return false;
  };

  const logoutUser = () => {
    setUser(null);
    setAuthTokens(null);
    localStorage.clear(); 
  };

  return (
    <AuthContext.Provider value={{ user, authTokens, loginUser, logoutUser, axiosInstance }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;