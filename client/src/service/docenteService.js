import api from './api';

// Validación de entrada
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Formato de correo electrónico inválido');
  }
};

const validateId = (id) => {
  if (!id || typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('ID de docente inválido');
  }
};

// Validación de código de verificación
const validateCodigo = (codigo) => {
  if (!codigo || codigo.length !== 6 || !/^\d+$/.test(codigo)) {
    throw new Error('Código de verificación inválido. Debe ser un número de 6 dígitos.');
  }
};

/**
 * Primera etapa: solicitar código de verificación
 * @param {string} correo_electronico - Correo del docente
 * @returns {Promise<Object>} Respuesta del servidor
 */
export const loginDocente = async (correo_electronico) => {
  try {
    validateEmail(correo_electronico);
    
    const response = await api.post('/api/docentes/login', { 
      correo_electronico,
      timestamp: Date.now() // Prevenir ataques de replay
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en loginDocente:', error);
    throw error;
  }
};

/**
 * Segunda etapa: verificar código de verificación
 * @param {string} correo_electronico - Correo del docente
 * @param {string} codigo - Código de verificación recibido por correo
 * @param {boolean} mantener_codigo - Si debe mantener el código activo tras verificarlo
 * @returns {Promise<Object>} Respuesta del servidor con token
 */
export const verificarCodigo = async (correo_electronico, codigo, mantener_codigo = true) => {
  try {
    validateEmail(correo_electronico);
    validateCodigo(codigo);
    
    const response = await api.post('/api/docentes/verificar-codigo', { 
      correo_electronico,
      codigo,
      mantener_codigo,
      timestamp: Date.now()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en verificarCodigo:', error);
    throw error;
  }
};

// Función para obtener todos los docentes con paginación y filtrado opcional
export const getDocentes = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get('/api/docentes/get', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getDocentes:', error);
    throw error;
  }
};

// Función para obtener un docente por su ID con validación
export const getDocenteById = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/docentes/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en getDocenteById:', error);
    throw error;
  }
};

// Función para crear un nuevo docente con validación de datos
export const createDocente = async (docenteData) => {
  try {
    // Validaciones de datos de entrada
    if (!docenteData.correo_electronico) {
      throw new Error('Correo electrónico es requerido');
    }
    validateEmail(docenteData.correo_electronico);
    
    const response = await api.post('/api/docentes/create', {
      ...docenteData,
      createdAt: new Date().toISOString() // Añadir timestamp de creación
    });
    return response.data;
  } catch (error) {
    console.error('Error en createDocente:', error);
    throw error;
  }
};

// Función para actualizar un docente existente con validación
export const updateDocente = async (id, docenteData) => {
  try {
    validateId(id);
    
    if (docenteData.correo_electronico) {
      validateEmail(docenteData.correo_electronico);
    }
    
    const response = await api.put(`/api/docentes/update/${id}`, {
      ...docenteData,
      updatedAt: new Date().toISOString() // Añadir timestamp de actualización
    });
    return response.data;
  } catch (error) {
    console.error('Error en updateDocente:', error);
    throw error;
  }
};

// Función para eliminar un docente por su ID con validación adicional
export const deleteDocente = async (id) => {
  try {
    validateId(id);
    
    // Añadir confirmación o validación adicional si es necesario
    const response = await api.delete(`/api/docentes/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteDocente:', error);
    throw error;
  }
};
export const verificarCodigoExistente = async (correo_electronico) => {
  try {
    validateEmail(correo_electronico);
    
    const response = await api.post('/api/docentes/verificar-codigo-existente', { 
      correo_electronico,
      timestamp: Date.now() // Prevenir ataques de replay
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al verificar código existente:', error);
    
    // Manejo más específico de errores
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      console.error('Error de respuesta del servidor:', error.response.data);
      throw new Error(error.response.data.error || 'Error en el servidor al verificar código');
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor');
      throw new Error('No se pudo conectar con el servidor. Verifique su conexión.');
    } else {
      // Otros errores
      throw error;
    }
  }
};
export default {
  loginDocente,
  verificarCodigo,
  getDocentes,
  getDocenteById,
  createDocente,
  updateDocente,
  deleteDocente,
  validateEmail,
  validateCodigo,
  verificarCodigoExistente
};