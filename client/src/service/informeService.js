import api from './api';
import { 
  determinarResultadoFinal,
  validarRubricaCompleta
} from '../util/calculo';
import { crearRubrica, actualizarRubrica, getRubricaPorId, rubricaACriterios } from './rubricaService';
import { 
  crearCalificacionAsociada, 
  actualizarCalificacion, 
  getCalificacionPorId, 
  eliminarCalificacion 
} from './calificacionService';
import { eliminarRubrica } from './rubricaService';
import { getBorradorPorDocenteYGrupo } from './borradorService';

// Validación de entrada
const validateId = (id) => {
  if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
    throw new Error('ID de informe inválido');
  }
};

const validateGrupoId = (grupoId) => {
  if (!grupoId || (typeof grupoId !== 'number' && typeof grupoId !== 'string')) {
    throw new Error('ID de grupo inválido');
  }
};

const validateEstudianteId = (estudianteId) => {
  if (!estudianteId || (typeof estudianteId !== 'number' && typeof estudianteId !== 'string')) {
    throw new Error('ID de estudiante inválido');
  }
};

const validateDocenteId = (docenteId) => {
  if (!docenteId || (typeof docenteId !== 'number' && typeof docenteId !== 'string')) {
    throw new Error('ID de docente inválido');
  }
};

const validateCalificacionId = (calificacionId) => {
  if (!calificacionId || (typeof calificacionId !== 'number' && typeof calificacionId !== 'string')) {
    throw new Error('ID de calificación inválido');
  }
};

const validateRubricaId = (rubricaId) => {
  if (!rubricaId || (typeof rubricaId !== 'number' && typeof rubricaId !== 'string')) {
    throw new Error('ID de rúbrica inválido');
  }
};

// Validación de campos de informe
const validateInformeData = (informeData) => {
  const requiredFields = [
    'grupo_id', 
    'estudiante_id', 
    'docente_id'
  ];
  
  for (const field of requiredFields) {
    if (informeData[field] === undefined || informeData[field] === null) {
      throw new Error(`El campo ${field} es obligatorio`);
    }
  }
  
  validateGrupoId(informeData.grupo_id);
  validateEstudianteId(informeData.estudiante_id);
  validateDocenteId(informeData.docente_id);
  
  // Validar rubrica_id o calificacion_id si están presentes
  if (informeData.rubrica_id) {
    validateRubricaId(informeData.rubrica_id);
  }
  
  if (informeData.calificacion_id) {
    validateCalificacionId(informeData.calificacion_id);
  }
};

// Función para obtener todos los informes con paginación y filtrado opcional
export const getInformes = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get('/api/informe/get', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getInformes:', error);
    throw error;
  }
};

// Función para obtener un informe por su ID con validación
export const getInformePorId = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/api/informe/get/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en getInformePorId:', error);
    throw error;
  }
};

// Función para crear un nuevo informe con validación de datos
export const crearInforme = async (informeData) => {
  try {
    validateInformeData(informeData);
    
    const response = await api.post('/api/informe/create', informeData);
    return response.data;
  } catch (error) {
    console.error('Error en crearInforme:', error);
    throw error;
  }
};

// Función para actualizar un informe existente con validación
export const actualizarInforme = async (id, informeData) => {
  try {
    validateId(id);
    validateInformeData(informeData);
    
    const response = await api.put(`/api/informe/update/${id}`, informeData);
    return response.data;
  } catch (error) {
    console.error('Error en actualizarInforme:', error);
    throw error;
  }
};

