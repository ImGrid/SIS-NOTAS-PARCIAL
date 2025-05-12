// src/util/admin-stats/constants.js

// Colores para los gráficos de estadísticas del administrador
export const CHART_COLORS = {
  // Estados de evaluación
  evaluados: '#4CAF50',
  aprobados: '#4CAF50',
  reprobados: '#F44336',
  pendientes: '#FFC107',
  sinGrupo: '#757575',
  sinRubrica: '#9E9E9E',
  
  // Secciones de evaluación
  presentacion: '#2196F3',
  sustentacion: '#FF9800',
  documentacion: '#9C27B0',
  innovacion: '#607D8B',
  
  // Paleta para múltiples docentes (comparativas)
  docentesComparativa: [
    '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#C2185B',
    '#303F9F', '#0097A7', '#455A64', '#5D4037', '#616161',
    '#00796B', '#E64A19', '#1565C0', '#43A047', '#FB8C00'
  ],
  
  // Colores para carreras
  carreras: {
    'Ingeniería de Sistemas': '#2196F3',
    'Sistemas Electronicos': '#F44336'
  },
  
  // Colores para gráficos de cobertura
  cobertura: {
    completa: '#2E7D32',
    alta: '#66BB6A',
    media: '#FFC107',
    baja: '#F44336',
    critica: '#B71C1C'
  }
};

// Configuraciones para diferentes tipos de gráficos
export const CHART_CONFIGS = {
  // Gráfico circular (PieChart)
  pieChart: {
    outerRadius: 80,
    innerRadius: 40,
    height: 300,
    marginTop: 30,
    legendVerticalAlign: 'bottom',
    legendHeight: 36
  },
  
  // Gráfico de barras (BarChart)
  barChart: {
    height: 350,
    margin: { top: 30, right: 30, left: 60, bottom: 80 },
    barGap: 4,
    barCategoryGap: "20%"
  },
  
  // Gráfico de líneas (LineChart)
  lineChart: {
    height: 300,
    margin: { top: 20, right: 30, left: 60, bottom: 60 }
  },
  
  // Gráfico de área (AreaChart)
  areaChart: {
    height: 350,
    margin: { top: 10, right: 30, left: 60, bottom: 80 }
  },
  
  // Mapa de calor
  heatmap: {
    cellHeight: 40,
    cellWidth: 100,
    colorScale: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
  }
};

// Textos y mensajes del sistema
export const MESSAGES = {
  // Mensajes de estado
  loading: 'Cargando datos estadísticos...',
  error: 'Error al cargar los datos de evaluación. Por favor, intente de nuevo más tarde.',
  noData: 'No hay datos disponibles para los filtros seleccionados.',
  
  // Mensajes para casos especiales
  sinDatos: {
    general: "No hay datos de evaluación disponibles para los filtros seleccionados.",
    materiaEspecifica: (materia, docente) => 
      `El docente ${docente} no ha creado grupos ni registrado rúbricas para la materia "${materia}".`,
    semestreVacio: (semestre, carrera) => 
      `No hay evaluaciones registradas para el ${semestre}° semestre de ${carrera}.`,
    docenteSinGrupos: (docente) => 
      `El docente ${docente} no ha creado ningún grupo de evaluación.`,
    materiasSinDocente: (materias) => 
      `Las siguientes materias no tienen docentes asignados: ${materias.join(', ')}.`,
    estudiantesSinGrupo: (cantidad) => 
      `${cantidad} estudiantes no están asignados a ningún grupo de evaluación.`
  },
  
  // Etiquetas de interfaz
  labels: {
    totalEstudiantes: 'Total de Estudiantes',
    estudiantesEvaluados: 'Estudiantes Evaluados',
    estudiantesPendientes: 'Estudiantes Pendientes',
    promedioGeneral: 'Promedio General',
    tasaCobertura: 'Tasa de Cobertura',
    ranking: 'Ranking',
    comparativaDocentes: 'Comparativa por Docente',
    coberturaCarrera: 'Cobertura por Carrera',
    tendenciasSemestre: 'Tendencias por Semestre'
  },
  
  // Tooltips
  tooltips: {
    evaluados: 'Estudiantes con rúbricas completadas',
    pendientes: 'Estudiantes con evaluaciones incompletas',
    sinGrupo: 'Estudiantes sin grupo asignado',
    sinRubrica: 'Grupos sin rúbricas registradas',
    promedioSeccion: (seccion) => `Promedio de calificación en ${seccion}`,
    coberturaDocente: 'Porcentaje de estudiantes evaluados por este docente'
  }
};

// Umbrales y límites estadísticos
export const THRESHOLDS = {
  // Umbrales de calificación
  notas: {
    aprobacion: 5.1,
    excelente: 8.5,
    sobresaliente: 9.5
  },
  
  // Umbrales de cobertura
  cobertura: {
    completa: 1.0,      // 100%
    alta: 0.8,          // 80%
    media: 0.6,         // 60%
    baja: 0.4,          // 40%
    critica: 0.2        // 20%
  },
  
  // Umbrales de alerta
  alertas: {
    coberturaMinima: 0.6,     // Alerta si cobertura < 60%
    promedioMinimo: 5.1,      // Alerta si promedio < 5.1
    materiasCriticas: 0.5,    // Materias con cobertura < 50%
    docentesBajoRendimiento: 0.7  // Docentes con promedio < 7.0
  },
  
  // Límites de visualización
  visualizacion: {
    maxDocentesComparativa: 10,
    maxMateriasGrafico: 15,
    maxSemestresLinea: 5,
    itemsPorPaginaTabla: 20
  }
};

// Formatos de datos
export const FORMATS = {
  // Formato de números
  numero: {
    decimales: 2,
    locale: 'es-BO'
  },
  
  // Formato de porcentajes
  porcentaje: {
    decimales: 1,
    simbolo: '%'
  },
  
  // Formato de fechas
  fecha: {
    corta: 'DD/MM/YYYY',
    completa: 'DD/MM/YYYY HH:mm:ss',
    mes: 'MMMM YYYY'
  },
  
  // Prefijos y sufijos
  unidades: {
    estudiantes: 'estudiantes',
    grupos: 'grupos',
    docentes: 'docentes',
    materias: 'materias'
  }
};

// Estados del sistema y filtros
export const ESTADOS = {
  // Estados de evaluación
  evaluacion: {
    completa: 'COMPLETA',
    pendiente: 'PENDIENTE',
    sinGrupo: 'SIN_GRUPO',
    sinRubrica: 'SIN_RUBRICA'
  },
  
  // Estados de grupos
  grupo: {
    finalizado: 'finalizado',
    pendiente: 'pendiente',
    sinRubrica: 'sin_rubrica'
  },
  
  // Estados de carga
  carga: {
    inicial: 'INICIAL',
    cargando: 'CARGANDO',
    exito: 'EXITO',
    error: 'ERROR'
  }
};

// Configuraciones de exportación
export const EXPORT_CONFIGS = {
  pdf: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: 30,
      bottom: 30,
      left: 20,
      right: 20
    },
    fontSize: {
      title: 18,
      subtitle: 14,
      body: 12,
      small: 10
    }
  },
  
  excel: {
    sheetName: 'Estadisticas',
    autoWidth: true,
    headers: {
      backgroundColor: '#2c3e50',
      fontColor: '#ffffff',
      fontSize: 12
    }
  }
};

// Clasificaciones y categorías
export const CATEGORIAS = {
  // Niveles de rendimiento
  rendimiento: [
    { min: 9.5, max: 10, label: 'SOBRESALIENTE', color: '#2E7D32' },
    { min: 8.5, max: 9.4, label: 'EXCELENTE', color: '#388E3C' },
    { min: 7.5, max: 8.4, label: 'MUY BUENO', color: '#43A047' },
    { min: 6.5, max: 7.4, label: 'BUENO', color: '#4CAF50' },
    { min: 5.5, max: 6.4, label: 'SATISFACTORIO', color: '#66BB6A' },
    { min: 4.5, max: 5.4, label: 'ACEPTABLE', color: '#FF9800' },
    { min: 3.5, max: 4.4, label: 'BÁSICAMENTE ACEPTABLE', color: '#FF5722' },
    { min: 2.5, max: 3.4, label: 'INSUFICIENTE', color: '#F44336' },
    { min: 1.5, max: 2.4, label: 'DEFICIENTE', color: '#E53935' },
    { min: 0, max: 1.4, label: 'MUY DEFICIENTE', color: '#B71C1C' }
  ],
  
  // Niveles de cobertura
  coberturaLabels: {
    1.0: 'Completa',
    0.8: 'Alta',
    0.6: 'Media',
    0.4: 'Baja',
    0.2: 'Crítica',
    0: 'Sin Datos'
  }
};

// Exportar todo como objeto por defecto también
export default {
  CHART_COLORS,
  CHART_CONFIGS,
  MESSAGES,
  THRESHOLDS,
  FORMATS,
  ESTADOS,
  EXPORT_CONFIGS,
  CATEGORIAS
};