// src/util/admin-stats/filters.js

import { ESTADOS } from './constants';

/**
 * Inicializar filtros basados en los datos disponibles
 * @param {Object} datosCompletos - Datos completos del sistema
 * @returns {Object} Configuración inicial de filtros
 */
export const inicializarFiltros = (datosCompletos) => {
  console.log('Inicializando filtros...');
  
  const { estructuraJerarquica, materiasSinDatos } = datosCompletos;
  
  // Extraer opciones únicas
  const carreras = Object.keys(estructuraJerarquica);
  const materiasPorCarreraSemestre = {};
  const semestresUnicos = new Set();
  
  // Procesar estructura jerárquica para extraer opciones
  Object.entries(estructuraJerarquica).forEach(([carrera, semestres]) => {
    materiasPorCarreraSemestre[carrera] = {};
    
    Object.entries(semestres).forEach(([semestre, materias]) => {
      semestresUnicos.add(parseInt(semestre));
      materiasPorCarreraSemestre[carrera][semestre] = [];
      
      Object.entries(materias).forEach(([nombreMateria, datosMateria]) => {
        materiasPorCarreraSemestre[carrera][semestre].push(nombreMateria);
      });
    });
  });
  
  // Convertir sets a arrays y ordenar
  const semestresArray = Array.from(semestresUnicos).sort((a, b) => a - b);
  
  // Opciones de estado
  const opcionesEstado = [
    { value: '', label: 'Todos los Estados' },
    { value: ESTADOS.evaluacion.completa, label: 'Evaluados' },
    { value: ESTADOS.evaluacion.pendiente, label: 'Pendientes' },
    { value: ESTADOS.evaluacion.sinGrupo, label: 'Sin Grupo' },
    { value: ESTADOS.evaluacion.sinRubrica, label: 'Sin Rúbrica' }
  ];
  
  // Valores por defecto
  const filtrosIniciales = {
    carrera: '',
    semestre: '',
    materia: 'TODAS',
    estado: '',
    busqueda: ''
  };
  
  console.log('Filtros inicializados:', {
    carreras: carreras.length,
    semestres: semestresArray.length
  });
  
  return {
    opciones: {
      carreras: carreras.map(c => ({ value: c, label: c })),
      semestres: semestresArray.map(s => ({ value: s, label: `${s}° Semestre` })),
      materias: materiasPorCarreraSemestre,
      estados: opcionesEstado
    },
    filtrosActivos: filtrosIniciales,
    relacionesFiltros: {
      materiasPorCarreraSemestre
    }
  };
};

/**
 * Aplicar filtros a los datos
 * @param {Object} datosCompletos - Datos completos del sistema
 * @param {Object} filtrosActivos - Filtros actualmente activos
 * @returns {Object} Datos filtrados
 */
