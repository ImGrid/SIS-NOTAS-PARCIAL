import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  loginSupervisor, 
  verificarCodigoSupervisor, 
  autenticarSupervisor, 
  validateEmail,
  verificarCodigoExistente
} from '../service/supervisorService';
import './loginadm.css'; // Importamos los nuevos estilos aislados

const SupervisorLogin = () => {
  const navigate = useNavigate();
  
  // Estados para los campos de formulario
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [codigo, setCodigo] = useState('');
  const [claveSecreta, setClaveSecreta] = useState('');
  
  // Estado para controlar el paso actual del proceso de login
  const [paso, setPaso] = useState(1); // 1: correo, 2: código, 3: clave secreta
  
  // Estados para manejo de errores y carga
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Estado para controlar opciones de código existente
  const [mostrarOpcionesCodigoExistente, setMostrarOpcionesCodigoExistente] = useState(false);

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
        const data = await loginSupervisor(correoElectronico);
        
        // Mostrar mensaje de éxito y avanzar al siguiente paso
        setMensaje(data.message || 'Se ha enviado un código de verificación a su correo.');
        setPaso(2);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al solicitar código';
      setError(errorMessage);
      console.error('Error al solicitar código:', error);
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
      
      const data = await loginSupervisor(correoElectronico);
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
      const data = await verificarCodigoSupervisor(correoElectronico, codigo);
      
      // Mostrar mensaje de éxito y avanzar al siguiente paso
      setMensaje(data.message || 'Código verificado. Ingrese la clave secreta del sistema.');
      setPaso(3);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Código inválido o expirado';
      setError(errorMessage);
      console.error('Error al verificar código:', error);
    } finally {
      setIsLoading(false);
    }
  }, [correoElectronico, codigo]);

  // Paso 3: Autenticar con clave secreta
  const handleAutenticar = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setMensaje('');

    // Validación básica
    if (!claveSecreta.trim()) {
      setError('La clave secreta es requerida');
      return;
    }

    try {
      setIsLoading(true);
      const data = await autenticarSupervisor(correoElectronico, codigo, claveSecreta);
      
      if (!data.token) {
        throw new Error('No se recibió token de autenticación');
      }

      // Guardar token y datos del usuario en sessionStorage
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
      
      // Redirigir al dashboard del supervisor
      navigate('/supervisor/dashboard', { replace: true });
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Clave secreta incorrecta';
      setError(errorMessage);
      console.error('Error al autenticar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [correoElectronico, codigo, claveSecreta, navigate]);

  // Función para retroceder al paso anterior
  const handleVolver = () => {
    if (paso > 1) {
      setPaso(paso - 1);
      setError(null);
      setMensaje('');
      setMostrarOpcionesCodigoExistente(false);
    } else {
      // Si estamos en el primer paso, volver a la página de login principal
      navigate('/login');
    }
  };

  // Renderizado del formulario según el paso actual
  const renderFormulario = () => {
    switch (paso) {
      case 1:
        return (
          <form onSubmit={handleSolicitarCodigo}>
            <div className="login-supervisor-form-group">
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
              />
            </div>
            
            {mostrarOpcionesCodigoExistente ? (
              <div className="login-supervisor-codigo-opciones">
                <button 
                  type="button" 
                  className="login-supervisor-usar-codigo"
                  onClick={usarCodigoExistente}
                  disabled={isLoading}
                >
                  Usar código existente
                </button>
                <button 
                  type="button" 
                  className="login-supervisor-nuevo-codigo"
                  onClick={solicitarNuevoCodigo}
                  disabled={isLoading}
                >
                  Solicitar nuevo código
                </button>
              </div>
            ) : (
              <div className="login-supervisor-button-group">
                <button 
                  type="button" 
                  onClick={handleVolver}
                  className="login-supervisor-back-button"
                  disabled={isLoading}
                >
                  Volver
                </button>
                
                <button 
                  type="submit" 
                  className="login-supervisor-submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verificando...' : 'Continuar'}
                </button>
              </div>
            )}
          </form>
        );
        
      case 2:
        return (
          <form onSubmit={handleVerificarCodigo}>
            <div className="login-supervisor-form-group">
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
              />
              <small>Revise su correo electrónico para obtener el código</small>
            </div>
            
            <div className="login-supervisor-button-group">
              <button 
                type="button" 
                onClick={handleVolver}
                className="login-supervisor-back-button"
                disabled={isLoading}
              >
                Volver
              </button>
              
              <button 
                type="submit" 
                className="login-supervisor-submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Verificar Código'}
              </button>
            </div>
          </form>
        );
        
      case 3:
        return (
          <form onSubmit={handleAutenticar}>
            <div className="login-supervisor-form-group">
              <label htmlFor="claveSecreta">Clave Secreta del Sistema</label>
              <input
                id="claveSecreta"
                type="password"
                placeholder="Ingrese la clave secreta"
                value={claveSecreta}
                onChange={(e) => setClaveSecreta(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>
            
            <div className="login-supervisor-button-group">
              <button 
                type="button" 
                onClick={handleVolver}
                className="login-supervisor-back-button"
                disabled={isLoading}
              >
                Volver
              </button>
              
              <button 
                type="submit" 
                className="login-supervisor-submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Accediendo...' : 'Acceder'}
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
      case 3:
        return "Ingrese la clave secreta del sistema";
      default:
        return "";
    }
  };

  return (
    <div className="login-supervisor-container">
      {/* Panel izquierdo con el formulario de login */}
      <div className="login-supervisor-panel">
        <div className="login-supervisor-card">
          <h2>Acceso de Supervisor</h2>
          <p className="login-supervisor-subtitle">{getTituloPaso()}</p>
          
          {error && (
            <div className="login-supervisor-error-message">
              <p>{error}</p>
            </div>
          )}
          
          {mensaje && (
            <div className="login-supervisor-success-message">
              <p>{mensaje}</p>
            </div>
          )}
          
          {renderFormulario()}
        </div>
      </div>
      
      {/* Panel derecho con la imagen de fondo */}
      <div className="login-supervisor-image"></div>
    </div>
  );
};

export default SupervisorLogin;