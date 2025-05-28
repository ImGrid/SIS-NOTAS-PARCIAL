import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from './LayoutSup';
import supRubricaService from '../../../service/supRubricaService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { 
  getGrupos, 
  getGruposPorCarrera,
  getGruposPorCarreraYParalelo,
  getParalelosDisponiblesPorCarrera
} from '../../../service/grupoService'; 
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
import MATERIAS_POR_SEMESTRE_TEC_SUP_DGCA from '../../../util/materias/materias_tec_diseño';
import MATERIAS_POR_SEMESTRE_TEC_SUP_INF from '../../../util/materias/materias_tec_inf';
import MATERIAS_POR_SEMESTRE_TEC_SUP_SE from '../../../util/materias/materias_tec_etn';
import MATERIAS_POR_SEMESTRE_TEC_SUP_ER from '../../../util/materias/materias_energ';
import MATERIAS_POR_SEMESTRE_TEC_SUP_CC from '../../../util/materias/materias_tec_cons_civ';
const SupervisorRubricas = () => {
  // Estados para configuración del supervisor
  const [supervisor, setSupervisor] = useState(null);
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [manejaParalelos, setManejaParalelos] = useState(false);
  
  // Estados para catálogos
  const [catalogoMaterias, setCatalogoMaterias] = useState({});
  const [carreras, setCarreras] = useState([]);
  const [semestres, setSemestres] = useState({});
  const [asignaturas, setAsignaturas] = useState(['TODAS']);
  const [paralelosDisponibles, setParalelosDisponibles] = useState([]);
  
  // Estados para datos principales
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  
  // Estados para modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [mostrarEstudiantes, setMostrarEstudiantes] = useState(false);
  
  // Estados para formularios
  const [motivo, setMotivo] = useState('');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroAsignatura, setFiltroAsignatura] = useState('TODAS');
  const [filtroParalelo, setFiltroParalelo] = useState(''); // Nuevo filtro para paralelos
  
  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Configuración del catálogo de materias (memoizado para performance)
  const catalogoCompleto = useMemo(() => ({
    'Ingeniería de Sistemas': MATERIAS_POR_SEMESTRE,
    'Ingeniería de Sistemas Electronicos': MATERIAS_POR_SEMESTRE_ETN,
    'Ingeniería Agroindustrial': MATERIAS_POR_SEMESTRE_AGRO,
    'Ciencias Básicas': MATERIAS_POR_SEMESTRE_BASICAS,
    'Ingeniería Comercial': MATERIAS_POR_SEMESTRE_COM,
    'Ingeniería Civil': MATERIAS_POR_SEMESTRE_CIVIL,
    'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual': MATERIAS_POR_SEMESTRE_TEC_SUP_DGCA,
    'Tec. Sup. en Informática': MATERIAS_POR_SEMESTRE_TEC_SUP_INF,
    'Tec. Sup. en Sistemas Electrónicos': MATERIAS_POR_SEMESTRE_TEC_SUP_SE,
    'Técnico Superior en Energías Renovables': MATERIAS_POR_SEMESTRE_TEC_SUP_ER,
    'Tec. Sup. Contrucción Civil': MATERIAS_POR_SEMESTRE_TEC_SUP_CC
  }), []);

  // Función para determinar si el supervisor maneja paralelos
  const detectarManejoParalelos = useCallback((carreras) => {
    return carreras.includes('Ciencias Básicas');
  }, []);

  // Función optimizada para cargar datos del supervisor
  const cargarDatosSupervisor = useCallback(async () => {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) {
      throw new Error('No se encontraron datos del supervisor. Por favor, inicie sesión nuevamente.');
    }

    const usuario = JSON.parse(usuarioStr);
    setSupervisor(usuario);

    // Obtener carreras asignadas
    let carrerasDelSupervisor = [];
    if (usuario.carreras && Array.isArray(usuario.carreras)) {
      carrerasDelSupervisor = usuario.carreras;
    } else if (usuario.id) {
      const supervisorData = await getSupervisorById(usuario.id);
      if (supervisorData?.carreras) {
        carrerasDelSupervisor = supervisorData.carreras;
      } else {
        throw new Error('No se pudieron obtener las carreras asignadas');
      }
    }

    setCarrerasAsignadas(carrerasDelSupervisor);
    
    // Detectar si maneja paralelos
    const requiereParalelos = detectarManejoParalelos(carrerasDelSupervisor);
    setManejaParalelos(requiereParalelos);

    return { carrerasDelSupervisor, requiereParalelos };
  }, [detectarManejoParalelos]);

  // Función para configurar catálogos basado en carreras asignadas
  const configurarCatalogos = useCallback((carrerasDelSupervisor) => {
    setCatalogoMaterias(catalogoCompleto);
    
    // Filtrar carreras disponibles
    const carrerasFiltradas = Object.keys(catalogoCompleto).filter(
      carrera => carrerasDelSupervisor.includes(carrera)
    );
    setCarreras(carrerasFiltradas);
    
    // Preparar semestres por carrera
    const semestresObj = {};
    carrerasFiltradas.forEach(carrera => {
      semestresObj[carrera] = Object.keys(catalogoCompleto[carrera])
        .sort((a, b) => parseInt(a) - parseInt(b));
    });
    setSemestres(semestresObj);
  }, [catalogoCompleto]);

  // Función optimizada para cargar grupos según si maneja paralelos o no
  const cargarGrupos = useCallback(async (carrerasDelSupervisor, requiereParalelos) => {
    if (!carrerasDelSupervisor || carrerasDelSupervisor.length === 0) {
      setGrupos([]);
      return;
    }

    let gruposFiltrados = [];
    
    // Cargar grupos de manera optimizada
    for (const carrera of carrerasDelSupervisor) {
      try {
        const gruposCarrera = await getGruposPorCarrera(carrera);
        gruposFiltrados = [...gruposFiltrados, ...gruposCarrera];
      } catch (error) {
        console.error(`Error al cargar grupos de la carrera ${carrera}:`, error);
      }
    }

    // Eliminar duplicados
    gruposFiltrados = gruposFiltrados.filter((grupo, index, self) =>
      index === self.findIndex((g) => g.id === grupo.id)
    );
    
    // Procesar grupos con datos adicionales
    const gruposConDatos = await procesarGrupos(gruposFiltrados);
    setGrupos(gruposConDatos);

    // Si maneja paralelos, cargar paralelos disponibles para Ciencias Básicas
    if (requiereParalelos && carrerasDelSupervisor.includes('Ciencias Básicas')) {
      try {
        const paralelos = await getParalelosDisponiblesPorCarrera('Ciencias Básicas');
        setParalelosDisponibles(paralelos || []);
      } catch (error) {
        console.error('Error al cargar paralelos disponibles:', error);
        setParalelosDisponibles(['A', 'B', 'C', 'D', 'E', 'F', 'G']); // Fallback
      }
    }
  }, []);

  // Función optimizada para procesar grupos con datos adicionales
  const procesarGrupos = useCallback(async (gruposExistentes) => {
    if (!gruposExistentes || gruposExistentes.length === 0) {
      return [];
    }
    
    // Procesar grupos en paralelo para mejor performance
    const gruposConDatos = await Promise.all(
      gruposExistentes.map(async (grupo) => {
        try {
          // Cargar datos en paralelo
          const [estudiantes, informes] = await Promise.all([
            getEstudiantesByGrupoId(grupo.id),
            getInformesPorGrupoId(grupo.id)
          ]);
          
          // Obtener datos del docente si existe
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
          
          // Verificar borradores si no hay rúbricas
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
            if (detalles.grupo?.habilitacion_activa) {
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
      })
    );
    
    return gruposConDatos;
  }, []);

  // Función para determinar el estado de un grupo
  const determinarEstadoGrupo = useCallback((estudiantes, informes) => {
    if (!estudiantes || estudiantes.length === 0) {
      return 'sin_rubrica';
    }
    
    if (!informes || informes.length === 0) {
      return 'sin_rubrica';
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
      return 'pendiente';
    }
  }, []);

  // Función para obtener texto del estado
  const getTextoEstado = useCallback((estado) => {
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
  }, []);

  // Efecto principal optimizado para cargar datos iniciales
  useEffect(() => {
    const inicializarDatos = async () => {
      try {
        setLoading(true);
        
        // 1. Cargar datos del supervisor y detectar configuración
        const { carrerasDelSupervisor, requiereParalelos } = await cargarDatosSupervisor();
        
        // 2. Configurar catálogos
        configurarCatalogos(carrerasDelSupervisor);
        
        // 3. Cargar grupos
        await cargarGrupos(carrerasDelSupervisor, requiereParalelos);
        
        setLoading(false);
      } catch (error) {
        console.error('Error al inicializar datos:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    inicializarDatos();
  }, [cargarDatosSupervisor, configurarCatalogos, cargarGrupos]);

  // Efecto para actualizar asignaturas cuando cambia carrera o semestre
  useEffect(() => {
    if (!filtroCarrera || !filtroSemestre) {
      setAsignaturas(['TODAS']);
      return;
    }
    
    // Verificar acceso a la carrera
    if (!carrerasAsignadas.includes(filtroCarrera)) {
      setFiltroCarrera('');
      toast.warning('No tiene acceso a esa carrera');
      return;
    }
    
    // Actualizar asignaturas
    if (catalogoMaterias[filtroCarrera]?.[filtroSemestre]) {
      const asignaturasSemestre = catalogoMaterias[filtroCarrera][filtroSemestre];
      setAsignaturas(['TODAS', ...asignaturasSemestre]);
      setFiltroAsignatura('TODAS');
    }
  }, [filtroCarrera, filtroSemestre, catalogoMaterias, carrerasAsignadas]);

  // Memoizar grupos filtrados para mejor performance
  const gruposFiltrados = useMemo(() => {
    return grupos.filter(grupo => {
      // Verificar carrera específica
      if (filtroCarrera && filtroCarrera !== grupo.carrera) {
        return false;
      }
      
      // Verificar acceso del supervisor
      if (!carrerasAsignadas.includes(grupo.carrera)) {
        return false;
      }
      
      // Filtro por búsqueda
      const matchBusqueda = !searchTerm || 
        (grupo.nombre_proyecto?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (grupo.carrera?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (grupo.materia?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filtro por estado
      const matchEstado = !filtroEstado || grupo.estado === filtroEstado;
      
      // Filtro por semestre
      const matchSemestre = !filtroSemestre || (grupo.semestre?.toString() === filtroSemestre);
      
      // Filtro por asignatura
      const matchAsignatura = filtroAsignatura === 'TODAS' || grupo.materia === filtroAsignatura;
      
      // Filtro por paralelo (solo si maneja paralelos)
      const matchParalelo = !manejaParalelos || !filtroParalelo || grupo.paralelo === filtroParalelo;
      
      return matchBusqueda && matchEstado && matchSemestre && matchAsignatura && matchParalelo;
    });
  }, [grupos, searchTerm, filtroEstado, filtroCarrera, filtroSemestre, filtroAsignatura, filtroParalelo, carrerasAsignadas, manejaParalelos]);

  // Función para ver detalles optimizada
  const verDetalles = useCallback(async (grupo) => {
    // Verificar acceso
    if (!carrerasAsignadas.includes(grupo.carrera)) {
      toast.error('No tiene acceso a este grupo');
      return;
    }
    
    try {
      setLoading(true);
      setMostrarEstudiantes(false);
      
      // Si el grupo ya tiene todos los detalles, usarlos directamente
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
  }, [carrerasAsignadas]);

  // Función para abrir modal de habilitación optimizada
  const abrirModalHabilitar = useCallback((grupo) => {
    // Verificar acceso
    if (!carrerasAsignadas.includes(grupo.carrera)) {
      toast.error('No tiene acceso a este grupo');
      return;
    }
    
    // Verificar si puede ser habilitado
    const verificacion = supRubricaService.verificarGrupoHabilitable(grupo);
    
    if (!verificacion.habilitacionPosible) {
      toast.warning(verificacion.razon);
      return;
    }
    
    setGrupoSeleccionado(grupo);
    setMotivo('');
    setModalVisible(true);
  }, [carrerasAsignadas]);

  // Función para habilitar grupo optimizada
  const habilitarGrupo = useCallback(async () => {
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
      await cargarGrupos(carrerasAsignadas, manejaParalelos);
      
      setLoading(false);
    } catch (error) {
      toast.error(error.message || 'Error al habilitar grupo');
      setLoading(false);
    }
  }, [motivo, grupoSeleccionado, cargarGrupos, carrerasAsignadas, manejaParalelos]);

  // Función para ver historial optimizada
  const verHistorial = useCallback(async (grupo) => {
    // Verificar acceso
    if (!carrerasAsignadas.includes(grupo.carrera)) {
      toast.error('No tiene acceso a este grupo');
      return;
    }
    
    try {
      setLoading(true);
      const resultado = await supRubricaService.obtenerHistorialHabilitaciones(grupo.id);
      setHistorial(resultado.historial || []);
      setHistorialVisible(true);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar historial de habilitaciones');
      setLoading(false);
    }
  }, [carrerasAsignadas]);

  // Función para desactivar habilitación optimizada
  const desactivarHabilitacion = useCallback(async (habilitacionId) => {
    try {
      setLoading(true);
      await supRubricaService.desactivarHabilitacion(habilitacionId);
      
      toast.success('Habilitación desactivada correctamente');
      
      // Recargar historial si hay grupo seleccionado
      if (grupoSeleccionado) {
        const resultado = await supRubricaService.obtenerHistorialHabilitaciones(grupoSeleccionado.id);
        setHistorial(resultado.historial || []);
        
        // Actualizar datos del grupo
        const detalles = await supRubricaService.obtenerRubricasGrupo(grupoSeleccionado.id);
        setGrupoSeleccionado(detalles.grupo);
      }
      
      // Recargar todos los grupos
      await cargarGrupos(carrerasAsignadas, manejaParalelos);
      
      setLoading(false);
    } catch (error) {
      toast.error('Error al desactivar habilitación');
      setLoading(false);
    }
  }, [grupoSeleccionado, cargarGrupos, carrerasAsignadas, manejaParalelos]);

  // Función para formatear fechas
  const formatearFecha = useCallback((fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-BO');
  }, []);

  // Función para obtener colores de estado
  const getEstadoColor = useCallback((estado) => {
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
  }, []);

  // Función para limpiar filtros
  const limpiarFiltros = useCallback(() => {
    setSearchTerm('');
    setFiltroEstado('');
    setFiltroCarrera('');
    setFiltroSemestre('');
    setFiltroAsignatura('TODAS');
    if (manejaParalelos) {
      setFiltroParalelo('');
    }
  }, [manejaParalelos]);

  // Renderizar header de tabla (condicional para paralelos)
  const renderizarHeaderTabla = useCallback(() => (
    <div className="sup-tabla-header">
      <div className="sup-col-nombre">Proyecto</div>
      <div className="sup-col-carrera">Carrera</div>
      <div className="sup-col-semestre">Sem.</div>
      {manejaParalelos && <div className="sup-col-paralelo">Paralelo</div>}
      <div className="sup-col-materia">Materia</div>
      <div className="sup-col-estado">Estado</div>
      <div className="sup-col-acciones">Acciones</div>
    </div>
  ), [manejaParalelos]);

  // Renderizar fila de grupo (condicional para paralelos)
  const renderizarFilaGrupo = useCallback((grupo) => (
    <div 
      key={grupo.id} 
      className={`sup-tabla-fila ${grupo.habilitacion_activa ? 'sup-fila-habilitada' : ''}`}
    >
      <div className="sup-col-nombre">{grupo.nombre_proyecto}</div>
      <div className="sup-col-carrera">{grupo.carrera}</div>
      <div className="sup-col-semestre">{grupo.semestre}</div>
      {manejaParalelos && <div className="sup-col-paralelo">{grupo.paralelo || 'A'}</div>}
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
          disabled={grupo.habilitacion_activa || grupo.estado !== 'finalizado'}
        >
          Habilitar
        </button>
      </div>
    </div>
  ), [manejaParalelos, getEstadoColor, verDetalles, abrirModalHabilitar]);

  // Renderizar filtros (condicional para paralelos)
  const renderizarFiltros = useCallback(() => (
    <div className="sup-filters-search-row">
      {/* Barra de búsqueda */}
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
      
      {/* Filtro de carrera */}
      <div className="sup-filtro">
        <label className="sup-filtro-label">Carrera</label>
        <select 
          value={filtroCarrera} 
          onChange={e => {
            const carreraSeleccionada = e.target.value;
            if (carreraSeleccionada === '' || carrerasAsignadas.includes(carreraSeleccionada)) {
              setFiltroCarrera(carreraSeleccionada);
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
      
      {/* Filtro de semestre */}
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
      
      {/* Filtro de paralelo (solo si maneja paralelos) */}
      {manejaParalelos && (
        <div className="sup-filtro">
          <label className="sup-filtro-label">Paralelo</label>
          <select 
            value={filtroParalelo} 
            onChange={e => setFiltroParalelo(e.target.value)}
          >
            <option value="">Todos los paralelos</option>
            {paralelosDisponibles.map(paralelo => (
              <option key={paralelo} value={paralelo}>Paralelo {paralelo}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* Filtro de asignatura */}
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
      
      {/* Filtro de estado */}
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
  ), [searchTerm, filtroCarrera, filtroSemestre, filtroParalelo, filtroAsignatura, filtroEstado, manejaParalelos, carreras, carrerasAsignadas, semestres, asignaturas, paralelosDisponibles, limpiarFiltros]);

  // Renderizar modal de detalles (con información de paralelo condicional)
  const renderizarModalDetalles = useCallback(() => {
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
                {manejaParalelos && grupoSeleccionado.carrera === 'Ciencias Básicas' && (
                  <span><strong>Paralelo:</strong> {grupoSeleccionado.paralelo || 'A'}</span>
                )}
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
              
              {/* Sección de estudiantes */}
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
                          {manejaParalelos && grupoSeleccionado.carrera === 'Ciencias Básicas' && <th>Paralelo</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {grupoSeleccionado._estudiantes.map(estudiante => (
                          <tr key={estudiante.id}>
                            <td>{estudiante.nombre}</td>
                            <td>{estudiante.apellido}</td>
                            <td>{estudiante.codigo}</td>
                            {manejaParalelos && grupoSeleccionado.carrera === 'Ciencias Básicas' && (
                              <td>{estudiante.paralelo || 'A'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Mensaje específico si no hay rúbricas */}
              {grupoSeleccionado.estado === 'sin_rubrica' && (
                <div className="sup-info-row">
                  <span style={{ color: '#f39c12', fontStyle: 'italic' }}>
                    El docente aún no ha registrado ninguna rúbrica para este grupo.
                  </span>
                </div>
              )}
              
              {/* Badge de habilitación activa */}
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
            
            {/* Detalles de habilitación activa */}
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
  }, [modalDetallesVisible, grupoSeleccionado, mostrarEstudiantes, manejaParalelos, getEstadoColor, formatearFecha, verHistorial, abrirModalHabilitar, desactivarHabilitacion]);

  // Renderizar modal de habilitación
  const renderizarModalHabilitar = useCallback(() => {
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
  }, [modalVisible, grupoSeleccionado, motivo, loading, habilitarGrupo]);

  // Renderizar modal de historial
  const renderizarModalHistorial = useCallback(() => {
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
  }, [historialVisible, grupoSeleccionado, historial, formatearFecha, desactivarHabilitacion, loading]);

  // Manejo de errores
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
        {/* Encabezado */}
        <div className="sup-header">
          <div className="sup-header-content">
            <h1>GESTIÓN DE RÚBRICAS</h1>
            {carrerasAsignadas.length > 0 && (
              <p className="header-asignacion">
                Carreras asignadas: <strong>{carrerasAsignadas.join(', ')}</strong>
                {manejaParalelos && <span className="paralelos-info"></span>}
              </p>
            )}
          </div>
        </div>
        
        <div className="sup-evaluacion-container">
          {/* Filtros */}
          {renderizarFiltros()}
          
          {loading ? (
            <div className="sup-loading-indicator">Cargando datos...</div>
          ) : (
            <div className="sup-contenido-principal">
              {gruposFiltrados.length === 0 ? (
                <div className="sup-no-results">
                  <p>No se encontraron grupos con los filtros aplicados.</p>
                </div>
              ) : (
                <div className={`sup-grupos-tabla ${manejaParalelos ? 'con-paralelos' : ''}`}>
                  {renderizarHeaderTabla()}
                  {gruposFiltrados.map(renderizarFilaGrupo)}
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