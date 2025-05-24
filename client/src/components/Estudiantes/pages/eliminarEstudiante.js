import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  deleteEstudiante, 
  verificarDependenciasEstudiante,
  carreraNecesitaParalelo 
} from '../../../service/estudianteService';
import '../style/eliminarEstudiante.css';

/**
 * Modal para eliminar estudiante con confirmación según dependencias
 * Incluye soporte para mostrar información de paralelos cuando es relevante
 * VERSIÓN CORREGIDA - Sin errores JSX
 */
function EliminarEstudianteModal({ estudiante, onClose, onEliminar }) {
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [dependencias, setDependencias] = useState(null);
  const [tieneDependencias, setTieneDependencias] = useState(false);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);
  
  // Estados para manejo de paralelos
  const [mostrarParalelo, setMostrarParalelo] = useState(false);
  
  // Al montar el componente, verificar dependencias y configuración
  useEffect(() => {
    const verificarDependencias = async () => {
      try {
        setVerificando(true);
        
        if (estudiante && estudiante.id) {
          // Verificar si debe mostrar información de paralelo
          const deberaMostrarParalelo = carreraNecesitaParalelo(estudiante.carrera);
          setMostrarParalelo(deberaMostrarParalelo);
          
          // Verificar dependencias del estudiante
          const respuesta = await verificarDependenciasEstudiante(estudiante.id);
          setDependencias(respuesta.dependencias);
          setTieneDependencias(respuesta.dependencias.tieneDependencias);
        }
      } catch (error) {
        console.error('Error al verificar dependencias:', error);
        toast.error('Error al verificar las dependencias del estudiante');
      } finally {
        setVerificando(false);
      }
    };
    
    verificarDependencias();
  }, [estudiante]);
  
  const handleEliminarClick = async () => {
    try {
      setLoading(true);
      
      // Si tiene dependencias y no se ha confirmado, solicitar confirmación
      if (tieneDependencias && !confirmarEliminacion) {
        setConfirmarEliminacion(true);
        setLoading(false);
        return;
      }
      
      // Eliminar el estudiante (con el parámetro de confirmación si es necesario)
      const resultado = await deleteEstudiante(estudiante.id, confirmarEliminacion);
            
      // Si se han eliminado dependencias, mostrar mensaje adicional
      if (resultado.dependenciasEliminadas) {
        const { asignaciones, informes, calificaciones } = resultado.dependenciasEliminadas;
        if (asignaciones > 0 || informes > 0 || calificaciones > 0) {
          toast.info(`Se eliminaron: ${asignaciones} asignaciones, ${informes} informes y ${calificaciones} calificaciones.`, {
            autoClose: 8000
          });
        }
      }
      
      onClose();
      if (onEliminar) onEliminar();
      
    } catch (error) {
      console.error('Error al eliminar estudiante:', error);
      
      if (error.requiereConfirmacion) {
        // Si se requiere confirmación, mostrar mensaje y actualizar estado
        setDependencias(error.dependencias);
        setTieneDependencias(true);
        setConfirmarEliminacion(true);
        toast.warning(error.mensaje);
      } else {
        // Otros errores
        toast.error(error.response?.data?.error || 'Error al eliminar el estudiante');
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderizar información del estudiante incluyendo paralelo cuando es relevante
  const renderInformacionEstudiante = () => {
    if (!estudiante) return null;
    
    const nombreCompleto = `${estudiante.nombre} ${estudiante.apellido}`;
    const carrera = estudiante.carrera;
    const semestre = estudiante.semestre;
    const paralelo = estudiante.paralelo || 'A'; // Siempre hay paralelo, por defecto 'A'
    
    return (
      <div className="info-estudiante">
        <h3>Información del estudiante:</h3>
        <ul className="datos-estudiante">
          <li><strong>Nombre:</strong> {nombreCompleto}</li>
          <li><strong>Código:</strong> {estudiante.codigo}</li>
          <li><strong>Carrera:</strong> {carrera}</li>
          <li><strong>Semestre:</strong> {semestre}º Semestre</li>
          {mostrarParalelo ? (
            <li>
              <strong>Paralelo:</strong> 
              <span className="paralelo-badge">{paralelo}</span>
              <span className="paralelo-info">(Ciencias Básicas)</span>
            </li>
          ) : (
            <li>
              <strong>Paralelo:</strong> 
              <span className="paralelo-badge-simple">{paralelo}</span>
            </li>
          )}
          <li><strong>Unidad Académica:</strong> {estudiante.unidad_educativa}</li>
        </ul>
      </div>
    );
  };

  // Componer el mensaje según las dependencias
  const getMensajeConfirmacion = () => {
    if (!dependencias) return "¿Está seguro que desea eliminar a este estudiante?";
    
    if (dependencias.asignaciones.cantidad > 0 && 
        dependencias.informes.cantidad === 0 && 
        dependencias.calificaciones.cantidad === 0) {
      const mensajeBase = "Este estudiante está asignado a grupos. Si continúa, se eliminarán todas sus asignaciones.";
      return mostrarParalelo 
        ? `${mensajeBase} Los datos están vinculados al paralelo ${estudiante.paralelo || 'A'} de Ciencias Básicas.`
        : mensajeBase;
    }
    
    if (dependencias.informes.cantidad > 0 || dependencias.calificaciones.cantidad > 0) {
      const mensajeBase = "Este estudiante tiene evaluaciones, rúbricas e informes asociados. Si continúa, se eliminarán todos estos datos.";
      return mostrarParalelo 
        ? `${mensajeBase} Los datos académicos están vinculados al paralelo ${estudiante.paralelo || 'A'} de Ciencias Básicas.`
        : mensajeBase;
    }
    
    return "¿Está seguro que desea eliminar a este estudiante?";
  };
  
  // Renderizar lista de dependencias con información de paralelo
  const renderDependenciasList = () => {
    if (!dependencias) return null;
    
    const items = [];
    
    if (dependencias.asignaciones.cantidad > 0) {
      items.push(
        <li key="asignaciones">
          {dependencias.asignaciones.cantidad} asignaciones a grupos
          <ul>
            {dependencias.asignaciones.detalle.map((a, index) => (
              <li key={`grupo-${index}`}>
                {a.nombre_proyecto} ({a.materia})
                {mostrarParalelo && (
                  <span className="paralelo-dependencia"> - Paralelo {estudiante.paralelo || 'A'}</span>
                )}
              </li>
            ))}
          </ul>
        </li>
      );
    }
    
    if (dependencias.informes.cantidad > 0) {
      items.push(
        <li key="informes">
          {dependencias.informes.cantidad} informes de evaluación
          {mostrarParalelo && (
            <span className="paralelo-dependencia"> (Paralelo {estudiante.paralelo || 'A'})</span>
          )}
        </li>
      );
    }
    
    if (dependencias.calificaciones.cantidad > 0) {
      items.push(
        <li key="calificaciones">
          {dependencias.calificaciones.cantidad} calificaciones registradas
          {mostrarParalelo && (
            <span className="paralelo-dependencia"> (Paralelo {estudiante.paralelo || 'A'})</span>
          )}
        </li>
      );
    }
    
    if (items.length === 0) return null;
    
    return (
      <ul className="dependencias-list">
        {items}
      </ul>
    );
  };

  // Renderizar advertencia especial para Ciencias Básicas
  const renderAdvertenciaParalelo = () => {
    if (!mostrarParalelo || !tieneDependencias) return null;
  };

  // Renderizar mensaje de confirmación según estado
  const renderMensajeConfirmacion = () => {
    if (!confirmarEliminacion) {
      return (
        <p className="aviso-confirmacion">
          Esta acción no se puede deshacer.
          {mostrarParalelo && " Los datos del paralelo se perderán permanentemente."}
        </p>
      );
    } else {
      return (
        <div className="confirmacion-fuerte">
          <p className="aviso-confirmacion fuerte">
            ¿Está completamente seguro de eliminar al estudiante y TODOS sus datos relacionados?
          </p>
          {mostrarParalelo && (
            <p className="aviso-paralelo">
              Esto incluye todos los datos específicos del Paralelo {estudiante.paralelo || 'A'} de Ciencias Básicas.
            </p>
          )}
        </div>
      );
    }
  };
  
  return (
    <div className="estudiante-eliminar-modal-styles">
      <div className="eliminar-estudiante-modal">
        <div className="modal-contenido">
          <h2>Eliminar Estudiante</h2>
          
          {/* Área de contenido con scroll */}
          <div className="modal-scroll-area">
            {verificando ? (
              <div className="loading-spinner">Verificando dependencias...</div>
            ) : (
              <>
                {/* Información del estudiante */}
                {renderInformacionEstudiante()}
                
                <div className="separador"></div>
                
                <p className="mensaje-principal">
                  ¿Está seguro que desea eliminar al estudiante <strong>{estudiante?.nombre} {estudiante?.apellido}</strong>?
                </p>
                
                {/* Advertencia especial para Ciencias Básicas */}
                {renderAdvertenciaParalelo()}
                
                {/* Mostrar mensaje según dependencias */}
                {tieneDependencias && (
                  <div className={`alerta-modal ${dependencias.informes.cantidad > 0 ? 'alerta-peligro' : 'alerta-advertencia'}`}>
                    <p>{getMensajeConfirmacion()}</p>
                    
                    {/* Mostrar lista de dependencias si aplica */}
                    {renderDependenciasList()}
                    
                    {/* Mensaje de confirmación corregido */}
                    {renderMensajeConfirmacion()}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Botones siempre visibles al final */}
          <div className="botones-modal">
            <button 
              className="btn-modal-cancelar" 
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            
            <button 
              className={`btn-modal-eliminar ${confirmarEliminacion ? 'confirmar' : ''} ${mostrarParalelo ? 'ciencias-basicas' : ''} ${loading ? 'loading' : ''}`}
              onClick={handleEliminarClick}
              disabled={loading}
            >
              {loading 
                ? 'Eliminando...' 
                : (confirmarEliminacion && tieneDependencias) 
                  ? mostrarParalelo 
                    ? 'Confirmar Eliminación (Paralelo incluido)'
                    : 'Confirmar Eliminación'
                  : 'Eliminar Estudiante'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EliminarEstudianteModal;