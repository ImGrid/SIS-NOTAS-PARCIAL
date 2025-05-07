// src/components/Docentes/Layout.js
import React from 'react';
import Sidebar from './sidebar';
import './style/Layout.css';

/**
 * Componente Layout que maneja la estructura principal de la aplicación
 * Incluye el sidebar y el contenido principal
 */
function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="content">
        {children}
      </main>
    </div>
  );
}

export default Layout;