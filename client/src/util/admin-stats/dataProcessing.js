// src/util/admin-stats/dataProcessing.js

// Importar servicios
import { getDocentes } from '../../service/docenteService';
import { getGrupos } from '../../service/grupoService';
import { 
  getEstudiantes, 
  getEstudiantesByCarrera, 
  getEstudiantesBySemestre, 
  getEstudiantesBySemestreYCarrera,
  getEstudiantesByMateria, // Nuevo endpoint
  getEstudiantesByGrupoId
} from '../../service/estudianteService';
import { getInformesPorGrupoId } from '../../service/informeService';
import { getRubricaPorId } from '../../service/rubricaService';

// Importar catálogos de materias
import MATERIAS_POR_SEMESTRE from '../../util/materias/materias_sis';
import MATERIAS_POR_SEMESTRE_ETN from '../../util/materias/materias_etn';
import MATERIAS_POR_SEMESTRE_AGRO from '../../util/materias/materias_agro';
import MATERIAS_POR_SEMESTRE_BASICAS from '../../util/materias/materias_basic';
import MATERIAS_POR_SEMESTRE_COM from '../../util/materias/materias_com';
import MATERIAS_POR_SEMESTRE_CIVIL from '../../util/materias/materias_cvil';

// Importar constantes
import { ESTADOS } from './constants';

/**
 * Cargar todos los datos necesarios para las estadísticas del administrador
 * @returns {Promise<Object>} Objeto con todos los datos cargados y organizados
 */
export const cargarDatosCompletos = async () => {
  try {
    // 1. Cargar datos básicos en paralelo
    const [todosLosDocentes, todosLosGrupos, todosLosEstudiantes] = await Promise.all([
      getDocentes(),
      getGrupos(),
      getEstudiantes()
    ]);
    
    // 2. Configurar catálogo completo de materias
    const catalogoMaterias = {
      'Ingeniería de Sistemas': MATERIAS_POR_SEMESTRE,
      'Sistemas Electronicos': MATERIAS_POR_SEMESTRE_ETN,
      'Ingeniería Agroindustrial': MATERIAS_POR_SEMESTRE_AGRO,
      'Ciencias Básicas': MATERIAS_POR_SEMESTRE_BASICAS,
      'Ingeniería Comercial': MATERIAS_POR_SEMESTRE_COM,
      'Ingeniería Civil': MATERIAS_POR_SEMESTRE_CIVIL
    };
    
    // 3. Cargar datos de evaluación para cada grupo
    const gruposConDatos = await cargarDatosEvaluacionPorGrupo(todosLosGrupos);
    
    // 4. Organizar estudiantes por carrera, semestre y grupo (incluyendo estado de evaluación)
    const estudiantesOrganizados = await organizarEstudiantesConEstado(todosLosEstudiantes, gruposConDatos);
    
    // 5. Crear estructura jerárquica
    const estructuraJerarquica = await crearEstructuraJerarquica(
      catalogoMaterias,
      todosLosDocentes,
      gruposConDatos,
      estudiantesOrganizados
    );
    
    return {
      docentes: todosLosDocentes,
      grupos: gruposConDatos,
      estudiantes: estudiantesOrganizados,
      catalogoMaterias,
      estructuraJerarquica,
      metadatos: {
        fechaCarga: new Date().toISOString(),
        totalDocentes: todosLosDocentes.length,
        totalGrupos: todosLosGrupos.length,
        totalEstudiantes: todosLosEstudiantes.length
      }
    };
  } catch (error) {
    console.error('Error al cargar datos completos:', error);
    throw new Error('No se pudieron cargar los datos del sistema: ' + error.message);
  }
};

/**
 * Cargar datos de evaluación para cada grupo
 * @param {Array} grupos - Lista de todos los grupos
 * @returns {Promise<Array>} Grupos con datos de evaluación cargados
 */
