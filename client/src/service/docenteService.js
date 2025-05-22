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

/**
 * Verifica las dependencias de un docente
 * @param {number|string} id - ID del docente
 * @returns {Promise<Object>} - Objeto con información sobre las dependencias y docentes disponibles
 */
export const verificarDependenciasDocente = async (id) => {
  try {
    validateId(id);
    
    const response = await api.get(`/api/docentes/verificar-dependencias/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al verificar dependencias del docente:', error);
    throw error;
  }
};

/**
 * Elimina un docente con manejo de dependencias
 * @param {number|string} id - ID del docente
 * @param {Object} options - Opciones para manejar dependencias
 * @param {boolean} options.confirmar - Confirmar la eliminación con dependencias
 * @param {number|null} options.reasignarA - ID del docente al que reasignar grupos
 * @param {boolean} options.borrarGrupos - Si es true, eliminar grupos en lugar de reasignarlos
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
export const deleteDocente = async (id, options = {}) => {
  try {
    validateId(id);
    
    const { confirmar = false, reasignarA = null, borrarGrupos = false } = options;
    
    let url = `/api/docentes/delete/${id}`;
    
    // Construir URL con parámetros según las opciones
    const params = [];
    
    if (confirmar) {
      params.push('confirmar=true');
    }
    
    if (reasignarA !== null) {
      params.push(`reasignar_a=${reasignarA}`);
    }
    
    if (borrarGrupos) {
      params.push('borrar_grupos=true');
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error('Error en deleteDocente:', error);
    
    // Si es un error de conflicto (409) y no se ha confirmado la eliminación,
    // propagamos la información sobre las dependencias
    if (error.response && error.response.status === 409) {
      throw {
        ...error,
        requiereConfirmacion: true,
        dependencias: error.response.data.dependencias,
        mensaje: error.response.data.mensaje,
        opciones: error.response.data.opciones
      };
    }
    
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

/**
 * Función de ayuda para obtener un resumen de las dependencias en texto amigable
 * @param {Object} dependencias - Objeto con información de dependencias
 * @returns {string} - Resumen en formato de texto
 */
export const obtenerResumenDependenciasDocente = (dependencias) => {
  if (!dependencias) return "No hay información sobre dependencias";
  
  let resumen = [];
  
  if (dependencias.grupos && dependencias.grupos.cantidad > 0) {
    const gruposStr = dependencias.grupos.detalle
      .map(g => `${g.nombre_proyecto} (${g.materia})`)
      .join(", ");
    resumen.push(`${dependencias.grupos.cantidad} grupos: ${gruposStr}`);
  }
  
  if (dependencias.rubricas && dependencias.rubricas.cantidad > 0) {
    resumen.push(`${dependencias.rubricas.cantidad} rúbricas`);
  }
  
  if (dependencias.calificaciones && dependencias.calificaciones.cantidad > 0) {
    resumen.push(`${dependencias.calificaciones.cantidad} calificaciones`);
  }
  
  if (dependencias.informes && dependencias.informes.cantidad > 0) {
    resumen.push(`${dependencias.informes.cantidad} informes`);
  }
  
  if (dependencias.borradores && dependencias.borradores.cantidad > 0) {
    resumen.push(`${dependencias.borradores.cantidad} borradores`);
  }
  
  if (resumen.length === 0) {
    return "El docente no tiene ninguna dependencia y puede eliminarse sin problemas.";
  }
  
  return `El docente tiene: ${resumen.join(", ")}`;
};

/**
 * Gestiona las carreras asignadas a un docente
 * @param {number|string} docenteId - ID del docente
 * @param {Array<string>} carreras - Lista de carreras a asignar
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const gestionarCarrerasDocente = async (docenteId, carreras) => {
  try {
    validateId(docenteId);
    
    if (!Array.isArray(carreras)) {
      throw new Error('Las carreras deben ser proporcionadas como un array');
    }
    
    // Verificar límite de 3 carreras
    if (carreras.length > 6) {
      throw new Error('Un docente no puede tener más de 6 carreras asignadas');
    }
    
    const response = await api.post(`/api/docentes/carreras/${docenteId}`, { carreras });
    return response.data;
  } catch (error) {
    console.error('Error al gestionar carreras del docente:', error);
    throw error;
  }
};

/**
 * Obtiene los docentes por carrera
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Array>} - Lista de docentes
 */
export const getDocentesPorCarrera = async (carrera) => {
  try {
    if (!carrera || typeof carrera !== 'string') {
      throw new Error('Nombre de carrera inválido');
    }
    
    const response = await api.get(`/api/docentes/carrera/${carrera}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener docentes por carrera:', error);
    throw error;
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
  verificarCodigoExistente,
  verificarDependenciasDocente,
  obtenerResumenDependenciasDocente,
  // Nuevas funciones:
  gestionarCarrerasDocente,
  getDocentesPorCarrera
};