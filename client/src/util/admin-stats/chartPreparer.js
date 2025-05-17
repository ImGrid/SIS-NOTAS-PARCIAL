// src/util/admin-stats/chartPreparer.js

import { 
  CHART_COLORS, 
  THRESHOLDS, 
} from './constants';

/**
 * Preparar datos para gráfico circular (PieChart)
 * @param {Object} datos - Datos (pueden ser completos o filtrados)
 * @param {Object} filtros - Filtros aplicados
 * @returns {Object} Datos preparados para gráfico circular
 */
export const prepararGraficoCircular = (datos, filtros) => {
  
  // Verificación de seguridad
  if (!datos) {
    return {
      chartData: [],
      totalEstudiantes: 0,
      mensaje: 'No hay datos disponibles',
      hayDatos: false
    };
  }
  
  // Determinar si los datos están filtrados o son la estructura completa
  let estudiantes = [];
  
  if (datos?.estudiantes) {
    // Si tiene la estructura filtrada
    if (Array.isArray(datos.estudiantes)) {
      estudiantes = datos.estudiantes;
    } 
    // Si tiene la estructura completa inicial
    else if (datos.estudiantes.porId instanceof Map) {
      estudiantes = Array.from(datos.estudiantes.porId.values());
    }
    // Si tiene la estructura organizada pero no es un Map
    else if (datos.estudiantes.porCarreraYSemestre) {
      estudiantes = [];
      Object.values(datos.estudiantes.porCarreraYSemestre).forEach(carreras => {
        Object.values(carreras).forEach(semestreEstudiantes => {
          estudiantes.push(...semestreEstudiantes);
        });
      });
    }
  }
  
  // Verificar si hay datos
  if (!estudiantes || estudiantes.length === 0) {
    return {
      chartData: [],
      totalEstudiantes: 0,
      mensaje: obtenerMensajeSinDatos(filtros),
      hayDatos: false
    };
  }
  
  // Contadores
  let evaluados = 0;
  let pendientes = 0;
  let aprobados = 0;
  let reprobados = 0;
  
  // Si hay estadísticas precalculadas, usarlas
  if (datos.estadisticas) {
    const stats = datos.estadisticas;
    evaluados = stats.estudiantesEvaluados || 0;
    pendientes = stats.estudiantesPendientes || 0;
    aprobados = stats.estudiantesAprobados || 0;
    reprobados = stats.estudiantesReprobados || 0;
  } else {
    // Analizar cada estudiante
    estudiantes.forEach(estudiante => {
      // Verificar estado directo si existe
      if (estudiante.estado === 'APROBADO') {
        evaluados++;
        aprobados++;
      } else if (estudiante.estado === 'REPROBADO') {
        evaluados++;
        reprobados++;
      } else if (estudiante.estado === 'PENDIENTE') {
        pendientes++;
      } else {
        // Sin estado explícito, determinar por informe/rúbrica
        if (estudiante.informe && estudiante.informe.rubrica) {
          evaluados++;
          if (estudiante.informe.rubrica.observaciones === 'APROBADO' || 
             (estudiante.informe.rubrica.nota_final && parseFloat(estudiante.informe.rubrica.nota_final) >= 5.1)) {
            aprobados++;
          } else {
            reprobados++;
          }
        } else {
          pendientes++;
        }
      }
    });
  }
  
  // Preparar datos para el gráfico
  const chartData = [];
  
  // Siempre incluir categorías si tienen al menos un elemento
  if (aprobados > 0) {
    chartData.push({
      name: 'Aprobados',
      value: aprobados,
      color: CHART_COLORS.aprobados,
      porcentaje: ((aprobados / estudiantes.length) * 100).toFixed(1)
    });
  }
  
  if (reprobados > 0) {
    chartData.push({
      name: 'Reprobados',
      value: reprobados,
      color: CHART_COLORS.reprobados,
      porcentaje: ((reprobados / estudiantes.length) * 100).toFixed(1)
    });
  }
  
  if (pendientes > 0) {
    chartData.push({
      name: 'Pendientes',
      value: pendientes,
      color: CHART_COLORS.pendientes,
      porcentaje: ((pendientes / estudiantes.length) * 100).toFixed(1)
    });
  }
  
  console.log('Gráfico circular preparado:', {
    total: estudiantes.length,
    evaluados,
    pendientes,
    aprobados,
    reprobados
  });
  
  return {
    chartData,
    totalEstudiantes: estudiantes.length,
    evaluados,
    pendientes,
    aprobados,
    reprobados,
    hayDatos: chartData.length > 0,
    mensaje: null
  };
};

