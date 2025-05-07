// src/components/Rubricas/pages/estadisticas.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, LabelList 
  } from 'recharts';
import Sidebar from '../../Docentes/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/estadisticas.css'; // Importamos el archivo CSS

// Importar servicios necesarios
import { getMisGrupos } from '../../../service/grupoService';
import { getEstudiantes } from '../../../service/estudianteService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { getDocenteById } from '../../../service/docenteService';

function Estadisticas() {
  // Estados para almacenar los datos
  const [grupos, setGrupos] = useState([]);
  const [todosLosEstudiantes, setTodosLosEstudiantes] = useState([]);
  const [estudiantesPorGrupo, setEstudiantesPorGrupo] = useState({});
  const [informesPorGrupo, setInformesPorGrupo] = useState({});
  const [rubricasPorInforme, setRubricasPorInforme] = useState({});
  const [gruposPorCarreraYSemestre, setGruposPorCarreraYSemestre] = useState({});
  const [semestresPorCarrera, setSemestresPorCarrera] = useState({});
  const [estadisticasPorCarreraYSemestre, setEstadisticasPorCarreraYSemestre] = useState({});
  const [estadisticasGenerales, setEstadisticasGenerales] = useState({
    aprobados: 0,
    reprobados: 0,
    pendientes: 0,
    promedioGeneral: 0,
    promedioSecciones: {
      presentacion: 0,
      sustentacion: 0,
      documentacion: 0,
      innovacion: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docenteActual, setDocenteActual] = useState(null);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('TODAS');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState('TODOS');
  
  const navigate = useNavigate();

  // Colores para los gráficos
  const COLORS = {
    aprobados: '#4CAF50',
    reprobados: '#F44336',
    pendientes: '#FFC107',
    presentacion: '#2196F3',
    sustentacion: '#FF9800',
    documentacion: '#9C27B0',
    innovacion: '#607D8B'
  };
  
  // Función para cargar todos los datos necesarios
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // 1. Cargar todos los grupos del docente
        const gruposData = await getMisGrupos();
        setGrupos(gruposData);

        // 2. Obtener información del docente desde sessionStorage
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

        // 3. Identificar las carreras y semestres que tienen grupos creados
        const semestresConGrupos = {};
        for (const grupo of gruposData) {
          const carrera = grupo.carrera;
          const semestre = grupo.semestre;
          
          if (!semestresConGrupos[carrera]) {
            semestresConGrupos[carrera] = new Set();
          }
          semestresConGrupos[carrera].add(semestre);
        }
        
        // Convertir los Sets a arrays para facilitar su manejo
        const semestresPorCarreraTemp = {};
        Object.keys(semestresConGrupos).forEach(carrera => {
          semestresPorCarreraTemp[carrera] = [...semestresConGrupos[carrera]];
        });
        setSemestresPorCarrera(semestresPorCarreraTemp);

        // 4. Organizar grupos por carrera y semestre
        const gruposPorCS = organizarGruposPorCarreraYSemestre(gruposData);
        setGruposPorCarreraYSemestre(gruposPorCS);

        // 5. Obtener TODOS los estudiantes
        const todosLosEstudiantesTemp = await getEstudiantes();
        setTodosLosEstudiantes(todosLosEstudiantesTemp);

        // 6. Inicializar objetos para almacenar información por grupo
        const estudiantesPorGrupoTemp = {};
        const informesPorGrupoTemp = {};
        const rubricasPorInformeTemp = {};
        
        // 7. Cargar datos para cada grupo
        for (const grupo of gruposData) {
          try {
            // Obtener estudiantes del grupo
            const estudiantes = await getEstudiantesByGrupoId(grupo.id);
            estudiantesPorGrupoTemp[grupo.id] = estudiantes;

            // Obtener informes del grupo
            const informes = await getInformesPorGrupoId(grupo.id);
            informesPorGrupoTemp[grupo.id] = informes;

            // Para cada informe, obtener su rúbrica
            for (const informe of informes) {
              if (informe && informe.rubrica_id) {
                try {
                  const rubrica = await getRubricaPorId(informe.rubrica_id);
                  if (rubrica) {
                    rubricasPorInformeTemp[informe.id] = rubrica;
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

        // 8. Actualizar estados con los datos cargados
        setEstudiantesPorGrupo(estudiantesPorGrupoTemp);
        setInformesPorGrupo(informesPorGrupoTemp);
        setRubricasPorInforme(rubricasPorInformeTemp);

        // 9. Preparar datos para estadísticas (solo estudiantes de semestres con grupos)
        const datosEstadisticasTemp = prepararDatosEstadisticas(
          gruposData,
          todosLosEstudiantesTemp,
          estudiantesPorGrupoTemp,
          informesPorGrupoTemp,
          rubricasPorInformeTemp,
          semestresPorCarreraTemp
        );
        
        // 10. Calcular estadísticas
        calcularEstadisticas(datosEstadisticasTemp, gruposPorCS);
        
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

  // Función para preparar los datos para las estadísticas
  const prepararDatosEstadisticas = (
    grupos, 
    todosLosEstudiantes, 
    estudiantesPorGrupo, 
    informesPorGrupo, 
    rubricasPorInforme,
    semestresPorCarrera
  ) => {
    const datosEstadisticas = [];

    // Filtrar estudiantes que pertenecen a las carreras y semestres que tienen grupos
    for (const estudiante of todosLosEstudiantes) {
      const carrera = estudiante.carrera;
      const semestre = estudiante.semestre;
      
      // Verificar si la carrera y semestre de este estudiante tiene grupos creados
      if (
        semestresPorCarrera[carrera] && 
        semestresPorCarrera[carrera].includes(semestre)
      ) {
        // Buscar si el estudiante pertenece a algún grupo
        let grupoDelEstudiante = null;
        let informeDelEstudiante = null;
        let rubricaDelEstudiante = null;
        
        // Buscar en los grupos que corresponden a esta carrera y semestre
        for (const grupo of grupos) {
          if (grupo.carrera === carrera && grupo.semestre === semestre) {
            const estudiantesDelGrupo = estudiantesPorGrupo[grupo.id] || [];
            
            if (estudiantesDelGrupo.some(est => est.id === estudiante.id)) {
              grupoDelEstudiante = grupo;
              
              // Buscar si tiene informe en este grupo
              const informesDelGrupo = informesPorGrupo[grupo.id] || [];
              informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
              
              // Si tiene informe, buscar su rúbrica
              if (informeDelEstudiante && informeDelEstudiante.rubrica_id) {
                rubricaDelEstudiante = rubricasPorInforme[informeDelEstudiante.id];
              }
              
              break; // Si encontramos el grupo, no necesitamos seguir buscando
            }
          }
        }
        
        // Agregar estudiante con sus datos a la lista
        datosEstadisticas.push({
          estudiante,
          grupo: grupoDelEstudiante || { 
            nombre_proyecto: 'Sin asignar',
            carrera: estudiante.carrera,
            semestre: estudiante.semestre
          },
          informe: informeDelEstudiante,
          rubrica: rubricaDelEstudiante
        });
      }
    }

    return datosEstadisticas;
  };

  // Función para organizar grupos por carrera y semestre
  const organizarGruposPorCarreraYSemestre = (grupos) => {
    const organizado = {};

    grupos.forEach(grupo => {
      const carrera = grupo.carrera;
      const semestre = grupo.semestre;

      if (!organizado[carrera]) {
        organizado[carrera] = {};
      }

      if (!organizado[carrera][semestre]) {
        organizado[carrera][semestre] = [];
      }

      organizado[carrera][semestre].push(grupo);
    });

    return organizado;
  };

  // Función para calcular todas las estadísticas
  const calcularEstadisticas = (datos, gruposPorCS) => {
    // Inicializar contadores generales
    let totalAprobados = 0;
    let totalReprobados = 0;
    let totalPendientes = 0;
    let totalEstudiantes = datos.length;
    
    // Sumatorias para promedios
    let sumaPresentacion = 0;
    let sumaSustentacion = 0;
    let sumaDocumentacion = 0;
    let sumaInnovacion = 0;
    let sumaNotaFinal = 0;
    let cantidadConNota = 0;
    
    // Estadísticas por carrera y semestre
    const estadisticasCS = {};
    
    // Inicializar estructura para cada carrera y semestre
    Object.keys(gruposPorCS).forEach(carrera => {
      estadisticasCS[carrera] = {};
      
      Object.keys(gruposPorCS[carrera]).forEach(semestre => {
        estadisticasCS[carrera][semestre] = {
          aprobados: 0,
          reprobados: 0,
          pendientes: 0,
          total: 0,
          promedioSecciones: {
            presentacion: 0,
            sustentacion: 0,
            documentacion: 0,
            innovacion: 0
          },
          promedioGeneral: 0,
          sumaNotas: {
            presentacion: 0,
            sustentacion: 0,
            documentacion: 0,
            innovacion: 0,
            notaFinal: 0
          },
          cantidadConNota: 0
        };
      });
    });
    
    // Recorrer todos los datos para calcular estadísticas
    datos.forEach(dato => {
        const carrera = dato.grupo.carrera;
        const semestre = dato.grupo.semestre;
        
        // Asegurarse de que la estructura existe
        if (!estadisticasCS[carrera]) {
          estadisticasCS[carrera] = {};
        }
        
        if (!estadisticasCS[carrera][semestre]) {
          estadisticasCS[carrera][semestre] = {
            aprobados: 0,
            reprobados: 0,
            pendientes: 0,
            total: 0,
            promedioSecciones: {
              presentacion: 0,
              sustentacion: 0,
              documentacion: 0,
              innovacion: 0
            },
            promedioGeneral: 0,
            sumaNotas: {
              presentacion: 0,
              sustentacion: 0,
              documentacion: 0,
              innovacion: 0,
              notaFinal: 0
            },
            cantidadConNota: 0
          };
        }
        
        // Incrementar total para esta carrera y semestre
        estadisticasCS[carrera][semestre].total++;
        
        // Verificar si tiene rúbrica y calcular estadísticas
        if (dato.rubrica) {
          // Sumar a contadores generales
          if (dato.rubrica.observaciones === 'APROBADO') {
            totalAprobados++;
            estadisticasCS[carrera][semestre].aprobados++;
          } else if (dato.rubrica.observaciones === 'REPROBADO') {
            totalReprobados++;
            estadisticasCS[carrera][semestre].reprobados++;
          } else {
            totalPendientes++;
            estadisticasCS[carrera][semestre].pendientes++;
          }
          
          // Sumar notas para promedios si tienen valores válidos
          if (dato.rubrica.presentacion !== null && dato.rubrica.presentacion !== undefined) {
            sumaPresentacion += parseFloat(dato.rubrica.presentacion);
            estadisticasCS[carrera][semestre].sumaNotas.presentacion += parseFloat(dato.rubrica.presentacion);
          }
          
          if (dato.rubrica.sustentacion !== null && dato.rubrica.sustentacion !== undefined) {
            sumaSustentacion += parseFloat(dato.rubrica.sustentacion);
            estadisticasCS[carrera][semestre].sumaNotas.sustentacion += parseFloat(dato.rubrica.sustentacion);
          }
          
          if (dato.rubrica.documentacion !== null && dato.rubrica.documentacion !== undefined) {
            sumaDocumentacion += parseFloat(dato.rubrica.documentacion);
            estadisticasCS[carrera][semestre].sumaNotas.documentacion += parseFloat(dato.rubrica.documentacion);
          }
          
          if (dato.rubrica.innovacion !== null && dato.rubrica.innovacion !== undefined) {
            sumaInnovacion += parseFloat(dato.rubrica.innovacion);
            estadisticasCS[carrera][semestre].sumaNotas.innovacion += parseFloat(dato.rubrica.innovacion);
          }
          
          if (dato.rubrica.nota_final !== null && dato.rubrica.nota_final !== undefined) {
            sumaNotaFinal += parseFloat(dato.rubrica.nota_final);
            estadisticasCS[carrera][semestre].sumaNotas.notaFinal += parseFloat(dato.rubrica.nota_final);
            cantidadConNota++;
            estadisticasCS[carrera][semestre].cantidadConNota++;
          }
        } else {
          // Si no tiene rúbrica, contar como pendiente
          totalPendientes++;
          estadisticasCS[carrera][semestre].pendientes++;
        }
      });
      
      // Calcular promedios generales
      const promedioGeneral = cantidadConNota > 0 ? sumaNotaFinal / cantidadConNota : 0;
      const promedioSecciones = {
        presentacion: cantidadConNota > 0 ? sumaPresentacion / cantidadConNota : 0,
        sustentacion: cantidadConNota > 0 ? sumaSustentacion / cantidadConNota : 0,
        documentacion: cantidadConNota > 0 ? sumaDocumentacion / cantidadConNota : 0,
        innovacion: cantidadConNota > 0 ? sumaInnovacion / cantidadConNota : 0
      };
      
      // Calcular promedios por carrera y semestre
      Object.keys(estadisticasCS).forEach(carrera => {
        Object.keys(estadisticasCS[carrera]).forEach(semestre => {
          const stats = estadisticasCS[carrera][semestre];
          const count = stats.cantidadConNota || 1; // Evitar división por cero
          
          stats.promedioGeneral = stats.sumaNotas.notaFinal / count;
          stats.promedioSecciones = {
            presentacion: stats.sumaNotas.presentacion / count,
            sustentacion: stats.sumaNotas.sustentacion / count,
            documentacion: stats.sumaNotas.documentacion / count,
            innovacion: stats.sumaNotas.innovacion / count
          };
        });
      });
      
      // Actualizar estados con las estadísticas calculadas
      setEstadisticasGenerales({
        aprobados: totalAprobados,
        reprobados: totalReprobados,
        pendientes: totalPendientes,
        total: totalEstudiantes,
        promedioGeneral,
        promedioSecciones
      });
      
      setEstadisticasPorCarreraYSemestre(estadisticasCS);
    };
  
    // Función para obtener datos del gráfico circular según selección
    const obtenerDatosGraficoCircular = () => {
        let totalEstudiantes = 0;
        let dataArray = [];
        
        if (carreraSeleccionada === 'TODAS' && semestreSeleccionado === 'TODOS') {
          // Mostrar estadísticas generales
          totalEstudiantes = estadisticasGenerales.total;
          dataArray = [
            { name: 'Aprobados', value: estadisticasGenerales.aprobados, color: COLORS.aprobados },
            { name: 'Reprobados', value: estadisticasGenerales.reprobados, color: COLORS.reprobados },
            { name: 'Pendientes', value: estadisticasGenerales.pendientes, color: COLORS.pendientes }
          ].filter(item => item.value > 0); // Solo mostrar categorías con valores
        } else if (carreraSeleccionada !== 'TODAS' && semestreSeleccionado === 'TODOS') {
          // Mostrar estadísticas de una carrera (todos los semestres)
          let aprobados = 0;
          let reprobados = 0;
          let pendientes = 0;
          
          // Sumar totales de todos los semestres de esta carrera
          Object.values(estadisticasPorCarreraYSemestre[carreraSeleccionada] || {}).forEach(stats => {
            aprobados += stats.aprobados;
            reprobados += stats.reprobados;
            pendientes += stats.pendientes;
            totalEstudiantes += stats.total;
          });
          
          dataArray = [
            { name: 'Aprobados', value: aprobados, color: COLORS.aprobados },
            { name: 'Reprobados', value: reprobados, color: COLORS.reprobados },
            { name: 'Pendientes', value: pendientes, color: COLORS.pendientes }
          ].filter(item => item.value > 0); // Solo mostrar categorías con valores
        } else if (carreraSeleccionada !== 'TODAS' && semestreSeleccionado !== 'TODOS') {
          // Mostrar estadísticas de una carrera y semestre específico
          const stats = estadisticasPorCarreraYSemestre[carreraSeleccionada]?.[semestreSeleccionado];
          
          if (!stats) return [
            { name: 'Sin datos', value: 1, color: '#ccc' }
          ];
          
          totalEstudiantes = stats.total;
          dataArray = [
            { name: 'Aprobados', value: stats.aprobados, color: COLORS.aprobados },
            { name: 'Reprobados', value: stats.reprobados, color: COLORS.reprobados },
            { name: 'Pendientes', value: stats.pendientes, color: COLORS.pendientes }
          ].filter(item => item.value > 0); // Solo mostrar categorías con valores
        } else {
          // Por defecto, mostrar estadísticas generales
          totalEstudiantes = estadisticasGenerales.total;
          dataArray = [
            { name: 'Aprobados', value: estadisticasGenerales.aprobados, color: COLORS.aprobados },
            { name: 'Reprobados', value: estadisticasGenerales.reprobados, color: COLORS.reprobados },
            { name: 'Pendientes', value: estadisticasGenerales.pendientes, color: COLORS.pendientes }
          ].filter(item => item.value > 0); // Solo mostrar categorías con valores
        }
        
        // Añadir el total a los datos para usarlo en la interfaz
        return {
          totalEstudiantes,
          chartData: dataArray
        };
      };
    
    // Función para obtener datos del gráfico de barras según selección
    const obtenerDatosGraficoBarras = () => {
        // Determinar los valores de promedio a mostrar según la selección
        let promedioSecciones;
        let promedioGeneral = 0;
        
        if (carreraSeleccionada === 'TODAS' && semestreSeleccionado === 'TODOS') {
          promedioSecciones = estadisticasGenerales.promedioSecciones;
          promedioGeneral = estadisticasGenerales.promedioGeneral;
        } else if (carreraSeleccionada !== 'TODAS' && semestreSeleccionado === 'TODOS') {
          // Calcular promedios para todos los semestres de esta carrera
          let sumaPresentacion = 0;
          let sumaSustentacion = 0;
          let sumaDocumentacion = 0;
          let sumaInnovacion = 0;
          let sumaPromedioGeneral = 0;
          let cantidadSemestresConNotas = 0;
          
          Object.values(estadisticasPorCarreraYSemestre[carreraSeleccionada] || {}).forEach(stats => {
            if (stats.cantidadConNota > 0) {
              sumaPresentacion += stats.promedioSecciones.presentacion;
              sumaSustentacion += stats.promedioSecciones.sustentacion;
              sumaDocumentacion += stats.promedioSecciones.documentacion;
              sumaInnovacion += stats.promedioSecciones.innovacion;
              sumaPromedioGeneral += stats.promedioGeneral;
              cantidadSemestresConNotas++;
            }
          });
          
          const divisor = cantidadSemestresConNotas || 1; // Evitar división por cero
          
          promedioSecciones = {
            presentacion: sumaPresentacion / divisor,
            sustentacion: sumaSustentacion / divisor,
            documentacion: sumaDocumentacion / divisor,
            innovacion: sumaInnovacion / divisor
          };
          
          promedioGeneral = sumaPromedioGeneral / divisor;
        } else if (carreraSeleccionada !== 'TODAS' && semestreSeleccionado !== 'TODOS') {
          // Promedios para esta carrera y semestre específico
          const stats = estadisticasPorCarreraYSemestre[carreraSeleccionada]?.[semestreSeleccionado];
          
          if (!stats || stats.cantidadConNota === 0) {
            // Si no hay datos, usar valores cero
            promedioSecciones = {
              presentacion: 0,
              sustentacion: 0,
              documentacion: 0,
              innovacion: 0
            };
            promedioGeneral = 0;
          } else {
            promedioSecciones = stats.promedioSecciones;
            promedioGeneral = stats.promedioGeneral;
          }
        } else {
          // Por defecto, usar promedios generales
          promedioSecciones = estadisticasGenerales.promedioSecciones;
          promedioGeneral = estadisticasGenerales.promedioGeneral;
        }
        
        // Crear datos para el gráfico
        return {
          chartData: [
            { name: 'Presentación', valor: promedioSecciones.presentacion || 0, color: COLORS.presentacion },
            { name: 'Sustentación', valor: promedioSecciones.sustentacion || 0, color: COLORS.sustentacion },
            { name: 'Documentación', valor: promedioSecciones.documentacion || 0, color: COLORS.documentacion },
            { name: 'Innovación', valor: promedioSecciones.innovacion || 0, color: COLORS.innovacion }
          ],
          promedioGeneral: promedioGeneral
        };
      };
    
    // Función para interpretar las notas
    const interpretarNota = (nota) => {
      if (isNaN(nota) || nota === null || nota === undefined) return "SIN DATOS";
      if (nota >= 9.5) return "SOBRESALIENTE";
      if (nota >= 8.5) return "EXCELENTE";
      if (nota >= 7.5) return "MUY BUENO";
      if (nota >= 6.5) return "BUENO";
      if (nota >= 5.5) return "SATISFACTORIO";
      if (nota >= 4.5) return "ACEPTABLE";
      if (nota >= 3.5) return "BÁSICAMENTE ACEPTABLE";
      if (nota >= 2.5) return "INSUFICIENTE";
      if (nota >= 1.5) return "DEFICIENTE";
      return "MUY DEFICIENTE";
    };
    
    // Obtener la fecha actual en formato DD/MM/YYYY
    const obtenerFechaActual = () => {
      const fecha = new Date();
      return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
    };
  
    // Función para formatear notas con dos decimales
    const formatearNota = (nota) => {
      if (nota === null || nota === undefined || isNaN(nota)) return '-';
      if (typeof nota === 'number') return nota.toFixed(2);
      if (typeof nota === 'string' && !isNaN(parseFloat(nota))) return parseFloat(nota).toFixed(2);
      return '-';
    };
    
    // Renderizado para estado de carga
    if (loading) {
      return (
        <div className="docentes-container">
          <ToastContainer position="top-right" autoClose={3000} />
          <Sidebar />
          <main className="content content-with-sidebar">
            {/* Añadimos el namespace para aislar los estilos */}
            <div className="estadisticas-styles">
              <div className="evaluacion-header">
                <h1>ESTADÍSTICAS DE EVALUACIÓN</h1>
                <h2>Semestre {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
              </div>
              <div className="evaluacion-container">
                <div className="loading-indicator">Cargando datos estadísticos...</div>
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
            {/* Añadimos el namespace para aislar los estilos */}
            <div className="estadisticas-styles">
              <div className="evaluacion-header">
                <h1>ESTADÍSTICAS DE EVALUACIÓN</h1>
                <h2>Semestre {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
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
    
    // Preparar datos para los gráficos
    const datosCircularObj = obtenerDatosGraficoCircular();
    const datosCircular = datosCircularObj;
    const datosBarrasObj = obtenerDatosGraficoBarras();
    const datosBarras = datosBarrasObj.chartData;
    const promedioGeneralBarras = datosBarrasObj.promedioGeneral;
    // Calcular promedio general a partir de los datos de barras
    const calcularPromedioGeneral = () => {
      const valoresTotales = datosBarras.reduce((sum, item) => {
        const valor = parseFloat(item.valor) || 0;
        return isNaN(valor) ? sum : sum + valor;
      }, 0);
      
      const cantidadValoresValidos = datosBarras.filter(item => !isNaN(parseFloat(item.valor))).length || 1; // Evitar división por cero
      return valoresTotales / cantidadValoresValidos;
    };
    
    const promedioGeneral = calcularPromedioGeneral();
    
    // Obtener lista de carreras y semestres disponibles para los selectores
    const carreras = ['TODAS', ...Object.keys(gruposPorCarreraYSemestre)];
    const semestres = ['TODOS'];
    
    // Agregar semestres disponibles según la carrera seleccionada
    if (carreraSeleccionada !== 'TODAS' && gruposPorCarreraYSemestre[carreraSeleccionada]) {
      semestres.push(...Object.keys(gruposPorCarreraYSemestre[carreraSeleccionada]));
    }
    
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar">
          {/* Añadimos el namespace para aislar los estilos */}
          <div className="estadisticas-styles">
            <div className="evaluacion-header">
              <h1>ESTADÍSTICAS DE EVALUACIÓN</h1>
              <h2>Semestre {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
            </div>
  
            <div className="evaluacion-container">
              {/* Información general */}
              <div className="proyecto-info-container">
                <div className="proyecto-info">
                  <div className="proyecto-info-item">
                    <div className="proyecto-info-label">Fecha del informe:</div>
                    <div className="proyecto-info-value">{obtenerFechaActual()}</div>
                  </div>
                  <div className="proyecto-info-item">
                    <div className="proyecto-info-label">Docente:</div>
                    <div className="proyecto-info-value">{docenteActual ? docenteActual.nombre_completo : 'No especificado'}</div>
                  </div>
                  <div className="proyecto-info-item">
                    <div className="proyecto-info-label">Total de grupos:</div>
                    <div className="proyecto-info-value">{grupos.length}</div>
                  </div>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="filtros-container">
                <div className="filtro">
                  <label htmlFor="carrera-select">Carrera:</label>
                  <select 
                    id="carrera-select" 
                    value={carreraSeleccionada}
                    onChange={(e) => {
                      setCarreraSeleccionada(e.target.value);
                      setSemestreSeleccionado('TODOS');
                    }}
                  >
                    {carreras.map(carrera => (
                      <option key={carrera} value={carrera}>{carrera}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filtro">
                  <label htmlFor="semestre-select">Semestre:</label>
                  <select 
                    id="semestre-select" 
                    value={semestreSeleccionado}
                    onChange={(e) => setSemestreSeleccionado(e.target.value)}
                    disabled={carreraSeleccionada === 'TODAS'}
                  >
                    {semestres.map(semestre => (
                      <option key={semestre} value={semestre}>{semestre === 'TODOS' ? 'TODOS' : `${semestre}° Semestre`}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Resumen estadístico */}
              <div className="resumen-estadistico">
                <h3>Resumen de Evaluación</h3>
                
                <div className="estadisticas-grid">
                  {/* Gráfico circular */}
                  <div className="grafico-container">
                    <h4>Distribución de Resultados</h4>
                    <div className="total-estudiantes">
                        <span className="total-label">Total de estudiantes:</span> 
                        <span className="total-value">{datosCircular.totalEstudiantes}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                        <Pie
                            data={datosCircular.chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = 25 + innerRadius + (outerRadius - innerRadius);
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            
                            return (
                                <text
                                x={x}
                                y={y}
                                fill={datosCircular.chartData[index].color}
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                fontWeight="bold"
                                >
                                {`${name}: ${(percent * 100).toFixed(0)}% (${value})`}
                                </text>
                            );
                            }}
                        >
                            {datosCircular.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} estudiantes`, 'Cantidad']} />
                        <Legend formatter={(value, entry) => `${value} (${entry.payload.value})`} />
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                  
                  {/* Gráfico de barras */}
                  <div className="grafico-container">
                    <h4>Calificación Promedio por Sección</h4>
                    <div className="promedio-general">
                        <span className="promedio-label">Promedio General:</span> 
                        <span className="promedio-value">{formatearNota(promedioGeneralBarras)}</span>
                        <span className="interpretacion">({interpretarNota(promedioGeneralBarras)})</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                        data={datosBarras}
                        margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                        >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip 
                            formatter={(value) => [`${formatearNota(value)} pts`, 'Promedio']}
                            labelFormatter={(label) => `Sección: ${label}`}
                        />
                        <Legend formatter={(value) => `${value}`} />
                        <Bar 
                            dataKey="valor" 
                            name="Puntuación Promedio"
                            isAnimationActive={true}
                        >
                            {datosBarras.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList 
                            dataKey="valor" 
                            position="top" 
                            formatter={(value) => formatearNota(value)}
                            style={{ 
                                fontWeight: 'bold', 
                                fontSize: '0.85rem', 
                                fill: '#333' 
                            }} 
                            />
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Tabla de resumen */}
                <div className="tabla-resumen-container">
                  <h4>Detalles Estadísticos</h4>
                  <table className="tabla-resumen">
                    <thead>
                      <tr>
                        <th>Sección</th>
                        <th>Promedio</th>
                        <th>Interpretación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosBarras.map((seccion, index) => (
                        <tr key={index}>
                          <td>{seccion.name}</td>
                          <td>{formatearNota(seccion.valor)}</td>
                          <td>{interpretarNota(seccion.valor)}</td>
                        </tr>
                      ))}
                      <tr className="fila-promedio">
                        <td><strong>Promedio General</strong></td>
                        <td>
                          <strong>
                            {formatearNota(promedioGeneral)}
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {interpretarNota(promedioGeneral)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="acciones-container">
                <button 
                  className="btn-volver"
                  onClick={() => navigate('/docentes')}
                >
                  Volver
                </button>
                
                <button 
                  className="btn-imprimir"
                  onClick={() => window.print()}
                >
                  Imprimir Informe
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  export default Estadisticas;