const cargarDatosEvaluacionPorGrupo = async (grupos) => {
  const gruposConDatos = await Promise.all(grupos.map(async (grupo) => {
    try {
      // Cargar informes del grupo
      const informes = await getInformesPorGrupoId(grupo.id);
      
      // Cargar rúbricas asociadas a los informes
      const informesConRubricas = await Promise.all(informes.map(async (informe) => {
        try {
          const rubrica = informe.rubrica_id ? 
            await getRubricaPorId(informe.rubrica_id) : null;
          
          return {
            ...informe,
            rubrica
          };
        } catch (error) {
          console.error(`Error al cargar rúbrica para informe ${informe.id}:`, error);
          return {
            ...informe,
            rubrica: null
          };
        }
      }));
      
      // Determinar estado del grupo
      const estadoGrupo = determinarEstadoGrupo(grupo, informesConRubricas);
      
      return {
        ...grupo,
        informes: informesConRubricas,
        estado: estadoGrupo,
        metadatos: {
          totalInformes: informesConRubricas.length,
          informesConRubrica: informesConRubricas.filter(i => i.rubrica).length,
          fechaUltimaEvaluacion: obtenerFechaUltimaEvaluacion(informesConRubricas)
        }
      };
    } catch (error) {
      console.error(`Error al cargar datos para grupo ${grupo.id}:`, error);
      return {
        ...grupo,
        informes: [],
        estado: ESTADOS.grupo.sinRubrica,
        metadatos: {
          error: error.message
        }
      };
    }
  }));
  
  return gruposConDatos;
};

/**
 * Organizar estudiantes por carrera, semestre y estado de evaluación
 * Versión mejorada que evita duplicaciones y asegura que todos los estados se incluyan
 * @param {Array} estudiantes - Lista de todos los estudiantes
 * @param {Array} grupos - Grupos con datos de evaluación
 * @returns {Object} Estudiantes organizados por diferentes criterios
 */
const organizarEstudiantesConEstado = async (estudiantes, grupos) => {
  // Crear mapas de búsqueda rápida
  const estudiantesPorId = new Map(estudiantes.map(e => [e.id, e]));
  const gruposPorId = new Map(grupos.map(g => [g.id, g]));
  
  // Organizar por carrera y semestre
  const porCarreraYSemestre = {};
  
  // Organizar por grupo
  const porGrupo = {};
  
  // Organizar por estado
  const porEstado = {
    [ESTADOS.evaluacion.completa]: [],  // Estudiantes evaluados y aprobados
    [ESTADOS.evaluacion.pendiente]: [], // Estudiantes en grupos pero sin evaluación
    [ESTADOS.evaluacion.sinGrupo]: [],  // Estudiantes sin asignar a ningún grupo
    [ESTADOS.evaluacion.sinRubrica]: [] // Estudiantes en grupos sin rúbricas
  };
  
  // 1. Primero, cada estudiante comienza sin grupo
  estudiantes.forEach(estudiante => {
    estudiante.estado = ESTADOS.evaluacion.sinGrupo;
    porEstado[ESTADOS.evaluacion.sinGrupo].push(estudiante);
  });
  
  // 2. Para cada grupo, obtener los estudiantes asignados
  for (const grupo of grupos) {
    try {
      const estudiantesGrupo = await getEstudiantesByGrupoId(grupo.id);
      
      // Crear mapa para informes de este grupo
      const informesPorEstudiante = new Map();
      if (grupo.informes) {
        grupo.informes.forEach(informe => {
          informesPorEstudiante.set(informe.estudiante_id, informe);
        });
      }
      
      // Inicializar array para este grupo
      porGrupo[grupo.id] = [];
      
      // Procesar cada estudiante del grupo
      estudiantesGrupo.forEach(estudiante => {
        const estudianteCompleto = estudiantesPorId.get(estudiante.id);
        if (!estudianteCompleto) return; // Si no existe en la lista general, omitir
        
        // Obtener informe si existe
        const informe = informesPorEstudiante.get(estudiante.id);
        
        // Determinar estado del estudiante
        let estado;
        if (!informe) {
          estado = ESTADOS.evaluacion.pendiente;
        } else if (!informe.rubrica) {
          estado = ESTADOS.evaluacion.sinRubrica;
        } else {
          estado = ESTADOS.evaluacion.completa;
        }
        
        // Actualizar estado del estudiante si es más "avanzado" que el actual
        // (completa > sinRubrica > pendiente > sinGrupo)
        const cambiarEstado = 
          (estado === ESTADOS.evaluacion.completa) || 
          (estado === ESTADOS.evaluacion.sinRubrica && estudianteCompleto.estado !== ESTADOS.evaluacion.completa) ||
          (estado === ESTADOS.evaluacion.pendiente && 
            estudianteCompleto.estado !== ESTADOS.evaluacion.completa && 
            estudianteCompleto.estado !== ESTADOS.evaluacion.sinRubrica);
        
        if (cambiarEstado) {
          // Eliminar de su estado anterior
          const indiceAnterior = porEstado[estudianteCompleto.estado].findIndex(e => e.id === estudiante.id);
          if (indiceAnterior >= 0) {
            porEstado[estudianteCompleto.estado].splice(indiceAnterior, 1);
          }
          
          // Actualizar estado y agregar al nuevo array
          estudianteCompleto.estado = estado;
          porEstado[estado].push(estudianteCompleto);
        }
        
        // Añadir a la lista del grupo
        porGrupo[grupo.id].push({
          ...estudianteCompleto,
          estado,
          informe
        });
        
        // Organizar por carrera y semestre
        const { carrera, semestre } = estudiante;
        
        if (!porCarreraYSemestre[carrera]) {
          porCarreraYSemestre[carrera] = {};
        }
        if (!porCarreraYSemestre[carrera][semestre]) {
          porCarreraYSemestre[carrera][semestre] = [];
        }
        
        // Evitar duplicados en la lista de carrera/semestre
        const yaExiste = porCarreraYSemestre[carrera][semestre].some(e => e.id === estudiante.id);
        if (!yaExiste) {
          porCarreraYSemestre[carrera][semestre].push({
            ...estudianteCompleto,
            estado,
            informe
          });
        }
      });
    } catch (error) {
      console.error(`Error al procesar estudiantes para grupo ${grupo.id}:`, error);
    }
  }
  
  console.log('Estudiantes organizados:', {
    totalCarreras: Object.keys(porCarreraYSemestre).length,
    totalGrupos: Object.keys(porGrupo).length,
    porEstado: {
      completa: porEstado[ESTADOS.evaluacion.completa].length,
      pendiente: porEstado[ESTADOS.evaluacion.pendiente].length,
      sinGrupo: porEstado[ESTADOS.evaluacion.sinGrupo].length,
      sinRubrica: porEstado[ESTADOS.evaluacion.sinRubrica].length
    }
  });
  
  return {
    porCarreraYSemestre,
    porGrupo,
    porEstado,
    porId: estudiantesPorId
  };
};

/**
 * Crear estructura jerárquica de datos para facilitar navegación y filtrado
 * @param {Object} catalogoMaterias - Catálogo de materias
 * @param {Array} docentes - Lista de docentes
 * @param {Array} grupos - Grupos con datos de evaluación
 * @param {Object} estudiantesOrganizados - Estudiantes organizados
 * @returns {Object} Estructura jerárquica completa
 */
const crearEstructuraJerarquica = async (
  catalogoMaterias,
  docentes,
  grupos,
  estudiantesOrganizados
) => {
  
  const estructura = {};
  
  // Crear mapas de referencia
  const docentesPorId = new Map(docentes.map(d => [d.id, d]));
  const gruposPorMateria = new Map();
  
  // Organizar grupos por materia
  grupos.forEach(grupo => {
    const key = `${grupo.carrera}-${grupo.semestre}-${grupo.materia}`;
    if (!gruposPorMateria.has(key)) {
      gruposPorMateria.set(key, []);
    }
    gruposPorMateria.get(key).push(grupo);
  });
  
  // Construir estructura jerárquica
  Object.entries(catalogoMaterias).forEach(([carrera, semestres]) => {
    if (!estructura[carrera]) {
      estructura[carrera] = {};
    }
    
    Object.entries(semestres).forEach(([semestre, materias]) => {
      const semestreNum = parseInt(semestre);
      if (!estructura[carrera][semestreNum]) {
        estructura[carrera][semestreNum] = {};
      }
      
      materias.forEach(materia => {
        const key = `${carrera}-${semestreNum}-${materia}`;
        const gruposMateria = gruposPorMateria.get(key) || [];
        
        // Identificar docentes de esta materia
        const docentesMateria = new Map();
        gruposMateria.forEach(grupo => {
          if (grupo.docente_id) {
            const docente = docentesPorId.get(grupo.docente_id);
            if (docente) {
              if (!docentesMateria.has(docente.id)) {
                docentesMateria.set(docente.id, {
                  ...docente,
                  grupos: []
                });
              }
              docentesMateria.get(docente.id).grupos.push(grupo);
            }
          }
        });
        
        // Calcular estadísticas de la materia
        const estadisticasMateria = calcularEstadisticasMateria(
          materia,
          carrera,
          semestreNum,
          gruposMateria,
          estudiantesOrganizados
        );
        
        // Agregar a la estructura
        estructura[carrera][semestreNum][materia] = {
          nombre: materia,
          carrera,
          semestre: semestreNum,
          docentes: Array.from(docentesMateria.values()),
          grupos: gruposMateria,
          estadisticas: estadisticasMateria,
          tieneDatos: gruposMateria.length > 0
        };
      });
    });
  });
  
  console.log('Estructura jerárquica creada completamente');
  return estructura;
};

/**
 * Calcular estadísticas específicas para una materia
 * @param {string} materia - Nombre de la materia
 * @param {string} carrera - Carrera
 * @param {number} semestre - Semestre
 * @param {Array} grupos - Grupos de la materia
 * @param {Object} estudiantesOrganizados - Estudiantes organizados
 * @returns {Object} Estadísticas de la materia
 */
const calcularEstadisticasMateria = (
  materia,
  carrera,
  semestre,
  grupos,
  estudiantesOrganizados
) => {
  // Buscar datos de estudiantes para esta carrera/semestre
  const estudiantesCarreraSemestre = 
    estudiantesOrganizados.porCarreraYSemestre[carrera]?.[semestre] || [];
  
  // Contar estudiantes por grupo
  let totalEstudiantesMateria = 0;
  let estudiantesEvaluados = 0;
  let estudiantesPendientes = 0;
  let estudiantesAprobados = 0;
  let estudiantesReprobados = 0;
  
  // Contar estudiantes únicos por su ID
  const estudiantesUnicos = new Set();
  
  grupos.forEach(grupo => {
    const estudiantesGrupo = estudiantesOrganizados.porGrupo[grupo.id] || [];
    
    estudiantesGrupo.forEach(estudiante => {
      // Solo contar cada estudiante una vez
      if (!estudiantesUnicos.has(estudiante.id)) {
        estudiantesUnicos.add(estudiante.id);
        totalEstudiantesMateria++;
        
        // Contar por estado
        if (estudiante.estado === ESTADOS.evaluacion.completa) {
          estudiantesEvaluados++;
          
          // Verificar aprobado/reprobado
          const informe = estudiante.informe;
          if (informe?.rubrica?.observaciones === 'APROBADO' || 
              (informe?.rubrica?.nota_final && Number(informe.rubrica.nota_final) >= 5.1)) {
            estudiantesAprobados++;
          } else {
            estudiantesReprobados++;
          }
        } else {
          estudiantesPendientes++;
        }
      }
    });
  });
  
  // Calcular promedios si hay datos
  let promedios = null;
  if (estudiantesEvaluados > 0) {
    promedios = calcularPromediosMateria(grupos);
  }
  
  return {
    totalEstudiantes: totalEstudiantesMateria,
    estudiantesEvaluados,
    estudiantesPendientes,
    estudiantesAprobados,
    estudiantesReprobados,
    tasaCobertura: totalEstudiantesMateria > 0 ? 
      (estudiantesEvaluados / totalEstudiantesMateria) : 0,
    tasaAprobacion: estudiantesEvaluados > 0 ?
      (estudiantesAprobados / estudiantesEvaluados) : 0,
    tasaReprobacion: estudiantesEvaluados > 0 ?
      (estudiantesReprobados / estudiantesEvaluados) : 0,
    promedios,
    totalGrupos: grupos.length,
    totalDocentes: new Set(grupos.map(g => g.docente_id).filter(Boolean)).size
  };
};