// Reemplazar la función prepararGraficoBarras en chartPreparer.js

/**
 * Preparar datos para gráfico de barras (promedio por sección)
 * @param {Object} datos - Datos (pueden ser completos o filtrados)
 * @param {Object} filtros - Filtros aplicados
 * @returns {Object} Datos preparados para gráfico de barras
 */
export const prepararGraficoBarras = (datos, filtros) => {
  
  // Verificación de seguridad
  if (!datos) {
    return {
      chartData: [],
      promedioGeneral: 0,
      mensaje: 'No hay datos disponibles',
      hayDatos: false
    };
  }
  
  // Obtener estudiantes según estructura de datos
  let estudiantes = [];
  let grupos = [];
  
  if (datos?.estudiantes) {
    if (Array.isArray(datos.estudiantes)) {
      estudiantes = datos.estudiantes;
    } else if (datos.estudiantes.porId instanceof Map) {
      estudiantes = Array.from(datos.estudiantes.porId.values());
    } else if (datos.estudiantes.porCarreraYSemestre) {
      estudiantes = [];
      Object.values(datos.estudiantes.porCarreraYSemestre).forEach(carreras => {
        Object.values(carreras).forEach(semestreEstudiantes => {
          estudiantes.push(...semestreEstudiantes);
        });
      });
    }
  }
  
  // Obtener grupos
  if (datos?.grupos) {
    grupos = datos.grupos;
  }  
  // Identificar estudiantes evaluados y sus rúbricas
  const estudiantesConRubrica = [];
  
  // PASO 1: Buscar directamente en el estudiante
  estudiantes.forEach(estudiante => {
    // Si el estudiante tiene rubrica directa
    if (estudiante.rubrica) {
      estudiantesConRubrica.push({
        estudiante,
        rubrica: estudiante.rubrica
      });
    }
    // Si el estudiante tiene informe con rubrica
    else if (estudiante.informe && estudiante.informe.rubrica) {
      estudiantesConRubrica.push({
        estudiante,
        rubrica: estudiante.informe.rubrica
      });
    }
  });
  
  // PASO 2: Buscar en grupos e informes
  if (estudiantesConRubrica.length === 0 && grupos.length > 0) {
    
    // Para cada grupo
    grupos.forEach(grupo => {
      if (grupo.informes && Array.isArray(grupo.informes)) {
        // Para cada informe en el grupo
        grupo.informes.forEach(informe => {
          if (informe.rubrica) {
            // Encontrar el estudiante correspondiente
            const estudianteId = informe.estudiante_id;
            const estudiante = estudiantes.find(e => e.id === estudianteId);
            
            if (estudiante) {
              estudiantesConRubrica.push({
                estudiante,
                rubrica: informe.rubrica
              });
            }
          }
        });
      }
    });
  }
    
  // Si no hay estudiantes con rúbrica, mostrar mensaje
  if (estudiantesConRubrica.length === 0) {
    return {
      chartData: [],
      promedioGeneral: 0,
      mensaje: obtenerMensajeSinDatos(filtros, 'evaluaciones'),
      hayDatos: false
    };
  }
  
  // Acumuladores para promedios
  let sumaPresentacion = 0;
  let sumaSustentacion = 0;
  let sumaDocumentacion = 0;
  let sumaInnovacion = 0;
  let sumaNotaFinal = 0;
  let cantidadConDatos = 0;
  
  // Calcular sumas de cada sección
  estudiantesConRubrica.forEach(({ rubrica }) => {
    // Verificar que la rúbrica tenga valores numéricos válidos
    const presentacion = parseFloat(rubrica.presentacion);
    const sustentacion = parseFloat(rubrica.sustentacion);
    const documentacion = parseFloat(rubrica.documentacion);
    const innovacion = parseFloat(rubrica.innovacion);
    const notaFinal = parseFloat(rubrica.nota_final);
        
    // Sumar solo si son números válidos
    if (!isNaN(presentacion)) sumaPresentacion += presentacion;
    if (!isNaN(sustentacion)) sumaSustentacion += sustentacion;
    if (!isNaN(documentacion)) sumaDocumentacion += documentacion;
    if (!isNaN(innovacion)) sumaInnovacion += innovacion;
    if (!isNaN(notaFinal)) sumaNotaFinal += notaFinal;
    
    // Si al menos un valor es válido, contar esta rúbrica
    if (!isNaN(presentacion) || !isNaN(sustentacion) || 
        !isNaN(documentacion) || !isNaN(innovacion) ||
        !isNaN(notaFinal)) {
      cantidadConDatos++;
    }
  });
  
  // Calcular promedios con verificación de división por cero
  const promedioGeneral = cantidadConDatos > 0 ? (sumaNotaFinal / cantidadConDatos) : 0;
    
  // Preparar datos del gráfico
  const chartData = [
    {
      name: 'Presentación',
      valor: cantidadConDatos > 0 ? (sumaPresentacion / cantidadConDatos) : 0,
      color: CHART_COLORS.presentacion,
      peso: '30%'
    },
    {
      name: 'Sustentación',
      valor: cantidadConDatos > 0 ? (sumaSustentacion / cantidadConDatos) : 0,
      color: CHART_COLORS.sustentacion,
      peso: '30%'
    },
    {
      name: 'Documentación',
      valor: cantidadConDatos > 0 ? (sumaDocumentacion / cantidadConDatos) : 0,
      color: CHART_COLORS.documentacion,
      peso: '30%'
    },
    {
      name: 'Innovación',
      valor: cantidadConDatos > 0 ? (sumaInnovacion / cantidadConDatos) : 0,
      color: CHART_COLORS.innovacion,
      peso: '10%'
    }
  ];
  
  return {
    chartData,
    promedioGeneral,
    cantidadDatos: cantidadConDatos,
    hayDatos: cantidadConDatos > 0,
    mensaje: cantidadConDatos > 0 ? null : obtenerMensajeSinDatos(filtros, 'evaluaciones')
  };
};

