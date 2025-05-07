// src/components/Supervisor/sidebar_sup.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../style/sidebar_sup.css';

function SidebarSup() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [docentesOpen, setDocentesOpen] = useState(false); // Estado para el submenú de docentes
  const [rubricasOpen, setRubricasOpen] = useState(false); // Estado para el submenú de rúbricas
  const [nombreUsuario, setNombreUsuario] = useState('Administrador'); 
  const [ubicacion, setUbicacion] = useState('Cochabamba'); 
  const navigate = useNavigate();
  
  // Efecto para cargar los datos del usuario al montar el componente
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      try {
        // Obtener el ID del usuario del sessionStorage
        const usuarioString = sessionStorage.getItem('usuario');
        if (!usuarioString) {
          return; // Si no hay datos de usuario, salir
        }
        
        const usuario = JSON.parse(usuarioString);
        
        // Actualizar el estado con el nombre real
        if (usuario && usuario.nombre_completo) {
          setNombreUsuario(usuario.nombre_completo);          
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
            !e.target.closest('.sidebar-sup') && 
            !e.target.closest('.sidebar-sup-tab')) {
          setSidebarOpen(false);
        }
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [sidebarOpen]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Toggle para el submenú de docentes
  const toggleDocentesSubmenu = () => {
    setDocentesOpen(!docentesOpen);
    // Cerrar otros menús abiertos si es necesario
    if (!docentesOpen && rubricasOpen) {
      setRubricasOpen(false);
    }
  };

  // Toggle para el submenú de rúbricas
  const toggleRubricasSubmenu = () => {
    setRubricasOpen(!rubricasOpen);
    // Cerrar otros menús abiertos si es necesario
    if (!rubricasOpen && docentesOpen) {
      setDocentesOpen(false);
    }
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    // Eliminar datos de la sesión
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    
    // Redirigir al login de administrador
    navigate('/adm/login');
  };

  return (
    <>
      {/* Pestaña lateral para móviles - simplificada sin texto */}
      <div 
        className={`sidebar-sup-tab ${sidebarOpen ? 'tab-open' : ''}`} 
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
      
      <aside className={`sidebar-sup ${sidebarOpen ? 'open' : ''}`}>
        {/* Header del sidebar */}
        <div className="sidebar-sup-header">
          <span className="logo-text">EMI - Admin</span>
        </div>
        
        {/* Perfil de usuario */}
        <div className="user-sup-profile">
          <div className="user-sup-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#2c3e50">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <div className="user-sup-info">
            <span className="user-sup-name">{nombreUsuario}</span>
            <span className="user-sup-location">{ubicacion}</span>
          </div>
        </div>

        {/* Navegación */}
        <nav className="nav-sup">
          <ul>
            {/* Opción Home/Dashboard */}
            <li>
              <Link to="/supervisor/dashboard" className="menu-sup-item">
                <div className="menu-sup-text">
                  <span className="menu-sup-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#d4af37">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                  </span>
                  Dashboard
                </div>
              </Link>
            </li>
            
            {/* Opción de Docentes */}
            <li>
              <button 
                onClick={toggleDocentesSubmenu}
                className={docentesOpen ? "active-menu-sup-item" : ""}
              >
                <div className="menu-sup-text">
                  <span className="menu-sup-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#d4af37">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </span>
                  Docentes
                </div>
                <span className={`arrow-sup-indicator ${docentesOpen ? 'arrow-sup-open' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#d4af37">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>
              <ul className={docentesOpen ? "sup-submenu open" : "sup-submenu"}>
                <li>
                  <Link to="/adm/personal/listar">Lista de Docentes</Link>
                </li>
                <li>
                  <Link to="/adm/personal/crear">Registrar Docente</Link>
                </li>
              </ul>
            </li>
            
            {/* Nueva opción de Rúbricas */}
            <li>
              <button 
                onClick={toggleRubricasSubmenu}
                className={rubricasOpen ? "active-menu-sup-item" : ""}
              >
                <div className="menu-sup-text">
                  <span className="menu-sup-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#d4af37">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </span>
                  Rúbricas
                </div>
                <span className={`arrow-sup-indicator ${rubricasOpen ? 'arrow-sup-open' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#d4af37">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>
              <ul className={rubricasOpen ? "sup-submenu open" : "sup-submenu"}>
                <li>
                  <Link to="/supervisor/rubricas">Gestionar Rúbricas</Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        
        {/* Botón de salir en la parte inferior */}
        <div className="sidebar-sup-footer">
          <button onClick={handleLogout} className="logout-sup-button">
            <div className="menu-sup-text">
              <span className="menu-sup-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#d4af37">
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

export default SidebarSup;