import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from './LayoutSup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';

// Importar servicios necesarios
import { getGrupos, getGruposPorCarrera } from '../../../service/grupoService';
import { getEstudiantes, getEstudiantesByGrupoId, getEstudiantesBySemestreYCarrera } from '../../../service/estudianteService';
import { getInformes, getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { obtenerTodasRubricas } from '../../../service/supRubricaService';
import { getDocentes, getDocentesPorCarrera } from '../../../service/docenteService';
import { getSupervisorById } from '../../../service/supervisorService';

// Importar estilos
import '../style/supDashboard.css';

// Colores para gráficos
const CHART_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

// Colores específicos para diferentes categorías
const COLORS = {
  aprobados: '#2ecc71',
  reprobados: '#e74c3c',
  pendientes: '#f39c12',
  presentacion: '#3498db',
  sustentacion: '#9b59b6',
  documentacion: '#34495e',
  innovacion: '#1abc9c'
};

// Funciones utilitarias

// Formatear fecha
const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-';
  const date = new Date(fechaStr);
  return date.toLocaleString('es-BO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  });
};

// Formatear número para mostrar
const formatearNumero = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('es-BO');
};

// Formatear calificación con 2 decimales
const formatearNota = (nota) => {
  if (nota === null || nota === undefined || isNaN(nota)) return '-';
  return parseFloat(nota).toFixed(2);
};

// Interpretar calificación numérica
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