export const aplicarFiltros = (datosCompletos, filtrosActivos) => {
  console.log('Aplicando filtros:', filtrosActivos);
  
  // Verificación de seguridad para evitar undefined
  if (!datosCompletos) {
    console.error('datosCompletos es undefined en aplicarFiltros');
    return {
      datosFiltrados: {
        grupos: [],
        estudiantes: [],
        estadisticas: {
          totalEstudiantes: 0,
          estudiantesEvaluados: 0,
          estudiantesPendientes: 0,
          estudiantesAprobados: 0,
          estudiantesReprobados: 0,
          tasaCobertura: 0,
          tasaAprobacion: 0,
          tasaReprobacion: 0
        }
      },
      validacion: { esValido: false, mensaje: 'Datos no disponibles' },
      error: 'Datos no disponibles'
    };
  }
  
  const { carrera, semestre, materia, estado, busqueda } = filtrosActivos;
  const { estructuraJerarquica, grupos = [], estudiantes = {} } = datosCompletos;
  
  // Validar combinación de filtros si la estructura está disponible
  let filtrosValidos = { esValido: true, mensaje: 'Combinación de filtros válida' };
  if (estructuraJerarquica) {
    filtrosValidos = validarCombinacionFiltros(filtrosActivos, datosCompletos);
    if (!filtrosValidos.esValido) {
      return {
        datosFiltrados: null,
        validacion: filtrosValidos,
        error: filtrosValidos.mensaje
      };
    }
  }
  
  // Comenzar filtrado básico
  let datosFiltrados = {
    grupos: [],
    estudiantes: [],
    estadisticas: {
      totalEstudiantes: 0,
      estudiantesEvaluados: 0,
      estudiantesPendientes: 0,
      estudiantesAprobados: 0,
      estudiantesReprobados: 0,
      tasaCobertura: 0,
      tasaAprobacion: 0,
      tasaReprobacion: 0
    }
  };
  
  // Definir estudiantesArray de manera segura
  const estudiantesArray = Array.isArray(estudiantes) ? estudiantes :
                         estudiantes.porId instanceof Map ? Array.from(estudiantes.porId.values()) :
                         estudiantes.porCarreraYSemestre ? obtenerEstudiantesDePorCarreraYSemestre(estudiantes.porCarreraYSemestre) :
                         [];
  
  // Aplicar filtros básicos
  if (carrera && !semestre && !materia) {
    // Filtro por carrera
    datosFiltrados.estudiantes = estudiantesArray.filter(e => e.carrera === carrera);
    datosFiltrados.grupos = grupos.filter(g => g.carrera === carrera);
  } else if (carrera && semestre && !materia) {
    // Filtro por carrera y semestre
    datosFiltrados.estudiantes = estudiantesArray.filter(e => e.carrera === carrera && e.semestre == semestre);
    datosFiltrados.grupos = grupos.filter(g => g.carrera === carrera && g.semestre == semestre);
  } else if (carrera && semestre && materia && materia !== 'TODAS') {
    // Filtro por materia específica
    datosFiltrados.grupos = grupos.filter(g => 
      g.carrera === carrera && g.semestre == semestre && g.materia === materia
    );
    
    // Obtener estudiantes de estos grupos
    const gruposIds = datosFiltrados.grupos.map(g => g.id);
    datosFiltrados.estudiantes = estudiantesArray.filter(e => {
      // Verificar si el estudiante pertenece a alguno de estos grupos
      // Esto es una simplificación - idealmente se verificaría la tabla estudiante_grupo
      return e.carrera === carrera && e.semestre == semestre;
    });
  } else {
    // Sin filtros o todos
    datosFiltrados.grupos = grupos;
    datosFiltrados.estudiantes = estudiantesArray;
  }
  
  // Aplicar filtro de búsqueda si existe
  if (busqueda && busqueda.trim() !== '') {
    const termino = busqueda.toLowerCase();
    datosFiltrados.estudiantes = datosFiltrados.estudiantes.filter(e => 
      (e.nombre && e.nombre.toLowerCase().includes(termino)) ||
      (e.apellido && e.apellido.toLowerCase().includes(termino)) ||
      (e.codigo && e.codigo.toLowerCase().includes(termino))
    );
  }
  
  // Calcular estadísticas básicas
  const totalEstudiantes = datosFiltrados.estudiantes.length;
  let evaluados = 0;
  let pendientes = 0;
  let aprobados = 0;
  let reprobados = 0;
  
  // Intentar usar el estado de los estudiantes, o inferirlo de la relación con informes
  datosFiltrados.estudiantes.forEach(estudiante => {
    // Verificar si el estudiante tiene informe/rubrica
    const tieneInforme = verificarSiTieneInforme(estudiante, grupos);
    
    if (tieneInforme.evaluado) {
      evaluados++;
      if (tieneInforme.aprobado) {
        aprobados++;
      } else {
        reprobados++;
      }
    } else {
      pendientes++;
    }
    
    // Añadir estado al estudiante
    estudiante.estado = tieneInforme.evaluado ? 
      (tieneInforme.aprobado ? 'APROBADO' : 'REPROBADO') : 
      'PENDIENTE';
  });
  
  // Actualizar estadísticas
  datosFiltrados.estadisticas = {
    totalEstudiantes: totalEstudiantes,
    estudiantesEvaluados: evaluados,
    estudiantesPendientes: pendientes,
    estudiantesAprobados: aprobados,
    estudiantesReprobados: reprobados,
    tasaCobertura: totalEstudiantes > 0 ? evaluados / totalEstudiantes : 0,
    tasaAprobacion: evaluados > 0 ? aprobados / evaluados : 0,
    tasaReprobacion: evaluados > 0 ? reprobados / evaluados : 0
  };
  
  // Calcular estadísticas filtradas
  const estadisticasFiltradas = calcularEstadisticasFiltradas(datosFiltrados);
  
  console.log('Datos filtrados:', {
    grupos: datosFiltrados.grupos.length,
    estudiantes: datosFiltrados.estudiantes.length,
    estadisticas: estadisticasFiltradas
  });
  
  return {
    datosFiltrados: {
      ...datosFiltrados,
      estadisticas: estadisticasFiltradas
    },
    validacion: filtrosValidos,
    error: null
  };
};

