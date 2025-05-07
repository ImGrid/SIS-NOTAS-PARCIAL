/**
 * Utilidades para el cálculo de calificaciones en el sistema de evaluación
 * Basado en la escala de evaluación institucional
 */

// Tabla de valores para la escala de evaluación
export const ESCALA_EVALUACION = {
  SOBRESALIENTE: { valor: 10, texto: 'SOBRESALIENTE' },
  EXCELENTE: { valor: 9, texto: 'EXCELENTE' },
  MUY_BUENO: { valor: 8, texto: 'MUY BUENO' },
  BUENO: { valor: 7, texto: 'BUENO' },
  SATISFACTORIO: { valor: 6, texto: 'SATISFACTORIO' },
  ACEPTABLE: { valor: 5, texto: 'ACEPTABLE' },
  BASICAMENTE_ACEPTABLE: { valor: 4, texto: 'BÁSICAMENTE ACEPTABLE' },
  INSUFICIENTE: { valor: 3, texto: 'INSUFICIENTE' },
  DEFICIENTE: { valor: 2, texto: 'DEFICIENTE' },
  MUY_DEFICIENTE: { valor: 1, texto: 'MUY DEFICIENTE' }
};

// Mapa de colores para cada nivel de la escala de evaluación
export const COLORES_ESCALA = {
  SOBRESALIENTE: '#93c47d', // Verde
  EXCELENTE: '#b6d7a8', // Verde claro
  MUY_BUENO: '#ffe599', // Amarillo
  BUENO: '#a4c2f4', // Azul claro
  SATISFACTORIO: '#45818e', // Azul verdoso
  ACEPTABLE: '#f1c232', // Naranja
  BASICAMENTE_ACEPTABLE: '#ffff00', // Amarillo intenso
  INSUFICIENTE: '#cc0000', // Rojo
  DEFICIENTE: '#990000', // Rojo oscuro
  MUY_DEFICIENTE: '#660000' // Rojo muy oscuro
};

