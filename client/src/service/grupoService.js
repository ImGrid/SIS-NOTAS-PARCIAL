import api from './api';
import borradorService from './borradorService';
import informeService from './informeService';

// Función para obtener información del docente actual desde el token
const getDocenteIdFromToken = () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No hay sesión activa');
  }
  
  // Obtener el objeto usuario que se guarda al iniciar sesión
  const usuarioString = sessionStorage.getItem('usuario');
  if (!usuarioString) {
    throw new Error('Datos de usuario no encontrados');
  }
  
  try {
    const usuario = JSON.parse(usuarioString);
    return usuario.id;
  } catch (error) {
    throw new Error('Error al obtener información del usuario');
  }
};

// ===== FUNCIONES DE VALIDACIÓN =====

/**
 * Valida y normaliza el campo paralelo según la carrera
 */
export const validarYNormalizarParalelo = (carrera, paralelo) => {
  if (carrera === 'Ciencias Básicas') {
    // Para Ciencias Básicas, el paralelo es obligatorio y debe ser A-G
    if (!paralelo || !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      throw new Error('Para Ciencias Básicas el paralelo es obligatorio y debe ser A, B, C, D, E, F o G');
    }
    return paralelo.toUpperCase();
  } else {
    // Para otras carreras, siempre usar 'A'
    return 'A';
  }
};

/**
 * Valida los datos del grupo incluyendo la lógica de paralelos
 */
export const validarDatosGrupo = (datos) => {
  const { nombre_proyecto, carrera, semestre, docente_id, materia, paralelo } = datos;
  
  // Validar campos básicos
  if (!nombre_proyecto || !carrera || !semestre || !docente_id || !materia) {
    throw new Error('Todos los campos básicos son obligatorios: nombre_proyecto, carrera, semestre, docente_id, materia');
  }
  
  // Validar que el semestre sea apropiado para la carrera
  const semestreNum = parseInt(semestre);
  if (carrera === 'Ciencias Básicas') {
    if (semestreNum !== 1 && semestreNum !== 2) {
      throw new Error('Ciencias Básicas solo puede tener semestres 1 o 2');
    }
  } else {
    if (semestreNum < 3 || semestreNum > 10) {
      throw new Error('Las carreras regulares deben tener semestres entre 3 y 10');
    }
  }
  
  // Validar y normalizar paralelo
  const paraleloValidado = validarYNormalizarParalelo(carrera, paralelo);
  
  return {
    ...datos,
    paralelo: paraleloValidado
  };
};

const validateId = (id) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new Error('ID inválido');
  }
};

const validateDocenteId = (docenteId) => {
  if (!docenteId || (typeof docenteId !== 'number' && typeof docenteId !== 'string')) {
    throw new Error('ID de docente inválido');
  }
};

const validateCarrera = (carrera) => {
  if (!carrera || typeof carrera !== 'string') {
    throw new Error('Carrera inválida o vacía');
  }
};

const validateSemestre = (semestre) => {
  if (!semestre || (typeof semestre !== 'number' && typeof semestre !== 'string')) {
    throw new Error('Semestre inválido o vacío');
  }
};

const validateMateria = (materia) => {
  if (!materia || typeof materia !== 'string') {
    throw new Error('Materia inválida o vacía');
  }
};

const validateParalelo = (paralelo) => {
  if (!paralelo || typeof paralelo !== 'string') {
    throw new Error('Paralelo inválido o vacío');
  }
};

// ===== FUNCIONES BÁSICAS CRUD =====