/**
 * Calcular promedios para una materia específica
 * @param {Array} grupos - Grupos de la materia
 * @returns {Object} Promedios calculados
 */
const calcularPromediosMateria = (grupos) => {
  let sumaPresentacion = 0;
  let sumaSustentacion = 0;
  let sumaDocumentacion = 0;
  let sumaInnovacion = 0;
  let sumaNotaFinal = 0;
  let cantidadConDatos = 0;
  
  grupos.forEach(grupo => {
    if (grupo.informes) {
      grupo.informes.forEach(informe => {
        if (informe.rubrica) {
          sumaPresentacion += parseFloat(informe.rubrica.presentacion) || 0;
          sumaSustentacion += parseFloat(informe.rubrica.sustentacion) || 0;
          sumaDocumentacion += parseFloat(informe.rubrica.documentacion) || 0;
          sumaInnovacion += parseFloat(informe.rubrica.innovacion) || 0;
          sumaNotaFinal += parseFloat(informe.rubrica.nota_final) || 0;
          cantidadConDatos++;
        }
      });
    }
  });
  
  if (cantidadConDatos === 0) return null;
  
  return {
    presentacion: sumaPresentacion / cantidadConDatos,
    sustentacion: sumaSustentacion / cantidadConDatos,
    documentacion: sumaDocumentacion / cantidadConDatos,
    innovacion: sumaInnovacion / cantidadConDatos,
    notaFinal: sumaNotaFinal / cantidadConDatos,
    cantidadDatos: cantidadConDatos
  };
};

/**
 * Determinar el estado de un grupo basado en sus evaluaciones
 * @param {Object} grupo - Grupo a evaluar
 * @param {Array} informes - Informes del grupo con rúbricas cargadas
 * @returns {string} Estado del grupo
 */
const determinarEstadoGrupo = (grupo, informes) => {
  if (!informes || informes.length === 0) {
    return ESTADOS.grupo.sinRubrica;
  }
  
  const informesConRubrica = informes.filter(i => i.rubrica !== null);
  
  if (informesConRubrica.length === 0) {
    return ESTADOS.grupo.sinRubrica;
  } else if (informesConRubrica.length < informes.length) {
    return ESTADOS.grupo.pendiente;
  } else {
    return ESTADOS.grupo.finalizado;
  }
};

/**
 * Obtener la fecha de la última evaluación en un grupo
 * @param {Array} informes - Informes del grupo
 * @returns {string|null} Fecha de la última evaluación o null
 */
const obtenerFechaUltimaEvaluacion = (informes) => {
  if (!informes || informes.length === 0) return null;
  
  const fechas = informes
    .filter(i => i.createdAt || i.fecha || i.fecha_creacion)
    .map(i => new Date(i.createdAt || i.fecha || i.fecha_creacion))
    .filter(d => !isNaN(d.getTime()));
  
  if (fechas.length === 0) return null;
  
  return new Date(Math.max(...fechas)).toISOString();
};

/**
 * Cargar datos específicos para materia con nuevo endpoint
 * @param {string} materia - Nombre de la materia
 * @returns {Promise<Object>} Datos organizados de la materia
 */
export const cargarDatosPorMateria = async (materia) => {
  try {
    // Usar el nuevo endpoint para obtener estudiantes por materia con su estado
    const estudiantes = await getEstudiantesByMateria(materia);
    
    // Contar por estado
    let evaluados = 0;
    let pendientes = 0;
    let aprobados = 0;
    let reprobados = 0;
    
    estudiantes.forEach(est => {
      if (est.estado === 'PENDIENTE') {
        pendientes++;
      } else if (est.estado === 'APROBADO') {
        evaluados++;
        aprobados++;
      } else if (est.estado === 'REPROBADO') {
        evaluados++;
        reprobados++;
      }
    });
    
    return {
      estudiantes,
      totalEstudiantes: estudiantes.length,
      evaluados,
      pendientes,
      aprobados,
      reprobados,
      tasaCobertura: estudiantes.length > 0 ? evaluados / estudiantes.length : 0,
      tasaAprobacion: evaluados > 0 ? aprobados / evaluados : 0,
      tasaReprobacion: evaluados > 0 ? reprobados / evaluados : 0
    };
  } catch (error) {
    console.error(`Error al cargar datos para materia ${materia}:`, error);
    throw error;
  }
};

