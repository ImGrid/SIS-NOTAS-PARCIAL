// src/components/Supervisor/LayoutSup.js
import React from 'react';
import SidebarSup from './sidebar_sup';
import '../style/LayoutSup.css';

/**
 * Componente LayoutSup que maneja la estructura principal para la vista de administradores
 * Incluye el sidebar del supervisor y el contenido principal
 */
const LayoutSup = ({ children }) => {
  return (
    <div className="app-layout-sup">
      <SidebarSup />
      <main className="content-sup">
        {children}
      </main>
    </div>
  );
};

export default LayoutSup;