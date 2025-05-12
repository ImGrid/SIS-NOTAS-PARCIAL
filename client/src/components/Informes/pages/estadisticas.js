// src/components/Rubricas/pages/estadisticas.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, LabelList 
  } from 'recharts';
import Sidebar from '../../Docentes/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/estadisticas.css'; // Importamos el archivo CSS
import { generarEstadisticasPDF } from '../../../util/pdf/estadisticasPdf';
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
  const graficoCircularRef = useRef(null);
  const graficoBarrasRef = useRef(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
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
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('TODAS');
  const [materiasUnicas, setMateriasUnicas] = useState(['TODAS']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docenteActual, setDocenteActual] = useState(null);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('TODAS');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState('TODOS');
  const [datosFiltrados, setDatosFiltrados] = useState([]);
  
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
        
        setDatosFiltrados(datosEstadisticasTemp);
        
        // 10. Calcular estadísticas
        calcularEstadisticas(datosEstadisticasTemp, gruposPorCS);
        
        // 11. Extraer materias únicas
        const materiasSet = new Set();
        for (const grupo of gruposData) {
          if (grupo.materia) {
            materiasSet.add(grupo.materia);
          }
        }
        setMateriasUnicas(['TODAS', ...Array.from(materiasSet).sort()]);
        
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

  // Efecto para filtrar datos cuando cambian los filtros
  useEffect(() => {
    if (!loading && todosLosEstudiantes.length > 0) {
      try {
        // Filtrar los datos según los filtros seleccionados
        const filtrados = filtrarDatos(
          grupos,
          todosLosEstudiantes,
          estudiantesPorGrupo,
          informesPorGrupo,
          rubricasPorInforme,
          carreraSeleccionada,
          semestreSeleccionado,
          materiaSeleccionada,
          semestresPorCarrera  // Asegurarnos de pasar este parámetro
        );
        
        setDatosFiltrados(filtrados);
        
        // Recalcular estadísticas con los datos filtrados
        calcularEstadisticas(filtrados, gruposPorCarreraYSemestre);
      } catch (error) {
        console.error("Error al filtrar datos:", error);
        toast.error("Error al aplicar filtros. Por favor, inténtalo de nuevo.");
      }
    }
  }, [carreraSeleccionada, semestreSeleccionado, materiaSeleccionada, 
      grupos, todosLosEstudiantes, estudiantesPorGrupo, informesPorGrupo, 
      rubricasPorInforme, semestresPorCarrera, gruposPorCarreraYSemestre]);

  const generarPDF = async () => {
    setGenerandoPDF(true);
    toast.info('Generando PDF, por favor espere...');
    
    try {
      // Añadir un pequeño retraso para asegurar que los gráficos están completamente renderizados
      setTimeout(async () => {
        try {
          await generarEstadisticasPDF({
            elementoDOM: document.getElementById('evaluacion-container'),
            filtros: {
              carrera: carreraSeleccionada,
              semestre: semestreSeleccionado,
              materia: materiaSeleccionada
            },
            docente: docenteActual,
            graficos: {
              graficoCircular: graficoCircularRef.current,
              graficoBarras: graficoBarrasRef.current
            },
            datos: {
              totalEstudiantes: datosCircular.totalEstudiantes,
              aprobados: estadisticasGenerales.aprobados,
              reprobados: estadisticasGenerales.reprobados,
              pendientes: estadisticasGenerales.pendientes,
              promedioGeneral: promedioGeneralBarras,
              datosBarras: datosBarras
            },
            totalGrupos: materiaSeleccionada === 'TODAS' 
              ? grupos.length 
              : grupos.filter(grupo => grupo.materia === materiaSeleccionada).length
          });
          
          toast.success('PDF generado correctamente');
        } catch (error) {
          console.error('Error al generar PDF:', error);
          toast.error('Error al generar el PDF: ' + error.message);
        } finally {
          setGenerandoPDF(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Error inicial al generar PDF:', error);
      toast.error('Error al preparar el PDF');
      setGenerandoPDF(false);
    }
  };

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setCarreraSeleccionada('TODAS');
    setSemestreSeleccionado('TODOS');
    setMateriaSeleccionada('TODAS');
  };

  const filtrarDatos = (
    grupos,
    todosLosEstudiantes,
    estudiantesPorGrupo,
    informesPorGrupo,
    rubricasPorInforme,
    carrera,
    semestre,
    materia,
    semestresPorCarrera
  ) => {
    const datosEstadisticas = [];

    // Comprobar si semestresPorCarrera está definido
    if (!semestresPorCarrera) {
      console.warn("semestresPorCarrera no está definido");
      return [];
    }

    // Recorrer todos los estudiantes
    for (const estudiante of todosLosEstudiantes) {
      const estudianteCarrera = estudiante.carrera;
      const estudianteSemestre = estudiante.semestre;
      
      // LÓGICA CORREGIDA: Verificar si el estudiante pertenece a carreras/semestres del docente
      let perteneceAGruposDocente = false;
      
      // Caso 1: Sin filtros o solo filtro de carrera
      if (semestre === 'TODOS' && materia === 'TODAS') {
        // Si no hay filtro de carrera, verificar todas las carreras/semestres del docente
        if (carrera === 'TODAS') {
          perteneceAGruposDocente = 
            semestresPorCarrera && 
            semestresPorCarrera[estudianteCarrera] && 
            Array.isArray(semestresPorCarrera[estudianteCarrera]) &&
            semestresPorCarrera[estudianteCarrera].includes(estudianteSemestre);
        } 
        // Si hay filtro de carrera, verificar solo si el docente tiene grupos en la carrera y semestre del estudiante
        else if (estudianteCarrera === carrera) {
          perteneceAGruposDocente = 
            semestresPorCarrera && 
            semestresPorCarrera[carrera] && 
            Array.isArray(semestresPorCarrera[carrera]) &&
            semestresPorCarrera[carrera].includes(estudianteSemestre);
        }
      }
      // Caso 2: Filtros más específicos (semestre o materia)
      else {
        // Para filtros específicos, la validación de si pertenece o no
        // se hará en los otros condicionales, así que aquí solo permitimos continuar
        perteneceAGruposDocente = true;
      }
      
      if (!perteneceAGruposDocente) {
        continue; // Estudiante no está en ninguna carrera/semestre donde el docente tenga grupos
      }
      
      // Aplicar filtros de carrera y semestre si están seleccionados
      if ((carrera !== 'TODAS' && estudianteCarrera !== carrera) ||
          (semestre !== 'TODOS' && estudianteSemestre.toString() !== semestre)) {
        continue; // Si no cumple estos filtros, pasar al siguiente estudiante
      }
      
      // El resto del código sigue igual...
      // Variables para almacenar las relaciones encontradas
      let grupoDelEstudiante = null;
      let informeDelEstudiante = null;
      let rubricaDelEstudiante = null;
      let cumpleFiltroMateria = (materia === 'TODAS'); // Por defecto cumple si no hay filtro
      
      // Buscar si el estudiante pertenece a algún grupo
      // y si ese grupo cumple con el filtro de materia
      for (const grupo of grupos) {
        // Verificar si la carrera y semestre coinciden con los del estudiante
        if (grupo.carrera === estudianteCarrera && grupo.semestre === estudianteSemestre) {
          const estudiantesDelGrupo = estudiantesPorGrupo[grupo.id] || [];
          
          // Verificar si el estudiante está en este grupo
          if (estudiantesDelGrupo.some(est => est.id === estudiante.id)) {
            // Si hay filtro de materia, verificar si el grupo lo cumple
            if (materia === 'TODAS' || grupo.materia === materia) {
              grupoDelEstudiante = grupo;
              cumpleFiltroMateria = true;
              
              // Buscar si tiene informe en este grupo
              const informesDelGrupo = informesPorGrupo[grupo.id] || [];
              informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
              
              // Si tiene informe, buscar su rúbrica
              if (informeDelEstudiante && informeDelEstudiante.rubrica_id) {
                rubricaDelEstudiante = rubricasPorInforme[informeDelEstudiante.id];
              }
              
              break; // Si encontramos un grupo que cumple todos los filtros, no necesitamos seguir buscando
            }
            
            // Si no cumple con el filtro de materia pero es el primer grupo encontrado, guardarlo
            // para usarlo si no encontramos otro grupo que cumpla todos los filtros
            if (!grupoDelEstudiante) {
              grupoDelEstudiante = grupo;
              
              // Buscar si tiene informe en este grupo
              const informesDelGrupo = informesPorGrupo[grupo.id] || [];
              informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
              
              // Si tiene informe, buscar su rúbrica
              if (informeDelEstudiante && informeDelEstudiante.rubrica_id) {
                rubricaDelEstudiante = rubricasPorInforme[informeDelEstudiante.id];
              }
            }
          }
        }
      }
      
      // PUNTO CLAVE: Decidir si incluir este estudiante en los resultados
      
      // Caso 1: Si hay filtro de materia pero el estudiante no cumple, omitirlo
      if (materia !== 'TODAS' && !cumpleFiltroMateria) {
        continue;
      }
      
      // Caso 2: Estudiante pendiente (sin rúbrica)
      if (!rubricaDelEstudiante) {
        datosEstadisticas.push({
          estudiante,
          grupo: grupoDelEstudiante || { 
            nombre_proyecto: 'Sin asignar',
            carrera: estudianteCarrera,
            semestre: estudianteSemestre,
            materia: materia !== 'TODAS' ? materia : 'No asignada'
          },
          informe: informeDelEstudiante,
          rubrica: rubricaDelEstudiante
        });
      }
      // Caso 3: Estudiante con rúbrica (APROBADO/REPROBADO)
      else {
        datosEstadisticas.push({
          estudiante,
          grupo: grupoDelEstudiante,
          informe: informeDelEstudiante,
          rubrica: rubricaDelEstudiante
        });
      }
    }

    return datosEstadisticas;
  };

  // Función para preparar los datos para las estadísticas
  const prepararDatosEstadisticas = (
    grupos, 
    todosLosEstudiantes, 
    estudiantesPorGrupo, 
    informesPorGrupo, 
    rubricasPorInforme,
    semestresPorCarrera
  ) => {
    // Usamos directamente la función de filtrado con los parámetros iniciales
    // Esto mantiene la coherencia entre la carga inicial y los filtrados posteriores
    return filtrarDatos(
      grupos,
      todosLosEstudiantes,
      estudiantesPorGrupo,
      informesPorGrupo,
      rubricasPorInforme,
      'TODAS', // carrera por defecto
      'TODOS',  // semestre por defecto
      'TODAS',  // materia por defecto
      semestresPorCarrera
    );
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
        
        // Usar datos filtrados para generar el gráfico
        const aprobados = datosFiltrados.filter(dato => dato.rubrica?.observaciones === 'APROBADO').length;
        const reprobados = datosFiltrados.filter(dato => dato.rubrica?.observaciones === 'REPROBADO').length;
        const pendientes = datosFiltrados.length - aprobados - reprobados;
        
        totalEstudiantes = datosFiltrados.length;
        
        dataArray = [
          { name: 'Aprobados', value: aprobados, color: COLORS.aprobados },
          { name: 'Reprobados', value: reprobados, color: COLORS.reprobados },
          { name: 'Pendientes', value: pendientes, color: COLORS.pendientes }
        ].filter(item => item.value > 0); // Solo mostrar categorías con valores
        
        // Añadir el total a los datos para usarlo en la interfaz
        return {
          totalEstudiantes,
          chartData: dataArray
        };
      };
    
    // Función para obtener datos del gráfico de barras según selección
    const obtenerDatosGraficoBarras = () => {
        // Calcular promedios de las secciones usando los datos filtrados
        let sumaPresentacion = 0;
        let sumaSustentacion = 0;
        let sumaDocumentacion = 0;
        let sumaInnovacion = 0;
        let sumaNotaFinal = 0;
        let cantidadConNota = 0;
        
        datosFiltrados.forEach(dato => {
          if (dato.rubrica) {
            if (dato.rubrica.presentacion !== null && dato.rubrica.presentacion !== undefined) {
              sumaPresentacion += parseFloat(dato.rubrica.presentacion);
            }
            
            if (dato.rubrica.sustentacion !== null && dato.rubrica.sustentacion !== undefined) {
              sumaSustentacion += parseFloat(dato.rubrica.sustentacion);
            }
            
            if (dato.rubrica.documentacion !== null && dato.rubrica.documentacion !== undefined) {
              sumaDocumentacion += parseFloat(dato.rubrica.documentacion);
            }
            
            if (dato.rubrica.innovacion !== null && dato.rubrica.innovacion !== undefined) {
              sumaInnovacion += parseFloat(dato.rubrica.innovacion);
            }
            
            if (dato.rubrica.nota_final !== null && dato.rubrica.nota_final !== undefined) {
              sumaNotaFinal += parseFloat(dato.rubrica.nota_final);
              cantidadConNota++;
            }
          }
        });
        
        const promedioGeneral = cantidadConNota > 0 ? sumaNotaFinal / cantidadConNota : 0;
        const promedioSecciones = {
          presentacion: cantidadConNota > 0 ? sumaPresentacion / cantidadConNota : 0,
          sustentacion: cantidadConNota > 0 ? sumaSustentacion / cantidadConNota : 0,
          documentacion: cantidadConNota > 0 ? sumaDocumentacion / cantidadConNota : 0,
          innovacion: cantidadConNota > 0 ? sumaInnovacion / cantidadConNota : 0
        };
        
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
                <div className="header-content">
                  <h1>ESTADÍSTICAS DE EVALUACIÓN</h1>
                </div>
              </div>
              <div className="evaluacion-container" id="evaluacion-container">
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
                <div className="header-content">
                  <h1>ESTADÍSTICAS DE EVALUACIÓN</h1>
                </div>
                <div className="header-actions">
                  <button 
                    className="btn-volver"
                    onClick={() => navigate('/docentes')}
                  >
                    Volver
                  </button>
                </div>
              </div>
              <div className="evaluacion-container">
                <div className="error-message">{error}</div>
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
    
    // Verificar si hay filtros activos
    const hayFiltrosActivos = carreraSeleccionada !== 'TODAS' || semestreSeleccionado !== 'TODOS' || materiaSeleccionada !== 'TODAS';
    
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar">
          {/* Añadimos el namespace para aislar los estilos */}
          <div className="estadisticas-styles">
            <div className="evaluacion-header">
              <div className="header-content">
                <h1>ESTADÍSTICAS DE EVALUACIÓN</h1>
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
  
            <div className="evaluacion-container" id="evaluacion-container">
              {/* Filtros en una sola línea */}
              <div className="filters-search-row">
                {/* Filtro de carrera */}
                <div className="filtro">
                  <label className="filtro-label">CARRERA</label>
                  <select 
                    id="carrera-select" 
                    value={carreraSeleccionada}
                    onChange={(e) => {
                      setCarreraSeleccionada(e.target.value);
                      setSemestreSeleccionado('TODOS');
                    }}
                  >
                    <option value="TODAS">Todas las carreras</option>
                    {carreras.filter(c => c !== 'TODAS').map(carrera => (
                      <option key={carrera} value={carrera}>{carrera}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro de semestre */}
                <div className="filtro">
                  <label className="filtro-label">SEMESTRE</label>
                  <select 
                    id="semestre-select" 
                    value={semestreSeleccionado}
                    onChange={(e) => setSemestreSeleccionado(e.target.value)}
                    disabled={carreraSeleccionada === 'TODAS'}
                  >
                    <option value="TODOS">Todos los semestres</option>
                    {carreraSeleccionada !== 'TODAS' && gruposPorCarreraYSemestre[carreraSeleccionada] 
                      ? Object.keys(gruposPorCarreraYSemestre[carreraSeleccionada]).sort((a, b) => a - b).map(semestre => (
                          <option key={semestre} value={semestre}>{`${semestre}° Semestre`}</option>
                        ))
                      : null
                    }
                  </select>
                </div>

                {/* Filtro de materia */}
                <div className="filtro">
                  <label className="filtro-label">MATERIA</label>
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
                  onClick={limpiarFiltros} 
                  className="btn-limpiar-filtros"
                  title="Limpiar todos los filtros"
                  disabled={!hayFiltrosActivos}
                >
                  X
                </button>
              </div>

              {/* Información general con estilo mejorado */}
              <div className="pdf-info">
                <div><strong>Fecha del informe:</strong> {obtenerFechaActual()}</div>
                <div><strong>Docente:</strong> {docenteActual ? docenteActual.nombre_completo : 'No especificado'}</div>
                <div><strong>Total de grupos:</strong> {
                  materiaSeleccionada === 'TODAS' 
                  ? grupos.length 
                  : grupos.filter(grupo => grupo.materia === materiaSeleccionada).length
                }</div>
                {carreraSeleccionada !== 'TODAS' && <div><strong>Carrera:</strong> {carreraSeleccionada}</div>}
                {semestreSeleccionado !== 'TODOS' && <div><strong>Semestre:</strong> {semestreSeleccionado}° Semestre</div>}
                {materiaSeleccionada !== 'TODAS' && <div><strong>Asignatura:</strong> {materiaSeleccionada}</div>}
                <div><strong>Total de estudiantes:</strong> {datosCircular.totalEstudiantes}</div>
              </div>
              
              {/* Resumen estadístico */}
              <div className="resumen-estadistico">
                <h3>Resumen de Evaluación</h3>
                
                <div className="estadisticas-grid">
                  {/* Gráfico circular */}
                  <div className="grafico-container" ref={graficoCircularRef}>
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
                  <div className="grafico-container" ref={graficoBarrasRef}>
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
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  export default Estadisticas;