import { createContext, useEffect, useState, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(null);
  
  // Added a loading state so the app doesn't flash the login screen 
  // for a split second before localStorage is read.
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    // Strictly use localStorage so the session survives tab closures
    const token = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setAuthTokens({ access: token, refresh });
    }
    setLoading(false);
  }, []);

  const loginUser = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/token/`, {
        email,
        password,
      });
      
      if (res.status === 200) {
        // Save everything directly to localStorage
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('refresh', res.data.refresh);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        setAuthTokens({ access: res.data.access, refresh: res.data.refresh });
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
    localStorage.clear(); // Wipes everything cleanly on manual logout
  };

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
            // If the refresh token dies, you can optionally force a logout here
            // logoutUser();
          }
        } else {
          config.headers.Authorization = `Bearer ${access}`;
        }
      }
      return config;
    });

    return instance;
  }, []);

  return (
    <AuthContext.Provider value={{ user, authTokens, loginUser, logoutUser, axiosInstance }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;