const SupervisorDashboard = () => {
  // Estados para los datos
  const [loading, setLoading] = useState(true);
  const [supervisor, setSupervisor] = useState(null);
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [gruposRecientes, setGruposRecientes] = useState([]);
  const [gruposPendientes, setGruposPendientes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  
  // Estados para estadísticas reales
  const [totalEstudiantes, setTotalEstudiantes] = useState(0);
  const [totalGrupos, setTotalGrupos] = useState(0);
  const [totalDocentes, setTotalDocentes] = useState(0);
  const [estadisticasEstudiantes, setEstadisticasEstudiantes] = useState({
    aprobados: 0,
    reprobados: 0,
    pendientes: 0
  });
  const [promediosSecciones, setPromediosSecciones] = useState({
    presentacion: 0,
    sustentacion: 0,
    documentacion: 0,
    innovacion: 0
  });
  const [estadisticasPorCarrera, setEstadisticasPorCarrera] = useState([]);
  
  const navigate = useNavigate();
  
  // Obtener datos del supervisor y sus carreras asignadas
  useEffect(() => {
    const obtenerDatosSupervisor = async () => {
      try {
        // Obtener datos del supervisor del sessionStorage
        const usuarioStr = sessionStorage.getItem('usuario');
        if (usuarioStr) {
          try {
            const usuario = JSON.parse(usuarioStr);
            setSupervisor(usuario);
            
            // Obtener carreras asignadas desde el objeto de usuario
            if (usuario.carreras && Array.isArray(usuario.carreras)) {
              setCarrerasAsignadas(usuario.carreras);
            } else if (usuario.id) {
              // Si no hay carreras en el objeto de usuario, intentar obtenerlas desde el servidor
              const supervisorData = await getSupervisorById(usuario.id);
              if (supervisorData && supervisorData.carreras) {
                setCarrerasAsignadas(supervisorData.carreras);
              } else {
                toast.error('No se pudieron obtener las carreras asignadas');
              }
            }
          } catch (error) {
            console.error('Error al parsear datos del supervisor:', error);
            toast.error('Error al cargar datos del supervisor');
          }
        }
      } catch (error) {
        console.error('Error al obtener datos del supervisor:', error);
        toast.error('Error al cargar datos del supervisor');
      }
    };
    
    obtenerDatosSupervisor();
  }, []);
  
  // Cargar datos filtrados por carreras asignadas
  useEffect(() => {
    // Solo ejecutar cuando tengamos las carreras asignadas
    if (carrerasAsignadas.length > 0) {
      cargarDatosFiltrados();
    }
  }, [carrerasAsignadas]);
  
  // Función para cargar datos filtrados por carreras asignadas
  const cargarDatosFiltrados = async () => {
    try {
      setLoading(true);
      
      // 1. Cargar grupos solo de las carreras asignadas
      let gruposData = [];
      for (const carrera of carrerasAsignadas) {
        try {
          const gruposCarrera = await getGruposPorCarrera(carrera);
          gruposData = [...gruposData, ...gruposCarrera];
        } catch (error) {
          console.error(`Error al cargar grupos de la carrera ${carrera}:`, error);
        }
      }
      
      // Eliminar duplicados (si un grupo pertenece a más de una carrera)
      gruposData = gruposData.filter((grupo, index, self) =>
        index === self.findIndex((g) => g.id === grupo.id)
      );
      
      setTotalGrupos(gruposData.length);
      
      // 2. Cargar docentes solo de las carreras asignadas
      let docentesData = [];
      for (const carrera of carrerasAsignadas) {
        try {
          const docentesCarrera = await getDocentesPorCarrera(carrera);
          docentesData = [...docentesData, ...docentesCarrera];
        } catch (error) {
          console.error(`Error al cargar docentes de la carrera ${carrera}:`, error);
        }
      }
      
      // Eliminar duplicados (si un docente pertenece a más de una carrera)
      docentesData = docentesData.filter((docente, index, self) =>
        index === self.findIndex((d) => d.id === docente.id)
      );
      
      setTotalDocentes(docentesData.length);
      
      // 3. Cargar estudiantes solo de las carreras asignadas
      let estudiantesData = [];
      for (const carrera of carrerasAsignadas) {
        try {
          // Obtener todos los semestres disponibles (1-10)
          for (let semestre = 1; semestre <= 10; semestre++) {
            const estudiantesSemestre = await getEstudiantesBySemestreYCarrera(semestre.toString(), carrera);
            estudiantesData = [...estudiantesData, ...estudiantesSemestre];
          }
        } catch (error) {
          console.error(`Error al cargar estudiantes de la carrera ${carrera}:`, error);
        }
      }
      
      // Eliminar duplicados (si un estudiante pertenece a más de una carrera)
      estudiantesData = estudiantesData.filter((estudiante, index, self) =>
        index === self.findIndex((e) => e.id === estudiante.id)
      );
      
      setTotalEstudiantes(estudiantesData.length);
      
      // 4. Obtener datos de rúbricas para los grupos de las carreras asignadas
      let rubricasData = { grupos: [] };
      try {
        // Este servicio debería ser mejorado para aceptar filtros por carrera
        rubricasData = await obtenerTodasRubricas();
        
        // Filtrar solo los grupos de las carreras asignadas
        if (rubricasData && rubricasData.grupos) {
          rubricasData.grupos = rubricasData.grupos.filter(grupo => 
            carrerasAsignadas.includes(grupo.carrera)
          );
        }
      } catch (error) {
        console.error('Error al cargar rúbricas:', error);
      }
      
      // 5. Inicializar objetos para almacenar información detallada
      const estudiantesPorGrupo = {};
      const informesPorGrupo = {};
      const rubricasPorInforme = {};
      
      // 6. Procesar cada grupo para obtener datos detallados
      for (const grupo of gruposData) {
        try {
          // Obtener estudiantes del grupo
          const estudiantes = await getEstudiantesByGrupoId(grupo.id);
          estudiantesPorGrupo[grupo.id] = estudiantes;
          
          // Obtener informes del grupo
          const informes = await getInformesPorGrupoId(grupo.id);
          informesPorGrupo[grupo.id] = informes;
          
          // Para cada informe, obtener su rúbrica
          for (const informe of informes) {
            if (informe && informe.rubrica_id) {
              try {
                const rubrica = await getRubricaPorId(informe.rubrica_id);
                if (rubrica) {
                  rubricasPorInforme[informe.id] = rubrica;
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
      
      // 7. Procesar informes directamente para optimizar rendimiento
      let informesGenerales = [];
      for (const grupoId in informesPorGrupo) {
        informesGenerales = [...informesGenerales, ...informesPorGrupo[grupoId]];
      }
      
      // 8. Calcular estadísticas de estudiantes (aprobados, reprobados, pendientes)
      const estadisticasEstudiantesTemp = calcularEstadisticasEstudiantes(
        estudiantesData,
        informesGenerales,
        rubricasPorInforme
      );
      setEstadisticasEstudiantes(estadisticasEstudiantesTemp);
      
      // 9. Calcular promedios por secciones
      const promediosSecciones = calcularPromediosPorSeccion(rubricasPorInforme);
      setPromediosSecciones(promediosSecciones);
      
      // 10. Calcular estadísticas por carrera
      const estadisticasPorCarrera = calcularEstadisticasPorCarrera(
        estudiantesData,
        gruposData,
        estudiantesPorGrupo,
        informesPorGrupo,
        rubricasPorInforme
      );
      setEstadisticasPorCarrera(estadisticasPorCarrera);
      
      // 11. Procesar grupos para estados
      const gruposConEstado = await procesarGrupos(gruposData, rubricasData, informesGenerales);
      
      // 12. Ordenar grupos por últimas actividades
      const gruposOrdenados = [...gruposConEstado].sort((a, b) => {
        return new Date(b.ultimaActividad || Date.now()) - 
               new Date(a.ultimaActividad || Date.now());
      });
      
      // 13. Obtener grupos recientes y pendientes
      setGruposRecientes(gruposOrdenados.slice(0, 5));
      
      const gruposPendientesTemp = gruposConEstado.filter(grupo => 
        grupo.estado === 'pendiente' || grupo.estado === 'sin_rubrica'
      );
      setGruposPendientes(gruposPendientesTemp.slice(0, 5));
      
      // 14. Generar alertas
      const alertasGeneradas = generarAlertas(
        gruposData, 
        rubricasData, 
        estudiantesData, 
        informesGenerales
      );
      setAlertas(alertasGeneradas);
      
      // Guardar timestamp de actualización
      setUltimaActualizacion(new Date().toISOString());
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      toast.error('Error al cargar datos del dashboard');
      setLoading(false);
    }
  };
        
  // Función para calcular estadísticas de estudiantes
  const calcularEstadisticasEstudiantes = (estudiantes, informes, rubricasPorInforme) => {
    let aprobados = 0;
    let reprobados = 0;
    let pendientes = 0;
    
    // Para cada estudiante, verificar si tiene informe y rúbrica
    estudiantes.forEach(estudiante => {
      // Buscar el informe más reciente del estudiante
      const informesEstudiante = informes.filter(informe => 
        informe.estudiante_id === estudiante.id
      );
      
      if (informesEstudiante.length === 0) {
        // Estudiante sin informe
        pendientes++;
      } else {
        // Ordenar informes por fecha (más reciente primero)
        const informesOrdenados = [...informesEstudiante].sort((a, b) => {
          return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
        });
        
        const informeReciente = informesOrdenados[0];
        
        // Obtener la rúbrica asociada al informe
        if (informeReciente.rubrica_id) {
          const rubrica = rubricasPorInforme[informeReciente.id];
          
          if (rubrica) {
            // Determinar si es aprobado o reprobado según la nota final
            if (parseFloat(rubrica.nota_final) >= 5.1) {
              aprobados++;
            } else {
              reprobados++;
            }
          } else {
            // Tiene informe pero no se encontró rúbrica
            pendientes++;
          }
        } else {
          // Tiene informe pero sin rubrica_id
          pendientes++;
        }
      }
    });
    
    return { aprobados, reprobados, pendientes };
  };
  
  // Función para calcular promedios por sección
  const calcularPromediosPorSeccion = (rubricasPorInforme) => {
    let sumaPresentacion = 0;
    let sumaSustentacion = 0;
    let sumaDocumentacion = 0;
    let sumaInnovacion = 0;
    let cantidadRubricas = 0;
    
    // Calcular sumas de cada sección
    Object.values(rubricasPorInforme).forEach(rubrica => {
      if (rubrica) {
        if (rubrica.presentacion !== null && rubrica.presentacion !== undefined) {
          sumaPresentacion += parseFloat(rubrica.presentacion);
        }
        
        if (rubrica.sustentacion !== null && rubrica.sustentacion !== undefined) {
          sumaSustentacion += parseFloat(rubrica.sustentacion);
        }
        
        if (rubrica.documentacion !== null && rubrica.documentacion !== undefined) {
          sumaDocumentacion += parseFloat(rubrica.documentacion);
        }
        
        if (rubrica.innovacion !== null && rubrica.innovacion !== undefined) {
          sumaInnovacion += parseFloat(rubrica.innovacion);
        }
        
        cantidadRubricas++;
      }
    });
    
    // Calcular promedios (evitar división por cero)
    const divisor = cantidadRubricas || 1;
    
    return {
      presentacion: sumaPresentacion / divisor,
      sustentacion: sumaSustentacion / divisor,
      documentacion: sumaDocumentacion / divisor,
      innovacion: sumaInnovacion / divisor
    };
  };
  
  // Función para calcular estadísticas por carrera
  const calcularEstadisticasPorCarrera = (
    estudiantes, 
    grupos, 
    estudiantesPorGrupo, 
    informesPorGrupo,
    rubricasPorInforme
  ) => {
    // Inicializar objeto para almacenar datos por carrera
    const datosPorCarrera = {};
    
    // Inicializar con las carreras asignadas al supervisor
    carrerasAsignadas.forEach(carrera => {
      datosPorCarrera[carrera] = {
        aprobados: 0,
        reprobados: 0,
        pendientes: 0,
        total: 0
      };
    });
    
    // Recorrer los grupos para asignar estudiantes a sus carreras
    grupos.forEach(grupo => {
      const carrera = grupo.carrera || 'Sin carrera';
      
      if (!datosPorCarrera[carrera]) {
        datosPorCarrera[carrera] = {
          aprobados: 0,
          reprobados: 0,
          pendientes: 0,
          total: 0
        };
      }
      
      // Obtener estudiantes de este grupo
      const estudiantesGrupo = estudiantesPorGrupo[grupo.id] || [];
      const informesGrupo = informesPorGrupo[grupo.id] || [];
      
      // Para cada estudiante del grupo, verificar su estado
      estudiantesGrupo.forEach(estudiante => {
        datosPorCarrera[carrera].total++;
        
        // Buscar el informe del estudiante en este grupo
        const informeEstudiante = informesGrupo.find(
          informe => informe.estudiante_id === estudiante.id
        );
        
        if (!informeEstudiante || !informeEstudiante.rubrica_id) {
          datosPorCarrera[carrera].pendientes++;
        } else {
          // Encontrar la rúbrica
          const rubrica = rubricasPorInforme[informeEstudiante.id];
          
          if (rubrica) {
            if (parseFloat(rubrica.nota_final) >= 5.1) {
              datosPorCarrera[carrera].aprobados++;
            } else {
              datosPorCarrera[carrera].reprobados++;
            }
          } else {
            datosPorCarrera[carrera].pendientes++;
          }
        }
      });
    });
    
    // Convertir a formato para gráfico
    return Object.entries(datosPorCarrera).map(([carrera, datos]) => ({
      name: carrera,
      aprobados: datos.aprobados,
      reprobados: datos.reprobados,
      pendientes: datos.pendientes
    }));
  };
        
  // Procesar grupos para obtener su estado actual y última actividad
  const procesarGrupos = async (grupos, rubricasData, informes) => {
    if (!grupos || !Array.isArray(grupos)) {
      console.warn('procesarGrupos: grupos no es un array', grupos);
      return [];
    }
    
    if (!rubricasData || typeof rubricasData !== 'object') {
      console.warn('procesarGrupos: rubricasData no es un objeto', rubricasData);
      rubricasData = { grupos: [] };
    }
    
    if (!informes || !Array.isArray(informes)) {
      console.warn('procesarGrupos: informes no es un array', informes);
      informes = [];
    }
    
    const gruposConEstado = [];
    
    for (const grupo of grupos) {
      if (!grupo || typeof grupo !== 'object') continue;
      
      try {
        // Determinar estado del grupo
        let estado = 'sin_rubrica';
        let ultimaActividad = grupo.createdAt || null;
        let habilitacionActiva = false;
        
        // Buscar info en datos de rúbricas de manera segura
        let grupoRubrica = null;
        if (rubricasData && Array.isArray(rubricasData.grupos)) {
          grupoRubrica = rubricasData.grupos.find(g => g && g.id === grupo.id);
        }
        
        if (grupoRubrica) {
          estado = grupoRubrica.estado || 'sin_rubrica';
          habilitacionActiva = Boolean(grupoRubrica.habilitacion_activa);
          if (grupoRubrica.detalle_habilitacion) {
            ultimaActividad = grupoRubrica.detalle_habilitacion.fecha_habilitacion || ultimaActividad;
          }
        }
        
        // Buscar informes asociados al grupo de manera segura
        const informesGrupo = Array.isArray(informes) 
          ? informes.filter(informe => informe && informe.grupo_id === grupo.id)
          : [];
        
        if (informesGrupo.length > 0) {
          try {
            // Obtener la fecha más reciente de los informes
            const fechaMasReciente = informesGrupo.reduce((latest, current) => {
              try {
                const currentDate = new Date(current.fecha_creacion || 0);
                return currentDate > latest ? currentDate : latest;
              } catch (err) {
                return latest;
              }
            }, new Date(0));
            
            if (fechaMasReciente > new Date(0)) {
              ultimaActividad = fechaMasReciente.toISOString();
            }
          } catch (err) {
            console.error('Error al procesar fechas:', err);
          }
          
          if (estado === 'sin_rubrica' && informesGrupo.length > 0) {
            estado = 'pendiente';
          }
        }
        
        gruposConEstado.push({
          ...grupo,
          estado,
          ultimaActividad,
          habilitacionActiva
        });
      } catch (error) {
        console.error(`Error al procesar grupo ${grupo.id || 'desconocido'}:`, error);
        // Agregar grupo con datos mínimos para evitar errores
        gruposConEstado.push({
          ...(grupo || {}),
          nombre_proyecto: grupo?.nombre_proyecto || 'Grupo sin nombre',
          carrera: grupo?.carrera || 'Sin carrera',
          semestre: grupo?.semestre || '?',
          estado: 'error',
          ultimaActividad: null,
          habilitacionActiva: false
        });
      }
    }
    
    return gruposConEstado;
  };
        
  // Generar alertas basadas en los datos
  const generarAlertas = (grupos = [], rubricas = {}, estudiantes = [], informes = []) => {
    // Validar que todos los parámetros sean del tipo correcto
    if (!Array.isArray(grupos)) {
      console.warn('generarAlertas: grupos no es un array', grupos);
      grupos = [];
    }
    
    if (!rubricas || typeof rubricas !== 'object') {
      console.warn('generarAlertas: rubricas no es un objeto', rubricas);
      rubricas = { grupos: [] };
    }
    
    if (!Array.isArray(rubricas.grupos)) {
      rubricas.grupos = [];
    }
    
    if (!Array.isArray(estudiantes)) {
      console.warn('generarAlertas: estudiantes no es un array', estudiantes);
      estudiantes = [];
    }
    
    if (!Array.isArray(informes)) {
      console.warn('generarAlertas: informes no es un array', informes);
      informes = [];
    }
    
    const alertasTemp = [];
    
    try {
      // 1. Alertas para grupos finalizados que podrían necesitar habilitación
      const gruposFinalizados = grupos.filter(grupo => {
        if (!grupo) return false;
        const grupoRubrica = rubricas.grupos?.find(g => g && g.id === grupo.id);
        return grupoRubrica && grupoRubrica.estado === 'finalizado' && !grupoRubrica.habilitacion_activa;
      });
      
      if (gruposFinalizados.length > 0) {
        alertasTemp.push({
          tipo: 'info',
          titulo: `${gruposFinalizados.length} grupos finalizados`,
          mensaje: 'Hay grupos con evaluaciones finalizadas que podrían requerir habilitación.',
          accion: 'Ver en Rúbricas',
          ruta: '/supervisor/rubricas'
        });
      }
      
      // 2. Alertas para habilitaciones activas
      const gruposHabilitados = grupos.filter(grupo => {
        if (!grupo) return false;
        const grupoRubrica = rubricas.grupos?.find(g => g && g.id === grupo.id);
        return grupoRubrica && grupoRubrica.habilitacion_activa;
      });
      
      if (gruposHabilitados.length > 0) {
        alertasTemp.push({
          tipo: 'warning',
          titulo: `${gruposHabilitados.length} habilitaciones activas`,
          mensaje: 'Hay grupos con habilitaciones activas pendientes de revisión.',
          accion: 'Revisar Habilitaciones',
          ruta: '/supervisor/rubricas'
        });
      }
      
      // 3. Alertas para estudiantes sin asignar a grupos
      const estudiantesSinGrupo = estudiantes.filter(estudiante => {
        if (!estudiante) return false;
        return !informes.some(informe => informe && informe.estudiante_id === estudiante.id);
      });
      
      if (estudiantesSinGrupo.length > 10) {
        alertasTemp.push({
          tipo: 'warning',
          titulo: `${estudiantesSinGrupo.length} estudiantes sin evaluar`,
          mensaje: 'Hay un número considerable de estudiantes que aún no han sido evaluados.',
          accion: 'Ver Informes',
          ruta: '/supervisor/informes'
        });
      }
      
      // 4. Alertas para grupos sin rúbricas
      const gruposSinRubrica = grupos.filter(grupo => {
        if (!grupo) return false;
        const grupoRubrica = rubricas.grupos?.find(g => g && g.id === grupo.id);
        return !grupoRubrica || grupoRubrica.estado === 'sin_rubrica';
      });
      
      if (gruposSinRubrica.length > 5) {
        alertasTemp.push({
          tipo: 'danger',
          titulo: `${gruposSinRubrica.length} grupos sin rúbricas`,
          mensaje: 'Hay varios grupos que aún no tienen rúbricas asignadas.',
          accion: 'Ver Estadísticas',
          ruta: '/supervisor/estadisticas'
        });
      }
      
      // Añadir una alerta genérica si no hay ninguna
      if (alertasTemp.length === 0) {
        alertasTemp.push({
          tipo: 'info',
          titulo: 'Sistema funcionando correctamente',
          mensaje: 'No hay alertas pendientes en este momento.',
          accion: 'Ver Estadísticas',
          ruta: '/supervisor/estadisticas'
        });
      }
    } catch (error) {
      console.error('Error al generar alertas:', error);
      // Proporcionar al menos una alerta genérica en caso de error
      alertasTemp.push({
        tipo: 'info',
        titulo: 'Bienvenido al sistema',
        mensaje: 'Utilice las opciones del menú para administrar el sistema.',
        accion: 'Ver Estadísticas',
        ruta: '/supervisor/estadisticas'
      });
    }
    
    return alertasTemp;
  };
  
  // Función para procesar datos para gráfico de barras por carrera
  const procesarDatosPorCarrera = (estadisticasGrupos) => {
    // Agrupar por carrera
    const datosPorCarrera = {};
    
    for (const grupo of estadisticasGrupos) {
      const carrera = grupo.carrera || 'Sin carrera';
      
      if (!datosPorCarrera[carrera]) {
        datosPorCarrera[carrera] = {
          aprobados: 0,
          reprobados: 0,
          pendientes: 0,
          total: 0
        };
      }
      
      datosPorCarrera[carrera].aprobados += (grupo.aprobados || 0);
      datosPorCarrera[carrera].reprobados += (grupo.reprobados || 0);
      datosPorCarrera[carrera].pendientes += (grupo.total_estudiantes || 0) - 
                                           ((grupo.aprobados || 0) + (grupo.reprobados || 0));
      datosPorCarrera[carrera].total += (grupo.total_estudiantes || 0);
    }
    
    // Convertir a formato para gráfico
    return Object.entries(datosPorCarrera).map(([carrera, datos]) => ({
      name: carrera,
      aprobados: datos.aprobados,
      reprobados: datos.reprobados,
      pendientes: datos.pendientes
    }));
  };
  
  // Renderizado para estado de carga
  if (loading) {
    return (
      <LayoutSup>
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Cargando datos del sistema...</p>
        </div>
      </LayoutSup>
    );
  }
  
  // Preparar datos para el gráfico circular
  const datosCircular = {
    totalEstudiantes: totalEstudiantes,
    chartData: [
      { name: 'Aprobados', value: estadisticasEstudiantes.aprobados, color: COLORS.aprobados },
      { name: 'Reprobados', value: estadisticasEstudiantes.reprobados, color: COLORS.reprobados },
      { name: 'Pendientes', value: estadisticasEstudiantes.pendientes, color: COLORS.pendientes }
    ].filter(item => item.value > 0) // Solo mostrar categorías con valores
  };
  
  // Preparar datos para el gráfico de barras
  const datosBarras = [
    { name: 'Presentación', valor: promediosSecciones.presentacion, color: COLORS.presentacion },
    { name: 'Sustentación', valor: promediosSecciones.sustentacion, color: COLORS.sustentacion },
    { name: 'Documentación', valor: promediosSecciones.documentacion, color: COLORS.documentacion },
    { name: 'Innovación', valor: promediosSecciones.innovacion, color: COLORS.innovacion }
  ];
  
  // Calcular el promedio general
  const promedioGeneral = Object.values(promediosSecciones).reduce((sum, val) => sum + val, 0) / 4;
  
  return (
    <LayoutSup>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="dashboard-container">
        {/* Encabezado del Dashboard */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Panel de Control</h1>
            <p className="header-subtitle">
              Bienvenido, <strong>{supervisor?.nombre_completo || 'Supervisor'}</strong>
            </p>
            {carrerasAsignadas.length > 0 && (
              <p className="header-asignacion">
                Carreras asignadas: <strong>{carrerasAsignadas.join(', ')}</strong>
              </p>
            )}
          </div>
          <div className="header-actions">
            <div className="last-update">
              <span>Última actualización: {formatFecha(ultimaActualizacion)}</span>
            </div>
            <button 
              className="btn-actualizar"
              onClick={() => cargarDatosFiltrados()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 10h7V3l-2.35 3.35z"/>
              </svg>
              Actualizar
            </button>
          </div>
        </div>
        
        {/* Tarjetas de métricas clave */}
        <div className="metricas-cards">
          <div className="metrica-card" style={{ borderTopColor: '#3498db' }}>
            <div className="metrica-icon estudiantes-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="metrica-info">
              <div className="metrica-titulo">Estudiantes</div>
              <div className="metrica-valor">{formatearNumero(totalEstudiantes)}</div>
            </div>
          </div>
          
          <div className="metrica-card" style={{ borderTopColor: '#2ecc71' }}>
            <div className="metrica-icon grupos-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#2ecc71">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </div>
            <div className="metrica-info">
              <div className="metrica-titulo">Proyectos</div>
              <div className="metrica-valor">{formatearNumero(totalGrupos)}</div>
            </div>
          </div>
          
          <div className="metrica-card" style={{ borderTopColor: '#f39c12' }}>
            <div className="metrica-icon docentes-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#f39c12">
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
              </svg>
            </div>
            <div className="metrica-info">
              <div className="metrica-titulo">Docentes</div>
              <div className="metrica-valor">{formatearNumero(totalDocentes)}</div>
            </div>
          </div>
          
          <div className="metrica-card" style={{ borderTopColor: '#e74c3c' }}>
            <div className="metrica-icon pendientes-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#e74c3c">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="metrica-info">
              <div className="metrica-titulo">Pendientes</div>
              <div className="metrica-valor">{formatearNumero(estadisticasEstudiantes.pendientes)}</div>
            </div>
          </div>
        </div>
        
        {/* Alertas del sistema */}
        {alertas.length > 0 && (
          <div className="alertas-container">
            <h2 className="seccion-titulo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
              Alertas del Sistema
            </h2>
            {alertas.map((alerta, index) => (
              <div key={index} className={`alerta alerta-${alerta.tipo}`}>
                <div className="alerta-header">
                  <div className="alerta-titulo">{alerta.titulo}</div>
                </div>
                <div className="alerta-mensaje">{alerta.mensaje}</div>
                <button 
                  className="alerta-accion-btn"
                  onClick={() => navigate(alerta.ruta)}
                >
                  {alerta.accion}
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Dashboard de gráficos */}
        <div className="dashboard-graficos">
          <div className="graficos-row">
            {/* Gráfico circular de distribución */}
            <div className="grafico-container">
              <h2 className="seccion-titulo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M12 5v14"/>
                </svg>
                Distribución de Estudiantes
              </h2>
              <div className="total-indicator">
                <div className="total-label">Total de estudiantes:</div> 
                <div className="total-value">{formatearNumero(totalEstudiantes)}</div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={datosCircular.chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent, value }) => 
                      `${name}: ${Math.round(percent * 100)}% (${value})`}
                  >
                    {datosCircular.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} estudiantes`, name]} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Gráfico de barras - Promedios por sección */}
            <div className="grafico-container">
              <h2 className="seccion-titulo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M4 9h4v11H4zm6-5h4v16h-4zm6 8h4v8h-4z"/>
                </svg>
                Calificaciones Promedio por Sección
              </h2>
              <div className="promedio-indicator">
                <div className="promedio-label">Promedio General:</div> 
                <div className="promedio-value">{formatearNota(promedioGeneral)}</div>
                <div className="interpretacion">({interpretarNota(promedioGeneral)})</div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={datosBarras}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip 
                    formatter={(value) => [`${formatearNota(value)} pts`, 'Promedio']}
                  />
                  <Legend />
                  <Bar dataKey="valor" name="Puntuación" fill="#3498db">
                    {datosBarras.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList 
                      dataKey="valor" 
                      position="top" 
                      formatter={(value) => formatearNota(value)}
                      style={{ fontSize: '11px', fill: '#333' }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Gráfico de rendimiento por carrera */}
        <div className="dashboard-graficos">
          <div className="grafico-container grafico-completo">
            <h2 className="seccion-titulo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              </svg>
              Rendimiento por Carrera
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={estadisticasPorCarrera}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 50,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ angle: 0, textAnchor: 'middle' }}
                  height={40}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar stackId="a" dataKey="aprobados" name="Aprobados" fill={COLORS.aprobados} />
                <Bar stackId="a" dataKey="reprobados" name="Reprobados" fill={COLORS.reprobados} />
                <Bar stackId="a" dataKey="pendientes" name="Pendientes" fill={COLORS.pendientes} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Accesos rápidos */}
        <div className="accesos-rapidos">
          <h2 className="seccion-titulo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            Accesos Rápidos
          </h2>
          <div className="accesos-grid">
            <div 
              className="acceso-card"
              onClick={() => navigate('/supervisor/rubricas')}
            >
              <div className="acceso-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="#2c3e50">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div className="acceso-nombre">Gestionar Rúbricas</div>
            </div>
            
            <div 
              className="acceso-card"
              onClick={() => navigate('/supervisor/informes')}
            >
              <div className="acceso-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="#2c3e50">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <div className="acceso-nombre">Informes de Notas</div>
            </div>
            
            <div 
              className="acceso-card"
              onClick={() => navigate('/supervisor/estadisticas')}
            >
              <div className="acceso-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="#2c3e50">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <div className="acceso-nombre">Estadísticas</div>
            </div>
            
            <div 
              className="acceso-card"
              onClick={() => navigate('/adm/personal/listar')}
            >
              <div className="acceso-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="#2c3e50">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <div className="acceso-nombre">Gestionar Docentes</div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-contenido-secundario">
          {/* Grupos con actividad reciente */}
          {gruposRecientes.length > 0 && (
            <div className="grupos-recientes-container">
              <h2 className="seccion-titulo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                Actividad Reciente
              </h2>
              <div className="grupos-table">
                {gruposRecientes.map((grupo, index) => (
                  <div key={index} className="grupo-row">
                    <div className="grupo-info">
                      <div className="grupo-nombre">{grupo.nombre_proyecto}</div>
                      <div className="grupo-meta">
                        <span className="grupo-carrera">{grupo.carrera}</span>
                        <span className="grupo-separador">•</span>
                        <span className="grupo-semestre">{grupo.semestre}° Semestre</span>
                      </div>
                    </div>
                    <div className="grupo-estado">
                      <span className={`badge badge-${grupo.estado === 'finalizado' ? 'success' : grupo.estado === 'pendiente' ? 'warning' : 'danger'}`}>
                        {grupo.estado === 'finalizado' ? 'Finalizado' : 
                         grupo.estado === 'pendiente' ? 'Pendiente' : 'Sin rúbrica'}
                      </span>
                      {grupo.habilitacionActiva && (
                        <span className="badge badge-info">Habilitado</span>
                      )}
                    </div>
                    <div className="grupo-acciones">
                      <button 
                        className="btn-ver-grupo"
                        onClick={() => navigate('/supervisor/rubricas')}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ver-todos-container">
                <button 
                  className="btn-ver-todos"
                  onClick={() => navigate('/supervisor/rubricas')}
                >
                  Ver todos los grupos
                </button>
              </div>
            </div>
          )}
          
          {/* Grupos pendientes de evaluación */}
          {gruposPendientes.length > 0 && (
            <div className="grupos-pendientes-container">
              <h2 className="seccion-titulo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                Pendientes de Evaluación
              </h2>
              <div className="grupos-table">
                {gruposPendientes.map((grupo, index) => (
                  <div key={index} className="grupo-row">
                    <div className="grupo-info">
                      <div className="grupo-nombre">{grupo.nombre_proyecto}</div>
                      <div className="grupo-meta">
                        <span className="grupo-carrera">{grupo.carrera}</span>
                        <span className="grupo-separador">•</span>
                        <span className="grupo-semestre">{grupo.semestre}° Semestre</span>
                      </div>
                    </div>
                    <div className="grupo-estado">
                      <span className={`badge badge-${grupo.estado === 'pendiente' ? 'warning' : 'danger'}`}>
                        {grupo.estado === 'pendiente' ? 'Pendiente' : 'Sin rúbrica'}
                      </span>
                    </div>
                    <div className="grupo-acciones">
                      <button 
                        className="btn-ver-grupo"
                        onClick={() => navigate('/supervisor/rubricas')}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ver-todos-container">
                <button 
                  className="btn-ver-todos"
                  onClick={() => navigate('/supervisor/rubricas')}
                >
                  Ver todos los pendientes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutSup>
  );
};

export default SupervisorDashboard;