// Estructura de indicadores y sus criterios con ponderaciones
export const ESTRUCTURA_RUBRICA = {
  presentacion: {
    nombre: 'PRESENTACIÓN',
    ponderacion: 0.30, // 30%
    criterios: [
      // Grupo: PRESENTACIÓN ORAL 20%
      { id: 'claridad_exposicion', nombre: 'CLARIDAD DE LA EXPOSICIÓN', peso: 0.10, grupo: 'presentacion_oral' },
      { id: 'uso_herramientas_visuales', nombre: 'USO DE HERRAMIENTAS VISUALES', peso: 0.05, grupo: 'presentacion_oral' },
      { id: 'distribucion_tiempo', nombre: 'DISTRIBUCIÓN DE TIEMPO', peso: 0.05, grupo: 'presentacion_oral' },
      // Grupo: TRABAJO EN EQUIPO 10%
      { id: 'equidad_participacion', nombre: 'EQUIDAD EN LA PARTICIPACIÓN', peso: 0.05, grupo: 'trabajo_equipo' },
      { id: 'coordinacion_cohesion', nombre: 'COORDINACIÓN Y COHESIÓN GRUPAL', peso: 0.05, grupo: 'trabajo_equipo' }
    ],
    grupos: {
      presentacion_oral: { nombre: 'PRESENTACIÓN ORAL', peso_total: 0.20 },
      trabajo_equipo: { nombre: 'TRABAJO EN EQUIPO', peso_total: 0.10 }
    }
  },
  sustentacion: {
    nombre: 'SUSTENTACIÓN',
    ponderacion: 0.30, // 30%
    criterios: [
      // Grupo: DOMINIO DEL CONTENIDO 20%
      { id: 'conocimiento_profundo', nombre: 'CONOCIMIENTO PROFUNDO DEL TEMA', peso: 0.10, grupo: 'dominio_contenido' },
      { id: 'respuestas_preguntas', nombre: 'RESPUESTAS A PREGUNTAS DEL DOCENTE', peso: 0.10, grupo: 'dominio_contenido' },
      { id: 'capacidad_analisis', nombre: 'CAPACIDAD DE ANÁLISIS', peso: 0.05 },
      { id: 'desarrollo_soluciones', nombre: 'DESARROLLO DE SOLUCIONES', peso: 0.05 }
    ],
    grupos: {
      dominio_contenido: { nombre: 'DOMINIO DEL CONTENIDO', peso_total: 0.20 }
    }
  },
  documentacion: {
    nombre: 'DOCUMENTACIÓN',
    ponderacion: 0.30, // 30%
    criterios: [
      // Grupo: CALIDAD DE INFORME 10%
      { id: 'estructura_documento', nombre: 'ESTRUCTURA DEL DOCUMENTO', peso: 0.05, grupo: 'calidad_informe' },
      { id: 'claridad_precision', nombre: 'CLARIDAD Y PRECISIÓN', peso: 0.05, grupo: 'calidad_informe' },
      // Grupo: CONTENIDO TÉCNICO 20%
      { id: 'complejidad_diseno', nombre: 'COMPLEJIDAD DE DISEÑO', peso: 0.05, grupo: 'contenido_tecnico' },
      { id: 'justificacion_tecnica', nombre: 'JUSTIFICACIÓN TÉCNICA', peso: 0.05, grupo: 'contenido_tecnico' },
      { id: 'resultados_claros', nombre: 'RESULTADOS CLAROS Y CONCISOS', peso: 0.05, grupo: 'contenido_tecnico' },
      { id: 'interpretacion_resultados', nombre: 'INTERPRETACIÓN DE RESULTADOS', peso: 0.05, grupo: 'contenido_tecnico' }
    ],
    grupos: {
      calidad_informe: { nombre: 'CALIDAD DE INFORME', peso_total: 0.10 },
      contenido_tecnico: { nombre: 'CONTENIDO TÉCNICO', peso_total: 0.20 }
    }
  },
  innovacion: {
    nombre: 'INNOVACIÓN',
    ponderacion: 0.10, // 10%
    criterios: [
      { id: 'nivel_creatividad', nombre: 'NIVEL DE CREATIVIDAD EN LA SOLUCIÓN', peso: 0.05 },
      { id: 'aplicabilidad_practica', nombre: 'APLICABILIDAD PRÁCTICA', peso: 0.05 }
    ]
  }
};

// Lista de criterios que requieren aplicar la división por 2
const CRITERIOS_CON_DIVISION = [];

/**
 * Convierte una calificación cualitativa a su valor numérico
 * @param {string} calificacion - Calificación cualitativa (ej: "SOBRESALIENTE", "EXCELENTE", etc.)
 * @returns {number} - Valor numérico correspondiente
 */
export const convertirCalificacionANumero = (calificacion) => {
  if (!calificacion) return 0;
  
  const mapeoCalificaciones = {
    'SOBRESALIENTE': 10,
    'EXCELENTE': 9,
    'MUY BUENO': 8,
    'BUENO': 7,
    'SATISFACTORIO': 6,
    'ACEPTABLE': 5,
    'BÁSICAMENTE ACEPTABLE': 4,
    'BASICAMENTE ACEPTABLE': 4,
    'INSUFICIENTE': 3,
    'DEFICIENTE': 2,
    'MUY DEFICIENTE': 1
  };
  
  const calificacionNormalizada = calificacion.toUpperCase().trim();
  return mapeoCalificaciones[calificacionNormalizada] || 0;
};

/**
 * Convierte un valor numérico a su calificación cualitativa correspondiente
 * @param {number} valor - Valor numérico (1-10)
 * @returns {string} - Calificación cualitativa
 */
