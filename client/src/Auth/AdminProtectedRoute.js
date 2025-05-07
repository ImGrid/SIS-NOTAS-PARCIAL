import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

/**
 * Componente para proteger rutas que solo pueden ser accedidas por supervisores
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componente hijo a renderizar si el usuario está autenticado
 */
const AdminProtectedRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si el usuario está autenticado y si es un supervisor
    const checkAuthentication = () => {
      try {
        const token = sessionStorage.getItem('token');
        const usuarioStr = sessionStorage.getItem('usuario');
        
        if (!token || !usuarioStr) {
          return false;
        }
        
        // Verificar si el token expiró
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          // Token expirado, limpiar storage
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('usuario');
          return false;
        }
        
        // Verificar si el usuario es un supervisor
        // Para esto, podemos verificar si el ID del usuario existe en la tabla de supervisores
        // En lugar de depender de un campo 'rol', verificaremos desde dónde se originó el login
        
        try {
          const usuario = JSON.parse(usuarioStr);
          
          // Verificar si el usuario proviene de la autenticación de supervisores
          // Esto lo podemos deducir por la presencia y estructura del objeto usuario
          // Los supervisores deben tener propiedades específicas que los docentes no tienen
          
          // Por ejemplo, verificar si tiene la propiedad 'cargo'
          if (usuario && usuario.cargo) {
            return true;
          }
          
          return false;
        } catch (e) {
          console.error('Error al parsear datos de usuario:', e);
          return false;
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        return false;
      }
    };

    setIsAuthenticated(checkAuthentication());
    setIsLoading(false);
  }, []);

  // Mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando credenciales...</p>
      </div>
    );
  }

  // Si no está autenticado o no es supervisor, redirigir al login de supervisor
  if (!isAuthenticated) {
    return <Navigate to="/adm/login" replace />;
  }

  // Si está autenticado y es supervisor, renderizar el componente hijo
  return children;
};

export default AdminProtectedRoute;