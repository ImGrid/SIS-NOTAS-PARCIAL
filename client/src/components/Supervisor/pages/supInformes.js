import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from './LayoutSup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/supInforme.css';

// Importar servicios
import { 
  getEstudiantes, 
  getEstudiantesBySemestreYCarrera, 
  getEstudiantesByGrupoId,
  getEstudiantesByCarreraYParalelo,
  getEstudiantesBySemestreCarreraYParalelo
} from '../../../service/estudianteService';
import { 
  getGrupos, 
  getGruposPorCarrera, 
  getGruposPorSemestre, 
  getGruposPorMateria,
  getGruposPorCarreraYParalelo,
  getGruposPorSemestreCarreraYParalelo
} from '../../../service/grupoService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { getCalificacionPorId } from '../../../service/calificacionService';
import { getDocenteById } from '../../../service/docenteService';
import { getSupervisorById } from '../../../service/supervisorService';

// Importar utilidades
import { formatearNota, formatearFecha, obtenerFechaActual } from '../../../util/helpers/formatHelper';
import { generarInformeNotasPDF } from '../../../util/pdf/informesNotasPdf';

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
const SupervisorInformes = () => {
  // Estados para configuración del supervisor
  const [supervisor, setSupervisor] = useState(null);
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [manejaParalelos, setManejaParalelos] = useState(false);
  
  // Estados para datos cargados
  const [carreras, setCarreras] = useState([]);
  const [semestres, setSemestres] = useState({});
  const [asignaturas, setAsignaturas] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  
  // Catálogos de materias
  const [catalogoMaterias, setCatalogoMaterias] = useState({});
  
  // Filtros seleccionados
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState('');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('TODAS');
  const [paraleloSeleccionado, setParaleloSeleccionado] = useState(''); // Nuevo filtro
  
  // Estado para búsqueda de estudiantes
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  
  // Datos procesados para mostrar
  const [datosInforme, setDatosInforme] = useState([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  const navigate = useNavigate();

  // Configuración del catálogo de materias (memoizado)
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

  // Paralelos disponibles para Ciencias Básicas
  const paralelosDisponibles = useMemo(() => [
    'A', 'B', 'C', 'D', 'E', 'F', 'G'
  ], []);

  // Función para detectar si el supervisor maneja paralelos
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

    return { carrerasFiltradas, semestresObj };
  }, [catalogoCompleto]);

  // Cargar datos iniciales y carreras asignadas al supervisor al montar el componente
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoading(true);
        
        // 1. Cargar datos del supervisor y detectar configuración
        const { carrerasDelSupervisor, requiereParalelos } = await cargarDatosSupervisor();
        
        // 2. Configurar catálogos
        const { carrerasFiltradas, semestresObj } = configurarCatalogos(carrerasDelSupervisor);
        
        // 3. Seleccionar valores por defecto
        if (carrerasFiltradas.length > 0) {
          const primeraCarrera = carrerasFiltradas[0];
          setCarreraSeleccionada(primeraCarrera);
          
          // Para Ciencias Básicas, seleccionar primer paralelo
          if (requiereParalelos && primeraCarrera === 'Ciencias Básicas') {
            setParaleloSeleccionado('A');
            // Para Ciencias Básicas, usar semestre 1 por defecto
            setSemestreSeleccionado('1');
          } else {
            // Para otras carreras, seleccionar primer semestre
            if (semestresObj[primeraCarrera]?.length > 0) {
              const primerSemestre = semestresObj[primeraCarrera][0];
              setSemestreSeleccionado(primerSemestre);
            }
          }
          
          // Cargar asignaturas para la configuración inicial
          const primerSemestre = requiereParalelos && primeraCarrera === 'Ciencias Básicas' 
            ? '1' 
            : semestresObj[primeraCarrera]?.[0];
            
          if (primerSemestre && catalogoCompleto[primeraCarrera]?.[primerSemestre]) {
            const asignaturasSemestre = catalogoCompleto[primeraCarrera][primerSemestre];
            setAsignaturas(['TODAS', ...asignaturasSemestre]);
          }
        } else {
          setError('No tiene carreras asignadas. Comuníquese con el administrador.');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        setError(error.message);
        setLoading(false);
        toast.error('Error al cargar datos iniciales. Por favor, intente nuevamente.');
      }
    };
    
    cargarDatosIniciales();
  }, [cargarDatosSupervisor, configurarCatalogos, catalogoCompleto]);
  
  // Actualizar asignaturas cuando cambia carrera o semestre
  useEffect(() => {
    if (!carreraSeleccionada || !semestreSeleccionado) return;
    
    // Actualizar lista de asignaturas
    if (catalogoMaterias[carreraSeleccionada]?.[semestreSeleccionado]) {
      const asignaturasSemestre = catalogoMaterias[carreraSeleccionada][semestreSeleccionado];
      setAsignaturas(['TODAS', ...asignaturasSemestre]);
      setAsignaturaSeleccionada('TODAS');
    }
    
    // Generar datos del informe con los nuevos filtros
    if (manejaParalelos && carreraSeleccionada === 'Ciencias Básicas') {
      // Para Ciencias Básicas necesitamos paralelo
      if (paraleloSeleccionado) {
        generarDatosInforme(carreraSeleccionada, semestreSeleccionado, 'TODAS', paraleloSeleccionado);
      }
    } else {
      // Para otras carreras, generar normalmente
      generarDatosInforme(carreraSeleccionada, semestreSeleccionado, 'TODAS');
    }
  }, [carreraSeleccionada, semestreSeleccionado, catalogoMaterias, manejaParalelos, paraleloSeleccionado]);
  
  // Generar informe cuando cambia la asignatura seleccionada
  useEffect(() => {
    if (!carreraSeleccionada || !semestreSeleccionado || !asignaturaSeleccionada) return;
    
    if (manejaParalelos && carreraSeleccionada === 'Ciencias Básicas') {
      if (paraleloSeleccionado) {
        generarDatosInforme(carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada, paraleloSeleccionado);
      }
    } else {
      generarDatosInforme(carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada);
    }
  }, [asignaturaSeleccionada, manejaParalelos, carreraSeleccionada, semestreSeleccionado, paraleloSeleccionado]);

  // Generar informe cuando cambia el paralelo (solo para Ciencias Básicas)
  useEffect(() => {
    if (!manejaParalelos || carreraSeleccionada !== 'Ciencias Básicas' || !paraleloSeleccionado) return;
    
    if (carreraSeleccionada && semestreSeleccionado && asignaturaSeleccionada) {
      generarDatosInforme(carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada, paraleloSeleccionado);
    }
  }, [paraleloSeleccionado, manejaParalelos, carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada]);
  
  // Función principal para generar datos del informe (LÓGICA CRÍTICA MANTENIDA)
  const generarDatosInforme = async (carrera, semestre, asignaturaFiltro, paralelo = null) => {
    try {
      setLoading(true);
      
      // Verificar que la carrera esté asignada al supervisor
      if (!carrerasAsignadas.includes(carrera)) {
        toast.error('No tiene acceso a esta carrera');
        setLoading(false);
        return;
      }
      
      // 1. LÓGICA CRÍTICA: Obtener TODOS los estudiantes (condicional para paralelos)
      let estudiantesFiltrados = [];
      
      if (manejaParalelos && carrera === 'Ciencias Básicas' && paralelo) {
        // Para Ciencias Básicas con paralelos
        estudiantesFiltrados = await getEstudiantesBySemestreCarreraYParalelo(semestre, carrera, paralelo);
      } else {
        // Para carreras regulares (lógica original mantenida)
        estudiantesFiltrados = await getEstudiantesBySemestreYCarrera(semestre, carrera);
      }
      
      setEstudiantes(estudiantesFiltrados);
      
      if (estudiantesFiltrados.length === 0) {
        setDatosInforme([]);
        setLoading(false);
        return;
      }
      
      // 2. Obtener todos los grupos (condicional para paralelos)
      let gruposFiltrados = [];
      
      if (manejaParalelos && carrera === 'Ciencias Básicas' && paralelo) {
        // Para Ciencias Básicas con paralelos
        const gruposCarreraParalelo = await getGruposPorCarreraYParalelo(carrera, paralelo);
        const gruposSemestreCarreraParalelo = await getGruposPorSemestreCarreraYParalelo(semestre, carrera, paralelo);
        
        // Filtrar por carrera, semestre Y paralelo
        gruposFiltrados = gruposCarreraParalelo.filter(grupo => 
          gruposSemestreCarreraParalelo.some(g => g.id === grupo.id)
        );
      } else {
        // Para carreras regulares (lógica original mantenida)
        const gruposCarrera = await getGruposPorCarrera(carrera);
        const gruposSemestre = await getGruposPorSemestre(semestre);
        
        // Filtrar por carrera Y semestre
        gruposFiltrados = gruposCarrera.filter(grupo => 
          gruposSemestre.some(g => g.id === grupo.id)
        );
      }
      
      setGrupos(gruposFiltrados);
      
      // 3. Determinar qué asignaturas vamos a procesar
      const asignaturasSemestre = catalogoMaterias[carrera][semestre] || [];
      const asignaturasAProcesar = asignaturaFiltro === 'TODAS' ? 
        asignaturasSemestre : [asignaturaFiltro];
      
      // 4. Array para almacenar datos del informe por asignatura
      const datosInformeTemp = [];
      
      // 5. Procesar cada asignatura
      for (const asignatura of asignaturasAProcesar) {
        // 6. Obtener grupos específicos para esta asignatura
        const gruposAsignatura = await getGruposPorMateria(asignatura);
        
        // Filtrar grupos por asignatura y aplicar filtros de carrera/semestre/paralelo
        let gruposAsignaturaFiltrados = [];
        
        if (manejaParalelos && carrera === 'Ciencias Básicas' && paralelo) {
          gruposAsignaturaFiltrados = gruposAsignatura.filter(grupo => 
            grupo.carrera === carrera && 
            grupo.semestre.toString() === semestre &&
            grupo.paralelo === paralelo
          );
        } else {
          gruposAsignaturaFiltrados = gruposAsignatura.filter(grupo => 
            grupo.carrera === carrera && grupo.semestre.toString() === semestre
          );
        }
        
        // 7. LÓGICA CRÍTICA MANTENIDA: Preparar estructura para estudiantes de esta asignatura
        const estudiantesConDatos = [];
        
        // 8. LÓGICA CRÍTICA MANTENIDA: Procesar cada estudiante
        for (const estudiante of estudiantesFiltrados) {
          // Buscar en cada grupo si el estudiante está asignado
          let estudianteAsignado = false;
          let grupoAsignado = null;
          let informeEstudiante = null;
          let rubricaEstudiante = null;
          let calificacionEstudiante = null;
          let docenteAsignado = null;
          
          // Revisar cada grupo de esta asignatura
          for (const grupo of gruposAsignaturaFiltrados) {
            // Obtener estudiantes asignados a este grupo
            const estudiantesGrupo = await getEstudiantesByGrupoId(grupo.id);
            
            // Verificar si el estudiante está en este grupo
            if (estudiantesGrupo.some(e => e.id === estudiante.id)) {
              estudianteAsignado = true;
              grupoAsignado = grupo;
              
              // Obtener informes de este grupo
              const informesGrupo = await getInformesPorGrupoId(grupo.id);
              
              // Buscar informe específico para este estudiante
              const informe = informesGrupo.find(
                inf => inf.estudiante_id === estudiante.id
              );
              
              if (informe) {
                informeEstudiante = informe;
                
                // Obtener rúbrica y calificación
                if (informe.rubrica_id) {
                  try {
                    rubricaEstudiante = await getRubricaPorId(informe.rubrica_id);
                  } catch (error) {
                    console.error(`Error al obtener rúbrica ${informe.rubrica_id}:`, error);
                  }
                }
                
                if (informe.calificacion_id) {
                  try {
                    calificacionEstudiante = await getCalificacionPorId(informe.calificacion_id);
                  } catch (error) {
                    console.error(`Error al obtener calificación ${informe.calificacion_id}:`, error);
                  }
                }
              }
              
              // Obtener información del docente
              if (grupo.docente_id) {
                try {
                  docenteAsignado = await getDocenteById(grupo.docente_id);
                } catch (error) {
                  console.error(`Error al obtener docente ${grupo.docente_id}:`, error);
                }
              }
              
              // Una vez encontrado, no es necesario seguir buscando en más grupos
              break;
            }
          }
          
          // Determinar resultado del estudiante
          let resultado = 'PENDIENTE';
          if (rubricaEstudiante) {
            // El resultado se determina según la nota final
            resultado = parseFloat(rubricaEstudiante.nota_final) >= 5.1 ? 'APROBADO' : 'REPROBADO';
          }
          
          // LÓGICA CRÍTICA MANTENIDA: Añadir datos del estudiante al array
          estudiantesConDatos.push({
            estudiante,
            grupo: grupoAsignado,
            informe: informeEstudiante,
            rubrica: rubricaEstudiante,
            calificacion: calificacionEstudiante,
            docente: docenteAsignado,
            resultado
          });
        }
        
        // 9. Calcular estadísticas
        const totalEstudiantes = estudiantesConDatos.length;
        const aprobados = estudiantesConDatos.filter(e => e.resultado === 'APROBADO').length;
        const reprobados = estudiantesConDatos.filter(e => e.resultado === 'REPROBADO').length;
        const pendientes = estudiantesConDatos.filter(e => e.resultado === 'PENDIENTE').length;
        
        // 10. Añadir a los datos del informe
        datosInformeTemp.push({
          asignatura,
          carrera,
          semestre,
          paralelo, // Nuevo campo para paralelos
          estudiantes: estudiantesConDatos,
          estadisticas: {
            total: totalEstudiantes,
            aprobados,
            reprobados,
            pendientes
          }
        });
      }
      
      // Aplicar filtro de búsqueda si existe
      if (busquedaEstudiante.trim()) {
        const terminoLower = busquedaEstudiante.toLowerCase();
        
        datosInformeTemp.forEach(informe => {
          informe.estudiantes = informe.estudiantes.filter(datos => {
            const nombreCompleto = `${datos.estudiante.nombre || ''} ${datos.estudiante.apellido || ''}`.toLowerCase();
            const codigo = (datos.estudiante.codigo || '').toLowerCase();
            
            return nombreCompleto.includes(terminoLower) || codigo.includes(terminoLower);
          });
          
          // Actualizar estadísticas
          informe.estadisticas = {
            total: informe.estudiantes.length,
            aprobados: informe.estudiantes.filter(e => e.resultado === 'APROBADO').length,
            reprobados: informe.estudiantes.filter(e => e.resultado === 'REPROBADO').length,
            pendientes: informe.estudiantes.filter(e => e.resultado === 'PENDIENTE').length
          };
        });
      }
      
      setDatosInforme(datosInformeTemp);
      setLoading(false);
    } catch (error) {
      console.error('Error al generar datos del informe:', error);
      setError('Error al generar el informe. Por favor, intente de nuevo.');
      setLoading(false);
      toast.error('Error al generar informe. Por favor, intente nuevamente.');
    }
  };
  
  // Función para limpiar búsqueda y filtros
  const limpiarBusqueda = useCallback(() => {
    setBusquedaEstudiante('');
    
    // Obtener primera carrera y primer semestre por defecto (solo de las asignadas)
    if (carrerasAsignadas.length > 0) {
      const primeraCarrera = carrerasAsignadas[0];
      setCarreraSeleccionada(primeraCarrera);
      
      if (manejaParalelos && primeraCarrera === 'Ciencias Básicas') {
        setParaleloSeleccionado('A');
        setSemestreSeleccionado('1');
      } else {
        if (semestres[primeraCarrera]?.length > 0) {
          const primerSemestre = semestres[primeraCarrera][0];
          setSemestreSeleccionado(primerSemestre);
        }
      }
    }
    setAsignaturaSeleccionada('TODAS');
  }, [carrerasAsignadas, manejaParalelos, semestres]);
  
  // Función para generar PDF
  const generarPDF = useCallback(() => {
    const contenido = document.getElementById('contenido-para-pdf');
    
    if (contenido) {
      setGenerandoPDF(true);
      toast.info('Generando PDF, por favor espere...');
      
      generarInformeNotasPDF({
        elementoDOM: contenido,
        filtros: {
          carrera: carreraSeleccionada,
          semestre: semestreSeleccionado,
          materia: asignaturaSeleccionada,
          paralelo: manejaParalelos ? paraleloSeleccionado : null,
          busqueda: busquedaEstudiante
        },
        supervisor: true,
        datosFiltrados: datosInforme
      })
      .then(() => {
        setGenerandoPDF(false);
        toast.success('PDF generado correctamente');
      })
      .catch(error => {
        console.error('Error al generar PDF:', error);
        setGenerandoPDF(false);
        toast.error('Error al generar el PDF. Inténtelo de nuevo.');
      });
    } else {
      toast.error('No se pudo generar el PDF. Contenido no encontrado.');
    }
  }, [carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada, paraleloSeleccionado, busquedaEstudiante, manejaParalelos, datosInforme]);

  // Renderizar filtros (condicional para paralelos)
  const renderizarFiltros = useCallback(() => (
    <div className="filters-search-row">
      {/* Barra de búsqueda */}
      <div className="search-input-container">
        <label className="search-label">Búsqueda</label>
        <div className="search-input-field">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o código de estudiante..."
            value={busquedaEstudiante}
            onChange={(e) => {
              setBusquedaEstudiante(e.target.value);
              // Si se borra completamente, recargar datos
              if (e.target.value === '') {
                if (manejaParalelos && carreraSeleccionada === 'Ciencias Básicas') {
                  generarDatosInforme(carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada, paraleloSeleccionado);
                } else {
                  generarDatosInforme(carreraSeleccionada, semestreSeleccionado, asignaturaSeleccionada);
                }
              }
            }}
            className="search-input"
          />
          {busquedaEstudiante && (
            <button 
              onClick={limpiarBusqueda} 
              className="clear-search"
              title="Limpiar búsqueda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Filtro de carrera */}
      <div className="filtro">
        <label className="filtro-label">Carrera</label>
        <select 
          id="carrera-select" 
          value={carreraSeleccionada}
          onChange={(e) => {
            setCarreraSeleccionada(e.target.value);
            // Resetear semestre y paralelo al cambiar carrera
            if (manejaParalelos && e.target.value === 'Ciencias Básicas') {
              setParaleloSeleccionado('A');
              setSemestreSeleccionado('1');
            } else {
              if (semestres[e.target.value]?.length > 0) {
                setSemestreSeleccionado(semestres[e.target.value][0]);
              } else {
                setSemestreSeleccionado('');
              }
            }
          }}
        >
          {carreras.map(carrera => (
            <option key={carrera} value={carrera}>{carrera}</option>
          ))}
        </select>
      </div>
      
      {/* Filtro de semestre */}
      <div className="filtro">
        <label className="filtro-label">Semestre</label>
        <select 
          id="semestre-select" 
          value={semestreSeleccionado}
          onChange={(e) => setSemestreSeleccionado(e.target.value)}
          disabled={!carreraSeleccionada}
        >
          {carreraSeleccionada && semestres[carreraSeleccionada] ? 
            semestres[carreraSeleccionada].map(semestre => (
              <option key={semestre} value={semestre}>{`${semestre}° Semestre`}</option>
            )) : 
            <option value="">No hay semestres disponibles</option>
          }
        </select>
      </div>
      
      {/* Filtro de paralelo (solo si maneja paralelos) */}
      {manejaParalelos && carreraSeleccionada === 'Ciencias Básicas' && (
        <div className="filtro">
          <label className="filtro-label">Paralelo</label>
          <select 
            id="paralelo-select" 
            value={paraleloSeleccionado}
            onChange={(e) => setParaleloSeleccionado(e.target.value)}
          >
            {paralelosDisponibles.map(paralelo => (
              <option key={paralelo} value={paralelo}>Paralelo {paralelo}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* Filtro de asignatura */}
      <div className="filtro">
        <label className="filtro-label">Asignatura</label>
        <select 
          id="materia-select" 
          value={asignaturaSeleccionada}
          onChange={(e) => setAsignaturaSeleccionada(e.target.value)}
          disabled={!carreraSeleccionada || !semestreSeleccionado}
        >
          {asignaturas.map(asignatura => (
            <option key={asignatura} value={asignatura}>{asignatura}</option>
          ))}
        </select>
      </div>
      
      {/* Botón limpiar */}
      <button 
        onClick={limpiarBusqueda} 
        className="btn-limpiar-busqueda"
        title="Limpiar búsqueda"
        disabled={!busquedaEstudiante && asignaturaSeleccionada === 'TODAS'}
      >
        X
      </button>
    </div>
  ), [
    busquedaEstudiante, carreraSeleccionada, semestreSeleccionado, paraleloSeleccionado, 
    asignaturaSeleccionada, manejaParalelos, carreras, semestres, asignaturas, 
    paralelosDisponibles, limpiarBusqueda, generarDatosInforme
  ]);

  // Renderizado para estado de carga
  if (loading) {
    return (
      <LayoutSup>
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="sup-informes-styles">
          <div className="evaluacion-header">
            <div className="header-content">
              <h1>INFORME DE NOTAS POR CARRERA</h1>
            </div>
          </div>
          <div className="evaluacion-container">
            <div className="loading-indicator">Cargando datos de evaluación...</div>
          </div>
        </div>
      </LayoutSup>
    );
  }
  
  // Renderizado para estado de error
  if (error) {
    return (
      <LayoutSup>
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="sup-informes-styles">
          <div className="evaluacion-header">
            <div className="header-content">
              <h1>INFORME DE NOTAS POR CARRERA</h1>
            </div>
          </div>
          <div className="evaluacion-container">
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
  
  // Renderizado principal
  return (
    <LayoutSup>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="sup-informes-styles">
        {/* Encabezado con título y botones */}
        <div className="evaluacion-header">
          <div className="header-content">
            <h1>INFORME DE NOTAS POR CARRERA</h1>
            {carrerasAsignadas.length > 0 && (
              <p className="header-asignacion">
                Carreras asignadas: <strong>{carrerasAsignadas.join(', ')}</strong>
              </p>
            )}
          </div>
          <div className="header-actions">
            <button 
              className="btn-volver"
              onClick={() => navigate('/supervisor/dashboard')}
              disabled={generandoPDF}
            >
              Volver
            </button>
            
            <button 
              className="btn-pdf"
              onClick={generarPDF}
              disabled={generandoPDF}
            >
              {generandoPDF ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
        
        <div className="evaluacion-container">
          {/* Filtros */}
          {renderizarFiltros()}
          
          {/* Contenido para PDF */}
          <div id="contenido-para-pdf" className="contenido-pdf-wrapper">
            {/* Encabezado para PDF */}
            <div className="pdf-header">
              <h1>INFORME DE NOTAS POR CARRERA</h1>
              <h2>Gestión {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
              <div className="pdf-info">
                <div>Fecha del informe: {obtenerFechaActual()}</div>
                <div>Carrera: {carreraSeleccionada}</div>
                <div>Semestre: {semestreSeleccionado}° Semestre</div>
                {manejaParalelos && carreraSeleccionada === 'Ciencias Básicas' && paraleloSeleccionado && (
                  <div>Paralelo: {paraleloSeleccionado}</div>
                )}
                {asignaturaSeleccionada !== 'TODAS' && <div>Asignatura: {asignaturaSeleccionada}</div>}
                {busquedaEstudiante && <div>Filtro estudiante: {busquedaEstudiante}</div>}
              </div>
            </div>
            
            {/* Mostrar cada informe por asignatura */}
            {datosInforme.map((informe, index) => (
              <div key={informe.asignatura} className={`seccion-informe ${index > 0 ? 'nueva-seccion-pdf' : 'primera-seccion-pdf'}`}>
                {/* TÍTULO CONDICIONAL - Sin reestructurar tabla */}
                <h3 className="evitar-salto-pagina">
                  Asignatura: {informe.asignatura}
                  {manejaParalelos && carreraSeleccionada === 'Ciencias Básicas' && informe.paralelo && (
                    <span> - Paralelo: {informe.paralelo}</span>
                  )}
                </h3>
                
                <div className="estadisticas-seccion evitar-salto-pagina">
                  <p>
                    Estudiantes: {informe.estadisticas.total} | 
                    Aprobados: {informe.estadisticas.aprobados} | 
                    Reprobados: {informe.estadisticas.reprobados} | 
                    Pendientes: {informe.estadisticas.pendientes}
                  </p>
                </div>
                
                <div className="evaluacion-estudiantes">
                  <table className="tabla-evaluacion">
                    <thead>
                      <tr>
                        <th style={{width: '2%'}}>#</th>
                        <th style={{width: '6%'}}>Código</th>
                        <th style={{width: '13%'}}>Estudiante</th>
                        <th style={{width: '10%'}}>Grupo</th>
                        <th style={{width: '11%'}}>Presentación (30%)</th>
                        <th style={{width: '11%'}}>Sustentación (30%)</th>
                        <th style={{width: '11%'}}>Documentación (30%)</th>
                        <th style={{width: '9%'}}>Innovación (10%)</th>
                        <th style={{width: '7%'}}>Nota Final</th>
                        <th style={{width: '10%'}}>Fecha Evaluación</th>
                        <th style={{width: '10%'}}>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {informe.estudiantes
                        .sort((a, b) => {
                          // Ordenar por apellido, luego por nombre
                          const apellidoA = a.estudiante.apellido?.toLowerCase() || '';
                          const apellidoB = b.estudiante.apellido?.toLowerCase() || '';
                          if (apellidoA !== apellidoB) return apellidoA.localeCompare(apellidoB);
                          return (a.estudiante.nombre?.toLowerCase() || '').localeCompare(b.estudiante.nombre?.toLowerCase() || '');
                        })
                        .map((datos, index) => (
                          <tr key={`${datos.estudiante.id}-${index}`} className="fila-estudiante">
                            <td style={{width: '3%', textAlign: 'center'}}>{index + 1}</td>
                            <td style={{width: '8%'}}>{datos.estudiante.codigo}</td>
                            <td style={{width: '18%'}}>{`${datos.estudiante.nombre || ''} ${datos.estudiante.apellido || ''}`}</td>
                            <td style={{width: '10%'}}>{datos.grupo ? datos.grupo.nombre_proyecto : 'Sin asignar'}</td>
                            <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.presentacion)}</td>
                            <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.sustentacion)}</td>
                            <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.documentacion)}</td>
                            <td style={{width: '7%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.innovacion)}</td>
                            <td style={{width: '7%', textAlign: 'center'}}>
                              <strong>{formatearNota(datos.rubrica?.nota_final)}</strong>
                            </td>
                            <td style={{width: '10%', textAlign: 'center'}}>{formatearFecha(datos.calificacion?.fecha)}</td>
                            <td style={{width: '13%', textAlign: 'center', whiteSpace: 'nowrap'}}>
                              <strong className={
                                datos.resultado === 'APROBADO' ? 'aprobado' : 
                                datos.resultado === 'REPROBADO' ? 'reprobado' : 
                                'pendiente'
                              }>
                                {datos.resultado}
                              </strong>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            
            {/* Mensaje si no hay datos */}
            {datosInforme.length === 0 && (
              <div className="empty-state">
                <p>No se encontraron datos de evaluación con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutSup>
  );
};

export default SupervisorInformes;