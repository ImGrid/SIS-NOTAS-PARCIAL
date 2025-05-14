import api from './api';
api.getSilent = async (url, options = {}) => {
  try {
    return await api.get(url, { 
      ...options, 
      silentErrors: true,
      silentErrorCodes: [404, ...((options.silentErrorCodes || []))]
    });
  } catch (error) {
    // Si es un 404, manejar silenciosamente
    if (error.response && error.response.status === 404) {
      return { data: null };
    }
    throw error;
  }
};
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
    
    // Usar siempre api.get en lugar de api.getSilent
    try {
      const response = await api.get(`/api/borradores/docente-grupo/${docenteId}/${grupoId}`);
      
      // Solo verificar que la respuesta y los datos existan
      if (!response.data) {
        console.log('[DEBUG] Respuesta sin datos');
        return null;
      }
      
      // Log para depuración
      console.log('[DEBUG] Borrador recuperado:', 
        response.data.id, 
        'Contenido:', typeof response.data.contenido, 
        response.data.contenido ? 'con datos' : 'vacío'
      );
      
      return response.data;
    } catch (error) {
      // Silenciar errores solo si silent=true
      if (silent) {
        return null;
      }
      throw error;
    }
  } catch (error) {
    if (!silent) {
      console.error('Error al obtener borrador por docente y grupo:', error);
    }
    return null;
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
    
    const borrador = await getBorradorPorDocenteYGrupo(docenteId, grupoId, true);
    
    if (!borrador) {
      return { success: true, message: "No existe borrador para eliminar" };
    }
    
    const response = await api.deleteSilent(`/api/borradores/delete/docente-grupo/${docenteId}/${grupoId}`);
    return response.data;
  } catch (error) {
    return { success: true, message: "Operación completada" };
  }
};
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