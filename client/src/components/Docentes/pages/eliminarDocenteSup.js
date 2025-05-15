import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  deleteDocente, 
  verificarDependenciasDocente,
  obtenerResumenDependenciasDocente 
} from '../../../service/docenteService';
import '../style/eliminarDocenteSup.css';

/**
 * Modal para eliminar docente con confirmación según dependencias
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.docente - Datos del docente a eliminar
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onEliminar - Función a ejecutar después de eliminar (opcional)
 */
function EliminarDocenteModal({ docente, onClose, onEliminar }) {
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [dependencias, setDependencias] = useState(null);
  const [tieneDependencias, setTieneDependencias] = useState(false);
  const [docentesDisponibles, setDocentesDisponibles] = useState([]);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState('dejar_sin_docente');
  const [docenteNuevo, setDocenteNuevo] = useState('');
  
  // Al montar el componente, verificar dependencias
  useEffect(() => {
    const verificarDependencias = async () => {
      try {
        setVerificando(true);
        
        if (docente && docente.id) {
          const respuesta = await verificarDependenciasDocente(docente.id);
          setDependencias(respuesta.dependencias);
          setTieneDependencias(respuesta.dependencias.tieneDependencias);
          setDocentesDisponibles(respuesta.docentesDisponibles || []);
        }
      } catch (error) {
        console.error('Error al verificar dependencias:', error);
        toast.error('Error al verificar las dependencias del docente');
      } finally {
        setVerificando(false);
      }
    };
    
    verificarDependencias();
  }, [docente]);
  
  const handleEliminarClick = async () => {
    try {
      setLoading(true);
      
      // Si tiene dependencias y no se ha confirmado, solicitar confirmación
      if (tieneDependencias && !confirmarEliminacion) {
        setConfirmarEliminacion(true);
        setLoading(false);
        return;
      }
      
      // Preparar opciones según lo seleccionado por el usuario
      const options = { confirmar: confirmarEliminacion };
      
      if (confirmarEliminacion) {
        if (opcionSeleccionada === 'reasignar' && docenteNuevo) {
          options.reasignarA = parseInt(docenteNuevo);
        } else if (opcionSeleccionada === 'borrar_grupos') {
          options.borrarGrupos = true;
        }
        // Si es 'dejar_sin_docente', no se añade ninguna opción adicional
      }
      
      // Eliminar el docente con las opciones seleccionadas
      const resultado = await deleteDocente(docente.id, options);
      
      // Mostrar mensaje de éxito
      toast.success(resultado.mensaje || 'Docente eliminado correctamente');
      
      // Cerrar modal y ejecutar callback si existe
      onClose();
      if (onEliminar) onEliminar();
      
    } catch (error) {
      console.error('Error al eliminar docente:', error);
      
      if (error.requiereConfirmacion) {
        // Si se requiere confirmación, mostrar mensaje y actualizar estado
        setDependencias(error.dependencias);
        setTieneDependencias(true);
        setConfirmarEliminacion(true);
        toast.warning(error.mensaje);
      } else {
        // Otros errores
        toast.error(error.response?.data?.error || 'Error al eliminar el docente');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de opción para grupos
  const handleOpcionChange = (e) => {
    setOpcionSeleccionada(e.target.value);
  };
  
  // Manejar selección de docente nuevo
  const handleDocenteChange = (e) => {
    setDocenteNuevo(e.target.value);
  };
  
  // Renderizar lista de dependencias
  const renderDependenciasList = () => {
    if (!dependencias) return null;
    
    const items = [];
    
    if (dependencias.grupos.cantidad > 0) {
      items.push(
        <li key="grupos">
          <strong>{dependencias.grupos.cantidad} grupos</strong> 
          <ul>
            {dependencias.grupos.detalle.map((g, index) => (
              <li key={`grupo-${index}`}>{g.nombre_proyecto} ({g.materia})</li>
            ))}
          </ul>
        </li>
      );
    }
    
    if (dependencias.rubricas.cantidad > 0) {
      items.push(
        <li key="rubricas">
          <strong>{dependencias.rubricas.cantidad} rúbricas</strong>
        </li>
      );
    }
    
    if (dependencias.calificaciones.cantidad > 0) {
      items.push(
        <li key="calificaciones">
          <strong>{dependencias.calificaciones.cantidad} calificaciones</strong>
        </li>
      );
    }
    
    if (dependencias.informes.cantidad > 0) {
      items.push(
        <li key="informes">
          <strong>{dependencias.informes.cantidad} informes</strong>
        </li>
      );
    }
    
    if (dependencias.borradores.cantidad > 0) {
      items.push(
        <li key="borradores">
          <strong>{dependencias.borradores.cantidad} borradores</strong>
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
  
  // Renderizar opciones para los grupos
  const renderOpcionesGrupos = () => {
    if (!confirmarEliminacion || !dependencias || dependencias.grupos.cantidad === 0) {
      return null;
    }
    
    return (
      <div className="opciones-grupos">
        <h4>¿Qué desea hacer con los grupos asignados?</h4>
        
        <div className="opciones-radio">
          <div className="opcion-item">
            <input 
              type="radio" 
              id="dejar_sin_docente" 
              name="opcion_grupos" 
              value="dejar_sin_docente"
              checked={opcionSeleccionada === 'dejar_sin_docente'}
              onChange={handleOpcionChange}
            />
            <label htmlFor="dejar_sin_docente">Dejar grupos sin docente asignado</label>
          </div>
          
          {docentesDisponibles.length > 0 && (
            <div className="opcion-item">
              <input 
                type="radio" 
                id="reasignar" 
                name="opcion_grupos" 
                value="reasignar"
                checked={opcionSeleccionada === 'reasignar'}
                onChange={handleOpcionChange}
              />
              <label htmlFor="reasignar">Reasignar grupos a otro docente</label>
              
              {opcionSeleccionada === 'reasignar' && (
                <div className="selector-docente">
                  <select 
                    value={docenteNuevo} 
                    onChange={handleDocenteChange}
                    disabled={opcionSeleccionada !== 'reasignar'}
                  >
                    <option value="">Seleccione un docente</option>
                    {docentesDisponibles.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre_completo} ({d.correo_electronico})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          
          <div className="opcion-item">
            <input 
              type="radio" 
              id="borrar_grupos" 
              name="opcion_grupos" 
              value="borrar_grupos"
              checked={opcionSeleccionada === 'borrar_grupos'}
              onChange={handleOpcionChange}
            />
            <label htmlFor="borrar_grupos" className="opcion-peligrosa">
              Eliminar todos los grupos y sus asignaciones
            </label>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="docente-eliminar-modal-styles">
      <div className="eliminar-docente-modal">
        <div className="modal-contenido">
          <h2>Eliminar Docente</h2>
          
          {/* Área de contenido con scroll */}
          <div className="modal-scroll-area">
            {verificando ? (
              <div className="loading-spinner">Verificando dependencias...</div>
            ) : (
              <>
                <p className="mensaje-principal">
                  ¿Está seguro que desea eliminar al docente <strong>{docente?.nombre_completo}</strong>?
                </p>
                
                {/* Mostrar mensaje según dependencias */}
                {tieneDependencias && (
                  <div className={`alerta-modal ${opcionSeleccionada === 'borrar_grupos' ? 'alerta-peligro' : 'alerta-advertencia'}`}>
                    <p>Este docente tiene {dependencias.grupos.cantidad} grupos, {dependencias.rubricas.cantidad} rúbricas, 
                       {dependencias.calificaciones.cantidad} calificaciones, {dependencias.informes.cantidad} informes
                       y {dependencias.borradores.cantidad} borradores asociados.</p>
                    
                    {/* Mostrar lista de dependencias si aplica */}
                    {renderDependenciasList()}
                    
                    {!confirmarEliminacion ? (
                      <p className="aviso-confirmacion">
                        Esta acción requiere confirmación adicional.
                      </p>
                    ) : (
                      <>
                        <p className="aviso-confirmacion fuerte">
                          Al eliminar este docente, también se eliminarán todas las rúbricas, calificaciones, informes y borradores asociados.
                        </p>
                        
                        {/* Opciones para los grupos */}
                        {renderOpcionesGrupos()}
                      </>
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
              disabled={loading || (confirmarEliminacion && opcionSeleccionada === 'reasignar' && !docenteNuevo)}
            >
              {loading 
                ? 'Eliminando...' 
                : (confirmarEliminacion && tieneDependencias) 
                  ? 'Confirmar Eliminación' 
                  : 'Eliminar Docente'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EliminarDocenteModal;