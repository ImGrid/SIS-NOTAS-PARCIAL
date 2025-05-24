import api from './api';

// Validación de entrada
export const validateCodigo = (codigo) => {
  if (!codigo || typeof codigo !== 'string') {
    throw new Error('Código de estudiante inválido');
  }
};

const validateId = (id) => {
  if (!id || typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('ID de estudiante inválido');
  }
};

const validateGrupoId = (grupoId) => {
  if (grupoId && typeof grupoId !== 'number' && typeof grupoId !== 'string') {
    throw new Error('ID de grupo inválido');
  }
  // Nota: Ahora permitimos que grupoId sea null o undefined
};

/**
 * Valida y normaliza el campo paralelo según la carrera
 */
export const validarYNormalizarParalelo = (carrera, paralelo) => {
  if (carrera === 'Ciencias Básicas') {
    // Para Ciencias Básicas, el paralelo es obligatorio y debe ser A-F
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
 * Valida los datos del estudiante incluyendo la lógica de paralelos
 */
export const validarDatosEstudiante = (datos) => {
  const { nombre, apellido, codigo, carrera, semestre, unidad_educativa, paralelo } = datos;
  
  // Validar campos básicos
  if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
    throw new Error('Todos los campos básicos son obligatorios: nombre, apellido, código, carrera, semestre, unidad_educativa');
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

// Función para obtener todos los estudiantes con paginación y filtrado opcional
export const getEstudiantes = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get('/api/estudiantes/get', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantes:', error);
    throw error;
  }
};

// Función para obtener un estudiante por su ID con validación
export const getEstudianteById = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/estudiantes/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstudianteById:', error);
    throw error;
  }
};

// Función para verificar las dependencias de un estudiante
export const verificarDependenciasEstudiante = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/estudiantes/verificar-dependencias/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en verificarDependenciasEstudiante:', error);
    throw error;
  }
};

// Función para crear un nuevo estudiante con validación de datos
export const createEstudiante = async (estudianteData) => {
  try {
    // Validar y normalizar datos
    const datosValidados = validarDatosEstudiante(estudianteData);
    
    const response = await api.post('/api/estudiantes/create', {
      ...datosValidados,
      createdAt: new Date().toISOString() // Añadir timestamp de creación
    });
    return response.data;
  } catch (error) {
    console.error('Error en createEstudiante:', error);
    throw error;
  }
};

