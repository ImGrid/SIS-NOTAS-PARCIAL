import api from './api';

/**
 * Servicio para gestionar las rúbricas desde el perfil del supervisor
 */

/**
 * Obtiene todas las rúbricas agrupadas por grupo
 * @returns {Promise<Object>} - Lista de grupos con sus rúbricas
 */
export const obtenerTodasRubricas = async () => {
  try {
    const response = await api.get('/api/supervisores/rubricas');
    return response.data;
  } catch (error) {
    console.error('Error al obtener rúbricas:', error);
    throw error;
  }
};

/**
 * Obtiene las rúbricas de un grupo específico
 * @param {number|string} grupoId - ID del grupo
 * @returns {Promise<Object>} - Información del grupo y sus rúbricas
 */
export const obtenerRubricasGrupo = async (grupoId) => {
  try {
    if (!grupoId) {
      throw new Error('ID de grupo es requerido');
    }
    
    const response = await api.get(`/api/supervisores/rubricas/grupo/${grupoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener rúbricas del grupo ${grupoId}:`, error);
    throw error;
  }
};

/**
 * Habilita las rúbricas de un grupo finalizado para permitir edición
 * @param {number|string} grupoId - ID del grupo a habilitar
 * @param {string} motivo - Motivo de la habilitación
 * @returns {Promise<Object>} - Resultado de la habilitación
 */
export const habilitarRubricasGrupo = async (grupoId, motivo) => {
  try {
    if (!grupoId) {
      throw new Error('ID de grupo es requerido');
    }
    
    if (!motivo || motivo.trim() === '') {
      throw new Error('El motivo de habilitación es requerido');
    }
    
    const response = await api.post(`/api/supervisores/rubricas/habilitar/${grupoId}`, {
      motivo
    });
    
    return response.data;
  } catch (error) {
    // Manejar específicamente errores conocidos
    if (error.response && error.response.data && error.response.data.error) {
      console.error(`Error al habilitar el grupo ${grupoId}:`, error.response.data.error);
      throw new Error(error.response.data.error);
    }
    
    console.error(`Error al habilitar rúbricas del grupo ${grupoId}:`, error);
    throw error;
  }
};

/**
 * Obtiene el historial de habilitaciones de un grupo
 * @param {number|string} grupoId - ID del grupo
 * @returns {Promise<Array>} - Lista de habilitaciones
 */
export const obtenerHistorialHabilitaciones = async (grupoId) => {
  try {
    if (!grupoId) {
      throw new Error('ID de grupo es requerido');
    }
    
    const response = await api.get(`/api/supervisores/rubricas/historial/${grupoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener historial de habilitaciones del grupo ${grupoId}:`, error);
    throw error;
  }
};

/**
 * Desactiva una habilitación existente
 * @param {number|string} habilitacionId - ID de la habilitación
 * @returns {Promise<Object>} - Resultado de la desactivación
 */
export const desactivarHabilitacion = async (habilitacionId) => {
  try {
    if (!habilitacionId) {
      throw new Error('ID de habilitación es requerido');
    }
    
    const response = await api.put(`/api/supervisores/rubricas/desactivar/${habilitacionId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al desactivar habilitación ${habilitacionId}:`, error);
    throw error;
  }
};

/**
 * Verifica si un grupo puede ser habilitado
 * Esta función no hace una llamada API, solo valida según la lógica del frontend
 * @param {Object} grupo - Datos del grupo
 * @returns {Object} - Resultado de la validación
 */
export const verificarGrupoHabilitable = (grupo) => {
  const resultado = {
    habilitacionPosible: false,
    razon: ''
  };
  
  // Si el grupo no existe o no tiene datos, no se puede habilitar
  if (!grupo) {
    resultado.razon = 'Datos de grupo no disponibles';
    return resultado;
  }
  
  // Verificar si ya tiene una habilitación activa
  if (grupo.habilitacion_activa) {
    resultado.razon = 'Este grupo ya tiene una habilitación activa';
    return resultado;
  }
  
  // Solo se pueden habilitar grupos finalizados
  if (grupo.estado !== 'finalizado') {
    if (grupo.estado === 'sin_rubrica') {
      resultado.razon = 'No se puede habilitar un grupo sin rúbricas';
    } else if (grupo.estado === 'pendiente') {
      resultado.razon = 'No se puede habilitar un grupo en estado pendiente';
    } else {
      resultado.razon = `No se puede habilitar un grupo en estado: ${grupo.estado}`;
    }
    return resultado;
  }
  
  resultado.habilitacionPosible = true;
  return resultado;
};

export default {
  obtenerTodasRubricas,
  obtenerRubricasGrupo,
  habilitarRubricasGrupo,
  obtenerHistorialHabilitaciones,
  desactivarHabilitacion,
  verificarGrupoHabilitable,
};