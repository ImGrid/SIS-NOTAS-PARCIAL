import api from './api';

// Validación de entrada
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

const validateGrupoId = (grupoId) => {
  if (!grupoId || (typeof grupoId !== 'number' && typeof grupoId !== 'string')) {
    throw new Error('ID de grupo inválido');
  }
};

// Validación de datos del borrador
const validateBorradorData = (borradorData) => {
  const requiredFields = [
    'docente_id',
    'grupo_id',
    'contenido'
  ];
  
  for (const field of requiredFields) {
    if (!borradorData[field]) {
      throw new Error(`El campo ${field} es obligatorio`);
    }
  }
  
  validateDocenteId(borradorData.docente_id);
  validateGrupoId(borradorData.grupo_id);
  
  if (typeof borradorData.contenido !== 'object') {
    throw new Error('El campo contenido debe ser un objeto JSON válido');
  }
};

/**
 * Guarda un borrador. Si ya existe uno para el mismo docente y grupo, lo actualiza.
 * @param {Object} borradorData - Datos del borrador a guardar
 * @returns {Promise<Object>} - El borrador creado o actualizado
 */
export const guardarBorrador = async (borradorData) => {
  try {
    validateBorradorData(borradorData);
    
    // Intentar obtener un borrador existente para este docente y grupo
    try {
      const docenteId = borradorData.docente_id;
      const grupoId = borradorData.grupo_id;
      
      // Usar getSilent para evitar errores en consola si no existe
      const respuesta = await api.getSilent(`/api/borradores/docente-grupo/${docenteId}/${grupoId}`);
      
      if (respuesta.data && respuesta.data.id) {
        // Si existe, actualizar
        console.log('Actualizando borrador existente:', respuesta.data.id);
        return await actualizarBorrador(respuesta.data.id, borradorData);
      }
    } catch (error) {
      // Si no existe, ignorar el error y continuar para crear uno nuevo
      if (error.response && error.response.status !== 404) {
        // Si es otro tipo de error, propagarlo
        throw error;
      }
    }    
    
    // Si no se encontró o hubo un error 404, crear nuevo
    console.log('Creando nuevo borrador');
    const response = await api.post('/api/borradores/create', borradorData);
    return response.data;
  } catch (error) {
    console.error('Error al guardar borrador:', error);
    throw error;
  }
};

// Función para obtener todos los borradores
export const getBorradores = async () => {
  try {
    const response = await api.get('/api/borradores/get');
    return response.data;
  } catch (error) {
    console.error('Error al obtener borradores:', error);
    throw error;
  }
};

/**
 * Obtiene un borrador por su ID
 * @param {number|string} id - ID del borrador
 * @returns {Promise<Object>} - El borrador encontrado
 */
export const getBorradorPorId = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/borradores/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener borrador por ID:', error);
    throw error;
  }
};

/**
 * Obtiene un borrador por docente y grupo
 * @param {number|string} docenteId - ID del docente
 * @param {number|string} grupoId - ID del grupo
 * @param {boolean} silent - Si es true, no mostrará errores en consola
 * @returns {Promise<Object|null>} - El borrador encontrado o null si no existe
 */
export const getBorradorPorDocenteYGrupo = async (docenteId, grupoId, silent = false) => {
  try {
    validateDocenteId(docenteId);
    validateGrupoId(grupoId);

    // Usar getSilent para evitar errores en consola si silent es true
    const method = silent ? api.getSilent : api.get;
    
    try {
      const response = await method(`/api/borradores/docente-grupo/${docenteId}/${grupoId}`);
      return response.data;
    } catch (error) {
      // Si hay error y es 404, retornar null sin mostrar error
      if (error.status === 404 || 
          (error.response && error.response.status === 404) ||
          (error.originalError && error.originalError.response && error.originalError.response.status === 404)) {
        return null;
      }
      // Para otros errores, si silent es true no mostrar nada
      if (!silent) {
        throw error;
      }
      return null;
    }
  } catch (error) {
    if (!silent) {
      console.error('Error al obtener borrador por docente y grupo:', error.message || error);
    }
    return null;  // Retornamos null en cualquier caso de error
  }
};

/**
 * Actualiza un borrador existente
 * @param {number|string} id - ID del borrador
 * @param {Object} borradorData - Nuevos datos para el borrador
 * @returns {Promise<Object>} - El borrador actualizado
 */
export const actualizarBorrador = async (id, borradorData) => {
  try {
    validateId(id);
    validateBorradorData(borradorData);
    
    const response = await api.put(`/api/borradores/update/${id}`, borradorData);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar borrador:', error);
    throw error;
  }
};

/**
 * Elimina un borrador por su ID
 * @param {number|string} id - ID del borrador
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
export const eliminarBorrador = async (id) => {
  try {
    validateId(id);
    const response = await api.delete(`/api/borradores/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar borrador:', error);
    throw error;
  }
};

/**
 * Elimina un borrador por docente y grupo
 * @param {number|string} docenteId - ID del docente
 * @param {number|string} grupoId - ID del grupo
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
export const eliminarBorradorPorDocenteYGrupo = async (docenteId, grupoId) => {
  try {
    validateDocenteId(docenteId);
    validateGrupoId(grupoId);
    
    // Verificar si existe usando silent para evitar errores en consola
    const borrador = await getBorradorPorDocenteYGrupo(docenteId, grupoId, true);
    
    if (!borrador) {
      return { success: true, message: "No existe borrador para eliminar" };
    }
    
    // Usar deleteSilent para evitar errores en consola si ya fue eliminado
    const response = await api.deleteSilent(`/api/borradores/delete/docente-grupo/${docenteId}/${grupoId}`);
    return response.data;
  } catch (error) {
    // Siempre retornar éxito para evitar errores en el frontend
    return { success: true, message: "Operación completada" };
  }
};

/**
 * Obtiene todos los borradores de un docente
 * @param {number|string} docenteId - ID del docente
 * @returns {Promise<Array>} - Lista de borradores del docente
 */
export const getBorradoresPorDocenteId = async (docenteId) => {
  try {
    validateDocenteId(docenteId);
    const response = await api.get(`/api/borradores/docente/${docenteId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener borradores por docente ID:', error);
    throw error;
  }
};

// Exportar todos los métodos para uso en otros archivos
export default {
  guardarBorrador,
  getBorradores,
  getBorradorPorId,
  getBorradorPorDocenteYGrupo,
  actualizarBorrador,
  eliminarBorrador,
  eliminarBorradorPorDocenteYGrupo,
  getBorradoresPorDocenteId
};