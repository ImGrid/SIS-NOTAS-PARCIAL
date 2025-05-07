// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('token') !== null;
  
  if (!isAuthenticated) {
    // Redirigir al login si no hay token
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;