export const convertirNumeroACalificacion = (valor) => {
  if (valor === undefined || valor === null) return '';
  
  const valorRedondeado = Math.round(valor);
  const mapeoValores = {
    10: ESCALA_EVALUACION.SOBRESALIENTE.texto,
    9: ESCALA_EVALUACION.EXCELENTE.texto,
    8: ESCALA_EVALUACION.MUY_BUENO.texto,
    7: ESCALA_EVALUACION.BUENO.texto,
    6: ESCALA_EVALUACION.SATISFACTORIO.texto,
    5: ESCALA_EVALUACION.ACEPTABLE.texto,
    4: ESCALA_EVALUACION.BASICAMENTE_ACEPTABLE.texto,
    3: ESCALA_EVALUACION.INSUFICIENTE.texto,
    2: ESCALA_EVALUACION.DEFICIENTE.texto,
    1: ESCALA_EVALUACION.MUY_DEFICIENTE.texto
  };
  
  return mapeoValores[valorRedondeado] || '';
};

/**
 * Obtiene el color correspondiente a una calificación
 * @param {string} calificacion - Calificación cualitativa
 * @returns {string} - Código de color hexadecimal
 */
export const obtenerColorCalificacion = (calificacion) => {
  if (!calificacion) return '#ffffff';
  
  const calificacionNormalizada = calificacion.toUpperCase().trim();
  
  const mapeoColores = {
    'SOBRESALIENTE': COLORES_ESCALA.SOBRESALIENTE,
    'EXCELENTE': COLORES_ESCALA.EXCELENTE,
    'MUY BUENO': COLORES_ESCALA.MUY_BUENO,
    'BUENO': COLORES_ESCALA.BUENO,
    'SATISFACTORIO': COLORES_ESCALA.SATISFACTORIO,
    'ACEPTABLE': COLORES_ESCALA.ACEPTABLE,
    'BÁSICAMENTE ACEPTABLE': COLORES_ESCALA.BASICAMENTE_ACEPTABLE,
    'BASICAMENTE ACEPTABLE': COLORES_ESCALA.BASICAMENTE_ACEPTABLE,
    'INSUFICIENTE': COLORES_ESCALA.INSUFICIENTE,
    'DEFICIENTE': COLORES_ESCALA.DEFICIENTE,
    'MUY DEFICIENTE': COLORES_ESCALA.MUY_DEFICIENTE
  };
  
  return mapeoColores[calificacionNormalizada] || '#ffffff';
};

/**
 * Determina si se debe aplicar división por 2 para un criterio específico
 * @param {string} idCriterio - ID del criterio
 * @returns {boolean} - true si se debe aplicar división, false en caso contrario
 */
export const debeAplicarDivision = (idCriterio) => {
  return CRITERIOS_CON_DIVISION.includes(idCriterio);
};

/**
 * Calcula la calificación numérica para un criterio específico (ajustada por peso)
 * @param {string} calificacion - Calificación cualitativa
 * @param {number} peso - Peso del criterio (entre 0 y 1)
 * @param {string} idCriterio - ID del criterio (opcional)
 * @returns {number} - Calificación numérica ponderada
 */
export const calcularPuntajeCriterio = (calificacion, peso, idCriterio = null) => {
  if (!calificacion || !peso) return 0;
  
  const valor = convertirCalificacionANumero(calificacion);
  
  // Aplica la división por 2 si el criterio está en la lista de criterios con división
  const aplicarDivision = idCriterio ? debeAplicarDivision(idCriterio) : false;
  const valorAjustado = aplicarDivision ? valor / 2 : valor;
  
  return valorAjustado * peso;
};

/**
 * Calcula la calificación para un grupo específico de criterios
 * @param {Object} calificaciones - Objeto con las calificaciones cualitativas por criterio
 * @param {Object} seccion - Sección de la rúbrica
 * @param {string} nombreGrupo - Nombre del grupo
 * @returns {number} - Calificación numérica del grupo (0-10)
 */
