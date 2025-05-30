// src/components/Rubricas/pages/notasInformes.js (Con Filtro de Paralelo)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/notasInformes.css';

// Importar servicios
import { getMisGrupos } from '../../../service/grupoService';
import { getEstudiantes } from '../../../service/estudianteService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { getDocenteById } from '../../../service/docenteService';
import { getCalificacionPorId } from '../../../service/calificacionService';

// Importar función para verificar si necesita paralelo
import { carreraNecesitaParalelo } from '../../../service/grupoService';

// Importar utilidades
import { formatearNota, formatearFecha, obtenerFechaActual, calcularPorcentajeAprobacion } from '../../../util/helpers/formatHelper';
import { generarInformeNotasPDF } from '../../../util/pdf/informesNotasPdf';

function NotasInformes() {
  // Estados para almacenar los datos
  const [grupos, setGrupos] = useState([]);
  const [todosLosEstudiantes, setTodosLosEstudiantes] = useState([]);
  const [estudiantesPorGrupo, setEstudiantesPorGrupo] = useState({});
  const [informesPorGrupo, setInformesPorGrupo] = useState({});
  const [rubricasPorInforme, setRubricasPorInforme] = useState({});
  const [calificacionesPorInforme, setCalificacionesPorInforme] = useState({});
  
  // Estructura de datos para organizar por materia-carrera-semestre-paralelo
  const [datosPorMateria, setDatosPorMateria] = useState({});
  
  // Datos para los filtros
  const [materiasUnicas, setMateriasUnicas] = useState([]);
  const [carrerasUnicas, setCarrerasUnicas] = useState([]);
  const [semestresPorCarrera, setSemestresPorCarrera] = useState({});
  const [paralelosDisponibles, setParalelosDisponibles] = useState([]); // NUEVO: Paralelos disponibles
  
  // Estados para los filtros seleccionados
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('TODAS');
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('TODAS');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState('TODOS');
  const [paraleloSeleccionado, setParaleloSeleccionado] = useState('TODOS'); // NUEVO: Filtro de paralelo
  
  // Estado para el campo de búsqueda de estudiantes
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  
  // Estados para carga y errores
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docenteActual, setDocenteActual] = useState(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  // Estado para carreras asignadas al docente
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);

  // Estado para controlar si el docente tiene Ciencias Básicas
  const [docenteTieneCienciasBasicas, setDocenteTieneCienciasBasicas] = useState(false);

  const navigate = useNavigate();

  // Función para obtener las carreras del docente desde sessionStorage
  const obtenerCarrerasDocente = () => {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        if (usuario && usuario.carreras && Array.isArray(usuario.carreras)) {
          return usuario.carreras;
        }
      }
      return [];
    } catch (error) {
      console.error("Error al obtener carreras del docente:", error);
      return [];
    }
  };

  // NUEVA FUNCIÓN: Obtener paralelos únicos de los grupos de Ciencias Básicas
  const obtenerParalelosDisponibles = (gruposFiltrados) => {
    const paralelosSet = new Set();
    
    // Solo obtener paralelos de grupos de Ciencias Básicas
    gruposFiltrados
      .filter(grupo => carreraNecesitaParalelo(grupo.carrera))
      .forEach(grupo => {
        if (grupo.paralelo) {
          paralelosSet.add(grupo.paralelo);
        }
      });
    
    // Convertir Set a array y ordenar
    const paralelosArray = Array.from(paralelosSet).sort();
    
    // Agregar la opción "TODOS" al inicio
    return ['TODOS', ...paralelosArray];
  };

  // NUEVA FUNCIÓN: Verificar si se debe mostrar el filtro de paralelo
  const deberMostrarFiltroParalelo = () => {
    return docenteTieneCienciasBasicas && paralelosDisponibles.length > 1; // Más de "TODOS"
  };

  // Función para cargar todos los datos necesarios
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Obtener carreras asignadas al docente
        const carreras = obtenerCarrerasDocente();
        setCarrerasAsignadas(carreras);
        
        // Verificar si el docente tiene Ciencias Básicas asignada
        const tieneCienciasBasicas = carreras.includes('Ciencias Básicas');
        setDocenteTieneCienciasBasicas(tieneCienciasBasicas);
        
        // Si no hay carreras asignadas, mostrar mensaje
        if (carreras.length === 0) {
          setError("No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.");
          setLoading(false);
          return;
        }

        // 1. Cargar todos los grupos del docente
        const gruposData = await getMisGrupos();
        
        // Filtrar grupos para mostrar solo los de las carreras asignadas
        const gruposFiltrados = gruposData.filter(grupo => 
          carreras.includes(grupo.carrera)
        );
        
        setGrupos(gruposFiltrados);

        // NUEVO: Obtener paralelos disponibles de los grupos
        const paralelosEncontrados = obtenerParalelosDisponibles(gruposFiltrados);
        setParalelosDisponibles(paralelosEncontrados);
        
        // 2. Obtener información del docente
        const usuarioString = sessionStorage.getItem('usuario');
        if (usuarioString) {
          try {
            const usuario = JSON.parse(usuarioString);
            if (usuario && usuario.id) {
              const docenteData = await getDocenteById(usuario.id);
              setDocenteActual(docenteData);
            }
          } catch (error) {
            console.error('Error al obtener datos del docente:', error);
          }
        }

        // 3. Extraer materias, carreras, semestres únicos y PARALELOS ESPECÍFICOS de los grupos
        const materiasSet = new Set();
        const carrerasSet = new Set();
        const semestresPorCarreraTemp = {};
        const materiasPorCarreraYSemestre = {};
        const paralelosPorCarreraYSemestreTemp = {}; // NUEVO: Para rastrear paralelos específicos

        for (const grupo of gruposFiltrados) {
          const materia = grupo.materia;
          const carrera = grupo.carrera;
          const semestre = grupo.semestre;
          const paralelo = grupo.paralelo || 'A'; // NUEVO: obtener paralelo del grupo
          
          // Normalizar la materia para evitar problemas con mayúsculas/minúsculas
          const materiaKey = materia.trim();
          
          // Almacenar materias únicas
          materiasSet.add(materiaKey);
          
          // Solo almacenar carreras que el docente tenga asignadas
          if (carreras.includes(carrera)) {
            carrerasSet.add(carrera);
          
            // Almacenar semestres por carrera
            if (!semestresPorCarreraTemp[carrera]) {
              semestresPorCarreraTemp[carrera] = new Set();
            }
            semestresPorCarreraTemp[carrera].add(semestre);
            
            // NUEVO: Almacenar paralelos específicos por carrera y semestre
            if (!paralelosPorCarreraYSemestreTemp[carrera]) {
              paralelosPorCarreraYSemestreTemp[carrera] = {};
            }
            if (!paralelosPorCarreraYSemestreTemp[carrera][semestre]) {
              paralelosPorCarreraYSemestreTemp[carrera][semestre] = new Set();
            }
            paralelosPorCarreraYSemestreTemp[carrera][semestre].add(paralelo);
            
            // Almacenar materias por carrera y semestre
            if (!materiasPorCarreraYSemestre[carrera]) {
              materiasPorCarreraYSemestre[carrera] = {};
            }
            if (!materiasPorCarreraYSemestre[carrera][semestre]) {
              materiasPorCarreraYSemestre[carrera][semestre] = new Set();
            }
            materiasPorCarreraYSemestre[carrera][semestre].add(materiaKey);
          }
        }
        
        // Convertir los Sets a arrays y crear estructura de paralelos
        setMateriasUnicas(['TODAS', ...Array.from(materiasSet)]);
        setCarrerasUnicas(['TODAS', ...Array.from(carrerasSet)]);
        
        const semestresPorCarreraObj = {};
        Object.keys(semestresPorCarreraTemp).forEach(carrera => {
          semestresPorCarreraObj[carrera] = Array.from(semestresPorCarreraTemp[carrera]).sort((a, b) => a - b);
        });
        setSemestresPorCarrera(semestresPorCarreraObj);

        // NUEVO: Convertir paralelos a estructura de objeto
        const paralelosPorCarreraYSemestreObj = {};
        Object.keys(paralelosPorCarreraYSemestreTemp).forEach(carrera => {
          paralelosPorCarreraYSemestreObj[carrera] = {};
          Object.keys(paralelosPorCarreraYSemestreTemp[carrera]).forEach(semestre => {
            paralelosPorCarreraYSemestreObj[carrera][semestre] = Array.from(paralelosPorCarreraYSemestreTemp[carrera][semestre]).sort();
          });
        });

        // 4. Obtener TODOS los estudiantes y filtrar por carrera
        const todosLosEstudiantesTemp = await getEstudiantes();
        
        // Filtrar estudiantes por carreras asignadas al docente
        const estudiantesFiltrados = todosLosEstudiantesTemp.filter(estudiante => 
          carreras.includes(estudiante.carrera)
        );
        
        setTodosLosEstudiantes(estudiantesFiltrados);

        // 5. Inicializar objetos para almacenar información
        const estudiantesPorGrupoTemp = {};
        const informesPorGrupoTemp = {};
        const rubricasPorInformeTemp = {};
        const calificacionesPorInformeTemp = {};
        
        // 6. Cargar datos para cada grupo
        for (const grupo of gruposFiltrados) {
          try {
            // Obtener estudiantes del grupo
            const estudiantes = await getEstudiantesByGrupoId(grupo.id);
            estudiantesPorGrupoTemp[grupo.id] = estudiantes;

            // Obtener informes del grupo
            const informes = await getInformesPorGrupoId(grupo.id);
            informesPorGrupoTemp[grupo.id] = informes;

            // Para cada informe, obtener su rúbrica y calificación
            for (const informe of informes) {
              if (informe.rubrica_id) {
                try {
                  const rubrica = await getRubricaPorId(informe.rubrica_id);
                  rubricasPorInformeTemp[informe.id] = rubrica;
                  
                  // Obtener la calificación asociada al informe
                  if (informe.calificacion_id) {
                    try {
                      const calificacion = await getCalificacionPorId(informe.calificacion_id);
                      calificacionesPorInformeTemp[informe.id] = calificacion;
                    } catch (error) {
                      console.error(`Error al cargar calificación para informe ${informe.id}:`, error);
                    }
                  }
                } catch (error) {
                  console.error(`Error al cargar rúbrica para informe ${informe.id}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error al cargar datos para el grupo ${grupo.id}:`, error);
          }
        }

        // 7. Actualizar estados con los datos cargados
        setEstudiantesPorGrupo(estudiantesPorGrupoTemp);
        setInformesPorGrupo(informesPorGrupoTemp);
        setRubricasPorInforme(rubricasPorInformeTemp);
        setCalificacionesPorInforme(calificacionesPorInformeTemp);

        // 8. Usar filtrarDatos que procesa TODOS los estudiantes
        const datosPorMateriaTemp = prepararDatosEstadisticas(
          gruposFiltrados,
          estudiantesFiltrados,
          estudiantesPorGrupoTemp,
          informesPorGrupoTemp,
          rubricasPorInformeTemp,
          calificacionesPorInformeTemp,
          semestresPorCarreraObj,
          paralelosPorCarreraYSemestreObj // NUEVO: pasar estructura de paralelos
        );
        
        setDatosPorMateria(datosPorMateriaTemp);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar los datos de evaluación. Por favor, intente de nuevo más tarde.');
        setLoading(false);
        toast.error('Error al cargar datos. Intente de nuevo.');
      }
    };

    cargarDatos();
  }, []);

  // Función para preparar datos que usa filtrarDatos
  const prepararDatosEstadisticas = (
    grupos, 
    todosLosEstudiantes, 
    estudiantesPorGrupo, 
    informesPorGrupo, 
    rubricasPorInforme,
    calificacionesPorInforme,
    semestresPorCarrera
  ) => {
    return filtrarDatos(
      grupos,
      todosLosEstudiantes,
      estudiantesPorGrupo,
      informesPorGrupo,
      rubricasPorInforme,
      calificacionesPorInforme,
      'TODAS', // carrera por defecto
      'TODOS',  // semestre por defecto
      'TODAS',  // materia por defecto
      'TODOS',  // NUEVO: paralelo por defecto
      semestresPorCarrera
    );
  };

  // FUNCIÓN ACTUALIZADA: Filtrar datos incluyendo filtro de paralelo
  const filtrarDatos = (
    grupos,
    todosLosEstudiantes,
    estudiantesPorGrupo,
    informesPorGrupo,
    rubricasPorInforme,
    calificacionesPorInforme,
    carrera,
    semestre,
    materia,
    paralelo,
    semestresPorCarrera,
    paralelosPorCarreraYSemestre // NUEVO: estructura de paralelos específicos
  ) => {
    const datosEstadisticas = [];

    if (!semestresPorCarrera) {
      console.warn("semestresPorCarrera no está definido");
      return [];
    }

    // Recorrer TODOS los estudiantes
    for (const estudiante of todosLosEstudiantes) {
      const estudianteCarrera = estudiante.carrera;
      const estudianteSemestre = estudiante.semestre;
      const estudianteParalelo = estudiante.paralelo || 'A';
      
      // LÓGICA CORREGIDA: Verificar si el estudiante pertenece a grupos específicos del docente
      let perteneceAGruposDocente = false;
      
      if (semestre === 'TODOS' && materia === 'TODAS') {
        if (carrera === 'TODAS') {
          // Para todas las carreras, verificar si hay grupos para esta carrera/semestre
          if (semestresPorCarrera && 
              semestresPorCarrera[estudianteCarrera] && 
              Array.isArray(semestresPorCarrera[estudianteCarrera]) &&
              semestresPorCarrera[estudianteCarrera].includes(estudianteSemestre)) {
            
            // NUEVO: Para Ciencias Básicas, verificar también el paralelo específico
            if (carreraNecesitaParalelo(estudianteCarrera)) {
              perteneceAGruposDocente = 
                paralelosPorCarreraYSemestre &&
                paralelosPorCarreraYSemestre[estudianteCarrera] &&
                paralelosPorCarreraYSemestre[estudianteCarrera][estudianteSemestre] &&
                paralelosPorCarreraYSemestre[estudianteCarrera][estudianteSemestre].includes(estudianteParalelo);
            } else {
              // Para otras carreras, no verificar paralelo
              perteneceAGruposDocente = true;
            }
          }
        } 
        else if (estudianteCarrera === carrera) {
          // Para carrera específica, verificar semestre
          if (semestresPorCarrera && 
              semestresPorCarrera[carrera] && 
              Array.isArray(semestresPorCarrera[carrera]) &&
              semestresPorCarrera[carrera].includes(estudianteSemestre)) {
            
            // NUEVO: Para Ciencias Básicas, verificar también el paralelo específico
            if (carreraNecesitaParalelo(carrera)) {
              perteneceAGruposDocente = 
                paralelosPorCarreraYSemestre &&
                paralelosPorCarreraYSemestre[carrera] &&
                paralelosPorCarreraYSemestre[carrera][estudianteSemestre] &&
                paralelosPorCarreraYSemestre[carrera][estudianteSemestre].includes(estudianteParalelo);
            } else {
              // Para otras carreras, no verificar paralelo
              perteneceAGruposDocente = true;
            }
          }
        }
      }
      else {
        // Cuando hay filtros específicos aplicados, permitir todos los estudiantes de grupos
        perteneceAGruposDocente = true;
      }
      
      if (!perteneceAGruposDocente) {
        continue;
      }
      
      // Aplicar filtros de carrera, semestre y paralelo
      if ((carrera !== 'TODAS' && estudianteCarrera !== carrera) ||
          (semestre !== 'TODOS' && estudianteSemestre.toString() !== semestre) ||
          (paralelo !== 'TODOS' && estudianteParalelo !== paralelo)) {
        continue;
      }
      
      // Variables para almacenar las relaciones encontradas
      let grupoDelEstudiante = null;
      let informeDelEstudiante = null;
      let rubricaDelEstudiante = null;
      let calificacionDelEstudiante = null;
      let cumpleFiltroMateria = (materia === 'TODAS');
      
      // Buscar si el estudiante pertenece a algún grupo
      for (const grupo of grupos) {
        if (grupo.carrera === estudianteCarrera && 
            grupo.semestre === estudianteSemestre &&
            (grupo.paralelo || 'A') === estudianteParalelo) {
          
          const estudiantesDelGrupo = estudiantesPorGrupo[grupo.id] || [];
          
          if (estudiantesDelGrupo.some(est => est.id === estudiante.id)) {
            if (materia === 'TODAS' || grupo.materia === materia) {
              grupoDelEstudiante = grupo;
              cumpleFiltroMateria = true;
              
              const informesDelGrupo = informesPorGrupo[grupo.id] || [];
              informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
              
              if (informeDelEstudiante && informeDelEstudiante.rubrica_id) {
                rubricaDelEstudiante = rubricasPorInforme[informeDelEstudiante.id];
              }

              if (informeDelEstudiante && informeDelEstudiante.calificacion_id) {
                calificacionDelEstudiante = calificacionesPorInforme[informeDelEstudiante.id];
              }
              
              break;
            }
            
            if (!grupoDelEstudiante) {
              grupoDelEstudiante = grupo;
              
              const informesDelGrupo = informesPorGrupo[grupo.id] || [];
              informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
              
              if (informeDelEstudiante && informeDelEstudiante.rubrica_id) {
                rubricaDelEstudiante = rubricasPorInforme[informeDelEstudiante.id];
              }

              if (informeDelEstudiante && informeDelEstudiante.calificacion_id) {
                calificacionDelEstudiante = calificacionesPorInforme[informeDelEstudiante.id];
              }
            }
          }
        }
      }
      
      // Si hay filtro de materia pero el estudiante no cumple, omitirlo
      if (materia !== 'TODAS' && !cumpleFiltroMateria) {
        continue;
      }
      
      // SIEMPRE agregar el estudiante (con o sin grupo)
      if (!rubricaDelEstudiante) {
        datosEstadisticas.push({
          estudiante,
          grupo: grupoDelEstudiante || { 
            nombre_proyecto: 'Sin asignar',
            carrera: estudianteCarrera,
            semestre: estudianteSemestre,
            paralelo: estudianteParalelo,
            materia: materia !== 'TODAS' ? materia : ''
          },
          informe: informeDelEstudiante,
          rubrica: rubricaDelEstudiante,
          calificacion: calificacionDelEstudiante,
          resultado: 'PENDIENTE'
        });
      } else {
        const resultado = informeDelEstudiante?.resultado || 
                         rubricaDelEstudiante?.observaciones || 
                         'PENDIENTE';
        
        datosEstadisticas.push({
          estudiante,
          grupo: grupoDelEstudiante,
          informe: informeDelEstudiante,
          rubrica: rubricaDelEstudiante,
          calificacion: calificacionDelEstudiante,
          resultado
        });
      }
    }

    return datosEstadisticas;
  };

  // FUNCIÓN ACTUALIZADA: Obtener datos filtrados incluyendo paralelo
  const obtenerDatosFiltradosActuales = () => {
    // Usar la función filtrarDatos actualizada
    let datosFiltrados = filtrarDatos(
      grupos,
      todosLosEstudiantes,
      estudiantesPorGrupo,
      informesPorGrupo,
      rubricasPorInforme,
      calificacionesPorInforme,
      carreraSeleccionada,
      semestreSeleccionado,
      materiaSeleccionada,
      paraleloSeleccionado, // NUEVO: incluir filtro de paralelo
      semestresPorCarrera
    );
    
    // Aplicar filtro de búsqueda de estudiante si existe
    if (busquedaEstudiante.trim() !== '') {
      const busquedaLower = busquedaEstudiante.toLowerCase();
      
      datosFiltrados = datosFiltrados.filter(datos => {
        const nombreCompleto = `${datos.estudiante.nombre || ''} ${datos.estudiante.apellido || ''}`.toLowerCase();
        const codigo = (datos.estudiante.codigo || '').toLowerCase();
        
        return nombreCompleto.includes(busquedaLower) || 
               codigo.includes(busquedaLower);
      });
    }
    
    // Organizar por carrera, semestre y paralelo
    const datosOrganizados = {};
    
    datosFiltrados.forEach(datos => {
      const carrera = datos.grupo.carrera;
      const semestre = datos.grupo.semestre;
      const paralelo = datos.estudiante.paralelo || 'A';
      
      if (!datosOrganizados[carrera]) {
        datosOrganizados[carrera] = {};
      }
      if (!datosOrganizados[carrera][semestre]) {
        datosOrganizados[carrera][semestre] = {};
      }
      
      // Para Ciencias Básicas, organizar por paralelo
      if (carreraNecesitaParalelo(carrera)) {
        if (!datosOrganizados[carrera][semestre][paralelo]) {
          datosOrganizados[carrera][semestre][paralelo] = {
            estudiantes: [],
            total: 0,
            aprobados: 0,
            reprobados: 0,
            pendientes: 0
          };
        }
        
        datosOrganizados[carrera][semestre][paralelo].estudiantes.push(datos);
      } else {
        // Para otras carreras, usar clave 'general'
        if (!datosOrganizados[carrera][semestre]['general']) {
          datosOrganizados[carrera][semestre]['general'] = {
            estudiantes: [],
            total: 0,
            aprobados: 0,
            reprobados: 0,
            pendientes: 0
          };
        }
        
        datosOrganizados[carrera][semestre]['general'].estudiantes.push(datos);
      }
    });
    
    // Calcular estadísticas
    Object.keys(datosOrganizados).forEach(carrera => {
      Object.keys(datosOrganizados[carrera]).forEach(semestre => {
        Object.keys(datosOrganizados[carrera][semestre]).forEach(paraleloOGeneral => {
          const seccion = datosOrganizados[carrera][semestre][paraleloOGeneral];
          seccion.total = seccion.estudiantes.length;
          seccion.aprobados = seccion.estudiantes.filter(e => e.resultado === 'APROBADO').length;
          seccion.reprobados = seccion.estudiantes.filter(e => e.resultado === 'REPROBADO').length;
          seccion.pendientes = seccion.estudiantes.filter(e => e.resultado === 'PENDIENTE').length;
        });
      });
    });
    
    return datosOrganizados;
  };

  // FUNCIÓN ACTUALIZADA: Limpiar la búsqueda incluyendo paralelo
  const limpiarBusqueda = () => {
    setBusquedaEstudiante('');
    setCarreraSeleccionada('TODAS');
    setSemestreSeleccionado('TODOS');
    setMateriaSeleccionada('TODAS');
    setParaleloSeleccionado('TODOS'); // NUEVO: limpiar filtro de paralelo
  };

  // Función para generar PDF utilizando el módulo externo
  const generarPDF = () => {
    const contenido = document.getElementById('contenido-para-pdf');
  
    if (contenido) {
      setGenerandoPDF(true);
      toast.info('Generando PDF, por favor espere...');
      
      generarInformeNotasPDF({
        elementoDOM: contenido,
        filtros: {
          carrera: carreraSeleccionada,
          semestre: semestreSeleccionado,
          materia: materiaSeleccionada,
          paralelo: paraleloSeleccionado, // NUEVO: incluir en filtros del PDF
          busqueda: busquedaEstudiante
        },
        docente: docenteActual,
        datosFiltrados: obtenerDatosFiltradosActuales(),
        totalGrupos: materiaSeleccionada === 'TODAS' 
               ? grupos.length 
               : grupos.filter(grupo => grupo.materia === materiaSeleccionada).length
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
  };

  // Renderizado para estado de carga
  if (loading) {
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar">
          <div className="notas-informe-styles">
            <div className="evaluacion-header">
              <h1>INFORME DE NOTAS FINALES</h1>
            </div>
            <div className="evaluacion-container">
              <div className="loading-indicator">Cargando datos de evaluación...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Renderizado para estado de error
  if (error) {
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar">
          <div className="notas-informe-styles">
            <div className="evaluacion-header">
              <h1>INFORME DE NOTAS FINALES</h1>
            </div>
            <div className="evaluacion-container">
              <div className="error-message">{error}</div>
              <div className="acciones-container">
                <button 
                  className="btn-volver"
                  onClick={() => navigate('/docentes')}
                >
                  Volver al Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Si no hay carreras asignadas, mostrar mensaje específico
  if (carrerasAsignadas.length === 0) {
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar">
          <div className="notas-informe-styles">
            <div className="evaluacion-header">
              <h1>INFORME DE NOTAS FINALES</h1>
            </div>
            <div className="evaluacion-container">
              <div className="error-message">
                No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.
              </div>
              <div className="acciones-container">
                <button 
                  className="btn-volver"
                  onClick={() => navigate('/docentes')}
                >
                  Volver al Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className="docentes-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <Sidebar />
      <main className="content content-with-sidebar">
        <div className="notas-informe-styles">
          {/* Encabezado modificado para incluir botones a la derecha */}
          <div className="evaluacion-header">
            <div className="header-content">
              <h1>INFORME DE NOTAS FINALES</h1>
            </div>
            <div className="header-actions">
              <button 
                className="btn-volver"
                onClick={() => navigate('/docentes')}
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
                    placeholder="Buscar por nombre o código..."
                    value={busquedaEstudiante}
                    onChange={(e) => setBusquedaEstudiante(e.target.value)}
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
              
              {/* Filtro de carrera - Mostrar solo las carreras asignadas al docente */}
              <div className="filtro">
                <label className="filtro-label">Carrera</label>
                <select 
                  id="carrera-select" 
                  value={carreraSeleccionada}
                  onChange={(e) => {
                    setCarreraSeleccionada(e.target.value);
                    setSemestreSeleccionado('TODOS');
                    setParaleloSeleccionado('TODOS'); // NUEVO: resetear paralelo cuando cambia carrera
                  }}
                >
                  <option value="TODAS">Todas mis carreras</option>
                  {carrerasUnicas
                    .filter(c => c !== 'TODAS')
                    .filter(c => carrerasAsignadas.includes(c))
                    .map(carrera => (
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
                  disabled={carreraSeleccionada === 'TODAS'}
                >
                  <option value="TODOS">Todos los semestres</option>
                  {carreraSeleccionada !== 'TODAS' && semestresPorCarrera[carreraSeleccionada] 
                    ? semestresPorCarrera[carreraSeleccionada].map(semestre => (
                        <option key={semestre} value={semestre}>{`${semestre}° Semestre`}</option>
                      ))
                    : null
                  }
                </select>
              </div>

              {/* NUEVO: Filtro de paralelo - Solo para Ciencias Básicas */}
              {deberMostrarFiltroParalelo() && (
                <div className="filtro">
                  <label className="filtro-label">Paralelo</label>
                  <select 
                    id="paralelo-select" 
                    value={paraleloSeleccionado}
                    onChange={(e) => setParaleloSeleccionado(e.target.value)}
                  >
                    <option value="TODOS">Todos los paralelos</option>
                    {paralelosDisponibles
                      .filter(p => p !== 'TODOS')
                      .map(paralelo => (
                        <option key={paralelo} value={paralelo}>{`Paralelo ${paralelo}`}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {/* Filtro de materia */}
              <div className="filtro">
                <label className="filtro-label">Asignatura</label>
                <select 
                  id="materia-select" 
                  value={materiaSeleccionada}
                  onChange={(e) => setMateriaSeleccionada(e.target.value)}
                >
                  <option value="TODAS">Todas las materias</option>
                  {materiasUnicas.filter(m => m !== 'TODAS').map(materia => (
                    <option key={materia} value={materia}>{materia}</option>
                  ))}
                </select>
              </div>
              
              {/* Botón X para limpiar todos los filtros */}
              <button 
                onClick={limpiarBusqueda} 
                className="btn-limpiar-busqueda"
                title="Limpiar búsqueda"
                disabled={!busquedaEstudiante && 
                         carreraSeleccionada === 'TODAS' && 
                         semestreSeleccionado === 'TODOS' && 
                         materiaSeleccionada === 'TODAS' &&
                         paraleloSeleccionado === 'TODOS'} // NUEVO: incluir paralelo en validación
              >
                X
              </button>
            </div>
            
            {/* Contenedor para PDF */}
            <div id="contenido-para-pdf" className="contenido-pdf-wrapper">
              {/* Encabezado para el PDF */}
              <div className="pdf-header">
                <h1>INFORME DE NOTAS FINALES</h1>
                <h2>Gestion {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
                <div className="pdf-info">
                  <div>Fecha del informe: {obtenerFechaActual()}</div>
                  <div>Docente: {docenteActual ? docenteActual.nombre_completo : 'No especificado'}</div>
                  <div>Total de grupos: {
                    materiaSeleccionada === 'TODAS' 
                    ? grupos.length 
                    : grupos.filter(grupo => grupo.materia === materiaSeleccionada).length
                  }</div>
                  {carreraSeleccionada !== 'TODAS' && <div>Carrera: {carreraSeleccionada}</div>}
                  {semestreSeleccionado !== 'TODOS' && <div>Semestre: {semestreSeleccionado}° Semestre</div>}
                  {materiaSeleccionada !== 'TODAS' && <div>Asignatura: {materiaSeleccionada}</div>}
                  {/* NUEVO: Mostrar filtro de paralelo en PDF */}
                  {paraleloSeleccionado !== 'TODOS' && <div>Paralelo: {paraleloSeleccionado}</div>}
                  {busquedaEstudiante && <div>Filtro estudiante: {busquedaEstudiante}</div>}
                </div>
              </div>
            
              {/* Resto del contenido del componente permanece igual */}
              {/* Recorrer cada carrera y semestre para crear secciones separadas */}
              {Object.keys(obtenerDatosFiltradosActuales()).sort().map(carrera => (
                Object.keys(obtenerDatosFiltradosActuales()[carrera]).sort((a, b) => parseInt(a) - parseInt(b)).map((semestre, semestreIndex) => {
                  const datosCarreraSemestre = obtenerDatosFiltradosActuales()[carrera][semestre];
                  
                  // Para Ciencias Básicas, mostrar cada paralelo por separado
                  if (carreraNecesitaParalelo(carrera)) {
                    return Object.keys(datosCarreraSemestre).sort().map((paralelo, paraleloIndex) => {
                      const datosSeccion = datosCarreraSemestre[paralelo];
                      if (!datosSeccion || datosSeccion.estudiantes.length === 0) return null;

                      // Determinar las asignaturas únicas en esta sección
                      const asignaturasSeccion = new Set();
                      datosSeccion.estudiantes.forEach(datos => {
                        if (datos.grupo && datos.grupo.materia) {
                          asignaturasSeccion.add(datos.grupo.materia);
                        } else if (datos.calificacion && datos.calificacion.asignatura) {
                          asignaturasSeccion.add(datos.calificacion.asignatura);
                        }
                      });

                      const asignaturasMostrar = Array.from(asignaturasSeccion).join(', ');

                      return (
                        <div key={`${carrera}-${semestre}-${paralelo}`} className={`seccion-carrera-semestre ${semestreIndex > 0 || paraleloIndex > 0 ? 'nueva-seccion-pdf' : 'primera-seccion-pdf'}`}>
                          {/* Título con paralelo para Ciencias Básicas */}
                          <h3 className="evitar-salto-pagina">{carrera} - {semestre}° Semestre - Paralelo {paralelo}</h3>
                          
                          {/* Información de la asignatura */}
                          <div className="info-asignatura evitar-salto-pagina">
                            <h4>Asignatura: {asignaturasMostrar}</h4>
                          </div>
                          
                          <div className="estadisticas-seccion evitar-salto-pagina">
                            <p>Estudiantes: {datosSeccion.total} | Aprobados: {datosSeccion.aprobados} | Reprobados: {datosSeccion.reprobados} | Pendientes: {datosSeccion.pendientes}</p>
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
                                {datosSeccion.estudiantes
                                  .sort((a, b) => {
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
                                      <td style={{width: '10%'}}>{datos.grupo.nombre_proyecto}</td>
                                      <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.presentacion)}</td>
                                      <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.sustentacion)}</td>
                                      <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.documentacion)}</td>
                                      <td style={{width: '7%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.innovacion)}</td>
                                      <td style={{width: '7%', textAlign: 'center'}}>
                                        <strong>{formatearNota(datos.rubrica?.nota_final)}</strong>
                                      </td>
                                      <td style={{width: '10%', textAlign: 'center'}}>{formatearFecha(datos.calificacion?.fecha)}</td>
                                      <td style={{width: '13%', textAlign: 'center', whiteSpace: 'nowrap'}}>
                                        <strong className={datos.resultado === 'APROBADO' ? 'aprobado' : datos.resultado === 'REPROBADO' ? 'reprobado' : ''}>
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
                      );
                    });
                  } else {
                    // Para otras carreras, mostrar sección normal sin paralelos
                    const datosSeccion = datosCarreraSemestre['general'];
                    if (!datosSeccion || datosSeccion.estudiantes.length === 0) return null;

                    // Determinar las asignaturas únicas en esta sección
                    const asignaturasSeccion = new Set();
                    datosSeccion.estudiantes.forEach(datos => {
                      if (datos.grupo && datos.grupo.materia) {
                        asignaturasSeccion.add(datos.grupo.materia);
                      } else if (datos.calificacion && datos.calificacion.asignatura) {
                        asignaturasSeccion.add(datos.calificacion.asignatura);
                      }
                    });

                    const asignaturasMostrar = Array.from(asignaturasSeccion).join(', ');

                    return (
                      <div key={`${carrera}-${semestre}`} className={`seccion-carrera-semestre ${semestreIndex > 0 ? 'nueva-seccion-pdf' : 'primera-seccion-pdf'}`}>
                        {/* Título normal sin paralelo para otras carreras */}
                        <h3 className="evitar-salto-pagina">{carrera} - {semestre}° Semestre</h3>
                        
                        {/* Información de la asignatura */}
                        <div className="info-asignatura evitar-salto-pagina">
                          <h4>Asignatura: {asignaturasMostrar}</h4>
                        </div>
                        
                        <div className="estadisticas-seccion evitar-salto-pagina">
                          <p>Estudiantes: {datosSeccion.total} | Aprobados: {datosSeccion.aprobados} | Reprobados: {datosSeccion.reprobados} | Pendientes: {datosSeccion.pendientes}</p>
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
                              {datosSeccion.estudiantes
                                .sort((a, b) => {
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
                                    <td style={{width: '10%'}}>{datos.grupo.nombre_proyecto}</td>
                                    <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.presentacion)}</td>
                                    <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.sustentacion)}</td>
                                    <td style={{width: '8%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.documentacion)}</td>
                                    <td style={{width: '7%', textAlign: 'center'}}>{formatearNota(datos.rubrica?.innovacion)}</td>
                                    <td style={{width: '7%', textAlign: 'center'}}>
                                      <strong>{formatearNota(datos.rubrica?.nota_final)}</strong>
                                    </td>
                                    <td style={{width: '10%', textAlign: 'center'}}>{formatearFecha(datos.calificacion?.fecha)}</td>
                                    <td style={{width: '13%', textAlign: 'center', whiteSpace: 'nowrap'}}>
                                      <strong className={datos.resultado === 'APROBADO' ? 'aprobado' : datos.resultado === 'REPROBADO' ? 'reprobado' : ''}>
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
                    );
                  }
                })
              ))}

              {/* Si no hay datos para mostrar después del filtrado */}
              {Object.keys(obtenerDatosFiltradosActuales()).length === 0 || 
               Object.keys(obtenerDatosFiltradosActuales()).every(carrera => 
                  Object.keys(obtenerDatosFiltradosActuales()[carrera]).every(semestre => 
                      !obtenerDatosFiltradosActuales()[carrera][semestre] || 
                      Object.keys(obtenerDatosFiltradosActuales()[carrera][semestre]).every(paraleloOGeneral =>
                        !obtenerDatosFiltradosActuales()[carrera][semestre][paraleloOGeneral] || 
                        obtenerDatosFiltradosActuales()[carrera][semestre][paraleloOGeneral].estudiantes.length === 0
                      )
                  )
               ) ? (
                <div className="empty-state">
                  <p>No se encontraron datos de evaluación con los filtros seleccionados. Por favor, ajuste los filtros o asegúrese de haber creado grupos y evaluado estudiantes.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotasInformes;