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

// Función para verificar las dependencias de un estudiante
export const verificarDependenciasEstudiante = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/estudiantes/verificar-dependencias/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en verificarDependenciasEstudiante:', error);
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
// Función para actualizar un estudiante existente con validación
export const updateEstudiante = async (id, estudianteData, confirmarLimpieza = false) => {
  // Declarar variables para cambios críticos fuera del try-catch para que 
  // estén disponibles en todo el ámbito de la función
  let cambioSemestreLocal = false;
  let cambioCarreraLocal = false;
  
  try {
    validateId(id);
    
    // Validar campos obligatorios si están presentes
    if (estudianteData.codigo) {
      validateCodigo(estudianteData.codigo);
    }
    
    if (estudianteData.grupo_id !== null && estudianteData.grupo_id !== undefined) {
      validateGrupoId(estudianteData.grupo_id);
    }
    
    // Obtener el estudiante actual para detectar cambios críticos
    const estudianteActual = await getEstudianteById(id);
    cambioSemestreLocal = estudianteData.semestre && estudianteData.semestre.toString() !== estudianteActual.semestre.toString();
    cambioCarreraLocal = estudianteData.carrera && estudianteData.carrera !== estudianteActual.carrera;
    
    // Si hay cambios críticos, añadir parámetro de confirmación
    let url = `/api/estudiantes/update/${id}`;
    if ((cambioSemestreLocal || cambioCarreraLocal) && confirmarLimpieza) {
      url += `?confirmar_limpieza=true`;
    }
    
    const response = await api.put(url, {
      ...estudianteData,
      updatedAt: new Date().toISOString() // Añadir timestamp de actualización
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en updateEstudiante:', error);
    
    // CORRECCIÓN: Mejorado el manejo del error 409
    if (error.response && error.response.status === 409) {
      // Crear un objeto de error mejorado que preserve la estructura original
      const errorMejorado = new Error(error.response.data.error || 'Error de conflicto');
      
      // Añadir propiedades importantes que necesita el componente
      errorMejorado.requiereConfirmacion = true;
      errorMejorado.dependencias = error.response.data.dependencias;
      errorMejorado.mensaje = error.response.data.mensaje;
      errorMejorado.status = 409;
      
      // Preservar la respuesta original completa
      errorMejorado.response = error.response;
      
      // Añadir información adicional sobre los cambios críticos
      // Ahora usamos las variables locales que sí están en este scope
      errorMejorado.cambiosCriticos = {
        carrera: cambioCarreraLocal,
        semestre: cambioSemestreLocal
      };
      
      // Lanzar el error mejorado
      throw errorMejorado;
    }
    
    throw error;
  }
};

// Función para eliminar un estudiante por su ID con validación y confirmación
export const deleteEstudiante = async (id, confirmar = false) => {
  try {
    validateId(id);
    
    let url = `/api/estudiantes/delete/${id}`;
    if (confirmar) {
      url += `?confirmar=true`;
    }
    
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error('Error en deleteEstudiante:', error);
    
    // CORRECCIÓN: Mejorado el manejo del error 409 (similar a updateEstudiante)
    if (error.response && error.response.status === 409) {
      const errorMejorado = new Error(error.response.data.error || 'Error de conflicto');
      errorMejorado.requiereConfirmacion = true;
      errorMejorado.dependencias = error.response.data.dependencias;
      errorMejorado.mensaje = error.response.data.mensaje;
      errorMejorado.status = 409;
      errorMejorado.response = error.response;
      
      throw errorMejorado;
    }
    
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

export const getEstudiantesBySemestreYCarrera = async (semestre, carrera) => {
  try {
    // Codificar la carrera para URL ya que puede contener espacios
    const carreraEncoded = encodeURIComponent(carrera);
    const response = await api.get(`/api/estudiantes/semestre-carrera/${semestre}/${carreraEncoded}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estudiantes por semestre y carrera:', error);
    throw error;
  }
};

export const getEstudiantesByMateria = async (materia) => {
  try {
    if (!materia || typeof materia !== 'string') {
      throw new Error('Materia inválida');
    }
    const materiaEncoded = encodeURIComponent(materia);
    const response = await api.get(`/api/estudiantes/materia/${materiaEncoded}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estudiantes por materia:', error);
    throw error;
  }
};

// Función de ayuda para mostrar un resumen de dependencias en texto amigable
export const obtenerResumenDependencias = (dependencias) => {
  if (!dependencias) return "No hay información sobre dependencias";
  
  let resumen = [];
  
  if (dependencias.asignaciones && dependencias.asignaciones.cantidad > 0) {
    const gruposStr = dependencias.asignaciones.detalle
      .map(a => `${a.nombre_proyecto} (${a.materia})`)
      .join(", ");
    resumen.push(`${dependencias.asignaciones.cantidad} asignaciones a grupos: ${gruposStr}`);
  }
  
  if (dependencias.informes && dependencias.informes.cantidad > 0) {
    resumen.push(`${dependencias.informes.cantidad} informes de evaluación`);
  }
  
  if (dependencias.calificaciones && dependencias.calificaciones.cantidad > 0) {
    resumen.push(`${dependencias.calificaciones.cantidad} calificaciones registradas`);
  }
  
  if (resumen.length === 0) {
    return "El estudiante no tiene ninguna dependencia y puede modificarse sin problemas.";
  }
  
  return `El estudiante tiene: ${resumen.join(", ")}`;
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
  getEstudiantesConEstadoGrupo,
  getEstudiantesBySemestreYCarrera,
  getEstudiantesByMateria,
  // Nuevas funciones:
  verificarDependenciasEstudiante,
  obtenerResumenDependencias
};