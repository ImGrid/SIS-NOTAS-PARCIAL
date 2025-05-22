import api from './api';

// Reutilizamos la validación de correo del servicio de docente
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Formato de correo electrónico inválido');
  }
};

// Validación básica de ID
const validateId = (id) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new Error('ID de supervisor inválido');
  }
};

// Validación de código de verificación
const validateCodigo = (codigo) => {
  if (!codigo || codigo.length !== 6 || !/^\d+$/.test(codigo)) {
    throw new Error('Código de verificación inválido. Debe ser un número de 6 dígitos.');
  }
};

// Validación de clave secreta
const validateClaveSecreta = (clave) => {
  if (!clave || clave.trim() === '') {
    throw new Error('La clave secreta es requerida');
  }
};

/**
 * Primera etapa de autenticación: solicitar código de verificación
 * @param {string} correo_electronico - Correo del supervisor
 * @returns {Promise<Object>} Respuesta del servidor
 */
export const loginSupervisor = async (correo_electronico) => {
  try {
    validateEmail(correo_electronico);
    
    const response = await api.post('/api/supervisores/login', { 
      correo_electronico,
      timestamp: Date.now() // Prevenir ataques de replay
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en loginSupervisor:', error);
    throw error;
  }
};

/**
 * Segunda etapa de autenticación: verificar código de verificación
 * @param {string} correo_electronico - Correo del supervisor
 * @param {string} codigo - Código de verificación recibido por correo
 * @param {boolean} mantener_codigo - Si debe mantener el código activo
 * @returns {Promise<Object>} Respuesta del servidor
 */
export const verificarCodigoSupervisor = async (correo_electronico, codigo, mantener_codigo = true) => {
  try {
    validateEmail(correo_electronico);
    validateCodigo(codigo);
    
    const response = await api.post('/api/supervisores/verificar-codigo', { 
      correo_electronico,
      codigo,
      mantener_codigo,
      timestamp: Date.now()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en verificarCodigoSupervisor:', error);
    throw error;
  }
};

/**
 * Tercera etapa de autenticación: validar clave secreta del sistema
 * @param {string} correo_electronico - Correo del supervisor
 * @param {string} codigo - Código de verificación 
 * @param {string} clave_secreta - Clave secreta del sistema
 * @returns {Promise<Object>} Respuesta del servidor con token
 */
export const autenticarSupervisor = async (correo_electronico, codigo, clave_secreta) => {
  try {
    validateEmail(correo_electronico);
    validateCodigo(codigo);
    validateClaveSecreta(clave_secreta);
    
    const response = await api.post('/api/supervisores/autenticar', { 
      correo_electronico,
      codigo,
      clave_secreta,
      timestamp: Date.now()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en autenticarSupervisor:', error);
    throw error;
  }
};

/**
 * Verifica si un correo corresponde a un supervisor
 * @param {string} correo - Correo a verificar
 * @returns {Promise<Object>} Respuesta que indica si es supervisor
 */
export const verificarCorreoSupervisor = async (correo) => {
  try {
    validateEmail(correo);
    
    const response = await api.get(`/api/supervisores/verificar-correo/${correo}`);
    return response.data;
  } catch (error) {
    console.error('Error en verificarCorreoSupervisor:', error);
    throw error;
  }
};

// CRUD básico para supervisores

// Función para obtener todos los supervisores
export const getSupervisores = async () => {
  try {
    const response = await api.get('/api/supervisores/get');
    return response.data;
  } catch (error) {
    console.error('Error en getSupervisores:', error);
    throw error;
  }
};

// Función para obtener un supervisor por su ID
export const getSupervisorById = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/supervisores/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en getSupervisorById:', error);
    throw error;
  }
};

// Función para crear un nuevo supervisor
export const createSupervisor = async (supervisorData) => {
  try {
    if (!supervisorData.correo_electronico) {
      throw new Error('Correo electrónico es requerido');
    }
    validateEmail(supervisorData.correo_electronico);
    
    const response = await api.post('/api/supervisores/create', supervisorData);
    return response.data;
  } catch (error) {
    console.error('Error en createSupervisor:', error);
    throw error;
  }
};

// Función para actualizar un supervisor existente
export const updateSupervisor = async (id, supervisorData) => {
  try {
    validateId(id);
    
    if (supervisorData.correo_electronico) {
      validateEmail(supervisorData.correo_electronico);
    }
    
    const response = await api.put(`/api/supervisores/update/${id}`, supervisorData);
    return response.data;
  } catch (error) {
    console.error('Error en updateSupervisor:', error);
    throw error;
  }
};

// Función para eliminar un supervisor
export const deleteSupervisor = async (id) => {
  try {
    validateId(id);
    const response = await api.delete(`/api/supervisores/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteSupervisor:', error);
    throw error;
  }
};

/**
 * Verifica si existe un código de verificación vigente para el correo
 * @param {string} correo_electronico - Correo del supervisor
 * @returns {Promise<Object>} Respuesta del servidor
 */
export const verificarCodigoExistente = async (correo_electronico) => {
  try {
    validateEmail(correo_electronico);
    
    const response = await api.post('/api/supervisores/verificar-codigo-existente', { 
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

/**
 * Gestiona las carreras asignadas a un supervisor
 * @param {number|string} supervisorId - ID del supervisor
 * @param {Array<string>} carreras - Lista de carreras a asignar
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const gestionarCarrerasSupervisor = async (supervisorId, carreras) => {
  try {
    validateId(supervisorId);
    
    if (!Array.isArray(carreras)) {
      throw new Error('Las carreras deben ser proporcionadas como un array');
    }
    
    const response = await api.post(`/api/supervisores/carreras/${supervisorId}`, { carreras });
    return response.data;
  } catch (error) {
    console.error('Error al gestionar carreras del supervisor:', error);
    throw error;
  }
};

/**
 * Obtiene los supervisores por carrera
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Array>} - Lista de supervisores
 */
export const getSupervisoresPorCarrera = async (carrera) => {
  try {
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Nombre de carrera inválido');
    }
    
    const response = await api.get(`/api/supervisores/carrera/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener supervisores por carrera:', error);
    throw error;
  }
};

export default {
  loginSupervisor,
  verificarCodigoSupervisor,
  autenticarSupervisor,
  verificarCorreoSupervisor,
  getSupervisores,
  getSupervisorById,
  createSupervisor,
  updateSupervisor,
  deleteSupervisor,
  validateEmail,
  verificarCodigoExistente,
  // Nuevas funciones:
  gestionarCarrerasSupervisor,
  getSupervisoresPorCarrera
};