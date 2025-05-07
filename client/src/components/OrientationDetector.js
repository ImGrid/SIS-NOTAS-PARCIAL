import React, { useEffect, useState } from 'react';

/**
 * Componente que detecta la orientación del dispositivo y muestra un overlay
 * solicitando al usuario que rote el dispositivo a modo horizontal para 
 * una mejor experiencia al ver tablas complejas.
 */
const OrientationDetector = ({ isTableView = false }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [orientation, setOrientation] = useState('landscape');
  
  // Función para detectar la orientación actual
  const checkOrientation = () => {
    // Usamos matchMedia para detectar la orientación de manera más confiable
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    
    if (isPortrait) {
      setOrientation('portrait');
      // Solo mostrar overlay si estamos en vista de tabla
      if (isTableView) {
        setShowOverlay(true);
      }
    } else {
      setOrientation('landscape');
      setShowOverlay(false);
    }
  };
  
  // Inicialización y configuración de listener para cambios de orientación
  useEffect(() => {
    // Verificar si estamos en un dispositivo móvil
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Comprobar orientación inicial
      checkOrientation();
      
      // Agregar listener para cambios de orientación
      const handleOrientationChange = () => {
        checkOrientation();
      };
      
      // Event listener para orientación
      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('resize', handleOrientationChange);
      
      // Limpieza al desmontar
      return () => {
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('resize', handleOrientationChange);
      };
    }
  }, [isTableView]);
  
  // Si no es móvil o ya estamos en landscape, no mostrar nada
  if (!showOverlay) return null;
  
  // Renderizado del overlay
  return (
    <div className="orientation-overlay active">
      <div className="orientation-content">
        <div className="orientation-animation">
          {/* Ícono SVG de rotación de dispositivo */}
          <div className="phone-rotate-icon">
            <div className="phone-container"></div>
            <div className="phone-button"></div>
            <div className="rotate-arrows">
              <div className="arrow-right"></div>
              <div className="arrow-left"></div>
            </div>
          </div>
        </div>
        
        <h2 className="orientation-title">¡Gire su dispositivo!</h2>
        <p className="orientation-description">
          Para una mejor experiencia al visualizar las tablas de evaluación, 
          por favor rote su dispositivo a modo horizontal.
        </p>
        
        <button 
          className="bypass-orientation-button"
          onClick={() => setShowOverlay(false)}
        >
          Continuar de todos modos
        </button>
      </div>
    </div>
  );
};

export default OrientationDetector;