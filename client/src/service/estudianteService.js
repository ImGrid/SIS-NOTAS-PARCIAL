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

// Función para crear un nuevo estudiante con validación de datos
export const createEstudiante = async (estudianteData) => {
  try {
    // Validaciones de datos obligatorios
    if (!estudianteData.nombre || !estudianteData.apellido || 
        !estudianteData.codigo || !estudianteData.carrera || 
        !estudianteData.semestre || !estudianteData.unidad_educativa) {
      throw new Error('Todos los campos obligatorios deben estar presentes');
    }
    
    validateCodigo(estudianteData.codigo);
    
    // Si grupo_id está presente, validarlo
    if (estudianteData.grupo_id) {
      validateGrupoId(estudianteData.grupo_id);
    }
    
    const response = await api.post('/api/estudiantes/create', {
      ...estudianteData,
      createdAt: new Date().toISOString() // Añadir timestamp de creación
    });
    return response.data;
  } catch (error) {
    console.error('Error en createEstudiante:', error);
    throw error;
  }
};

// Función para actualizar un estudiante existente con validación
export const updateEstudiante = async (id, estudianteData) => {
  try {
    validateId(id);
    
    // Validar campos obligatorios si están presentes
    if (estudianteData.codigo) {
      validateCodigo(estudianteData.codigo);
    }
    
    if (estudianteData.grupo_id !== null && estudianteData.grupo_id !== undefined) {
      validateGrupoId(estudianteData.grupo_id);
    }
    
    const response = await api.put(`/api/estudiantes/update/${id}`, {
      ...estudianteData,
      updatedAt: new Date().toISOString() // Añadir timestamp de actualización
    });
    return response.data;
  } catch (error) {
    console.error('Error en updateEstudiante:', error);
    throw error;
  }
};

// Función para eliminar un estudiante por su ID con validación adicional
export const deleteEstudiante = async (id) => {
  try {
    validateId(id);
    
    // Añadir confirmación o validación adicional si es necesario
    const response = await api.delete(`/api/estudiantes/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteEstudiante:', error);
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
  getEstudiantesConEstadoGrupo
};