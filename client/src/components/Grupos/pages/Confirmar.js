// src/components/common/ConfirmationModal.js
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../style/Confirmar.css';

// SVG Icons
const icons = {
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  )
};

/**
 * Componente Modal de Confirmación personalizado
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Controla si el modal está visible
 * @param {string} props.title - Título del modal (opcional)
 * @param {string} props.message - Mensaje principal del modal
 * @param {string} props.confirmText - Texto del botón de confirmación (por defecto: "Aceptar")
 * @param {string} props.cancelText - Texto del botón de cancelación (por defecto: "Cancelar")
 * @param {Function} props.onConfirm - Función a ejecutar cuando se confirma
 * @param {Function} props.onCancel - Función a ejecutar cuando se cancela
 * @param {string} props.type - Tipo de modal ("warning", "danger", "info") - afecta los colores
 */
const ConfirmationModal = ({
  isOpen,
  title = "Confirmar acción",
  message,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  type = "warning" // warning, danger, info
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
    <div className="custom-modal-backdrop" onClick={handleBackdropClick}>
      <div 
        className={`custom-modal-container modal-type-${type}`} 
        ref={modalRef}
        role="dialog" 
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="custom-modal-header">
          <h2 id="modal-title">{title}</h2>
        </div>
        
        <div className="custom-modal-body">
          <div className="custom-modal-icon">{icons.warning}</div>
          <p className="custom-modal-message">{message}</p>
        </div>
        
        <div className="custom-modal-footer">
          <button 
            className="custom-modal-btn btn-cancel" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="custom-modal-btn btn-confirm" 
            onClick={onConfirm}
          >
            {icons.trash}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;