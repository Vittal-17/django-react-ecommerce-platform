// src/utils/auth.js

// This function retrieves the token from localStorage (or sessionStorage)
export const getAuthToken = () => {
    return localStorage.getItem('authToken');  // or sessionStorage depending on your preference
  };
  
  // This function stores the token in localStorage
  export const setAuthToken = (token) => {
    localStorage.setItem('authToken', token);
  };
  
  // This function removes the token from localStorage
  export const removeAuthToken = () => {
    localStorage.removeItem('authToken');
  };
  