export const calcularCalificacionGrupo = (calificaciones, seccion, nombreGrupo) => {
  if (!calificaciones || !seccion || !nombreGrupo) return 0;
  
  let puntosTotales = 0;
  let pesoTotal = 0;
  
  for (const criterio of seccion.criterios) {
    if (criterio.grupo === nombreGrupo) {
      const calificacion = calificaciones[criterio.id];
      
      if (calificacion) {
        puntosTotales += calcularPuntajeCriterio(calificacion, criterio.peso, criterio.id);
        pesoTotal += criterio.peso;
      }
    }
  }
  
  if (pesoTotal === 0) return 0;
  
  // Normalizar a escala 0-10
  const calificacionNormalizada = puntosTotales / pesoTotal;
  
  // Redondear a 2 decimales
  return Math.round(calificacionNormalizada * 100) / 100;
};

/**
 * Calcula la calificación para una sección completa de la rúbrica
 * @param {Object} calificaciones - Objeto con las calificaciones cualitativas por criterio
 * @param {Object} seccion - Sección de la rúbrica con sus criterios y pesos
 * @returns {number} - Calificación numérica de la sección (0-10)
 */
export const calcularCalificacionSeccion = (calificaciones, seccion) => {
  if (!calificaciones || !seccion) return 0;
  
  let puntosTotales = 0;
  let pesoTotal = 0;
  
  for (const criterio of seccion.criterios) {
    const calificacion = calificaciones[criterio.id];
    
    if (calificacion) {
      puntosTotales += calcularPuntajeCriterio(calificacion, criterio.peso, criterio.id);
      pesoTotal += criterio.peso;
    }
  }
  
  if (pesoTotal === 0) return 0;
  
  // Normalizar a escala 0-10
  const calificacionNormalizada = (puntosTotales / pesoTotal) ;
  
  // Redondear a 2 decimales
  return Math.round(calificacionNormalizada * 100) / 100;
};

/**
 * Calcula calificaciones estructuradas por sección y grupo
 * @param {Object} calificaciones - Objeto con las calificaciones cualitativas por criterio
 * @returns {Object} - Objeto con calificaciones estructuradas
 */
export const calcularCalificacionesEstructuradas = (calificaciones) => {
  if (!calificaciones) return {};
  
  const resultado = {};
  
  for (const [seccionKey, seccion] of Object.entries(ESTRUCTURA_RUBRICA)) {
    resultado[seccionKey] = {
      nombre: seccion.nombre,
      calificacion: calcularCalificacionSeccion(calificaciones, seccion),
      grupos: {}
    };
    
    // Calcular calificaciones por grupo si existen
    if (seccion.grupos) {
      for (const [grupoKey, grupo] of Object.entries(seccion.grupos)) {
        resultado[seccionKey].grupos[grupoKey] = {
          nombre: grupo.nombre,
          calificacion: calcularCalificacionGrupo(calificaciones, seccion, grupoKey)
        };
      }
    }
  }
  
  return resultado;
};

/**
 * Calcula la nota final basada en las calificaciones de cada sección
 * @param {Object|number} calificacionesSecciones - Objeto con calificaciones por sección o calificación de presentación
 * @param {number} [sustentacion] - Calificación de sustentación
 * @param {number} [documentacion] - Calificación de documentación
 * @param {number} [innovacion] - Calificación de innovación
 * @returns {number} - Nota final (0-10)
 */