/**
 * Preparar dashboard completo del administrador
 * @param {Object} datos - Datos del sistema (pueden ser completos o filtrados)
 * @param {Object} estadisticasGlobales - Estadísticas globales calculadas
 * @param {Object} filtros - Filtros aplicados
 * @returns {Object} Dashboard completo preparado
 */
export const prepararDashboardCompleto = (datos, estadisticasGlobales, filtros) => {
  
  // Verificación de seguridad
  if (!datos) {
    return {
      metricasPrincipales: {
        totalEstudiantes: { valor: 0, etiqueta: 'Total de Estudiantes', icono: 'students', color: '#2196F3' },
        tasaAprobacion: { valor: '0.0%', etiqueta: 'Tasa de Aprobación', icono: 'approval', color: '#B71C1C' },
        tasaReprobacion: { valor: '0.0%', etiqueta: 'Tasa de Reprobación', icono: 'failure', color: '#66BB6A' }
      },
      graficos: {
        circulares: [{ tipo: 'estudiantes', titulo: 'Distribución de Estudiantes', datos: { hayDatos: false } }],
        barras: [{ tipo: 'promedios', titulo: 'Calificaciones Promedio por Sección', datos: { hayDatos: false } }]
      },
      filtrosAplicados: filtros,
      fechaGeneracion: new Date().toISOString()
    };
  }
  
  // Usar estadísticas proporcionadas o extraerlas de los datos
  let statsActuales = estadisticasGlobales;
  
  // Si no hay estadísticas globales pero hay datos.estadisticas
  if (!statsActuales && datos.estadisticas) {
    statsActuales = datos.estadisticas;
  }
  
  // Si aún no hay stats, crear un objeto vacío
  if (!statsActuales) {
    statsActuales = {
      totalEstudiantes: 0,
      estudiantesEvaluados: 0,
      estudiantesPendientes: 0,
      estudiantesAprobados: 0,
      estudiantesReprobados: 0,
      tasaCobertura: 0,
      tasaAprobacion: 0,
      tasaReprobacion: 0
    };
  }
  
  // Métricas principales - Total de Estudiantes, Tasa de Aprobación y Tasa de Reprobación
  const metricasPrincipales = {
    totalEstudiantes: {
      valor: statsActuales.totalEstudiantes || 0,
      etiqueta: 'Total de Estudiantes',
      icono: 'students',
      color: '#2196F3'
    },
    tasaAprobacion: {
      valor: `${((statsActuales.tasaAprobacion || 0) * 100).toFixed(1)}%`,
      etiqueta: 'Tasa de Aprobación',
      icono: 'approval',
      color: determinarColorPorValor(statsActuales.tasaAprobacion || 0, 'cobertura')
    },
    tasaReprobacion: {
      valor: `${((statsActuales.tasaReprobacion || 0) * 100).toFixed(1)}%`,
      etiqueta: 'Tasa de Reprobación',
      icono: 'failure',
      color: determinarColorPorValor(statsActuales.tasaReprobacion || 0, 'reprobacion')
    }
  };
  
  // Gráficos principales - Gráfico circular y de barras
  const graficos = {
    circulares: [
      {
        tipo: 'estudiantes',
        titulo: 'Distribución de Estudiantes',
        datos: prepararGraficoCircular(datos, filtros)
      }
    ],
    barras: [
      {
        tipo: 'promedios',
        titulo: 'Calificaciones Promedio por Sección',
        datos: prepararGraficoBarras(datos, filtros)
      }
    ]
  };
    
  return {
    metricasPrincipales,
    graficos,
    filtrosAplicados: filtros,
    fechaGeneracion: new Date().toISOString()
  };
};

