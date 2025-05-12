import api from './api';

// Validación de entrada
const validateFiltros = (filtros) => {
  if (filtros && typeof filtros !== 'object') {
    throw new Error('Los filtros deben ser un objeto');
  }
  
  // Validar semestre si está presente
  if (filtros?.semestre) {
    const semestreNum = parseInt(filtros.semestre);
    if (isNaN(semestreNum) || semestreNum < 1 || semestreNum > 10) {
      throw new Error('El semestre debe ser un número válido entre 1 y 10');
    }
  }
  
  // Validar carrera y materia si están presentes
  if (filtros?.carrera && typeof filtros.carrera !== 'string') {
    throw new Error('La carrera debe ser una cadena de texto');
  }
  
  if (filtros?.materia && typeof filtros.materia !== 'string') {
    throw new Error('La materia debe ser una cadena de texto');
  }
  
  if (filtros?.estado && typeof filtros.estado !== 'string') {
    throw new Error('El estado debe ser una cadena de texto');
  }
};

// Función helper para construir query params
const buildQueryParams = (filtros = {}) => {
  const params = {};
  
  if (filtros.carrera) params.carrera = filtros.carrera;
  if (filtros.semestre) params.semestre = filtros.semestre;
  if (filtros.materia) params.materia = filtros.materia;
  if (filtros.estado) params.estado = filtros.estado;
  
  return params;
};

/**
 * Obtener dashboard completo con todas las estadísticas
 * @param {Object} filtros - Filtros opcionales { carrera, semestre, materia }
 * @returns {Promise<Object>} Dashboard completo con estadísticas
 */
export const getDashboard = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/dashboard', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getDashboard:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas por grupos para evitar duplicados
 * @param {Object} filtros - Filtros opcionales { carrera, semestre, materia }
 * @returns {Promise<Array>} Estadísticas por grupos
 */
export const getEstadisticasPorGrupos = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/grupos', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getEstadisticasPorGrupos:', error);
    throw error;
  }
};

/**
 * Obtener estudiantes sin asignar a ningún grupo
 * @param {Object} filtros - Filtros opcionales { carrera, semestre }
 * @returns {Promise<Array>} Estudiantes sin grupo asignado
 */
export const getEstudiantesSinGrupo = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/sin-grupo', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantesSinGrupo:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas por docente
 * @param {Object} filtros - Filtros opcionales { carrera, semestre, materia }
 * @returns {Promise<Array>} Estadísticas por docente
 */
export const getEstadisticasPorDocente = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/docentes', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getEstadisticasPorDocente:', error);
    throw error;
  }
};

/**
 * Obtener detalle completo de estudiantes
 * @param {Object} filtros - Filtros opcionales { carrera, semestre, materia, estado }
 * @returns {Promise<Array>} Detalle de estudiantes con filtros aplicados
 */
export const getDetalleEstudiantes = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/estudiantes', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getDetalleEstudiantes:', error);
    throw error;
  }
};

/**
 * Obtener cobertura de evaluaciones por materia
 * @param {Object} filtros - Filtros opcionales { carrera, semestre }
 * @returns {Promise<Array>} Cobertura por materia
 */
export const getCoberturaPorMateria = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/cobertura', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getCoberturaPorMateria:', error);
    throw error;
  }
};

/**
 * Obtener resumen ejecutivo completo
 * @param {Object} filtros - Filtros opcionales { carrera, semestre }
 * @returns {Promise<Object>} Resumen ejecutivo con métricas clave
 */
export const getResumenEjecutivo = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    const params = buildQueryParams(filtros);
    const response = await api.get('/api/estadisticas/resumen', { params });
    
    return response.data;
  } catch (error) {
    console.error('Error en getResumenEjecutivo:', error);
    throw error;
  }
};

/**
 * Obtener opciones de filtros disponibles
 * @returns {Promise<Object>} Opciones disponibles para filtros
 */
export const getFiltrosDisponibles = async () => {
  try {
    const response = await api.get('/api/estadisticas/filtros-disponibles');
    return response.data;
  } catch (error) {
    console.error('Error en getFiltrosDisponibles:', error);
    throw error;
  }
};

/**
 * Obtener documentación de la API de estadísticas
 * @returns {Promise<Object>} Documentación de endpoints disponibles
 */
