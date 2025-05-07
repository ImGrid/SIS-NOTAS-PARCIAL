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
  
  // Verificar que contenido sea un objeto válido
  if (typeof borradorData.contenido !== 'object') {
    throw new Error('El campo contenido debe ser un objeto JSON válido');
  }
};

// Función para guardar un borrador (crea o actualiza)
export const guardarBorrador = async (borradorData) => {
  try {
    validateBorradorData(borradorData);
    
    // Intentar obtener un borrador existente para este docente y grupo
    try {
      const docenteId = borradorData.docente_id;
      const grupoId = borradorData.grupo_id;
      
      const respuesta = await api.get(`/api/borradores/docente-grupo/${docenteId}/${grupoId}`);
      
      if (respuesta.data && respuesta.data.id) {
        // Si existe, actualizar
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

export const getBorradorPorDocenteYGrupo = async (docenteId, grupoId, silent = false) => {
  try {
    validateDocenteId(docenteId);
    validateGrupoId(grupoId);

    try {
      // Usar getSilent si silent es true
      const method = silent ? api.getSilent : api.get;
      const response = await method(`/api/borradores/docente-grupo/${docenteId}/${grupoId}`);
      return response.data;
    } catch (error) {
      // Si hay error y es 404, retornar null sin mostrar error
      if (error.status === 404 || 
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

// Función para actualizar un borrador existente
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

// Función para eliminar un borrador
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

// Función para eliminar un borrador por docente y grupo
export const eliminarBorradorPorDocenteYGrupo = async (docenteId, grupoId) => {
  try {
    validateDocenteId(docenteId);
    validateGrupoId(grupoId);
    
    // Primero verificamos si existe el borrador (usando modo silencioso)
    const borrador = await getBorradorPorDocenteYGrupo(docenteId, grupoId, true);
    
    // Si no existe borrador, retornar éxito sin intentar eliminar
    if (!borrador) {
      return { success: true, message: "No existe borrador para eliminar" };
    }
    
    // Si existe borrador, proceder con la eliminación silenciosa
    const response = await api.deleteSilent(`/api/borradores/delete/docente-grupo/${docenteId}/${grupoId}`);
    return response.data;
  } catch (error) {
    // En caso de cualquier error, devolver éxito para evitar interrumpir el flujo
    return { success: true, message: "Operación completada" };
  }
};
// Función para obtener los borradores de un docente
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