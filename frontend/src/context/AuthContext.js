import { createContext, useEffect, useState, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(null);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember') === 'true');

  useEffect(() => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const token = storage.getItem('access');
    const refresh = storage.getItem('refresh');
    const storedUser = storage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setAuthTokens({ access: token, refresh });
    }
  }, [rememberMe]);

  const loginUser = async (email, password, remember = false) => {
    try {
      const res = await axios.post(`${API_URL}/api/token/`, {
        email,
        password,
      });
      if (res.status === 200) {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('access', res.data.access);
        storage.setItem('refresh', res.data.refresh);
        storage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('remember', remember);
        setRememberMe(remember);
        setAuthTokens(res.data);
        setUser(res.data.user);
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
    sessionStorage.clear();
  };

  // 1. Wrap in useMemo so it doesn't reset on every render
  const axiosInstance = useMemo(() => {
    const instance = axios.create({ baseURL: API_URL });

    instance.interceptors.request.use(async (config) => {
      const storage = localStorage.getItem('remember') === 'true' ? localStorage : sessionStorage;
      const access = storage.getItem('access');
      const refresh = storage.getItem('refresh');

      if (access) {
        const decoded = jwtDecode(access);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired && refresh) {
          try {
            const response = await axios.post(`${API_URL}/api/token/refresh/`, { refresh });
            storage.setItem('access', response.data.access);
            config.headers.Authorization = `Bearer ${response.data.access}`;
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
            // We don't call logoutUser here because it's outside the component context
            // Just let the 401 happen and the app will handle it
          }
        } else {
          config.headers.Authorization = `Bearer ${access}`;
        }
      }
      return config;
    });

    return instance;
    // eslint-disable-next-line
  }, [rememberMe]); // Re-create only if rememberMe toggles

  return (
    <AuthContext.Provider value={{ user, authTokens, loginUser, logoutUser, axiosInstance, rememberMe, setRememberMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;