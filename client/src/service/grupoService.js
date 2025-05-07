import api from './api';

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

// Validación de entrada (actualizada para incluir materia)
const validateGrupoData = (grupoData) => {
  const { nombre_proyecto, carrera, semestre, materia } = grupoData;
  
  if (!nombre_proyecto || typeof nombre_proyecto !== 'string') {
    throw new Error('Nombre de proyecto inválido o vacío');
  }
  
  if (!carrera || typeof carrera !== 'string') {
    throw new Error('Carrera inválida o vacía');
  }
  
  if (!semestre || (typeof semestre !== 'number' && typeof semestre !== 'string')) {
    throw new Error('Semestre inválido o vacío');
  }
  
  if (!materia || typeof materia !== 'string') {
    throw new Error('Materia inválida o vacía');
  }
};

const validateId = (id) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new Error('ID inválido');
  }
};

// Nueva función para obtener los grupos del docente logueado
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
    validateGrupoData(grupoData);
    
    const docenteId = getDocenteIdFromToken();
    const token = sessionStorage.getItem('token');
    
    const grupoCompleto = {
      ...grupoData,
      docente_id: docenteId
    };
    
    const response = await api.post('/api/grupos/create', grupoCompleto, {
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
    validateGrupoData(grupoData);
    
    const docenteId = getDocenteIdFromToken();
    const token = sessionStorage.getItem('token');
    
    const grupoCompleto = {
      ...grupoData,
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

// Función para eliminar un grupo por su ID con validación
export const deleteGrupo = async (id) => {
  try {
    validateId(id);
    
    const token = sessionStorage.getItem('token');
    
    const response = await api.delete(`/api/grupos/delete/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en deleteGrupo:', error);
    throw error;
  }
};

// Función para obtener grupos por ID de docente
export const getGruposPorDocenteId = async (docenteId) => {
  try {
    validateId(docenteId);
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
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Carrera inválida o vacía');
    }
    
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
    if (!semestre || (typeof semestre !== 'number' && typeof semestre !== 'string')) {
      throw new Error('Semestre inválido o vacío');
    }
    
    const response = await api.get(`/api/grupos/semestre/${semestre}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorSemestre:', error);
    throw error;
  }
};

// Nueva función para obtener grupos por materia
export const getGruposPorMateria = async (materia) => {
  try {
    if (!materia || typeof materia !== 'string') {
      throw new Error('Materia inválida o vacía');
    }
    
    const response = await api.get(`/api/grupos/materia/${materia}`);
    return response.data;
  } catch (error) {
    console.error('Error en getGruposPorMateria:', error);
    throw error;
  }
};

export default {
  getMisGrupos,
  getGrupos,
  getGrupoPorId,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  getGruposPorDocenteId,
  getGruposPorCarrera,
  getGruposPorSemestre,
  getGruposPorMateria
};