/**
 * Cargar datos para carrera y semestre evitando duplicaciones
 * @param {string} carrera - Carrera
 * @param {string} semestre - Semestre
 * @returns {Promise<Object>} Datos organizados
 */
export const cargarDatosPorCarreraYSemestre = async (carrera, semestre) => {
  try {
    // Usar el endpoint existente para obtener estudiantes únicos por semestre y carrera
    const estudiantes = await getEstudiantesBySemestreYCarrera(semestre, carrera);
    
    // Si necesitamos información de evaluación que no viene del backend, podríamos
    // cargar los grupos para esta combinación de carrera/semestre
    const grupos = await getGrupos();
    const gruposFiltrados = grupos.filter(g => 
      g.carrera === carrera && Number(g.semestre) === Number(semestre)
    );
    
    // Procesar grupos para obtener evaluaciones
    const gruposConDatos = await cargarDatosEvaluacionPorGrupo(gruposFiltrados);
    
    // Construir mapa de evaluaciones por estudiante
    const evaluacionesPorEstudiante = new Map();
    gruposConDatos.forEach(grupo => {
      if (grupo.informes) {
        grupo.informes.forEach(informe => {
          evaluacionesPorEstudiante.set(informe.estudiante_id, {
            informe,
            grupo
          });
        });
      }
    });
    
    // Enriquecer estudiantes con información de evaluación
    const estudiantesConEstado = estudiantes.map(est => {
      const evaluacion = evaluacionesPorEstudiante.get(est.id);
      let estado = 'PENDIENTE';
      
      if (evaluacion) {
        if (evaluacion.informe.rubrica) {
          const nota = evaluacion.informe.rubrica.nota_final;
          estado = nota >= 5.1 ? 'APROBADO' : 'REPROBADO';
        }
      }
      
      return {
        ...est,
        estado,
        evaluacion: evaluacion || null
      };
    });
    
    // Contar por estado
    let evaluados = 0;
    let pendientes = 0;
    let aprobados = 0;
    let reprobados = 0;
    
    estudiantesConEstado.forEach(est => {
      if (est.estado === 'PENDIENTE') {
        pendientes++;
      } else if (est.estado === 'APROBADO') {
        evaluados++;
        aprobados++;
      } else if (est.estado === 'REPROBADO') {
        evaluados++;
        reprobados++;
      }
    });
    
    return {
      estudiantes: estudiantesConEstado,
      totalEstudiantes: estudiantesConEstado.length,
      evaluados,
      pendientes,
      aprobados,
      reprobados,
      tasaCobertura: estudiantesConEstado.length > 0 ? evaluados / estudiantesConEstado.length : 0,
      tasaAprobacion: evaluados > 0 ? aprobados / evaluados : 0,
      tasaReprobacion: evaluados > 0 ? reprobados / evaluados : 0
    };
  } catch (error) {
    console.error(`Error al cargar datos para ${carrera} - ${semestre}° semestre:`, error);
    throw error;
  }
};

// Exportar funciones adicionales que podrían ser útiles
export const procesarDatosParaComparacion = (datos) => {
  // Función para procesar datos específicamente para comparaciones
  console.log('Procesando datos para comparación...');
  // Implementación aquí
};

export const actualizarDatosIncrementales = async (datosExistentes, filtros) => {
  // Función para actualizar datos sin recargar todo
  console.log('Actualizando datos incrementalmente...');
  // Implementación aquí
};

export default {
  cargarDatosCompletos,
  procesarDatosParaComparacion,
  actualizarDatosIncrementales,
  cargarDatosPorMateria,
  cargarDatosPorCarreraYSemestre
};