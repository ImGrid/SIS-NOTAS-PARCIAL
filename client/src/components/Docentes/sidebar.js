// src/components/Docentes/sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './style/sidebar.css';
import docenteService from '../../service/docenteService';
import api from '../../service/api';

function Sidebar() {
  const [gruposOpen, setGruposOpen] = useState(false);
  const [estudiantesOpen, setEstudiantesOpen] = useState(false);
  const [evaluacionesOpen, setEvaluacionesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [informesOpen, setInformesOpen] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario Docente');
  const [ubicacion, setUbicacion] = useState('Cochabamba');
  const navigate = useNavigate();
  
  // Efecto para cargar los datos del usuario al montar el componente
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      try {
        // Obtener el ID del usuario del localStorage
        const usuarioString = localStorage.getItem('usuario');
        if (!usuarioString) {
          return; // Si no hay datos de usuario, salir
        }
        
        const usuario = JSON.parse(usuarioString);
        if (!usuario.id) {
          return; // Si no hay ID de usuario, salir
        }
        
        // Obtener los datos completos del docente usando el ID
        const datosDocente = await docenteService.getDocenteById(usuario.id);
        
        // Actualizar el estado con el nombre real
        if (datosDocente && datosDocente.nombre_completo) {
          setNombreUsuario(datosDocente.nombre_completo);
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        // Mantener el nombre predeterminado en caso de error
      }
    };
    
    cargarDatosUsuario();
  }, []); // Se ejecuta solo al montar el componente
  
  // Cerrar sidebar automáticamente en pantallas pequeñas cuando se cambia de ruta
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Limpieza al desmontar
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  
  // Manejar el cierre del sidebar cuando se hace clic fuera de él
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Solo en pantallas pequeñas
      if (window.innerWidth <= 768) {
        // Si el sidebar está abierto y el clic no fue dentro del sidebar ni en la pestaña
        if (sidebarOpen && 
            !e.target.closest('.sidebar') && 
            !e.target.closest('.sidebar-tab')) {
          setSidebarOpen(false);
        }
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [sidebarOpen]);
  
  const toggleGruposSubmenu = () => {
    setGruposOpen(!gruposOpen);
  };
  
  const toggleEstudiantesSubmenu = () => {
    setEstudiantesOpen(!estudiantesOpen);
  };
  
  const toggleEvaluacionesSubmenu = () => {
    setEvaluacionesOpen(!evaluacionesOpen);
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Función mejorada para cerrar sesión
  const handleLogout = async () => {
    try {
      // Indicar que la app está procesando el logout
      const logoutButton = document.querySelector('.logout-button');
      if (logoutButton) {
        logoutButton.disabled = true;
        logoutButton.textContent = 'Cerrando sesión...';
      }
      
      // Intentar cerrar sesión en el servidor (revocar tokens)
      await api.logout(true);
      
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('usuario');
      
      // Redirigir al login
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      
      // En caso de error, forzar logout local
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('usuario');
      
      // Redirigir al login
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {/* Pestaña lateral para móviles - simplificada sin texto */}
      <div 
        className={`sidebar-tab ${sidebarOpen ? 'tab-open' : ''}`} 
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {sidebarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        )}
      </div>
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Header del sidebar */}
        <div className="sidebar-header">
          <span className="logo-text">EMI - CBBA</span>
        </div>
        
        {/* Perfil de usuario - ACTUALIZADO con nombre real */}
        <div className="user-profile">
          <div className="user-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#1e3a5f">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <div className="user-info">
            <span className="user-name">{nombreUsuario}</span>
            <span className="user-location">{ubicacion}</span>
          </div>
        </div>

        {/* Navegación */}
        <nav>
          <ul>
            {/* Opción Home/Dashboard */}
            <li>
              <Link to="/docentes" className="menu-item">
                <div className="menu-text">
                  <span className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                  </span>
                  Home
                </div>
              </Link>
            </li>
            
            <li>
              <button 
                onClick={toggleGruposSubmenu} 
                className={gruposOpen ? "active-menu-item" : ""}
              >
                <div className="menu-text">
                  <span className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0-3h8v2h-8zm0 6h4v2h-4z" />
                    </svg>
                  </span>
                  Grupos
                </div>
                <span className={`arrow-indicator ${gruposOpen ? 'arrow-open' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>
              <ul className={gruposOpen ? "open" : ""}>
                <li>
                  <Link to="/grupos/gestion">Gestión de Grupos</Link>
                </li>
                <li>
                  <Link to="/grupos/crear">Crear Grupos</Link>
                </li>
              </ul>
            </li>
            
            {/* Opción de Estudiantes */}
            <li>
              <button 
                onClick={toggleEstudiantesSubmenu} 
                className={estudiantesOpen ? "active-menu-item" : ""}
              >
                <div className="menu-text">
                  <span className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                      <path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </span>
                  Estudiantes
                </div>
                <span className={`arrow-indicator ${estudiantesOpen ? 'arrow-open' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>
              <ul className={estudiantesOpen ? "open" : ""}>
                <li>
                  <Link to="/estudiantes/listar">Lista de Estudiantes</Link>
                </li>
                <li>
                  <Link to="/estudiantes/crear">Registrar Estudiante</Link>
                </li>
              </ul>
            </li>
            
            <li>
              <button 
                onClick={toggleEvaluacionesSubmenu} 
                className={evaluacionesOpen ? "active-menu-item" : ""}
              >
                <div className="menu-text">
                  <span className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  </span>
                  Evaluaciones
                </div>
                <span className={`arrow-indicator ${evaluacionesOpen ? 'arrow-open' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>
              <ul className={evaluacionesOpen ? "open" : ""}>
                <li>
                  <Link to="/evaluaciones/gestionar">Gestionar Evaluaciones</Link>
                </li>
                <li>
                  <Link to="/evaluaciones/rubrica">Rúbrica</Link>
                </li>
              </ul>
            </li>

            <li>
              <button 
                onClick={() => setInformesOpen(!informesOpen)} 
                className={informesOpen ? "active-menu-item" : ""}
              >
                <div className="menu-text">
                  <span className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1.6 14.66h-1.2v-7.2h1.2v7.2zm-2.4 0h-1.2v-4.8h1.2v4.8zm-2.4 0h-1.2v-9.6h1.2v9.6zm-2.4 0H9v-6h1.2v6zm-2.4 0H6.8v-2.4h1.2v2.4z" />
                    </svg>
                  </span>
                  Informes
                </div>
                <span className={`arrow-indicator ${informesOpen ? 'arrow-open' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>
              <ul className={informesOpen ? "open" : ""}>
                <li>
                  <Link to="/informes/notas-finales">Notas Finales</Link>
                </li>
                <li>
                  <Link to="/informes/estadisticas">Estadísticas</Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        
        {/* Botón de salir en la parte inferior */}
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <div className="menu-text">
              <span className="menu-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#e6c350">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
              </span>
              Cerrar Sesión
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;