/**
 * Validar si una combinación de filtros es válida
 * @param {Object} filtros - Filtros a validar
 * @param {Object} datosCompletos - Datos completos para validar contra
 * @returns {Object} Resultado de la validación
 */
export const validarCombinacionFiltros = (filtros, datosCompletos) => {
  const { carrera, semestre, materia } = filtros;
  const { estructuraJerarquica } = datosCompletos;
  
  // Validar carrera existe
  if (carrera && !estructuraJerarquica[carrera]) {
    return {
      esValido: false,
      mensaje: `La carrera "${carrera}" no existe en el sistema`,
      sugerencia: 'Seleccione una carrera válida'
    };
  }
  
  // Validar semestre existe para la carrera
  if (carrera && semestre && !estructuraJerarquica[carrera][semestre]) {
    return {
      esValido: false,
      mensaje: `El semestre ${semestre} no tiene datos para ${carrera}`,
      sugerencia: 'Seleccione un semestre que tenga datos'
    };
  }
  
  // Validar materia existe
  if (carrera && semestre && materia !== 'TODAS' && 
      !estructuraJerarquica[carrera][semestre][materia]) {
    return {
      esValido: false,
      mensaje: `La materia "${materia}" no existe en ${carrera} - ${semestre}° semestre`,
      sugerencia: 'Seleccione una materia válida o "Todas las materias"'
    };
  }
  
  return {
    esValido: true,
    mensaje: 'Combinación de filtros válida'
  };
};

/**
 * Gestionar filtros inteligentes - actualizar opciones disponibles
 * @param {Object} filtrosActivos - Filtros actualmente activos
 * @param {Object} opcionesFiltros - Opciones originales de filtros
 * @param {Object} datosCompletos - Datos completos del sistema
 * @returns {Object} Opciones de filtros actualizadas
 */
export const gestionarFiltrosInteligentes = (filtrosActivos, opcionesFiltros, datosCompletos) => {
  const opcionesActualizadas = { ...opcionesFiltros };
  const { carrera, semestre, materia } = filtrosActivos;
  const { estructuraJerarquica } = datosCompletos;
  
  // Actualizar semestres disponibles según carrera
  if (carrera) {
    const semestresCarrera = estructuraJerarquica[carrera] ? 
      Object.keys(estructuraJerarquica[carrera]).map(s => parseInt(s)) : [];
    
    opcionesActualizadas.semestres = semestresCarrera
      .sort((a, b) => a - b)
      .map(s => ({ 
        value: s, 
        label: `${s}° Semestre`,
        disabled: false
      }));
  }
  
  // Actualizar materias disponibles según carrera y semestre
  if (carrera && semestre) {
    const materiasDisponibles = estructuraJerarquica[carrera]?.[semestre] ? 
      Object.keys(estructuraJerarquica[carrera][semestre]) : [];
    
    opcionesActualizadas.materias = [
      { value: 'TODAS', label: 'Todas las materias' },
      ...materiasDisponibles.map(m => ({
        value: m,
        label: m,
        disabled: false,
        tieneDatos: estructuraJerarquica[carrera][semestre][m].tieneDatos,
        grupos: estructuraJerarquica[carrera][semestre][m].grupos.length
      }))
    ];
  }
  
  // Añadir contadores a las opciones
  opcionesActualizadas.contadores = calcularContadoresPorOpcion(
    filtrosActivos,
    datosCompletos
  );
  
  return opcionesActualizadas;
};

/**
 * Función auxiliar para extraer estudiantes de la estructura porCarreraYSemestre
 */
function obtenerEstudiantesDePorCarreraYSemestre(porCarreraYSemestre) {
  const estudiantes = [];
  Object.values(porCarreraYSemestre).forEach(carreras => {
    Object.values(carreras).forEach(semestreEstudiantes => {
      estudiantes.push(...semestreEstudiantes);
    });
  });
  return estudiantes;
}

/**
 * Función auxiliar para verificar si un estudiante tiene informe
 */
