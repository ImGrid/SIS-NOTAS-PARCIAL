import React, { useState, useEffect } from 'react';
import LayoutSup from '../pages/LayoutSup'; // Importamos el LayoutSup correcto
import '../style/supDashboard.css'; // Importamos los estilos

const SupervisorDashboard = () => {
  const [supervisor, setSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recuperar los datos del supervisor del sessionStorage
    const usuarioStr = sessionStorage.getItem('usuario');
    
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setSupervisor(usuario);
      } catch (error) {
        console.error('Error al parsear datos del supervisor:', error);
      }
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <LayoutSup>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando información...</p>
        </div>
      </LayoutSup>
    );
  }

  return (
    <LayoutSup>
      <div className="dashboard-welcome">
        <div className="welcome-card">
          <h2>¡Bienvenido al Panel de Supervisión!</h2>
          
          {supervisor ? (
            <p>
              Hola, <strong>{supervisor.nombre_completo}</strong>. 
              Ha iniciado sesión correctamente en el sistema de administración.
            </p>
          ) : (
            <p>Ha iniciado sesión correctamente en el sistema de administración.</p>
          )}
          
          <div className="welcome-info">
            <p>Desde este panel podrá:</p>
            <ul>
              <li>Visualizar estadísticas generales del sistema</li>
              <li>Supervisar el progreso de calificaciones</li>
              <li>Gestionar docentes y grupos</li>
              <li>Acceder a informes y reportes</li>
            </ul>
          </div>
        </div>
      </div>
    </LayoutSup>
  );
};

export default SupervisorDashboard;