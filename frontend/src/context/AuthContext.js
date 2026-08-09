// AuthContext.jsx
import { createContext, useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const AuthContext = createContext();

// ==========================================
// 🚀 AXIOS REFRESH QUEUE STATE (Placed outside to persist across renders)
// ==========================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 1. CREATE AXIOS INSTANCE WITH COOKIE CREDENTIALS
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      withCredentials: true, // 🚀 Automatically attaches HTTP-Only cookies
    });

    // Response Interceptor for 401 Silent Refresh & Session Expiration
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          
          // 🚀 STAMPEDE FIX: IF REFRESH IS IN PROGRESS, QUEUE THE REQUEST
          if (isRefreshing) {
            return new Promise(function(resolve, reject) {
              failedQueue.push({ resolve, reject });
            }).then(() => {
              return instance(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          // Lock the queue
          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // 🚀 Hit refresh endpoint
            await instance.post('/api/token/refresh/');
            
            // Unlock queue and process waiting requests
            processQueue(null);
            
            // Backend set new access_token cookie; retry original request
            return instance(originalRequest);
          } catch (refreshErr) {
            // If refresh fails, reject queue and log out
            processQueue(refreshErr, null);
            
            localStorage.removeItem('user');
            setUser(null);

            toast.error('⏳ Session Expired, Please Log in Again', {
              duration: 4000,
            });

            navigate('/login');
            return Promise.reject(refreshErr);
          } finally {
            // Reset the lock when done
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [navigate]);

  // 2. HYDRATION ON MOUNT
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          // Self-healing check: fetch fresh data using the correct ID endpoint
          if (!parsedUser.profile_picture && parsedUser.id) {
            const response = await axiosInstance.get(`/api/users/${parsedUser.id}/`);
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          } else {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error('Session initialization error:', error);
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [axiosInstance]);

  // 3. LOGIN USER METHOD
  const loginUser = async (email, password) => {
    try {
      // 🚀 Include credentials so set-cookie headers are accepted by browser
      const res = await axios.post(
        `${API_URL}/api/token/`,
        { email, password },
        { withCredentials: true }
      );

      if (res.status === 200) {
        const { user: userData } = res.data;

        // Store ONLY non-sensitive user metadata in localStorage for UI state
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        // ==========================================
        // THE MERGE ALGORITHM (UPDATED FOR COOKIES)
        // ==========================================
        const tempCart = JSON.parse(localStorage.getItem('tempCart')) || [];

        if (tempCart.length > 0) {
          toast('Syncing your guest cart...', { icon: '🔄' });

          for (const item of tempCart) {
            try {
              // 🚀 Uses axiosInstance withCredentials—no manual Authorization header needed!
              await axiosInstance.post('/api/cart-items/', {
                product: item.product,
                quantity: item.quantity,
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

  // 4. CROSS-TAB WALLET SYNC (BroadcastChannel)
  useEffect(() => {
    const channel = new BroadcastChannel('eazyshop_wallet_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_WALLET') {
        setUser((prevUser) => {
          if (prevUser && prevUser.id === event.data.userId) {
            return { ...prevUser, wallet_balance: event.data.newBalance };
          }
          return prevUser;
        });
      }
    };
    return () => channel.close();
  }, []);

  // Expose a helper to trigger the sync across tabs
  const syncWalletBalance = (userId, newBalance) => {
    setUser((prev) => ({ ...prev, wallet_balance: newBalance }));
    const channel = new BroadcastChannel('eazyshop_wallet_sync');
    channel.postMessage({ type: 'SYNC_WALLET', userId, newBalance });
    channel.close();
  };

  // 5. LOGOUT USER METHOD
  const logoutUser = async () => {
    try {
      // Notify backend to clear HTTP-Only cookies
      await axiosInstance.post('/api/logout/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, axiosInstance, syncWalletBalance }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;