import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  deleteEstudiante, 
  verificarDependenciasEstudiante 
} from '../../../service/estudianteService';
import '../style/eliminarEstudiante.css';

/**
 * Modal para eliminar estudiante con confirmación según dependencias
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.estudiante - Datos del estudiante a eliminar
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onEliminar - Función a ejecutar después de eliminar (opcional)
 */
function EliminarEstudianteModal({ estudiante, onClose, onEliminar }) {
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [dependencias, setDependencias] = useState(null);
  const [tieneDependencias, setTieneDependencias] = useState(false);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);
  
  // Al montar el componente, verificar dependencias
  useEffect(() => {
    const verificarDependencias = async () => {
      try {
        setVerificando(true);
        
        if (estudiante && estudiante.id) {
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

  // Componer el mensaje según las dependencias
  const getMensajeConfirmacion = () => {
    if (!dependencias) return "¿Está seguro que desea eliminar a este estudiante?";
    
    if (dependencias.asignaciones.cantidad > 0 && 
        dependencias.informes.cantidad === 0 && 
        dependencias.calificaciones.cantidad === 0) {
      return "Este estudiante está asignado a grupos. Si continúa, se eliminarán todas sus asignaciones.";
    }
    
    if (dependencias.informes.cantidad > 0 || dependencias.calificaciones.cantidad > 0) {
      return "Este estudiante tiene evaluaciones, rúbricas e informes asociados. Si continúa, se eliminarán todos estos datos.";
    }
    
    return "¿Está seguro que desea eliminar a este estudiante?";
  };
  
  // Renderizar lista de dependencias
  const renderDependenciasList = () => {
    if (!dependencias) return null;
    
    const items = [];
    
    if (dependencias.asignaciones.cantidad > 0) {
      items.push(
        <li key="asignaciones">
          {dependencias.asignaciones.cantidad} asignaciones a grupos
          <ul>
            {dependencias.asignaciones.detalle.map((a, index) => (
              <li key={`grupo-${index}`}>{a.nombre_proyecto} ({a.materia})</li>
            ))}
          </ul>
        </li>
      );
    }
    
    if (dependencias.informes.cantidad > 0) {
      items.push(
        <li key="informes">
          {dependencias.informes.cantidad} informes de evaluación
        </li>
      );
    }
    
    if (dependencias.calificaciones.cantidad > 0) {
      items.push(
        <li key="calificaciones">
          {dependencias.calificaciones.cantidad} calificaciones registradas
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
                <p className="mensaje-principal">
                  ¿Está seguro que desea eliminar al estudiante <strong>{estudiante?.nombre} {estudiante?.apellido}</strong>?
                </p>
                
                {/* Mostrar mensaje según dependencias */}
                {tieneDependencias && (
                  <div className={`alerta-modal ${dependencias.informes.cantidad > 0 ? 'alerta-peligro' : 'alerta-advertencia'}`}>
                    <p>{getMensajeConfirmacion()}</p>
                    
                    {/* Mostrar lista de dependencias si aplica */}
                    {renderDependenciasList()}
                    
                    {!confirmarEliminacion ? (
                      <p className="aviso-confirmacion">
                        Esta acción no se puede deshacer.
                      </p>
                    ) : (
                      <p className="aviso-confirmacion fuerte">
                        ¿Está completamente seguro de eliminar al estudiante y TODOS sus datos relacionados?
                      </p>
                    )}
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
              className={`btn-modal-eliminar ${confirmarEliminacion ? 'confirmar' : ''} ${loading ? 'loading' : ''}`}
              onClick={handleEliminarClick}
              disabled={loading}
            >
              {loading 
                ? 'Eliminando...' 
                : (confirmarEliminacion && tieneDependencias) 
                  ? 'Confirmar Eliminación' 
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