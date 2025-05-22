import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from './LayoutSup';
import supRubricaService from '../../../service/supRubricaService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getGrupos, getGruposPorCarrera } from '../../../service/grupoService'; 
import { getBorradorPorDocenteYGrupo } from '../../../service/borradorService';
import { getDocenteById } from '../../../service/docenteService';
import { getSupervisorById } from '../../../service/supervisorService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/supRubrica.css';

// Iconos para el detalle de estudiantes
import { ChevronDown, ChevronUp, Users } from 'react-feather';

// Importar catálogos de materias
import MATERIAS_POR_SEMESTRE from '../../../util/materias/materias_sis';
import MATERIAS_POR_SEMESTRE_ETN from '../../../util/materias/materias_etn';
import MATERIAS_POR_SEMESTRE_AGRO from '../../../util/materias/materias_agro';
import MATERIAS_POR_SEMESTRE_BASICAS from '../../../util/materias/materias_basic';
import MATERIAS_POR_SEMESTRE_COM from '../../../util/materias/materias_com';
import MATERIAS_POR_SEMESTRE_CIVIL from '../../../util/materias/materias_cvil';

const SupervisorRubricas = () => {
  // Estados para los catálogos
  const [catalogoMaterias, setCatalogoMaterias] = useState({});
  const [carreras, setCarreras] = useState([]);
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [semestres, setSemestres] = useState({});
  const [asignaturas, setAsignaturas] = useState([]);
  const [supervisor, setSupervisor] = useState(null);
  
  // Estados para los grupos
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  
  // Estados para los modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historial, setHistorial] = useState([]);
  
  // Estado para mostrar/ocultar lista de estudiantes
  const [mostrarEstudiantes, setMostrarEstudiantes] = useState(false);
  
  // Estados para formularios
  const [motivo, setMotivo] = useState('');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroAsignatura, setFiltroAsignatura] = useState('TODAS');
  
  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Cargar datos iniciales usando catálogos de materias y carreras asignadas al supervisor
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoading(true);
        
        // 1. Obtener datos del supervisor y sus carreras asignadas
        const usuarioStr = sessionStorage.getItem('usuario');
        if (usuarioStr) {
          try {
            const usuario = JSON.parse(usuarioStr);
            setSupervisor(usuario);
            
            // Obtener carreras asignadas desde el objeto de usuario
            let carrerasDelSupervisor = [];
            if (usuario.carreras && Array.isArray(usuario.carreras)) {
              carrerasDelSupervisor = usuario.carreras;
            } else if (usuario.id) {
              // Si no hay carreras en el objeto de usuario, intentar obtenerlas desde el servidor
              const supervisorData = await getSupervisorById(usuario.id);
              if (supervisorData && supervisorData.carreras) {
                carrerasDelSupervisor = supervisorData.carreras;
              } else {
                toast.error('No se pudieron obtener las carreras asignadas');
                setLoading(false);
                return;
              }
            }
            
            setCarrerasAsignadas(carrerasDelSupervisor);
            
            // 2. Configurar catálogos de materias
            const catalogoCompleto = {
              'Ingeniería de Sistemas': MATERIAS_POR_SEMESTRE,
              'Ingeniería de Sistemas Electronicos': MATERIAS_POR_SEMESTRE_ETN,
              'Ingeniería Agroindustrial': MATERIAS_POR_SEMESTRE_AGRO,
              'Ciencias Básicas': MATERIAS_POR_SEMESTRE_BASICAS,
              'Ingeniería Comercial': MATERIAS_POR_SEMESTRE_COM,
              'Ingeniería Civil': MATERIAS_POR_SEMESTRE_CIVIL
            };
            setCatalogoMaterias(catalogoCompleto);
            
            // 3. Filtrar catálogos para mostrar solo las carreras asignadas al supervisor
            const carrerasFiltradas = Object.keys(catalogoCompleto).filter(
              carrera => carrerasDelSupervisor.includes(carrera)
            );
            
            setCarreras(carrerasFiltradas);
            
            // 4. Preparar semestres disponibles por carrera
            const semestresObj = {};
            carrerasFiltradas.forEach(carrera => {
              semestresObj[carrera] = Object.keys(catalogoCompleto[carrera]).sort((a, b) => parseInt(a) - parseInt(b));
            });
            setSemestres(semestresObj);
            
            // 5. No seleccionar filtros específicos al iniciar, mantener vista amplia
            setFiltroCarrera('');
            setFiltroSemestre('');
            setFiltroAsignatura('TODAS');
            
            // 6. Cargar grupos filtrados por carreras asignadas
            await cargarGruposPorCarrerasAsignadas(carrerasDelSupervisor);
          } catch (error) {
            console.error('Error al parsear datos del supervisor:', error);
            setError('Error al procesar datos del supervisor');
          }
        } else {
          setError('No se encontraron datos del supervisor. Por favor, inicie sesión nuevamente.');
        }
        
        setLoading(false);
      } catch (error) {
        toast.error('Error al cargar los datos. Por favor, intente de nuevo más tarde.');
        setLoading(false);
      }
    };
    
    cargarDatosIniciales();
  }, []);

  // Actualizar asignaturas cuando cambia carrera o semestre
  useEffect(() => {
    if (!filtroCarrera || !filtroSemestre) {
      // Si no hay carrera o semestre seleccionado, mostrar "TODAS" como única opción
      setAsignaturas(['TODAS']);
      return;
    }
    
    // Verificar que la carrera seleccionada esté entre las asignadas
    if (!carrerasAsignadas.includes(filtroCarrera)) {
      setFiltroCarrera('');
      toast.warning('No tiene acceso a esa carrera');
      return;
    }
    
    // Actualizar lista de asignaturas
    if (catalogoMaterias[filtroCarrera] && catalogoMaterias[filtroCarrera][filtroSemestre]) {
      const asignaturasSemestre = catalogoMaterias[filtroCarrera][filtroSemestre];
      setAsignaturas(['TODAS', ...asignaturasSemestre]);
      setFiltroAsignatura('TODAS'); // Resetear a TODAS cuando cambia carrera o semestre
    }
  }, [filtroCarrera, filtroSemestre, catalogoMaterias, carrerasAsignadas]);

  // Función para cargar grupos filtrados por carreras asignadas
  const cargarGruposPorCarrerasAsignadas = async (carrerasAsignadas) => {
    try {
      if (!carrerasAsignadas || carrerasAsignadas.length === 0) {
        setGrupos([]);
        setLoading(false);
        return;
      }

      // Cargar grupos de todas las carreras asignadas
      let gruposFiltrados = [];
      for (const carrera of carrerasAsignadas) {
        try {
          const gruposCarrera = await getGruposPorCarrera(carrera);
          gruposFiltrados = [...gruposFiltrados, ...gruposCarrera];
        } catch (error) {
          console.error(`Error al cargar grupos de la carrera ${carrera}:`, error);
        }
      }

      // Eliminar duplicados (grupos que pertenecen a más de una carrera)
      gruposFiltrados = gruposFiltrados.filter((grupo, index, self) =>
        index === self.findIndex((g) => g.id === grupo.id)
      );
      
      // Procesar grupos con datos adicionales
      const gruposConDatos = await procesarGrupos(gruposFiltrados);
      setGrupos(gruposConDatos);
    } catch (error) {
      toast.error('Error al cargar datos de rúbricas');
    }
  };

  // Función para procesar cada grupo con datos adicionales
  const procesarGrupos = async (gruposExistentes) => {
    try {
      if (!gruposExistentes || gruposExistentes.length === 0) {
        return [];
      }
      
      // Procesar cada grupo existente con su información
      const gruposConDatos = await Promise.all(gruposExistentes.map(async (grupo) => {
        try {
          // Obtener estudiantes del grupo
          const estudiantes = await getEstudiantesByGrupoId(grupo.id);
          
          // Obtener informes del grupo
          const informes = await getInformesPorGrupoId(grupo.id);
          
          // Obtener datos del docente si existe docente_id
          let docente_nombre = "-";
          if (grupo.docente_id) {
            try {
              const docente = await getDocenteById(grupo.docente_id);
              docente_nombre = docente ? docente.nombre_completo : "-";
            } catch (errorDocente) {
              console.error(`Error al obtener docente ${grupo.docente_id}:`, errorDocente);
            }
          }
          
          // Determinar estado del grupo
          let estadoGrupo = determinarEstadoGrupo(estudiantes, informes);
          
          // Verificar si hay borradores para este grupo
          if (grupo.docente_id && estadoGrupo === 'sin_rubrica') {
            try {
              const borrador = await getBorradorPorDocenteYGrupo(grupo.docente_id, grupo.id, true);
              if (borrador !== null) {
                estadoGrupo = 'pendiente';
              }
            } catch (error) {
              // Ignorar errores al verificar borradores
            }
          }
          
          // Verificar habilitación activa
          let habilitacionActiva = false;
          let detalleHabilitacion = null;
          
          try {
            const detalles = await supRubricaService.obtenerRubricasGrupo(grupo.id);
            if (detalles.grupo && detalles.grupo.habilitacion_activa) {
              habilitacionActiva = true;
              detalleHabilitacion = detalles.grupo.detalle_habilitacion;
            }
          } catch (error) {
            console.log('Error al verificar habilitación:', error);
          }
          
          return {
            ...grupo,
            docente_nombre,
            total_estudiantes: estudiantes.length,
            total_informes: informes.filter((inf, index, self) => 
              index === self.findIndex(i => i.estudiante_id === inf.estudiante_id)
            ).length,
            estado: estadoGrupo,
            texto_estado: getTextoEstado(estadoGrupo),
            habilitacion_activa: habilitacionActiva,
            detalle_habilitacion: detalleHabilitacion,
            informes: informes,
            // Guardar datos para referencia futura
            _estudiantes: estudiantes
          };
        } catch (error) {
          console.error(`Error al procesar grupo ${grupo.id}:`, error);
          return {
            ...grupo,
            estado: 'error',
            texto_estado: 'Error',
            total_estudiantes: 0,
            total_informes: 0,
            habilitacion_activa: false
          };
        }
      }));
      
      return gruposConDatos;
    } catch (error) {
      console.error('Error al procesar grupos:', error);
      return [];
    }
  };

  // Función para determinar el estado de un grupo
  const determinarEstadoGrupo = (estudiantes, informes) => {
    if (!estudiantes || estudiantes.length === 0) {
      return 'sin_rubrica'; // Si no hay estudiantes, no puede haber rúbricas
    }
    
    if (!informes || informes.length === 0) {
      return 'sin_rubrica'; // Si no hay informes, no hay rúbricas
    }
    
    // Crear mapa de informes por estudiante (solo el más reciente)
    const informesPorEstudiante = {};
    informes.forEach(informe => {
      if (!informesPorEstudiante[informe.estudiante_id] || 
          new Date(informesPorEstudiante[informe.estudiante_id].fecha_creacion || 0) < 
          new Date(informe.fecha_creacion || 0)) {
        informesPorEstudiante[informe.estudiante_id] = informe;
      }
    });
    
    const informesUnicos = Object.values(informesPorEstudiante);
    
    // Un grupo está finalizado cuando todos los estudiantes tienen informes
    if (informesUnicos.length >= estudiantes.length) {
      return 'finalizado';
    } else {
      // Si hay algunos informes pero no para todos los estudiantes
      return 'pendiente';
    }
  };

  // Función para obtener texto del estado
  const getTextoEstado = (estado) => {
    switch (estado) {
      case 'finalizado':
        return 'Finalizado';
      case 'pendiente':
        return 'Pendiente';
      case 'sin_rubrica':
        return 'Sin Rúbrica';
      default:
        return 'Error';
    }
  };

  // Aplicar filtros a los grupos
  const gruposFiltrados = React.useMemo(() => {
    // Primero filtrar por carreras asignadas al supervisor
    const resultado = grupos.filter(grupo => {
      // Si se seleccionó una carrera específica, verificar que coincida y que esté asignada
      if (filtroCarrera && filtroCarrera !== grupo.carrera) {
        return false;
      }
      
      // Verificar que la carrera del grupo esté entre las asignadas al supervisor
      if (!carrerasAsignadas.includes(grupo.carrera)) {
        return false;
      }
      
      // Filtro por búsqueda (nombre proyecto, carrera o materia)
      const matchBusqueda = 
        !searchTerm || // Si no hay término de búsqueda, incluir todos
        (grupo.nombre_proyecto && grupo.nombre_proyecto.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (grupo.carrera && grupo.carrera.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (grupo.materia && grupo.materia.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filtro por estado
      const matchEstado = !filtroEstado || grupo.estado === filtroEstado;
      
      // Filtro por semestre
      const matchSemestre = !filtroSemestre || (grupo.semestre && grupo.semestre.toString() === filtroSemestre);
      
      // Filtro por asignatura
      const matchAsignatura = filtroAsignatura === 'TODAS' || grupo.materia === filtroAsignatura;
      
      return matchBusqueda && matchEstado && matchSemestre && matchAsignatura;
    });
    
    return resultado;
  }, [grupos, searchTerm, filtroEstado, filtroCarrera, filtroSemestre, filtroAsignatura, carrerasAsignadas]);

  // Función para ver detalles de un grupo
  const verDetalles = async (grupo) => {
    try {
      setLoading(true);
      setMostrarEstudiantes(false); // Resetear el estado del desplegable de estudiantes
      
      // Verificar si el grupo pertenece a una carrera asignada
      if (!carrerasAsignadas.includes(grupo.carrera)) {
        toast.error('No tiene acceso a este grupo');
        setLoading(false);
        return;
      }
      
      // Verificar si el grupo tiene rúbricas registradas
      if (grupo.estado === 'sin_rubrica') {
        setGrupoSeleccionado(grupo);
        setModalDetallesVisible(true);
        setLoading(false);
        return;
      }
      
      // Si ya tenemos todos los detalles del grupo, usarlos directamente
      if (grupo.total_estudiantes !== undefined && grupo.total_informes !== undefined) {
        setGrupoSeleccionado(grupo);
        setModalDetallesVisible(true);
        setLoading(false);
        return;
      }
      
      // Si no, obtener los detalles
      const detalles = await supRubricaService.obtenerRubricasGrupo(grupo.id);
      setGrupoSeleccionado(detalles.grupo);
      setModalDetallesVisible(true);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar detalles del grupo');
      setLoading(false);
    }
  };

  // Función para abrir el modal de habilitación
  const abrirModalHabilitar = (grupo) => {
    // Verificar si el grupo pertenece a una carrera asignada
    if (!carrerasAsignadas.includes(grupo.carrera)) {
      toast.error('No tiene acceso a este grupo');
      return;
    }
    
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
      await cargarGruposPorCarrerasAsignadas(carrerasAsignadas);
      
      setLoading(false);
    } catch (error) {
      toast.error(error.message || 'Error al habilitar grupo');
      setLoading(false);
    }
  };

  // Función para ver historial de habilitaciones
  const verHistorial = async (grupo) => {
    try {
      // Verificar si el grupo pertenece a una carrera asignada
      if (!carrerasAsignadas.includes(grupo.carrera)) {
        toast.error('No tiene acceso a este grupo');
        return;
      }
      
      setLoading(true);
      const resultado = await supRubricaService.obtenerHistorialHabilitaciones(grupo.id);
      setHistorial(resultado.historial || []);
      setHistorialVisible(true);
      setLoading(false);
    } catch (error) {
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
      
      // Recargar todos los grupos para actualizar la vista principal
      await cargarGruposPorCarrerasAsignadas(carrerasAsignadas);
      
      setLoading(false);
    } catch (error) {
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
        return 'sup-estado-finalizado';
      case 'pendiente':
        return 'sup-estado-pendiente';
      case 'sin_rubrica':
        return 'sup-estado-sin-rubrica';
      default:
        return '';
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('');
    setFiltroCarrera('');
    setFiltroSemestre('');
    setFiltroAsignatura('TODAS');
  };

  // Renderizar modal de detalles del grupo
  const renderizarModalDetalles = () => {
    if (!modalDetallesVisible || !grupoSeleccionado) return null;
    
    return (
      <div className="sup-modal-overlay">
        <div className="sup-modal-container sup-modal-detalles">
          <div className="sup-modal-header">
            <h3>Detalles del Grupo</h3>
            <button 
              className="sup-btn-cerrar" 
              onClick={() => setModalDetallesVisible(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="sup-modal-body">
            <div className="sup-detalles-info">
              <h3>{grupoSeleccionado.nombre_proyecto}</h3>
              <div className="sup-info-row">
                <span><strong>Carrera:</strong> {grupoSeleccionado.carrera}</span>
                <span><strong>Semestre:</strong> {grupoSeleccionado.semestre}</span>
                <span><strong>Materia:</strong> {grupoSeleccionado.materia || 'No especificada'}</span>
              </div>
              <div className="sup-info-row">
                <span><strong>Docente:</strong> {grupoSeleccionado.docente_nombre || '-'}</span>
                <span><strong>Informes:</strong> {grupoSeleccionado.total_informes}</span>
                <span><strong>Estado:</strong> 
                  <span className={`sup-badge ${getEstadoColor(grupoSeleccionado.estado)}`}>
                    {grupoSeleccionado.texto_estado}
                  </span>
                </span>
              </div>
              
              {/* Sección de estudiantes con diseño expandible */}
              <div className="sup-estudiantes-seccion">
                <div 
                  className="sup-estudiantes-encabezado" 
                  onClick={() => setMostrarEstudiantes(!mostrarEstudiantes)}
                >
                  <div className="sup-estudiantes-titulo">
                    <Users size={16} />
                    <span>Estudiantes ({grupoSeleccionado.total_estudiantes})</span>
                  </div>
                  {mostrarEstudiantes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                
                {mostrarEstudiantes && grupoSeleccionado._estudiantes && grupoSeleccionado._estudiantes.length > 0 && (
                  <div className="sup-estudiantes-contenido">
                    <table className="sup-estudiantes-tabla">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Apellido</th>
                          <th>Código</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupoSeleccionado._estudiantes.map(estudiante => (
                          <tr key={estudiante.id}>
                            <td>{estudiante.nombre}</td>
                            <td>{estudiante.apellido}</td>
                            <td>{estudiante.codigo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Mostrar mensaje específico si no hay rúbricas */}
              {grupoSeleccionado.estado === 'sin_rubrica' && (
                <div className="sup-info-row">
                  <span style={{ color: '#f39c12', fontStyle: 'italic' }}>
                    El docente aún no ha registrado ninguna rúbrica para este grupo.
                  </span>
                </div>
              )}
              
              {/* Si existe una habilitación activa, mostrar badge */}
              {grupoSeleccionado.habilitacion_activa && (
                <div className="sup-info-row">
                  <span className="sup-badge sup-estado-habilitado">Habilitado para edición</span>
                </div>
              )}
            </div>
            
            <div className="sup-detalles-acciones">
              <button 
                className="sup-btn sup-btn-ver-historial"
                onClick={() => verHistorial(grupoSeleccionado)}
              >
                Ver Historial de Habilitaciones
              </button>
              
              <button 
                className="sup-btn sup-btn-habilitar"
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
              <div className="sup-habilitacion-activa">
                <h4>Habilitación Activa</h4>
                <p><strong>Motivo:</strong> {grupoSeleccionado.detalle_habilitacion.motivo}</p>
                <p><strong>Fecha:</strong> {formatearFecha(grupoSeleccionado.detalle_habilitacion.fecha_habilitacion)}</p>
                <button 
                  className="sup-btn sup-btn-desactivar"
                  onClick={() => desactivarHabilitacion(grupoSeleccionado.detalle_habilitacion.id)}
                >
                  Desactivar Habilitación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar modal de habilitación
  const renderizarModalHabilitar = () => {
    if (!modalVisible) return null;
    
    return (
      <div className="sup-modal-overlay">
        <div className="sup-modal-container">
          <div className="sup-modal-header">
            <h3>Habilitar Rúbricas para Edición</h3>
            <button 
              className="sup-btn-cerrar" 
              onClick={() => setModalVisible(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="sup-modal-body">
            <p className="sup-modal-warning">
              <strong>ADVERTENCIA:</strong> Está a punto de habilitar las rúbricas de este grupo para edición.
              Esto permitirá al docente realizar cambios en evaluaciones que ya fueron finalizadas.
            </p>
            
            <p>Grupo: <strong>{grupoSeleccionado?.nombre_proyecto}</strong></p>
            
            <div className="sup-form-group">
              <label htmlFor="motivo">Motivo de la habilitación (obligatorio):</label>
              <textarea
                id="motivo"
                className="sup-motivo-input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique el motivo por el cual se está habilitando la edición de estas rúbricas..."
                rows={4}
              />
            </div>
          </div>
          
          <div className="sup-modal-footer">
            <button 
              className="sup-btn-cancelar"
              onClick={() => setModalVisible(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              className="sup-btn-confirmar"
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
      <div className="sup-modal-overlay">
        <div className="sup-modal-container sup-modal-lg">
          <div className="sup-modal-header">
            <h3>Historial de Habilitaciones</h3>
            <button 
              className="sup-btn-cerrar" 
              onClick={() => setHistorialVisible(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="sup-modal-body">
            <p>Grupo: <strong>{grupoSeleccionado?.nombre_proyecto}</strong></p>
            
            {historial.length === 0 ? (
              <p className="sup-no-results">No hay registros de habilitaciones para este grupo.</p>
            ) : (
              <div className="sup-historial-table">
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
                      <tr key={item.id} className={item.activa ? 'sup-fila-activa' : ''}>
                        <td>{formatearFecha(item.fecha_habilitacion)}</td>
                        <td>{item.supervisor_nombre}</td>
                        <td>{item.motivo}</td>
                        <td>
                          <span className={`sup-badge ${item.activa ? 'sup-activa' : 'sup-inactiva'}`}>
                            {item.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td>
                          {item.activa && (
                            <button 
                              className="sup-btn sup-btn-desactivar-sm"
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
          
          <div className="sup-modal-footer">
            <button 
              className="sup-btn-cerrar"
              onClick={() => setHistorialVisible(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <LayoutSup>
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="sup-rubricas-container">
          <div className="sup-header">
            <div className="sup-header-content">
              <h1>GESTIÓN DE RÚBRICAS</h1>
            </div>
          </div>
          <div className="sup-evaluacion-container">
            <div className="error-message">{error}</div>
            <div className="acciones-container">
              <button 
                className="btn-volver"
                onClick={() => navigate('/supervisor/dashboard')}
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </LayoutSup>
    );
  }

  return (
    <LayoutSup>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="sup-rubricas-container">
        {/* Encabezado con título */}
        <div className="sup-header">
          <div className="sup-header-content">
            <h1>GESTIÓN DE RÚBRICAS</h1>
            {carrerasAsignadas.length > 0 && (
              <p className="header-asignacion">
                Carreras asignadas: <strong>{carrerasAsignadas.join(', ')}</strong>
              </p>
            )}
          </div>
        </div>
        
        <div className="sup-evaluacion-container">
          {/* Filtros y búsqueda en una sola línea con etiquetas */}
          <div className="sup-filters-search-row">
            {/* Barra de búsqueda con etiqueta */}
            <div className="sup-search-input-container">
              <label className="sup-search-label">Búsqueda</label>
              <div className="sup-search-input-field">
                <svg className="sup-search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por proyecto, carrera o materia..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="sup-search-input"
                />
              </div>
            </div>
            
            {/* Filtro de carrera con etiqueta */}
            <div className="sup-filtro">
              <label className="sup-filtro-label">Carrera</label>
              <select 
                value={filtroCarrera} 
                onChange={e => {
                  // Verificar que la carrera seleccionada esté entre las asignadas
                  const carreraSeleccionada = e.target.value;
                  if (carreraSeleccionada === '' || carrerasAsignadas.includes(carreraSeleccionada)) {
                    setFiltroCarrera(carreraSeleccionada);
                    // Resetear semestre al cambiar carrera
                    setFiltroSemestre('');
                  } else {
                    toast.warning('No tiene acceso a esa carrera');
                  }
                }}
              >
                <option value="">Todas las carreras asignadas</option>
                {carreras.map(carrera => (
                  <option key={carrera} value={carrera}>{carrera}</option>
                ))}
              </select>
            </div>
            
            {/* Filtro de semestre con etiqueta */}
            <div className="sup-filtro">
              <label className="sup-filtro-label">Semestre</label>
              <select 
                value={filtroSemestre} 
                onChange={e => setFiltroSemestre(e.target.value)}
                disabled={!filtroCarrera}
              >
                <option value="">Todos los semestres</option>
                {filtroCarrera && semestres[filtroCarrera] ? 
                  semestres[filtroCarrera].map(semestre => (
                    <option key={semestre} value={semestre}>{`${semestre}° Semestre`}</option>
                  )) : 
                  null
                }
              </select>
            </div>
            
            {/* Filtro de asignatura con etiqueta */}
            <div className="sup-filtro">
              <label className="sup-filtro-label">Asignatura</label>
              <select 
                value={filtroAsignatura} 
                onChange={e => setFiltroAsignatura(e.target.value)}
                disabled={!filtroCarrera || !filtroSemestre}
              >
                {asignaturas.map(asignatura => (
                  <option key={asignatura} value={asignatura}>{asignatura}</option>
                ))}
              </select>
            </div>
            
            {/* Filtro de estado con etiqueta */}
            <div className="sup-filtro">
              <label className="sup-filtro-label">Estado</label>
              <select 
                value={filtroEstado} 
                onChange={e => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="finalizado">Finalizados</option>
                <option value="pendiente">Pendientes</option>
                <option value="sin_rubrica">Sin Rúbrica</option>
              </select>
            </div>
            
            {/* Botón limpiar filtros */}
            <button 
              className="sup-btn-limpiar-filtros"
              onClick={limpiarFiltros}
            >
              X
            </button>
          </div>
          
          {loading ? (
            <div className="sup-loading-indicator">Cargando datos...</div>
          ) : (
            <div className="sup-contenido-principal">
              {gruposFiltrados.length === 0 ? (
                <div className="sup-no-results">
                  <p>No se encontraron grupos con los filtros aplicados.</p>
                </div>
              ) : (
                <div className="sup-grupos-tabla">
                  <div className="sup-tabla-header">
                    <div className="sup-col-nombre">Proyecto</div>
                    <div className="sup-col-carrera">Carrera</div>
                    <div className="sup-col-semestre">Sem.</div>
                    <div className="sup-col-materia">Materia</div>
                    <div className="sup-col-estado">Estado</div>
                    <div className="sup-col-acciones">Acciones</div>
                  </div>
                  
                  {gruposFiltrados.map(grupo => (
                    <div 
                      key={grupo.id} 
                      className={`sup-tabla-fila ${grupo.habilitacion_activa ? 'sup-fila-habilitada' : ''}`}
                    >
                      <div className="sup-col-nombre">{grupo.nombre_proyecto}</div>
                      <div className="sup-col-carrera">{grupo.carrera}</div>
                      <div className="sup-col-semestre">{grupo.semestre}</div>
                      <div className="sup-col-materia">{grupo.materia || '-'}</div>
                      <div className="sup-col-estado">
                        <span className={`sup-badge ${getEstadoColor(grupo.estado)}`}>
                          {grupo.texto_estado}
                        </span>
                        {grupo.habilitacion_activa && (
                          <span className="sup-badge sup-estado-habilitado">Habilitado</span>
                        )}
                      </div>
                      <div className="sup-col-acciones">
                        <button 
                          className="sup-btn sup-btn-detalles"
                          onClick={() => verDetalles(grupo)}
                        >
                          Detalles
                        </button>
                        <button 
                          className="sup-btn sup-btn-habilitacion"
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
          )}
        </div>
      </div>
      
      {renderizarModalDetalles()}
      {renderizarModalHabilitar()}
      {renderizarModalHistorial()}
    </LayoutSup>
  );
};

export default SupervisorRubricas;