export const calcularNotaFinal = (calificacionesSecciones, sustentacion, documentacion, innovacion) => {
  // Si recibimos un objeto con estructura compleja
  if (typeof calificacionesSecciones === 'object' && !Array.isArray(calificacionesSecciones)) {
    let notaFinal = 0;
    let pesoTotal = 0;
    
    for (const [seccionKey, seccion] of Object.entries(ESTRUCTURA_RUBRICA)) {
      const calificacion = calificacionesSecciones[seccionKey] ? 
                           (calificacionesSecciones[seccionKey].calificacion || calificacionesSecciones[seccionKey]) : 
                           0;
      
      if (calificacion) {
        notaFinal += parseFloat(calificacion) * seccion.ponderacion;
        pesoTotal += seccion.ponderacion;
      }
    }
    
    if (pesoTotal === 0) return 0;
    
    // Normalizar si el peso total no es 1
    if (pesoTotal !== 1) {
      notaFinal = notaFinal / pesoTotal;
    }
    
    // Redondear a 2 decimales
    return Math.round(notaFinal * 100) / 100;
  } 
  // Si recibimos parámetros individuales (compatibilidad con versión anterior)
  else if (sustentacion !== undefined || documentacion !== undefined || innovacion !== undefined) {
    const presentacion = calificacionesSecciones || 0;
    const sustentacionVal = sustentacion || 0;
    const documentacionVal = documentacion || 0;
    const innovacionVal = innovacion || 0;
    
    const ponderaciones = {
      presentacion: ESTRUCTURA_RUBRICA.presentacion.ponderacion,
      sustentacion: ESTRUCTURA_RUBRICA.sustentacion.ponderacion,
      documentacion: ESTRUCTURA_RUBRICA.documentacion.ponderacion,
      innovacion: ESTRUCTURA_RUBRICA.innovacion.ponderacion
    };
    
    const notaFinal = 
      (parseFloat(presentacion) * ponderaciones.presentacion) +
      (parseFloat(sustentacionVal) * ponderaciones.sustentacion) +
      (parseFloat(documentacionVal) * ponderaciones.documentacion) +
      (parseFloat(innovacionVal) * ponderaciones.innovacion);
      
    // Redondear a 2 decimales
    return Math.round(notaFinal * 100) / 100;
  }
  
  return 0;
};

/**
 * Determina el resultado final de aprobación/reprobación
 * @param {number} notaFinal - Nota final (0-10)
 * @returns {string} - "APROBADO" o "REPROBADO"
 */
export const determinarResultadoFinal = (notaFinal) => {
  return notaFinal >= 5.1 ? "APROBADO" : "REPROBADO";
};

/**
 * Inicializa un objeto vacío con todos los criterios de evaluación
 * @returns {Object} - Objeto con todos los campos de criterios inicializados
 */
export const inicializarRubricaVacia = () => {
  const calificaciones = {};
  
  // Inicializar todos los criterios con valores vacíos
  for (const seccion of Object.values(ESTRUCTURA_RUBRICA)) {
    for (const criterio of seccion.criterios) {
      calificaciones[criterio.id] = '';
    }
  }
  
  return calificaciones;
};

/**
 * Valida si una rúbrica tiene todos los criterios obligatorios evaluados
 * @param {Object} calificaciones - Objeto con las calificaciones por criterio
 * @returns {boolean} - true si la rúbrica está completa, false en caso contrario
 */
export const validarRubricaCompleta = (calificaciones) => {
  if (!calificaciones) return false;
  
  for (const seccion of Object.values(ESTRUCTURA_RUBRICA)) {
    for (const criterio of seccion.criterios) {
      if (!calificaciones[criterio.id] || calificaciones[criterio.id] === '') {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Obtiene una lista de criterios faltantes en una rúbrica
 * @param {Object} calificaciones - Objeto con las calificaciones por criterio
 * @returns {Array} - Array de objetos con información de criterios faltantes
 */
export const obtenerCriteriosFaltantes = (calificaciones) => {
  if (!calificaciones) return [];
  
  const faltantes = [];
  
  for (const seccion of Object.values(ESTRUCTURA_RUBRICA)) {
    for (const criterio of seccion.criterios) {
      if (!calificaciones[criterio.id] || calificaciones[criterio.id] === '') {
        faltantes.push({
          id: criterio.id,
          nombre: criterio.nombre,
          seccion: seccion.nombre
        });
      }
    }
  }
  
  return faltantes;
};

export default {
  ESCALA_EVALUACION,
  COLORES_ESCALA,
  ESTRUCTURA_RUBRICA,
  convertirCalificacionANumero,
  convertirNumeroACalificacion,
  obtenerColorCalificacion,
  debeAplicarDivision,
  calcularPuntajeCriterio,
  calcularCalificacionGrupo,
  calcularCalificacionSeccion,
  calcularCalificacionesEstructuradas,
  calcularNotaFinal,
  determinarResultadoFinal,
  inicializarRubricaVacia,
  validarRubricaCompleta,
  obtenerCriteriosFaltantes
};