export const getDocumentacion = async () => {
  try {
    const response = await api.get('/api/estadisticas/docs');
    return response.data;
  } catch (error) {
    console.error('Error en getDocumentacion:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas completas en paralelo para dashboard principal
 * @param {Object} filtros - Filtros opcionales
 * @returns {Promise<Object>} Objeto con todas las estadísticas necesarias
 */
export const getEstadisticasCompletas = async (filtros = {}) => {
  try {
    validateFiltros(filtros);
    
    // Hacer peticiones en paralelo para optimizar performance
    const [
      dashboard,
      estadisticasGrupos,
      estudiantesSinGrupo,
      estadisticasDocentes,
      coberturaMaterias
    ] = await Promise.all([
      getDashboard(filtros),
      getEstadisticasPorGrupos(filtros),
      getEstudiantesSinGrupo(filtros),
      getEstadisticasPorDocente(filtros),
      getCoberturaPorMateria(filtros)
    ]);
    
    return {
      dashboard,
      estadisticasGrupos,
      estudiantesSinGrupo,
      estadisticasDocentes,
      coberturaMaterias,
      filtrosAplicados: filtros,
      fechaConsulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en getEstadisticasCompletas:', error);
    throw error;
  }
};

/**
 * Exportar datos de estadísticas en formato CSV
 * @param {Object} datos - Datos a exportar
 * @param {string} tipo - Tipo de datos ('estudiantes', 'grupos', 'docentes')
 * @returns {string} Datos en formato CSV
 */
export const exportarACSV = (datos, tipo = 'estudiantes') => {
  try {
    if (!Array.isArray(datos) || datos.length === 0) {
      throw new Error('No hay datos para exportar');
    }
    
    let headers = [];
    let rows = [];
    
    switch (tipo) {
      case 'estudiantes':
        headers = ['Código', 'Nombre', 'Apellido', 'Carrera', 'Semestre', 'Grupo', 'Estado', 'Nota Final'];
        rows = datos.map(est => [
          est.codigo || '',
          est.nombre || '',
          est.apellido || '',
          est.carrera || '',
          est.semestre || '',
          est.nombre_proyecto || 'Sin grupo',
          est.estado || 'PENDIENTE',
          est.nota_final || ''
        ]);
        break;
        
      case 'grupos':
        headers = ['Nombre Proyecto', 'Carrera', 'Semestre', 'Materia', 'Total Estudiantes', 'Aprobados', 'Reprobados'];
        rows = datos.map(grupo => [
          grupo.nombre_proyecto || '',
          grupo.carrera || '',
          grupo.semestre || '',
          grupo.materia || '',
          grupo.total_estudiantes || 0,
          grupo.aprobados || 0,
          grupo.reprobados || 0
        ]);
        break;
        
      case 'docentes':
        headers = ['Docente', 'Total Grupos', 'Total Estudiantes', 'Aprobados', 'Reprobados', 'Promedio Notas'];
        rows = datos.map(doc => [
          doc.nombre_completo || '',
          doc.total_grupos || 0,
          doc.total_estudiantes || 0,
          doc.aprobados || 0,
          doc.reprobados || 0,
          doc.promedio_notas ? Number(doc.promedio_notas).toFixed(2) : ''
        ]);
        break;
        
      default:
        throw new Error('Tipo de exportación no válido');
    }
    
    // Construir CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    return csv;
  } catch (error) {
    console.error('Error en exportarACSV:', error);
    throw error;
  }
};

/**
 * Descargar archivo CSV
 * @param {string} contenidoCSV - Contenido del archivo CSV
 * @param {string} nombreArchivo - Nombre del archivo a descargar
 */
export const descargarCSV = (contenidoCSV, nombreArchivo = 'estadisticas.csv') => {
  try {
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = nombreArchivo;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error en descargarCSV:', error);
    throw error;
  }
};

export default {
  getDashboard,
  getEstadisticasPorGrupos,
  getEstudiantesSinGrupo,
  getEstadisticasPorDocente,
  getDetalleEstudiantes,
  getCoberturaPorMateria,
  getResumenEjecutivo,
  getFiltrosDisponibles,
  getDocumentacion,
  getEstadisticasCompletas,
  exportarACSV,
  descargarCSV
};