// Funciones auxiliares

/**
 * Determinar color basado en el valor y tipo de métrica
 * @param {number} valor - Valor a evaluar
 * @param {string} tipo - Tipo de métrica ('promedio', 'cobertura', 'reprobacion')
 * @returns {string} Color hex
 */
const determinarColorPorValor = (valor, tipo) => {
  if (tipo === 'promedio') {
    if (valor >= THRESHOLDS.notas.sobresaliente) return '#2E7D32';
    if (valor >= THRESHOLDS.notas.excelente) return '#388E3C';
    if (valor >= THRESHOLDS.notas.aprobacion) return '#FF9800';
    return '#F44336';
  } else if (tipo === 'cobertura') {
    if (valor >= THRESHOLDS.cobertura.completa) return '#2E7D32';
    if (valor >= THRESHOLDS.cobertura.alta) return '#66BB6A';
    if (valor >= THRESHOLDS.cobertura.media) return '#FFC107';
    if (valor >= THRESHOLDS.cobertura.baja) return '#F44336';
    return '#B71C1C';
  } else if (tipo === 'reprobacion') {
    // Invertir los colores para la tasa de reprobación
    if (valor >= 0.7) return '#B71C1C'; // Muy alto (rojo oscuro)
    if (valor >= 0.5) return '#F44336'; // Alto (rojo)
    if (valor >= 0.3) return '#FF9800'; // Medio (naranja)
    if (valor >= 0.1) return '#FFC107'; // Bajo (amarillo)
    return '#66BB6A'; // Muy bajo (verde)
  }
  return '#757575';
};

/**
 * Obtener mensaje apropiado cuando no hay datos
 * @param {Object} filtros - Filtros aplicados
 * @param {string} tipo - Tipo específico de datos
 * @returns {string} Mensaje apropiado
 */
const obtenerMensajeSinDatos = (filtros, tipo = 'general') => {
  if (!filtros) {
    return 'No hay datos disponibles';
  }
  
  if (filtros?.carrera && filtros?.semestre && filtros?.materia !== 'TODAS') {
    return `No hay datos de ${tipo} para ${filtros.materia} en ${filtros.carrera} - ${filtros.semestre}° semestre`;
  }
  
  if (filtros?.carrera && filtros?.semestre) {
    return `No hay datos para ${filtros.carrera} - ${filtros.semestre}° semestre`;
  }
  
  return 'No hay datos disponibles para los filtros seleccionados';
};

// Exportación por defecto con las funciones simplificadas
const chartPreparerModule = {
  prepararGraficoCircular,
  prepararGraficoBarras,
  prepararDashboardCompleto
};

export default chartPreparerModule;