// Función para actualizar un estudiante existente con validación
export const updateEstudiante = async (id, estudianteData, confirmarLimpieza = false) => {
  try {
    validateId(id);
    
    // Validar y normalizar datos
    const datosValidados = validarDatosEstudiante(estudianteData);
    
    // Construir URL con parámetro de confirmación si es necesario
    let url = `/api/estudiantes/update/${id}`;
    if (confirmarLimpieza) {
      url += '?confirmar_limpieza=true';
    }
    
    const response = await api.put(url, {
      ...datosValidados,
      updatedAt: new Date().toISOString() // Añadir timestamp de actualización
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en updateEstudiante:', error);
    
    // Mejor manejo del error 409
    if (error.response && error.response.status === 409) {
      // NOTA: Aquí no modificamos el objeto error directamente,
      // simplemente lo dejamos pasar para que el componente lo maneje
      // Esto evita problemas con la estructura del objeto y mantiene
      // la información original del backend
      throw error;
    }
    
    throw error;
  }
};

// Función para eliminar un estudiante por su ID con validación y confirmación
export const deleteEstudiante = async (id, confirmar = false) => {
  try {
    validateId(id);
    
    let url = `/api/estudiantes/delete/${id}`;
    if (confirmar) {
      url += `?confirmar=true`;
    }
    
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error('Error en deleteEstudiante:', error);
    
    // CORRECCIÓN: Mejorado el manejo del error 409 (similar a updateEstudiante)
    if (error.response && error.response.status === 409) {
      const errorMejorado = new Error(error.response.data.error || 'Error de conflicto');
      errorMejorado.requiereConfirmacion = true;
      errorMejorado.dependencias = error.response.data.dependencias;
      errorMejorado.mensaje = error.response.data.mensaje;
      errorMejorado.status = 409;
      errorMejorado.response = error.response;
      
      throw errorMejorado;
    }
    
    throw error;
  }
};

// Función para obtener estudiantes por grupo ID
export const getEstudiantesByGrupoId = async (grupoId) => {
  try {
    validateGrupoId(grupoId);
    const response = await api.get(`/api/estudiantes/grupo/${grupoId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantesByGrupoId:', error);
    throw error;
  }
};

// Función para obtener estudiantes por carrera
export const getEstudiantesByCarrera = async (carrera) => {
  try {
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Carrera inválida');
    }
    const response = await api.get(`/api/estudiantes/carrera/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantesByCarrera:', error);
    throw error;
  }
};

// Función para obtener estudiantes por semestre
export const getEstudiantesBySemestre = async (semestre) => {
  try {
    if (!semestre || (typeof semestre !== 'number' && typeof semestre !== 'string')) {
      throw new Error('Semestre inválido');
    }
    const response = await api.get(`/api/estudiantes/semestre/${semestre}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantesBySemestre:', error);
    throw error;
  }
};

// ===== NUEVAS FUNCIONES PARA PARALELOS =====

/**
 * NUEVA FUNCIÓN: Obtener estudiantes por carrera y paralelo
 */
export const getEstudiantesByCarreraYParalelo = async (carrera, paralelo) => {
  try {
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Carrera inválida');
    }
    if (!paralelo || typeof paralelo !== 'string') {
      throw new Error('Paralelo inválido');
    }
    
    const response = await api.get(`/api/estudiantes/carrera-paralelo/${carrera}/${paralelo}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantesByCarreraYParalelo:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Obtener estudiantes por semestre, carrera y paralelo
 */
export const getEstudiantesBySemestreCarreraYParalelo = async (semestre, carrera, paralelo) => {
  try {
    if (!semestre || (typeof semestre !== 'number' && typeof semestre !== 'string')) {
      throw new Error('Semestre inválido');
    }
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Carrera inválida');
    }
    if (!paralelo || typeof paralelo !== 'string') {
      throw new Error('Paralelo inválido');
    }
    
    const response = await api.get(`/api/estudiantes/semestre-carrera-paralelo/${semestre}/${carrera}/${paralelo}`);
    return response.data;
  } catch (error) {
    console.error('Error en getEstudiantesBySemestreCarreraYParalelo:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Obtener paralelos disponibles para una carrera
 */
export const getParalelosDisponiblesByCarrera = async (carrera) => {
  try {
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Carrera inválida');
    }
    
    const response = await api.get(`/api/estudiantes/paralelos-disponibles/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error en getParalelosDisponiblesByCarrera:', error);
    throw error;
  }
};

/**
 * NUEVA FUNCIÓN: Verificar si un código está disponible
 */
export const verificarCodigoDisponible = async (codigo, semestre, paralelo, excludeId = null) => {
  try {
    if (!codigo || !semestre || !paralelo) {
      throw new Error('Se requieren código, semestre y paralelo');
    }
    
    const params = {
      codigo,
      semestre,
      paralelo
    };
    
    if (excludeId) {
      params.exclude_id = excludeId;
    }
    
    const response = await api.get('/api/estudiantes/verificar-codigo-disponible', { params });
    return response.data;
  } catch (error) {
    console.error('Error en verificarCodigoDisponible:', error);
    throw error;
  }
};

// ===== FUNCIONES EXISTENTES ACTUALIZADAS =====

export const asignarEstudianteAGrupo = async (estudianteId, grupoId) => {
  try {
    const response = await api.post('/api/estudiantes/asignar-grupo', {
      estudianteId,
      grupoId
    });
    return response.data;
  } catch (error) {
    console.error('Error al asignar estudiante a grupo:', error);
    throw error;
  }
};

export const desasignarEstudianteDeGrupo = async (estudianteId, grupoId) => {
  try {
    const response = await api.post('/api/estudiantes/desasignar-grupo', {
      estudianteId,
      grupoId
    });
    return response.data;
  } catch (error) {
    console.error('Error al desasignar estudiante de grupo:', error);
    throw error;
  }
};

export const estudianteYaAsignadoAMateria = async (estudianteId, materia) => {
  try {
    // Codificar la materia para URL
    const materiaEncoded = encodeURIComponent(materia);
    const response = await api.get(`/api/estudiantes/verificar-materia/${estudianteId}/${materiaEncoded}`);
    return response.data;
  } catch (error) {
    console.error('Error al verificar asignación por materia:', error);
    throw error;
  }
};

export const getEstudiantesConEstadoGrupo = async () => {
  try {
    const response = await api.get('/api/estudiantes/con-estado-grupo');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estudiantes con estado de grupo:', error);
    throw error;
  }
};

export const getEstudiantesBySemestreYCarrera = async (semestre, carrera) => {
  try {
    // Codificar la carrera para URL ya que puede contener espacios
    const carreraEncoded = encodeURIComponent(carrera);
    const response = await api.get(`/api/estudiantes/semestre-carrera/${semestre}/${carreraEncoded}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estudiantes por semestre y carrera:', error);
    throw error;
  }
};

export const getEstudiantesByMateria = async (materia) => {
  try {
    if (!materia || typeof materia !== 'string') {
      throw new Error('Materia inválida');
    }
    const materiaEncoded = encodeURIComponent(materia);
    const response = await api.get(`/api/estudiantes/materia/${materiaEncoded}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estudiantes por materia:', error);
    throw error;
  }
};

// Función de ayuda para mostrar un resumen de dependencias en texto amigable
export const obtenerResumenDependencias = (dependencias) => {
  if (!dependencias) return "No hay información sobre dependencias";
  
  let resumen = [];
  
  if (dependencias.asignaciones && dependencias.asignaciones.cantidad > 0) {
    const gruposStr = dependencias.asignaciones.detalle
      .map(a => `${a.nombre_proyecto} (${a.materia})`)
      .join(", ");
    resumen.push(`${dependencias.asignaciones.cantidad} asignaciones a grupos: ${gruposStr}`);
  }
  
  if (dependencias.informes && dependencias.informes.cantidad > 0) {
    resumen.push(`${dependencias.informes.cantidad} informes de evaluación`);
  }
  
  if (dependencias.calificaciones && dependencias.calificaciones.cantidad > 0) {
    resumen.push(`${dependencias.calificaciones.cantidad} calificaciones registradas`);
  }
  
  if (resumen.length === 0) {
    return "El estudiante no tiene ninguna dependencia y puede modificarse sin problemas.";
  }
  
  return `El estudiante tiene: ${resumen.join(", ")}`;
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

export default {
  getEstudiantes,
  getEstudianteById,
  createEstudiante,
  updateEstudiante,
  deleteEstudiante,
  getEstudiantesByGrupoId,
  getEstudiantesByCarrera,
  getEstudiantesBySemestre,
  estudianteYaAsignadoAMateria,
  getEstudiantesConEstadoGrupo,
  getEstudiantesBySemestreYCarrera,
  getEstudiantesByMateria,
  // Funciones de dependencias:
  verificarDependenciasEstudiante,
  obtenerResumenDependencias,
  // Nuevas funciones para paralelos:
  getEstudiantesByCarreraYParalelo,
  getEstudiantesBySemestreCarreraYParalelo,
  getParalelosDisponiblesByCarrera,
  verificarCodigoDisponible,
  // Funciones de utilidad:
  validarYNormalizarParalelo,
  validarDatosEstudiante,
  getSemestresDisponibles,
  getParalelosDisponibles,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  validateCodigo
};