// Función para eliminar un informe por su ID con validación adicional
export const eliminarInforme = async (id) => {
  try {
    validateId(id);
    
    const response = await api.delete(`/api/informe/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en eliminarInforme:', error);
    throw error;
  }
};

// Función para obtener informes por grupo ID
export const getInformesPorGrupoId = async (grupoId) => {
  try {
    validateGrupoId(grupoId);
    const response = await api.get(`/api/informe/grupo/${grupoId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getInformesPorGrupoId:', error);
    throw error;
  }
};

// Función para obtener informes por estudiante ID
export const getInformesPorEstudianteId = async (estudianteId) => {
  try {
    validateEstudianteId(estudianteId);
    const response = await api.get(`/api/informe/estudiante/${estudianteId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getInformesPorEstudianteId:', error);
    throw error;
  }
};

// Función para obtener informes por docente ID
export const getInformesPorDocenteId = async (docenteId) => {
  try {
    validateDocenteId(docenteId);
    const response = await api.get(`/api/informe/docente/${docenteId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getInformesPorDocenteId:', error);
    throw error;
  }
};

// Verificar si un grupo tiene habilitación activa
const verificarGrupoHabilitado = async (grupoId) => {
  try {
    const response = await api.get(`/api/supervisores/rubricas/grupo/${grupoId}`);
    return response.data && response.data.grupo && response.data.grupo.habilitacion_activa === true;
  } catch (error) {
    console.error('Error al verificar habilitación de grupo:', error);
    return false;
  }
};

// FUNCIÓN MODIFICADA: Cargar datos completos de evaluación para edición
export const cargarDatosEvaluacionExistente = async (grupoId, estudiantes) => {
  try {
    validateGrupoId(grupoId);
    
    // 1. Verificar si el grupo tiene habilitación activa
    const grupoHabilitado = await verificarGrupoHabilitado(grupoId);
    
    // 2. Obtener informes asociados al grupo
    const informes = await getInformesPorGrupoId(grupoId);
    
    if (!informes || informes.length === 0) {
      // No hay evaluaciones previas
      return {
        informes: [],
        tieneEvaluacionPrevia: false,
        calificacionesPorEstudiante: {}
      };
    }
    
    // 3. Preparar estructura para almacenar los datos de evaluación
    const calificacionesPorEstudiante = {};
    const informesCompletos = [];
    
    // 4. Obtener el ID del docente del primer informe (asumimos que todos los informes tienen el mismo docente)
    let docenteId = null;
    if (informes.length > 0) {
      docenteId = informes[0].docente_id;
    }
    
    // 5. Si el grupo está habilitado, buscar primero los datos en la tabla de borradores
    if (grupoHabilitado && docenteId) {
      try {
        const borrador = await getBorradorPorDocenteYGrupo(docenteId, grupoId);
        
        if (borrador && borrador.contenido) {
          
          // Usamos directamente el contenido del borrador, que tiene los criterios originales
          const contenidoBorrador = borrador.contenido;
          
          // Para cada estudiante en el borrador
          Object.keys(contenidoBorrador).forEach(estudianteId => {
            // Buscar el informe correspondiente
            const informe = informes.find(inf => inf.estudiante_id.toString() === estudianteId.toString());
            
            if (informe) {
              // Extraer metadatos de los informes, pero usar los criterios del borrador
              calificacionesPorEstudiante[estudianteId] = {
                ...contenidoBorrador[estudianteId],
                _rubrica_id: informe.rubrica_id,
                _calificacion_id: informe.calificacion_id,
                _informe_id: informe.id
              };
              
              // También agregamos el informe a la lista de informes completos
              const informeCompleto = {
                ...informe,
                criterios_originales: contenidoBorrador[estudianteId]
              };
              
              informesCompletos.push(informeCompleto);
            }
          });
          
          return {
            informes: informesCompletos,
            tieneEvaluacionPrevia: true,
            calificacionesPorEstudiante,
            fuenteDatos: 'borrador'
          };
        }
      } catch (error) {
        console.error('Error al cargar borrador:', error);
      }
    }
    console.log("Siguiendo flujo original de carga de datos...");
    
    // Para cada informe, obtener la rúbrica y calificación
    for (const informe of informes) {
      try {
        // Obtener la rúbrica
        const rubrica = await getRubricaPorId(informe.rubrica_id);
        
        // Obtener la calificación
        const calificacion = await getCalificacionPorId(informe.calificacion_id);
        
        // Encontrar el estudiante correspondiente
        const estudianteId = informe.estudiante_id;
        
        // Si el grupo está habilitado, intentamos ser más precisos en la conversión
        if (grupoHabilitado) {
          // Para grupos habilitados, intentamos usar datos más precisos
          // Aquí solo usaremos rubricaACriterios como fallback
          console.warn("Advertencia: Usando conversión aproximada para grupo habilitado");
        }
        
        // Convertir la rúbrica a formato de criterios individuales (aproximado)
        const criterios = rubricaACriterios(rubrica);
        
        if (criterios) {
          // Almacenar en el objeto de calificaciones por estudiante
          calificacionesPorEstudiante[estudianteId] = {
            ...criterios,
            // Añadir información de IDs para actualización
            _rubrica_id: rubrica.id,
            _calificacion_id: calificacion.id,
            _informe_id: informe.id
          };
          
          // Añadir el informe completo a la lista
          informesCompletos.push({
            ...informe,
            rubrica,
            calificacion
          });
        }
      } catch (error) {
        console.error(`Error al cargar datos para informe ${informe.id}:`, error);
      }
    }
    
    return {
      informes: informesCompletos,
      tieneEvaluacionPrevia: informesCompletos.length > 0,
      calificacionesPorEstudiante,
      fuenteDatos: 'aproximado'
    };
  } catch (error) {
    console.error('Error en cargarDatosEvaluacionExistente:', error);
    throw error;
  }
};

// Función para obtener informes detallados con datos de estudiantes, grupos y rúbricas
export const getInformesDetallados = async (page = 1, limit = 10, filters = {}) => {
  try {
    // Esta función requeriría un endpoint adicional en el backend que haga un JOIN
    // entre las tablas informes, estudiantes, grupos y rubricas
    const response = await api.get('/api/informe/detallados', {
      params: {
        page,
        limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error en getInformesDetallados:', error);
    throw error;
  }
};

// FUNCIÓN MODIFICADA: Evaluar a un estudiante (actualiza directamente las entidades existentes)
export const evaluarEstudiante = async (grupo_id, estudiante_id, docente_id, calificaciones, asignatura, comentarios_generales = '') => {
  try {
    // Validar que todas las calificaciones necesarias estén presentes
    if (!validarRubricaCompleta(calificaciones)) {
      throw new Error('Faltan criterios de evaluación por completar');
    }
    
    // Agregar docente_id a las calificaciones
    calificaciones.docente_id = docente_id;
    
    // MODIFICACIÓN: Verificar si estamos en modo edición
    const modoEdicion = calificaciones._rubrica_id && calificaciones._calificacion_id && calificaciones._informe_id;
    
    let rubricaResultado, calificacionResultado, informeResultado;
    
    if (modoEdicion) {
      // CAMBIO PRINCIPAL: Actualizamos correctamente los registros existentes
      // 1. Actualizar la rúbrica
      rubricaResultado = await actualizarRubrica(calificaciones._rubrica_id, calificaciones);
      
      // 2. Actualizar la calificación
      const calificacionData = {
        gestion: new Date().getFullYear().toString(),
        periodo: new Date().getMonth() < 6 ? "I" : "II",
        fecha: new Date().toISOString(),
        asignatura,
        rubrica_id: rubricaResultado.id,
        docente_id,
        estudiante_id
      };
      
      calificacionResultado = await actualizarCalificacion(calificaciones._calificacion_id, calificacionData);
      
      // 3. Actualizar el informe
      const informeData = {
        grupo_id,
        estudiante_id,
        docente_id,
        rubrica_id: rubricaResultado.id,
        calificacion_id: calificacionResultado.id,
        comentarios_generales,
        resultado: determinarResultadoFinal(rubricaResultado.nota_final)
      };
      
      informeResultado = await actualizarInforme(calificaciones._informe_id, informeData);
    } else {
      // Flujo original: crear nuevas entidades
      // 1. Primero creamos la rúbrica con las calificaciones
      rubricaResultado = await crearRubrica(calificaciones);
      if (!rubricaResultado) {
        throw new Error('Error al crear la rúbrica');
      }
      
      // 2. Creamos una calificación que asocie la rúbrica con el estudiante
      calificacionResultado = await crearCalificacionAsociada(
        docente_id,
        estudiante_id,
        rubricaResultado.id,
        asignatura
      );
      if (!calificacionResultado) {
        throw new Error('Error al crear la calificación');
      }
      
      // 3. Luego creamos el informe que relaciona todo
      const informeData = {
        grupo_id,
        estudiante_id,
        docente_id,
        rubrica_id: rubricaResultado.id,
        calificacion_id: calificacionResultado.id,
        comentarios_generales,
        resultado: determinarResultadoFinal(rubricaResultado.nota_final)
      };
      
      informeResultado = await crearInforme(informeData);
    }
    
    // Devolver un objeto con todos los elementos creados/actualizados
    return {
      rubrica: rubricaResultado,
      calificacion: calificacionResultado,
      informe: informeResultado,
      modo: modoEdicion ? 'actualizado' : 'creado'
    };
  } catch (error) {
    console.error('Error en evaluarEstudiante:', error);
    throw error;
  }
};

// Función para evaluar a todos los estudiantes de un grupo
export const evaluarGrupo = async (grupo_id, docente_id, estudiantes, calificacionesGrupo, asignatura, comentarios_generales = '') => {
  try {
    const resultados = [];
    
    // Para cada estudiante en el grupo
    for (const estudiante of estudiantes) {
      // Verificar si tiene calificaciones individuales
      const calificacionesEstudiante = calificacionesGrupo[estudiante.id] || calificacionesGrupo;
      
      // Evaluar al estudiante
      const resultado = await evaluarEstudiante(
        grupo_id, 
        estudiante.id, 
        docente_id, 
        calificacionesEstudiante,
        asignatura, 
        comentarios_generales
      );
      
      resultados.push({
        estudiante_id: estudiante.id,
        nombre_estudiante: `${estudiante.nombre} ${estudiante.apellido}`,
        codigo_estudiante: estudiante.codigo,
        rubrica_id: resultado.rubrica.id,
        calificacion_id: resultado.calificacion.id,
        informe_id: resultado.informe.id,
        nota_final: resultado.rubrica.nota_final,
        resultado: resultado.informe.resultado,
        modo: resultado.modo
      });
    }
    
    return resultados;
  } catch (error) {
    console.error('Error en evaluarGrupo:', error);
    throw error;
  }
};

/**
 * Elimina todas las rúbricas, informes y calificaciones asociadas a un grupo
 * @param {number|string} grupoId - ID del grupo
 * @returns {Promise<Object>} - Objeto con resumen de eliminaciones
 */
export const eliminarRubricasGrupo = async (grupoId) => {
  try {
    validateGrupoId(grupoId);
    
    // 1. Obtener todos los informes asociados al grupo
    const informes = await getInformesPorGrupoId(grupoId);
    
    if (!informes || informes.length === 0) {
      return { 
        success: true, 
        message: 'No hay evaluaciones para eliminar', 
        eliminados: {
          informes: 0,
          rubricas: 0,
          calificaciones: 0
        }
      };
    }
    
    // 2. Crear contadores para tracking
    const eliminados = {
      informes: 0,
      rubricas: 0,
      calificaciones: 0
    };
    
    // 3. Para cada informe, eliminar rúbrica y calificación asociadas
    for (const informe of informes) {
      try {
        // Almacenar IDs antes de eliminar el informe
        const rubricaId = informe.rubrica_id;
        const calificacionId = informe.calificacion_id;
        
        // Eliminar el informe
        await eliminarInforme(informe.id);
        eliminados.informes++;
        
        // Eliminar la calificación si existe
        if (calificacionId) {
          try {
            await eliminarCalificacion(calificacionId);
            eliminados.calificaciones++;
          } catch (error) {
            console.error(`Error al eliminar calificación ${calificacionId}:`, error);
          }
        }
        
        // Eliminar la rúbrica si existe
        if (rubricaId) {
          try {
            await eliminarRubrica(rubricaId);
            eliminados.rubricas++;
          } catch (error) {
            console.error(`Error al eliminar rúbrica ${rubricaId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error al procesar informe ${informe.id}:`, error);
      }
    }
    
    return {
      success: true,
      message: `Se eliminaron ${eliminados.informes} informes, ${eliminados.rubricas} rúbricas y ${eliminados.calificaciones} calificaciones.`,
      eliminados
    };
  } catch (error) {
    console.error('Error en eliminarRubricasGrupo:', error);
    throw error;
  }
};

export default {
  getInformes,
  getInformePorId,
  crearInforme,
  actualizarInforme,
  eliminarInforme,
  getInformesPorGrupoId,
  getInformesPorEstudianteId,
  getInformesPorDocenteId,
  getInformesDetallados,
  evaluarEstudiante,
  evaluarGrupo,
  eliminarRubricasGrupo,
  cargarDatosEvaluacionExistente,
  verificarGrupoHabilitado
};