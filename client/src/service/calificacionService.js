import api from './api';

// Validación de entrada
const validateId = (id) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new Error('ID inválido');
  }
};

const validateEstudianteId = (estudianteId) => {
  if (!estudianteId || (typeof estudianteId !== 'number' && typeof estudianteId !== 'string')) {
    throw new Error('ID de estudiante inválido');
  }
};

const validateDocenteId = (docenteId) => {
  if (!docenteId || (typeof docenteId !== 'number' && typeof docenteId !== 'string')) {
    throw new Error('ID de docente inválido');
  }
};

const validateRubricaId = (rubricaId) => {
  if (!rubricaId || (typeof rubricaId !== 'number' && typeof rubricaId !== 'string')) {
    throw new Error('ID de rúbrica inválido');
  }
};

// Validación de datos de calificación
const validateCalificacionData = (calificacionData) => {
  const requiredFields = [
    'gestion',
    'periodo',
    'asignatura',
    'rubrica_id',
    'docente_id',
    'estudiante_id'
  ];
  
  for (const field of requiredFields) {
    if (!calificacionData[field]) {
      throw new Error(`El campo ${field} es obligatorio`);
    }
  }
  
  validateRubricaId(calificacionData.rubrica_id);
  validateDocenteId(calificacionData.docente_id);
  validateEstudianteId(calificacionData.estudiante_id);
};

// Función para obtener todas las calificaciones con paginación y filtrado opcional
export const getCalificaciones = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get('/api/calificaciones/get', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    throw error;
  }
};

// Función para obtener una calificación por su ID
export const getCalificacionPorId = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/calificaciones/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener calificación por ID:', error);
    throw error;
  }
};

// Función para crear una nueva calificación
export const crearCalificacion = async (calificacionData) => {
  try {
    validateCalificacionData(calificacionData);
    
    // Asegurar que la fecha esté presente y en formato ISO
    const calificacionCompleta = {
      ...calificacionData,
      fecha: calificacionData.fecha || new Date().toISOString()
    };
    
    const response = await api.post('/api/calificaciones/create', calificacionCompleta);
    return response.data;
  } catch (error) {
    console.error('Error al crear calificación:', error);
    throw error;
  }
};

// Función MODIFICADA para actualizar correctamente una calificación existente
export const actualizarCalificacion = async (id, calificacionData) => {
  try {
    validateId(id);
    validateCalificacionData(calificacionData);
    
    // Asegurar que los datos se envíen correctamente
    const response = await api.put(`/api/calificaciones/update/${id}`, {
      ...calificacionData,
      fecha: calificacionData.fecha || new Date().toISOString()
    });
    
    // Verificar si la actualización fue exitosa
    if (!response.data) {
      throw new Error(`Error al actualizar la calificación ${id}: No se recibió respuesta del servidor`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al actualizar calificación:', error);
    throw error;
  }
};

// Función para eliminar una calificación
export const eliminarCalificacion = async (id) => {
  try {
    validateId(id);
    const response = await api.delete(`/api/calificaciones/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar calificación:', error);
    throw error;
  }
};

// Función para obtener calificaciones por estudiante ID
export const getCalificacionesPorEstudianteId = async (estudianteId) => {
  try {
    validateEstudianteId(estudianteId);
    const response = await api.get(`/api/calificaciones/estudiante/${estudianteId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener calificaciones por estudiante ID:', error);
    throw error;
  }
};

// Función para obtener calificaciones por docente ID
export const getCalificacionesPorDocenteId = async (docenteId) => {
  try {
    validateDocenteId(docenteId);
    const response = await api.get(`/api/calificaciones/docente/${docenteId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener calificaciones por docente ID:', error);
    throw error;
  }
};

// Función para obtener calificaciones por rúbrica ID
export const getCalificacionesPorRubricaId = async (rubricaId) => {
  try {
    validateRubricaId(rubricaId);
    const response = await api.get(`/api/calificaciones/rubrica/${rubricaId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener calificaciones por rúbrica ID:', error);
    throw error;
  }
};

// Función para crear una calificación y asociarla con una rúbrica y un estudiante
export const crearCalificacionAsociada = async (docenteId, estudianteId, rubricaId, asignatura, periodo = '', gestion = '') => {
  try {
    validateDocenteId(docenteId);
    validateEstudianteId(estudianteId);
    validateRubricaId(rubricaId);
    
    if (!asignatura) {
      throw new Error('La asignatura es obligatoria');
    }
    
    // Obtener fecha actual
    const fechaActual = new Date();
    
    // Determinar gestión (año actual)
    const gestionActual = gestion || fechaActual.getFullYear().toString();
    
    // Determinar periodo (I o II)
    // Si el mes es menor a 6 (julio), entonces es periodo I, sino periodo II
    let periodoActual = periodo;
    if (!periodoActual) {
      periodoActual = fechaActual.getMonth() < 6 ? "I" : "II";
    }
    
    // Crear objeto de calificación
    const calificacionData = {
      gestion: gestionActual,
      periodo: periodoActual,
      fecha: fechaActual.toISOString(),
      asignatura,
      rubrica_id: rubricaId,
      docente_id: docenteId,
      estudiante_id: estudianteId
    };
    
    // Crear la calificación
    return await crearCalificacion(calificacionData);
  } catch (error) {
    console.error('Error al crear calificación asociada:', error);
    throw error;
  }
};

// Función para obtener calificaciones con información de rúbrica y estudiante
export const getCalificacionesDetalladas = async (filters = {}) => {
  try {
    // Esta función simula un JOIN entre calificaciones, rúbricas y estudiantes
    // El backend no proporciona este endpoint directamente, así que lo implementamos en el cliente
    
    const calificaciones = await getCalificaciones();
    const calificacionesDetalladas = [];
    
    for (const calificacion of calificaciones) {
      try {
        // Obtener datos de la rúbrica asociada
        const rubrica = await api.get(`/api/rubricas/get/${calificacion.rubrica_id}`);
        
        // Obtener datos del estudiante asociado
        const estudiante = await api.get(`/api/estudiantes/get/${calificacion.estudiante_id}`);
        
        // Crear objeto con datos completos
        calificacionesDetalladas.push({
          ...calificacion,
          rubrica: rubrica.data,
          estudiante: estudiante.data
        });
      } catch (innerError) {
        console.error(`Error al obtener detalles para calificación ${calificacion.id}:`, innerError);
        // Si hay error, agregamos la calificación sin los detalles adicionales
        calificacionesDetalladas.push(calificacion);
      }
    }
    
    return calificacionesDetalladas;
  } catch (error) {
    console.error('Error al obtener calificaciones detalladas:', error);
    throw error;
  }
};

export default {
  getCalificaciones,
  getCalificacionPorId,
  crearCalificacion,
  actualizarCalificacion,
  eliminarCalificacion,
  getCalificacionesPorEstudianteId,
  getCalificacionesPorDocenteId,
  getCalificacionesPorRubricaId,
  crearCalificacionAsociada,
  getCalificacionesDetalladas
};