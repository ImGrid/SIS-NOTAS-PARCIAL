// src/components/common/WarningModal.js
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../style/Advertencia.css';

// SVG Icons
const icons = {
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  checkCircle: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
};

/**
 * Componente Modal de Advertencia personalizado
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Controla si el modal está visible
 * @param {string} props.title - Título del modal (opcional)
 * @param {string} props.message - Mensaje principal del modal
 * @param {string} props.confirmText - Texto del botón de confirmación (por defecto: "Aceptar")
 * @param {string} props.cancelText - Texto del botón de cancelación (por defecto: "Cancelar")
 * @param {Function} props.onConfirm - Función a ejecutar cuando se confirma
 * @param {Function} props.onCancel - Función a ejecutar cuando se cancela
 */
const WarningModal = ({
  isOpen,
  title = "Advertencia",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel
}) => {
  const modalRef = useRef(null);
  
  // Cerrar modal con ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevenir scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = ''; // Restaurar scroll
    };
  }, [isOpen, onCancel]);
  
  // Click fuera del modal para cerrar
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onCancel();
    }
  };
  
  // Si no está abierto, no renderizar nada
  if (!isOpen) return null;
  
  // Crear portal para renderizar fuera del flujo normal del DOM
  return ReactDOM.createPortal(
    <div className="warning-modal-backdrop" onClick={handleBackdropClick}>
      <div 
        className="warning-modal-container" 
        ref={modalRef}
        role="dialog" 
        aria-modal="true"
        aria-labelledby="warning-modal-title"
      >
        <div className="warning-modal-header">
          <h2 id="warning-modal-title">{title}</h2>
        </div>
        
        <div className="warning-modal-body">
          <div className="warning-modal-icon">{icons.warning}</div>
          <p className="warning-modal-message">{message}</p>
        </div>
        
        <div className="warning-modal-footer">
          <button 
            className="warning-modal-btn btn-cancel" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="warning-modal-btn btn-confirm" 
            onClick={onConfirm}
          >
            {icons.checkCircle}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WarningModal;