// Función para obtener los grupos del docente logueado
export const getMisGrupos = async () => {
  try {
    const docenteId = getDocenteIdFromToken();
    
    const token = sessionStorage.getItem('token');
    const response = await api.get(`/api/grupos/docente/${docenteId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getMisGrupos:', error);
    throw error;
  }
};

// Función para obtener todos los grupos con paginación y filtrado opcional
export const getGrupos = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get('/api/grupos/get', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getGrupos:', error);
    throw error;
  }
};

// Función para obtener un grupo por su ID con validación
export const getGrupoPorId = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/grupos/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGrupoPorId:', error);
    throw error;
  }
};

// Función para crear un nuevo grupo asignando automáticamente al docente actual
export const createGrupo = async (grupoData) => {
  try {
    // PRIMERO obtener el docente_id
    const docenteId = getDocenteIdFromToken();
    const token = sessionStorage.getItem('token');
    
    // DESPUÉS agregar el docente_id a los datos
    const grupoCompleto = {
      ...grupoData,
      docente_id: docenteId
    };
    
    // FINALMENTE validar los datos completos
    const datosValidados = validarDatosGrupo(grupoCompleto);
    
    const response = await api.post('/api/grupos/create', datosValidados, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en createGrupo:', error);
    throw error;
  }
};

// Función para actualizar un grupo existente con validación
export const updateGrupo = async (id, grupoData) => {
  try {
    validateId(id);
    
    // Validar y normalizar datos
    const datosValidados = validarDatosGrupo(grupoData);
    
    const docenteId = getDocenteIdFromToken();
    const token = sessionStorage.getItem('token');
    
    const grupoCompleto = {
      ...datosValidados,
      docente_id: docenteId
    };
    
    const response = await api.put(`/api/grupos/update/${id}`, grupoCompleto, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en updateGrupo:', error);
    throw error;
  }
};

export const deleteGrupo = async (id) => {
  try {
    validateId(id);
    
    // 1. Intentar eliminar informes y rúbricas si existen
    try {
      await informeService.eliminarRubricasGrupo(id);
    } catch (error) {
      // Continuar aunque falle la eliminación de informes
    }
    
    try {
      const borradores = await api.get('/api/borradores/get');
      
      const borradoresDelGrupo = borradores.data.filter(
        borrador => borrador.grupo_id && borrador.grupo_id.toString() === id.toString()
      );
      
      for (const borrador of borradoresDelGrupo) {
        await api.delete(`/api/borradores/delete/${borrador.id}`);
      }
      
      const docenteId = getDocenteIdFromToken();
      await borradorService.eliminarBorradorPorDocenteYGrupo(docenteId, id);
      
    } catch (error) {
      // Continuar aunque falle la eliminación de borradores
    }
    
    const token = sessionStorage.getItem('token');
    const response = await api.delete(`/api/grupos/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en deleteGrupo:', error);
    throw error;
  }
};

// ===== FUNCIONES DE CONSULTA BÁSICAS =====

// Función para obtener grupos por ID de docente
export const getGruposPorDocenteId = async (docenteId) => {
  try {
    validateDocenteId(docenteId);
    const response = await api.get(`/api/grupos/docente/${docenteId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorDocenteId:', error);
    throw error;
  }
};

// Función para obtener grupos por carrera
export const getGruposPorCarrera = async (carrera) => {
  try {
    validateCarrera(carrera);
    const response = await api.get(`/api/grupos/carrera/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorCarrera:', error);
    throw error;
  }
};

// Función para obtener grupos por semestre
export const getGruposPorSemestre = async (semestre) => {
  try {
    validateSemestre(semestre);
    const response = await api.get(`/api/grupos/semestre/${semestre}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorSemestre:', error);
    throw error;
  }
};

export const getGruposPorMateria = async (materia) => {
  try {
    validateMateria(materia);
    const response = await api.get(`/api/grupos/materia/${materia}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorMateria:', error);
    throw error;
  }
};

// ===== NUEVAS FUNCIONES PARA PARALELOS =====

/**
 * NUEVA FUNCIÓN: Obtener grupos por carrera y paralelo
 * Especialmente útil para Ciencias Básicas
 */
export const getGruposPorCarreraYParalelo = async (carrera, paralelo) => {
  try {
    validateCarrera(carrera);
    validateParalelo(paralelo);
    
    // Validar paralelo según carrera antes de hacer la petición
    const paraleloValidado = validarYNormalizarParalelo(carrera, paralelo);
    
    const response = await api.get(`/api/grupos/carrera-paralelo/${carrera}/${paraleloValidado}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorCarreraYParalelo:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Obtener grupos por semestre, carrera y paralelo
 * Filtrado más específico para Ciencias Básicas
 */
export const getGruposPorSemestreCarreraYParalelo = async (semestre, carrera, paralelo) => {
  try {
    validateSemestre(semestre);
    validateCarrera(carrera);
    validateParalelo(paralelo);
    
    // Validar paralelo según carrera antes de hacer la petición
    const paraleloValidado = validarYNormalizarParalelo(carrera, paralelo);
    
    const response = await api.get(`/api/grupos/semestre-carrera-paralelo/${semestre}/${carrera}/${paraleloValidado}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorSemestreCarreraYParalelo:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Obtener grupos por semestre y paralelo
 * Ver todos los grupos de un paralelo específico across carreras
 */
export const getGruposPorSemestreYParalelo = async (semestre, paralelo) => {
  try {
    validateSemestre(semestre);
    validateParalelo(paralelo);
    
    // Validar que el paralelo sea válido
    if (!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      throw new Error('El paralelo debe ser A, B, C, D, E, F o G');
    }
    
    const response = await api.get(`/api/grupos/semestre-paralelo/${semestre}/${paralelo.toUpperCase()}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorSemestreYParalelo:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Obtener paralelos disponibles para una carrera específica
 * Útil para generar filtros dinámicos en el frontend
 */
export const getParalelosDisponiblesPorCarrera = async (carrera) => {
  try {
    validateCarrera(carrera);
    const response = await api.get(`/api/grupos/paralelos-disponibles/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error en getParalelosDisponiblesPorCarrera:', error);
    throw error;
  }
};

// ===== FUNCIONES DE CONSULTA AVANZADA =====

/**
 * NUEVA FUNCIÓN: Obtener grupos con información de estudiantes asignados
 * Incluye información del paralelo para reportes
 */
export const getGruposConEstudiantes = async (filtros = {}) => {
  try {
    const params = {};
    
    if (filtros.carrera) {
      validateCarrera(filtros.carrera);
      params.carrera = filtros.carrera;
    }
    
    if (filtros.semestre) {
      validateSemestre(filtros.semestre);
      params.semestre = filtros.semestre;
    }
    
    if (filtros.paralelo) {
      validateParalelo(filtros.paralelo);
      params.paralelo = filtros.paralelo.toUpperCase();
    }
    
    if (filtros.limit) params.limit = filtros.limit;
    if (filtros.offset) params.offset = filtros.offset;
    
    const response = await api.get('/api/grupos/con-estudiantes', { params });
    return response.data;
  } catch (error) {
    console.error('Error en getGruposConEstudiantes:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Obtener estadísticas de grupos por paralelo
 * Solo para Ciencias Básicas - útil para reportes
 */
export const getEstadisticasPorParalelo = async (carrera) => {
  try {
    validateCarrera(carrera);
    
    if (carrera !== 'Ciencias Básicas') {
      throw new Error('Las estadísticas por paralelo solo aplican para Ciencias Básicas');
    }
    
    const response = await api.get(`/api/grupos/estadisticas-paralelo/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstadisticasPorParalelo:', error);
    throw error;
  }
};

// ===== FUNCIONES DE VALIDACIÓN Y VERIFICACIÓN =====

/**
 * NUEVA FUNCIÓN: Verificar si un estudiante es compatible con un grupo
 * Valida carrera, semestre y paralelo
 */
export const verificarCompatibilidadEstudianteGrupo = async (estudianteId, grupoId) => {
  try {
    validateId(estudianteId);
    validateId(grupoId);
    
    const response = await api.get(`/api/grupos/verificar-compatibilidad/${estudianteId}/${grupoId}`);
    return response.data;
  } catch (error) {
    console.error('Error en verificarCompatibilidadEstudianteGrupo:', error);
    throw error;
  }
};

// ===== FUNCIONES DE UTILIDAD PARA PARALELOS =====

/**
 * Obtener semestres disponibles según la carrera
 */
export const getSemestresDisponibles = (carrera) => {
  // Caso especial para Ciencias Básicas (solo 1er y 2do semestre)
  if (carrera === 'Ciencias Básicas') {
    return [
      { value: '1', label: 'Primer Semestre' },
      { value: '2', label: 'Segundo Semestre' }
    ];
  }
  
  // Para el resto de carreras (3ro a 10mo)
  return [
    { value: '3', label: 'Tercer Semestre' },
    { value: '4', label: 'Cuarto Semestre' },
    { value: '5', label: 'Quinto Semestre' },
    { value: '6', label: 'Sexto Semestre' },
    { value: '7', label: 'Séptimo Semestre' },
    { value: '8', label: 'Octavo Semestre' },
    { value: '9', label: 'Noveno Semestre' },
    { value: '10', label: 'Décimo Semestre' }
  ];
};

/**
 * Obtener paralelos disponibles según la carrera
 */
export const getParalelosDisponibles = (carrera) => {
  if (carrera === 'Ciencias Básicas') {
    return [
      { value: 'A', label: 'Paralelo A' },
      { value: 'B', label: 'Paralelo B' },
      { value: 'C', label: 'Paralelo C' },
      { value: 'D', label: 'Paralelo D' },
      { value: 'E', label: 'Paralelo E' },
      { value: 'F', label: 'Paralelo F' },
      { value: 'G', label: 'Paralelo G' }
    ];
  }
  
  // Para otras carreras, solo paralelo A (pero generalmente no se muestra)
  return [
    { value: 'A', label: 'Paralelo A' }
  ];
};

/**
 * Verificar si una carrera necesita mostrar el selector de paralelo
 */
export const carreraNecesitaParalelo = (carrera) => {
  return carrera === 'Ciencias Básicas';
};

/**
 * Obtener el paralelo por defecto para una carrera
 */
export const getParaleloPorDefecto = (carrera) => {
  // Todas las carreras usan 'A' por defecto
  return 'A';
};

/**
 * Validar si un paralelo es válido para una carrera específica
 */
export const validarParaleloParaCarrera = (carrera, paralelo) => {
  try {
    validarYNormalizarParalelo(carrera, paralelo);
    return { valido: true, mensaje: 'Paralelo válido' };
  } catch (error) {
    return { valido: false, mensaje: error.message };
  }
};

/**
 * Obtener descripción de un grupo incluyendo información de paralelo
 */
export const obtenerDescripcionGrupo = (grupo) => {
  if (!grupo) return 'Grupo no válido';
  
  const paraleloTexto = grupo.carrera === 'Ciencias Básicas' 
    ? ` - Paralelo ${grupo.paralelo}` 
    : '';
    
  return `${grupo.nombre_proyecto} (${grupo.carrera} - ${grupo.semestre}° Semestre${paraleloTexto} - ${grupo.materia})`;
};

/**
 * Agrupar grupos por paralelo (útil para Ciencias Básicas)
 */
export const agruparGruposPorParalelo = (grupos) => {
  return grupos.reduce((acc, grupo) => {
    const paralelo = grupo.paralelo || 'A';
    if (!acc[paralelo]) {
      acc[paralelo] = [];
    }
    acc[paralelo].push(grupo);
    return acc;
  }, {});
};

/**
 * Filtrar grupos compatibles con un estudiante
 */
export const filtrarGruposCompatibles = (grupos, estudiante) => {
  if (!estudiante) return grupos;
  
  return grupos.filter(grupo => {
    return grupo.carrera === estudiante.carrera && 
           grupo.semestre === estudiante.semestre && 
           grupo.paralelo === estudiante.paralelo;
  });
};

// ===== FUNCIONES DE ANÁLISIS Y REPORTES =====

/**
 * Obtener resumen de grupos por carrera y paralelo
 */
export const obtenerResumenGruposPorCarreraYParalelo = async (carrera) => {
  try {
    const grupos = await getGruposPorCarrera(carrera);
    const resumen = agruparGruposPorParalelo(grupos);
    
    // Agregar estadísticas adicionales
    Object.keys(resumen).forEach(paralelo => {
      const gruposParalelo = resumen[paralelo];
      resumen[paralelo] = {
        grupos: gruposParalelo,
        total: gruposParalelo.length,
        materias: [...new Set(gruposParalelo.map(g => g.materia))],
        semestres: [...new Set(gruposParalelo.map(g => g.semestre))]
      };
    });
    
    return resumen;
  } catch (error) {
    console.error('Error en obtenerResumenGruposPorCarreraYParalelo:', error);
    throw error;
  }
};

export default {
  // Funciones básicas CRUD
  getMisGrupos,
  getGrupos,
  getGrupoPorId,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  
  // Funciones de consulta básicas
  getGruposPorDocenteId,
  getGruposPorCarrera,
  getGruposPorSemestre,
  getGruposPorMateria,
  
  // Nuevas funciones para paralelos
  getGruposPorCarreraYParalelo,
  getGruposPorSemestreCarreraYParalelo,
  getGruposPorSemestreYParalelo,
  getParalelosDisponiblesPorCarrera,
  
  // Funciones de consulta avanzada
  getGruposConEstudiantes,
  getEstadisticasPorParalelo,
  
  // Funciones de validación y verificación
  verificarCompatibilidadEstudianteGrupo,
  
  // Funciones de utilidad
  validarYNormalizarParalelo,
  validarDatosGrupo,
  getSemestresDisponibles,
  getParalelosDisponibles,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  validarParaleloParaCarrera,
  obtenerDescripcionGrupo,
  agruparGruposPorParalelo,
  filtrarGruposCompatibles,
  obtenerResumenGruposPorCarreraYParalelo
};