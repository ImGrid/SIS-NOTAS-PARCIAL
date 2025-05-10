import api from './api';
import {
  ESTRUCTURA_RUBRICA,
  calcularCalificacionSeccion,
  calcularNotaFinal,
  inicializarRubricaVacia,
  validarRubricaCompleta,
  determinarResultadoFinal
} from '../util/calculo';

// Validación de entrada
const validateId = (id) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new Error('ID de rúbrica inválido');
  }
};

const validateDocenteId = (docenteId) => {
  if (!docenteId || (typeof docenteId !== 'number' && typeof docenteId !== 'string')) {
    throw new Error('ID de docente inválido');
  }
};

// Función para obtener todas las rúbricas
export const getRubricas = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get('/api/rubricas/get', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getRubricas:', error);
    throw error;
  }
};

// Función para obtener una rúbrica por su ID
export const getRubricaPorId = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/rubricas/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en getRubricaPorId:', error);
    throw error;
  }
};

// Función para obtener rúbricas por docente ID
export const getRubricasPorDocenteId = async (docenteId) => {
  try {
    validateDocenteId(docenteId);
    const response = await api.get(`/api/rubricas/docente/${docenteId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getRubricasPorDocenteId:', error);
    throw error;
  }
};

// Función para crear una rúbrica basada en calificaciones
export const crearRubrica = async (calificaciones) => {
  try {
    // Validar que todas las calificaciones necesarias estén presentes
    if (!validarRubricaCompleta(calificaciones)) {
      throw new Error('Faltan criterios de evaluación por completar');
    }
    
    // Calcular valores agregados para cada sección
    const presentacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.presentacion);
    const sustentacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.sustentacion);
    const documentacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.documentacion);
    const innovacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.innovacion);
    
    // Calcular nota final
    const nota_final = calcularNotaFinal(presentacion, sustentacion, documentacion, innovacion);
    
    // Determinar resultado (aprobado/reprobado)
    const resultado = determinarResultadoFinal(nota_final);
    
    // Crear objeto de rúbrica
    const rubricaData = {
      presentacion,
      sustentacion,
      documentacion,
      innovacion,
      nota_final,
      resultado,
      docente_id: calificaciones.docente_id,
      observaciones: calificaciones.observaciones || resultado,
      comentarios: calificaciones.comentarios || ''
    };
    
    // Enviar al servidor
    const response = await api.post('/api/rubricas/create', rubricaData);
    return response.data;
  } catch (error) {
    console.error('Error en crearRubrica:', error);
    throw error;
  }
};

// Función MODIFICADA para actualizar correctamente una rúbrica existente
export const actualizarRubrica = async (id, calificaciones) => {
  try {
    validateId(id);
    
    // Validar que todas las calificaciones necesarias estén presentes
    if (!validarRubricaCompleta(calificaciones)) {
      throw new Error('Faltan criterios de evaluación por completar');
    }
    
    // Calcular valores agregados para cada sección
    const presentacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.presentacion);
    const sustentacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.sustentacion);
    const documentacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.documentacion);
    const innovacion = calcularCalificacionSeccion(calificaciones, ESTRUCTURA_RUBRICA.innovacion);
    
    // Calcular nota final
    const nota_final = calcularNotaFinal(presentacion, sustentacion, documentacion, innovacion);
    
    // Determinar resultado (aprobado/reprobado)
    const resultado = determinarResultadoFinal(nota_final);
    
    // Crear objeto de rúbrica actualizado
    const rubricaData = {
      presentacion,
      sustentacion,
      documentacion,
      innovacion,
      nota_final,
      resultado,
      docente_id: calificaciones.docente_id,
      observaciones: calificaciones.observaciones || resultado,
      comentarios: calificaciones.comentarios || ''
    };
    
    // Enviar al servidor
    const response = await api.put(`/api/rubricas/update/${id}`, rubricaData);
    
    // Verificar si la actualización fue exitosa
    if (!response.data) {
      throw new Error(`Error al actualizar la rúbrica ${id}: No se recibió respuesta del servidor`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en actualizarRubrica:', error);
    throw error;
  }
};

// Función para eliminar una rúbrica
export const eliminarRubrica = async (id) => {
  try {
    validateId(id);
    const response = await api.delete(`/api/rubricas/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en eliminarRubrica:', error);
    throw error;
  }
};

// Función para obtener la estructura de la rúbrica predefinida
export const getEstructuraRubrica = () => {
  return ESTRUCTURA_RUBRICA;
};

// Función para inicializar una rúbrica con valores vacíos
export const inicializarRubricaVaciaConDocente = (docenteId) => {
  const rubricaVacia = inicializarRubricaVacia();
  rubricaVacia.docente_id = docenteId;
  rubricaVacia.observaciones = '';
  rubricaVacia.comentarios = '';
  
  return rubricaVacia;
};

// FUNCIÓN PARA CONVERTIR UNA RÚBRICA AL FORMATO DE CALIFICACIONES INDIVIDUALES
export const rubricaACriterios = (rubrica) => {
  if (!rubrica) return null;
  
  // Crear objeto base con datos del docente
  const criterios = {
    docente_id: rubrica.docente_id,
    observaciones: rubrica.observaciones || '',
    comentarios: rubrica.comentarios || ''
  };
  
  // Para la sección de presentación
  Object.values(ESTRUCTURA_RUBRICA.presentacion.criterios).forEach(criterio => {
    // Asignar el mismo valor de la sección a todos los criterios
    // Se podría refinar este algoritmo para una distribución más precisa
    criterios[criterio.id] = convertirNumeroACalificacion(rubrica.presentacion);
  });
  
  // Para la sección de sustentación
  Object.values(ESTRUCTURA_RUBRICA.sustentacion.criterios).forEach(criterio => {
    criterios[criterio.id] = convertirNumeroACalificacion(rubrica.sustentacion);
  });
  
  // Para la sección de documentación
  Object.values(ESTRUCTURA_RUBRICA.documentacion.criterios).forEach(criterio => {
    criterios[criterio.id] = convertirNumeroACalificacion(rubrica.documentacion);
  });
  
  // Para la sección de innovación
  Object.values(ESTRUCTURA_RUBRICA.innovacion.criterios).forEach(criterio => {
    criterios[criterio.id] = convertirNumeroACalificacion(rubrica.innovacion);
  });
  
  return criterios;
};

// Función auxiliar para convertir una nota numérica a calificación textual
export const convertirNumeroACalificacion = (nota) => {
  if (nota >= 9.5) return "SOBRESALIENTE";
  if (nota >= 8.5) return "EXCELENTE";
  if (nota >= 7.5) return "MUY BUENO";
  if (nota >= 6.5) return "BUENO";
  if (nota >= 5.5) return "SATISFACTORIO";
  if (nota >= 4.5) return "ACEPTABLE";
  if (nota >= 3.5) return "BÁSICAMENTE ACEPTABLE";
  if (nota >= 2.5) return "INSUFICIENTE";
  if (nota >= 1.5) return "DEFICIENTE";
  return "MUY DEFICIENTE";
};

// Función para convertir una rúbrica del backend al formato detallado con calificaciones por criterio
export const convertirRubricaADetallada = (rubrica) => {
  // Esta función sería útil si necesitamos reconstruir las calificaciones individuales
  // a partir de los datos agregados almacenados en la base de datos
  
  // Por ahora retornamos solo un esqueleto con las secciones principales
  return {
    docente_id: rubrica.docente_id,
    observaciones: rubrica.observaciones || '',
    comentarios: rubrica.comentarios || '',
    resultado: rubrica.resultado || determinarResultadoFinal(rubrica.nota_final),
    presentacion: rubrica.presentacion,
    sustentacion: rubrica.sustentacion,
    documentacion: rubrica.documentacion,
    innovacion: rubrica.innovacion,
    nota_final: rubrica.nota_final
  };
};

export default {
  getRubricas,
  getRubricaPorId,
  getRubricasPorDocenteId,
  crearRubrica,
  actualizarRubrica,
  eliminarRubrica,
  getEstructuraRubrica,
  inicializarRubricaVaciaConDocente,
  convertirRubricaADetallada,
  rubricaACriterios,
  convertirNumeroACalificacion
};