function verificarSiTieneInforme(estudiante, grupos) {
  // Estado por defecto
  const resultado = { evaluado: false, aprobado: false };
  
  // Si el estudiante ya tiene estado, usarlo
  if (estudiante.estado) {
    if (estudiante.estado === 'APROBADO') {
      return { evaluado: true, aprobado: true };
    } else if (estudiante.estado === 'REPROBADO') {
      return { evaluado: true, aprobado: false };
    } else if (estudiante.estado === 'PENDIENTE') {
      return { evaluado: false, aprobado: false };
    }
  }
  
  // Si el estudiante tiene informe directo, verificar
  if (estudiante.informe && estudiante.informe.rubrica) {
    const rubrica = estudiante.informe.rubrica;
    resultado.evaluado = true;
    resultado.aprobado = rubrica.observaciones === 'APROBADO' || 
                        (rubrica.nota_final && parseFloat(rubrica.nota_final) >= 5.1);
    return resultado;
  }
  
  // Si no, buscar en los grupos
  for (const grupo of grupos) {
    if (grupo.informes) {
      for (const informe of grupo.informes) {
        if (informe.estudiante_id === estudiante.id && informe.rubrica) {
          resultado.evaluado = true;
          resultado.aprobado = informe.rubrica.observaciones === 'APROBADO' || 
                              (informe.rubrica.nota_final && parseFloat(informe.rubrica.nota_final) >= 5.1);
          return resultado;
        }
      }
    }
  }
  
  return resultado;
}

/**
 * Calcular estadísticas de los datos filtrados
 * @param {Object} datosFiltrados - Datos filtrados
 * @returns {Object} Estadísticas calculadas
 */
const calcularEstadisticasFiltradas = (datosFiltrados) => {
  const { grupos, estudiantes, estadisticas } = datosFiltrados;
  
  // Si ya hay estadísticas calculadas, usarlas
  if (estadisticas && estadisticas.totalEstudiantes > 0) {
    return estadisticas;
  }
  
  // Calcular desde cero
  let totalEstudiantes = estudiantes.length;
  let estudiantesEvaluados = 0;
  let estudiantesPendientes = 0;
  let aprobados = 0;
  let reprobados = 0;
  let sumaNotas = 0;
  let cantidadConNota = 0;
  
  estudiantes.forEach(estudiante => {
    if (estudiante.estado === 'APROBADO') {
      estudiantesEvaluados++;
      aprobados++;
      // Si tiene nota, sumarla
      if (estudiante.informe?.rubrica?.nota_final) {
        const nota = parseFloat(estudiante.informe.rubrica.nota_final);
        if (!isNaN(nota)) {
          sumaNotas += nota;
          cantidadConNota++;
        }
      }
    } else if (estudiante.estado === 'REPROBADO') {
      estudiantesEvaluados++;
      reprobados++;
      // Si tiene nota, sumarla
      if (estudiante.informe?.rubrica?.nota_final) {
        const nota = parseFloat(estudiante.informe.rubrica.nota_final);
        if (!isNaN(nota)) {
          sumaNotas += nota;
          cantidadConNota++;
        }
      }
    } else {
      estudiantesPendientes++;
    }
  });
  
  const promedioGeneral = cantidadConNota > 0 ? sumaNotas / cantidadConNota : 0;
  const tasaCobertura = totalEstudiantes > 0 ? (estudiantesEvaluados / totalEstudiantes) : 0;
  const tasaAprobacion = estudiantesEvaluados > 0 ? (aprobados / estudiantesEvaluados) : 0;
  const tasaReprobacion = estudiantesEvaluados > 0 ? (reprobados / estudiantesEvaluados) : 0;
  
  return {
    totalGrupos: grupos.length,
    totalEstudiantes,
    estudiantesEvaluados,
    estudiantesPendientes,
    estudiantesAprobados: aprobados,
    estudiantesReprobados: reprobados,
    promedioGeneral,
    tasaCobertura,
    tasaAprobacion,
    tasaReprobacion
  };
};

/**
 * Calcular contadores para cada opción de filtro
 * @param {Object} filtrosActivos - Filtros actuales
 * @param {Object} datosCompletos - Datos completos
 * @returns {Object} Contadores por opción
 */
const calcularContadoresPorOpcion = (filtrosActivos, datosCompletos) => {
  const contadores = {
    carreras: {},
    semestres: {},
    materias: {},
    estados: {}
  };
  
  return contadores;
};

// Exportar todas las funciones
export default {
  inicializarFiltros,
  aplicarFiltros,
  validarCombinacionFiltros,
  gestionarFiltrosInteligentes
};