import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginDocente, verificarCodigo, validateEmail, verificarCodigoExistente } from '../service/docenteService';
import './login.css'; // Importamos los nuevos estilos aislados

const Login = () => {
  const navigate = useNavigate();
  
  // Estados para los campos de formulario
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [codigo, setCodigo] = useState('');
  
  // Estado para controlar el paso actual del proceso de login
  const [paso, setPaso] = useState(1); // 1: correo, 2: código
  
  // Estados para manejo de errores y carga
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  // Estado para controlar opciones de código existente
  const [mostrarOpcionesCodigoExistente, setMostrarOpcionesCodigoExistente] = useState(false);
  
  // Estado para controlar clicks en botón administrativo
  const [adminClickCount, setAdminClickCount] = useState(0);

  // Manejar clic en el botón oculto de admin
  const handleAdminButtonClick = () => {
    // Incrementar contador
    setAdminClickCount(prevCount => {
      const newCount = prevCount + 1;
      
      // Usar setTimeout para evitar actualizaciones de estado durante el renderizado
      if (newCount >= 2) {
        // Reiniciar contador
        setTimeout(() => {
          setAdminClickCount(0);
          // Navegar después de que el componente se haya renderizado completamente
          navigate('/adm/login');
        }, 0);
      }
      return newCount;
    });

    // Reiniciar el contador después de 1 segundo si no se hizo doble clic
    setTimeout(() => {
      setAdminClickCount(0);
    }, 1000);
  };

  // Paso 1: Solicitar código de verificación
  const handleSolicitarCodigo = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setMensaje('');
    setMostrarOpcionesCodigoExistente(false);

    // Validación básica
    if (!correoElectronico.trim()) {
      setError('El correo electrónico es requerido');
      return;
    }

    try {
      validateEmail(correoElectronico);
      
      setIsLoading(true);
      
      // Primero verificamos si ya hay un código vigente
      const verificacion = await verificarCodigoExistente(correoElectronico);
      
      if (verificacion.codigo_existente) {
        // Ya hay un código vigente, preguntamos al usuario qué hacer
        setMensaje(`Ya tiene un código vigente (expira en ${verificacion.expiracion} minutos). ¿Desea continuar con ese código o solicitar uno nuevo?`);
        // Mostrar botones adicionales para esta decisión
        setMostrarOpcionesCodigoExistente(true);
      } else {
        // No hay código vigente, solicitamos uno nuevo como antes
        const data = await loginDocente(correoElectronico);
        setMensaje(data.message || 'Se ha enviado un código de verificación a su correo.');
        setPaso(2);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al verificar código';
      setError(errorMessage);
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [correoElectronico]);

  // Función para usar el código existente
  const usarCodigoExistente = () => {
    setMostrarOpcionesCodigoExistente(false);
    setMensaje('Por favor ingrese el código que recibió anteriormente.');
    setPaso(2);
  };
  
  // Función para solicitar un nuevo código
  const solicitarNuevoCodigo = async () => {
    try {
      setIsLoading(true);
      setMostrarOpcionesCodigoExistente(false);
      
      const data = await loginDocente(correoElectronico);
      setMensaje(data.message || 'Se ha enviado un nuevo código de verificación a su correo.');
      setPaso(2);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al solicitar código';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Verificar código de verificación
  const handleVerificarCodigo = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setMensaje('');

    // Validación básica
    if (!codigo.trim() || codigo.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    try {
      setIsLoading(true);
      const data = await verificarCodigo(correoElectronico, codigo);
      
      if (!data.token) {
        throw new Error('Inicio de sesión fallido: Token no recibido');
      }

      // Guardamos el token y la información del usuario
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
      
      // Redirigir al dashboard
      navigate('/docentes', { replace: true });
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Código inválido o expirado';
      setError(errorMessage);
      console.error('Error al verificar código:', error);
    } finally {
      setIsLoading(false);
    }
  }, [correoElectronico, codigo, navigate]);

  // Función para retroceder al paso anterior
  const handleVolver = () => {
    setPaso(1);
    setCodigo('');
    setError(null);
    setMensaje('');
    setMostrarOpcionesCodigoExistente(false);
  };

  // Renderizado del formulario según el paso actual
  const renderFormulario = () => {
    switch (paso) {
      case 1:
        return (
          <form onSubmit={handleSolicitarCodigo}>
            <div className="login-docente-form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="Ingrese su correo electrónico"
                value={correoElectronico}
                onChange={(e) => setCorreoElectronico(e.target.value)}
                disabled={isLoading || mostrarOpcionesCodigoExistente}
                required
                autoFocus
                aria-required="true"
                aria-invalid={!!error}
              />
            </div>
            
            {mostrarOpcionesCodigoExistente ? (
              <div className="login-docente-codigo-opciones">
                <button 
                  type="button" 
                  className="login-docente-usar-codigo"
                  onClick={usarCodigoExistente}
                  disabled={isLoading}
                >
                  Usar código existente
                </button>
                <button 
                  type="button" 
                  className="login-docente-nuevo-codigo"
                  onClick={solicitarNuevoCodigo}
                  disabled={isLoading}
                >
                  Solicitar nuevo código
                </button>
              </div>
            ) : (
              <button 
                type="submit" 
                className="login-docente-submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Continuar'}
              </button>
            )}
          </form>
        );
        
      case 2:
        return (
          <form onSubmit={handleVerificarCodigo}>
            <div className="login-docente-form-group">
              <label htmlFor="codigo">Código de Verificación</label>
              <input
                id="codigo"
                type="text"
                placeholder="Ingrese el código de 6 dígitos"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                pattern="\d{6}"
                disabled={isLoading}
                required
                autoFocus
                aria-required="true"
                aria-invalid={!!error}
              />
              <small>Revise su correo electrónico para obtener el código</small>
            </div>
            
            <div className="login-docente-button-group">
              <button 
                type="button" 
                onClick={handleVolver}
                className="login-docente-back-button"
                disabled={isLoading}
              >
                Volver
              </button>
              
              <button 
                type="submit" 
                className="login-docente-submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        );
        
      default:
        return null;
    }
  };

  // Obtener título según el paso actual
  const getTituloPaso = () => {
    switch (paso) {
      case 1:
        return "Ingrese su correo electrónico";
      case 2:
        return "Ingrese el código de verificación";
      default:
        return "";
    }
  };

  return (
    <div className="login-docente-container">
      {/* Panel izquierdo con el formulario de login */}
      <div className="login-docente-panel">
        {/* Botón oculto para acceder al panel de administrador */}
        <button 
          className="login-docente-admin-button"
          onClick={handleAdminButtonClick}
          aria-label="Acceso administrativo"
        />
        
        <div className="login-docente-card">
          <h2>Iniciar Sesión</h2>
          <p className="login-docente-subtitle">{getTituloPaso()}</p>
          
          {error && (
            <div className="login-docente-error-message">
              <p>{error}</p>
            </div>
          )}
          
          {mensaje && (
            <div className="login-docente-success-message">
              <p>{mensaje}</p>
            </div>
          )}
          
          {renderFormulario()}
        </div>
      </div>
      
      {/* Panel derecho con la imagen de fondo */}
      <div className="login-docente-image"></div>
    </div>
  );
};

export default Login;