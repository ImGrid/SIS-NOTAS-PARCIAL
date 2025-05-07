import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from './LayoutSup';
import supRubricaService from '../../../service/supRubricaService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/supRubrica.css';

const SupervisorRubricas = () => {
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(true);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  
  const navigate = useNavigate();

  // Cargar los datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const resultado = await supRubricaService.obtenerTodasRubricas();
        setGrupos(resultado.grupos || []);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar rúbricas:', error);
        toast.error('Error al cargar datos de rúbricas');
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Aplicar filtros a los grupos
  const gruposFiltrados = React.useMemo(() => {
    return grupos.filter(grupo => {
      // Filtro por búsqueda (nombre proyecto, carrera o materia)
      const matchBusqueda = 
        grupo.nombre_proyecto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grupo.carrera?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grupo.materia?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por estado
      const matchEstado = !filtroEstado || grupo.estado === filtroEstado;
      
      // Filtro por carrera
      const matchCarrera = !filtroCarrera || grupo.carrera === filtroCarrera;
      
      // Filtro por semestre
      const matchSemestre = !filtroSemestre || grupo.semestre.toString() === filtroSemestre;
      
      return matchBusqueda && matchEstado && matchCarrera && matchSemestre;
    });
  }, [grupos, searchTerm, filtroEstado, filtroCarrera, filtroSemestre]);

  // Obtener lista de carreras únicas
  const carreras = React.useMemo(() => {
    const carrerasSet = new Set(grupos.map(g => g.carrera).filter(Boolean));
    return [...carrerasSet].sort();
  }, [grupos]);

  // Obtener lista de semestres únicos
  const semestres = React.useMemo(() => {
    const semestresSet = new Set(grupos.map(g => g.semestre).filter(Boolean));
    return [...semestresSet].sort((a, b) => a - b);
  }, [grupos]);

  // Función para ver detalles de un grupo
  const verDetalles = async (grupo) => {
    try {
      setLoading(true);
      const detalles = await supRubricaService.obtenerRubricasGrupo(grupo.id);
      setGrupoSeleccionado(detalles.grupo);
      setLoading(false);
    } catch (error) {
      console.error(`Error al obtener detalles del grupo ${grupo.id}:`, error);
      toast.error('Error al cargar detalles del grupo');
      setLoading(false);
    }
  };

  // Función para abrir el modal de habilitación
  const abrirModalHabilitar = (grupo) => {
    // Verificar si el grupo puede ser habilitado
    const verificacion = supRubricaService.verificarGrupoHabilitable(grupo);
    
    if (!verificacion.habilitacionPosible) {
      toast.warning(verificacion.razon);
      return;
    }
    
    setGrupoSeleccionado(grupo);
    setMotivo('');
    setModalVisible(true);
  };

  // Función para habilitar un grupo
  const habilitarGrupo = async () => {
    if (!motivo.trim()) {
      toast.warning('El motivo es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      await supRubricaService.habilitarRubricasGrupo(grupoSeleccionado.id, motivo);
      
      toast.success('Grupo habilitado correctamente');
      setModalVisible(false);
      
      // Recargar datos
      const resultado = await supRubricaService.obtenerTodasRubricas();
      setGrupos(resultado.grupos || []);
      
      // Si hay un grupo seleccionado, actualizar sus datos
      if (grupoSeleccionado) {
        const detalles = await supRubricaService.obtenerRubricasGrupo(grupoSeleccionado.id);
        setGrupoSeleccionado(detalles.grupo);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al habilitar grupo:', error);
      toast.error(error.message || 'Error al habilitar grupo');
      setLoading(false);
    }
  };

  // Función para ver historial de habilitaciones
  const verHistorial = async (grupo) => {
    try {
      setLoading(true);
      const resultado = await supRubricaService.obtenerHistorialHabilitaciones(grupo.id);
      setHistorial(resultado.historial || []);
      setHistorialVisible(true);
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      toast.error('Error al cargar historial de habilitaciones');
      setLoading(false);
    }
  };

  // Función para desactivar una habilitación
  const desactivarHabilitacion = async (habilitacionId) => {
    try {
      setLoading(true);
      await supRubricaService.desactivarHabilitacion(habilitacionId);
      
      toast.success('Habilitación desactivada correctamente');
      
      // Recargar historial
      if (grupoSeleccionado) {
        const resultado = await supRubricaService.obtenerHistorialHabilitaciones(grupoSeleccionado.id);
        setHistorial(resultado.historial || []);
        
        // Actualizar datos del grupo
        const detalles = await supRubricaService.obtenerRubricasGrupo(grupoSeleccionado.id);
        setGrupoSeleccionado(detalles.grupo);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al desactivar habilitación:', error);
      toast.error('Error al desactivar habilitación');
      setLoading(false);
    }
  };

  // Función para formatear fechas
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-BO');
  };

  // Colores según estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'finalizado':
        return 'estado-finalizado';
      case 'pendiente':
        return 'estado-pendiente';
      case 'sin_rubrica':
        return 'estado-sin-rubrica';
      default:
        return '';
    }
  };

  // Renderizar panel de detalles del grupo
  const renderizarDetallesGrupo = () => {
    if (!grupoSeleccionado) return null;
    
    return (
      <div className="detalles-grupo-container">
        <div className="detalles-header">
          <h2>Detalles del Grupo</h2>
          <button 
            className="btn-cerrar" 
            onClick={() => setGrupoSeleccionado(null)}
          >
            ✕
          </button>
        </div>
        
        <div className="detalles-info">
          <h3>{grupoSeleccionado.nombre_proyecto}</h3>
          <div className="info-row">
            <span><strong>Carrera:</strong> {grupoSeleccionado.carrera}</span>
            <span><strong>Semestre:</strong> {grupoSeleccionado.semestre}</span>
            <span><strong>Materia:</strong> {grupoSeleccionado.materia || 'No especificada'}</span>
          </div>
          <div className="info-row">
            <span><strong>Docente:</strong> {grupoSeleccionado.docente_nombre}</span>
            <span><strong>Estudiantes:</strong> {grupoSeleccionado.total_estudiantes}</span>
            <span><strong>Informes:</strong> {grupoSeleccionado.total_informes}</span>
          </div>
          <div className="info-row">
            <span>
              <strong>Estado:</strong> 
              <span className={`badge ${getEstadoColor(grupoSeleccionado.estado)}`}>
                {grupoSeleccionado.texto_estado}
              </span>
            </span>
            {grupoSeleccionado.habilitacion_activa && (
              <span className="badge estado-habilitado">Habilitado para edición</span>
            )}
          </div>
        </div>
        
        <div className="detalles-acciones">
          <button 
            className="btn-ver-historial"
            onClick={() => verHistorial(grupoSeleccionado)}
          >
            Ver Historial de Habilitaciones
          </button>
          
          <button 
            className="btn-habilitar"
            onClick={() => abrirModalHabilitar(grupoSeleccionado)}
            disabled={
              grupoSeleccionado.habilitacion_activa || 
              grupoSeleccionado.estado !== 'finalizado'
            }
          >
            Habilitar Rúbricas
          </button>
        </div>
        
        {/* Si existe una habilitación activa, mostrar detalles */}
        {grupoSeleccionado.habilitacion_activa && grupoSeleccionado.detalle_habilitacion && (
          <div className="habilitacion-activa">
            <h4>Habilitación Activa</h4>
            <p><strong>Motivo:</strong> {grupoSeleccionado.detalle_habilitacion.motivo}</p>
            <p><strong>Fecha:</strong> {formatearFecha(grupoSeleccionado.detalle_habilitacion.fecha_habilitacion)}</p>
            <button 
              className="btn-desactivar"
              onClick={() => desactivarHabilitacion(grupoSeleccionado.detalle_habilitacion.id)}
            >
              Desactivar Habilitación
            </button>
          </div>
        )}
      </div>
    );
  };

  // Renderizar modal de habilitación
  const renderizarModalHabilitar = () => {
    if (!modalVisible) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h3>Habilitar Rúbricas para Edición</h3>
            <button 
              className="btn-cerrar" 
              onClick={() => setModalVisible(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="modal-body">
            <p className="modal-warning">
              <strong>ADVERTENCIA:</strong> Está a punto de habilitar las rúbricas de este grupo para edición.
              Esto permitirá al docente realizar cambios en evaluaciones que ya fueron finalizadas.
            </p>
            
            <p>Grupo: <strong>{grupoSeleccionado?.nombre_proyecto}</strong></p>
            
            <div className="form-group">
              <label htmlFor="motivo">Motivo de la habilitación (obligatorio):</label>
              <textarea
                id="motivo"
                className="motivo-input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique el motivo por el cual se está habilitando la edición de estas rúbricas..."
                rows={4}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn-cancelar"
              onClick={() => setModalVisible(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              className="btn-confirmar"
              onClick={habilitarGrupo}
              disabled={loading || !motivo.trim()}
            >
              {loading ? 'Procesando...' : 'Confirmar Habilitación'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar modal de historial
  const renderizarModalHistorial = () => {
    if (!historialVisible) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-container modal-lg">
          <div className="modal-header">
            <h3>Historial de Habilitaciones</h3>
            <button 
              className="btn-cerrar" 
              onClick={() => setHistorialVisible(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="modal-body">
            <p>Grupo: <strong>{grupoSeleccionado?.nombre_proyecto}</strong></p>
            
            {historial.length === 0 ? (
              <p className="no-results">No hay registros de habilitaciones para este grupo.</p>
            ) : (
              <div className="historial-table">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Supervisor</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(item => (
                      <tr key={item.id} className={item.activa ? 'fila-activa' : ''}>
                        <td>{formatearFecha(item.fecha_habilitacion)}</td>
                        <td>{item.supervisor_nombre}</td>
                        <td>{item.motivo}</td>
                        <td>
                          <span className={`badge ${item.activa ? 'activa' : 'inactiva'}`}>
                            {item.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td>
                          {item.activa && (
                            <button 
                              className="btn-desactivar-sm"
                              onClick={() => desactivarHabilitacion(item.id)}
                              disabled={loading}
                            >
                              Desactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn-cerrar"
              onClick={() => setHistorialVisible(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <LayoutSup>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="sup-rubricas-container">
        <h1>Gestión de Rúbricas</h1>
        
        <div className="filtros-container">
          <div className="buscador">
            <input
              type="text"
              placeholder="Buscar por proyecto, carrera o materia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filtros">
            <select 
              value={filtroEstado} 
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="finalizado">Finalizados</option>
              <option value="pendiente">Pendientes</option>
              <option value="sin_rubrica">Sin Rúbrica</option>
            </select>
            
            <select 
              value={filtroCarrera} 
              onChange={e => setFiltroCarrera(e.target.value)}
            >
              <option value="">Todas las carreras</option>
              {carreras.map(carrera => (
                <option key={carrera} value={carrera}>{carrera}</option>
              ))}
            </select>
            
            <select 
              value={filtroSemestre} 
              onChange={e => setFiltroSemestre(e.target.value)}
            >
              <option value="">Todos los semestres</option>
              {semestres.map(semestre => (
                <option key={semestre} value={semestre}>Semestre {semestre}</option>
              ))}
            </select>
            
            <button 
              className="btn-limpiar-filtros"
              onClick={() => {
                setSearchTerm('');
                setFiltroEstado('');
                setFiltroCarrera('');
                setFiltroSemestre('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-indicator">Cargando datos...</div>
        ) : (
          <div className="contenido-grid">
            <div className="rubricas-lista">
              {gruposFiltrados.length === 0 ? (
                <div className="no-results">
                  <p>No se encontraron grupos con los filtros aplicados.</p>
                </div>
              ) : (
                <div className="grupos-tabla">
                  <div className="tabla-header">
                    <div className="col-nombre">Proyecto</div>
                    <div className="col-carrera">Carrera</div>
                    <div className="col-semestre">Sem.</div>
                    <div className="col-materia">Materia</div>
                    <div className="col-estado">Estado</div>
                    <div className="col-acciones">Acciones</div>
                  </div>
                  
                  {gruposFiltrados.map(grupo => (
                    <div 
                      key={grupo.id} 
                      className={`tabla-fila ${grupo.habilitacion_activa ? 'fila-habilitada' : ''}`}
                    >
                      <div className="col-nombre">{grupo.nombre_proyecto}</div>
                      <div className="col-carrera">{grupo.carrera}</div>
                      <div className="col-semestre">{grupo.semestre}</div>
                      <div className="col-materia">{grupo.materia || '-'}</div>
                      <div className="col-estado">
                        <span className={`badge ${getEstadoColor(grupo.estado)}`}>
                          {grupo.texto_estado}
                        </span>
                        {grupo.habilitacion_activa && (
                          <span className="badge estado-habilitado">Habilitado</span>
                        )}
                      </div>
                      <div className="col-acciones">
                        <button 
                          className="btn-detalles"
                          onClick={() => verDetalles(grupo)}
                        >
                          Detalles
                        </button>
                        <button 
                          className="btn-habilitacion"
                          onClick={() => abrirModalHabilitar(grupo)}
                          disabled={
                            grupo.habilitacion_activa || 
                            grupo.estado !== 'finalizado'
                          }
                        >
                          Habilitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {grupoSeleccionado && renderizarDetallesGrupo()}
          </div>
        )}
      </div>
      
      {renderizarModalHabilitar()}
      {renderizarModalHistorial()}
    </LayoutSup>
  );
};

export default SupervisorRubricas;