// src/util/admin-stats/calculations.js

import { THRESHOLDS, CATEGORIAS, ESTADOS } from './constants';

/**
 * Calcular estadísticas globales del sistema
 * @param {Object} datosCompletos - Datos completos del sistema
 * @returns {Object} Estadísticas globales calculadas
 */
export const calcularEstadisticasGlobales = (datosCompletos) => {
  
  const { estudiantes, grupos, docentes } = datosCompletos;
  
  // Contar totales básicos
  const totalEstudiantes = estudiantes.porId?.size || estudiantes.length || 0;
  const totalGrupos = grupos?.length || 0;
  const totalDocentes = docentes?.length || 0;
  
  // Analizar estado de evaluaciones
  let estudiantesEvaluados = 0;
  let estudiantesPendientes = 0;
  let estudiantesSinGrupo = estudiantes.porEstado?.[ESTADOS.evaluacion.sinGrupo]?.length || 0;
  
  // Contadores para promedios
  let sumaPresentacion = 0;
  let sumaSustentacion = 0;
  let sumaDocumentacion = 0;
  let sumaInnovacion = 0;
  let sumaNotaFinal = 0;
  let cantidadConNotas = 0;
  
  // Contadores para aprobados/reprobados
  let aprobados = 0;
  let reprobados = 0;
  
  // Procesar todos los grupos y sus evaluaciones
  grupos?.forEach(grupo => {
    if (grupo.informes) {
      grupo.informes.forEach(informe => {
        if (informe.rubrica) {
          estudiantesEvaluados++;
          
          // Agregar a sumas para promedios
          sumaPresentacion += parseFloat(informe.rubrica.presentacion) || 0;
          sumaSustentacion += parseFloat(informe.rubrica.sustentacion) || 0;
          sumaDocumentacion += parseFloat(informe.rubrica.documentacion) || 0;
          sumaInnovacion += parseFloat(informe.rubrica.innovacion) || 0;
          sumaNotaFinal += parseFloat(informe.rubrica.nota_final) || 0;
          cantidadConNotas++;
          
          // Clasificar por resultado
          if (informe.rubrica.observaciones === 'APROBADO' || 
              parseFloat(informe.rubrica.nota_final) >= THRESHOLDS.notas.aprobacion) {
            aprobados++;
          } else {
            reprobados++;
          }
        } else {
          estudiantesPendientes++;
        }
      });
    }
  });
  
  // Calcular promedios
  const promedioGeneral = cantidadConNotas > 0 ? sumaNotaFinal / cantidadConNotas : 0;
  const promedioSecciones = cantidadConNotas > 0 ? {
    presentacion: sumaPresentacion / cantidadConNotas,
    sustentacion: sumaSustentacion / cantidadConNotas,
    documentacion: sumaDocumentacion / cantidadConNotas,
    innovacion: sumaInnovacion / cantidadConNotas
  } : null;
  
  // Calcular tasas
  const tasaCobertura = totalEstudiantes > 0 ? 
    (estudiantesEvaluados / totalEstudiantes) : 0;
  const tasaAprobacion = estudiantesEvaluados > 0 ? 
    (aprobados / estudiantesEvaluados) : 0;
  
  console.log('Estadísticas globales calculadas:', {
    totalEstudiantes,
    estudiantesEvaluados,
    estudiantesPendientes,
    tasaCobertura
  });
  
  return {
    totalEstudiantes,
    totalGrupos,
    totalDocentes,
    estudiantesEvaluados,
    estudiantesPendientes,
    estudiantesSinGrupo,
    aprobados,
    reprobados,
    promedioGeneral,
    promedioSecciones,
    tasaCobertura,
    tasaAprobacion,
    fechaCalculo: new Date().toISOString()
  };
};

/**
 * Calcular estadísticas por docente
 * @param {Object} datosCompletos - Datos completos del sistema
 * @returns {Object} Estadísticas por docente
 */
export const calcularEstadisticasPorDocente = (datosCompletos) => {
  
  const { docentes, grupos, estudiantes } = datosCompletos;
  const estadisticasPorDocente = {};
  
  // Crear mapa de grupos por docente
  const gruposPorDocente = new Map();
  grupos?.forEach(grupo => {
    if (grupo.docente_id) {
      if (!gruposPorDocente.has(grupo.docente_id)) {
        gruposPorDocente.set(grupo.docente_id, []);
      }
      gruposPorDocente.get(grupo.docente_id).push(grupo);
    }
  });
  
  // Procesar cada docente
  docentes?.forEach(docente => {
    const gruposDocente = gruposPorDocente.get(docente.id) || [];
    const estadisticas = calcularEstadisticasDocenteEspecifico(
      docente,
      gruposDocente,
      estudiantes
    );
    
    estadisticasPorDocente[docente.id] = estadisticas;
  });
  
  // Calcular rankings
  const listaDocentes = Object.values(estadisticasPorDocente);
  const rankingPorPromedio = calcularRankingDocentes(listaDocentes, 'promedioGeneral');
  const rankingPorCobertura = calcularRankingDocentes(listaDocentes, 'tasaCobertura');
  
  // Añadir rankings a cada docente
  rankingPorPromedio.forEach((item, index) => {
    estadisticasPorDocente[item.docenteId].rankingPromedio = index + 1;
  });
  
  rankingPorCobertura.forEach((item, index) => {
    estadisticasPorDocente[item.docenteId].rankingCobertura = index + 1;
  });
    
  return {
    estadisticasIndividuales: estadisticasPorDocente,
    rankings: {
      porPromedio: rankingPorPromedio,
      porCobertura: rankingPorCobertura
    },
    resumenGeneral: calcularResumenGeneralDocentes(estadisticasPorDocente)
  };
};

/**
 * Calcular estadísticas para un docente específico
 * @param {Object} docente - Datos del docente
 * @param {Array} grupos - Grupos del docente
 * @param {Object} estudiantes - Estudiantes organizados
 * @returns {Object} Estadísticas del docente
 */
const calcularEstadisticasDocenteEspecifico = (docente, grupos, estudiantes) => {
  let totalEstudiantes = 0;
  let estudiantesEvaluados = 0;
  let estudiantesPendientes = 0;
  
  // Acumuladores para promedios
  let sumaPresentacion = 0;
  let sumaSustentacion = 0;
  let sumaDocumentacion = 0;
  let sumaInnovacion = 0;
  let sumaNotaFinal = 0;
  let cantidadConNotas = 0;
  
  // Contadores de resultados
  let aprobados = 0;
  let reprobados = 0;
  
  // Materias que enseña
  const materiasUniques = new Set();
  const carrerasUniques = new Set();
  const semestresUniques = new Set();
  
  grupos?.forEach(grupo => {
    // Contar estudiantes del grupo
    const estudiantesGrupo = estudiantes.porGrupo?.[grupo.id] || [];
    totalEstudiantes += estudiantesGrupo.length;
    
    // Registrar materia, carrera y semestre
    if (grupo.materia) materiasUniques.add(grupo.materia);
    if (grupo.carrera) carrerasUniques.add(grupo.carrera);
    if (grupo.semestre) semestresUniques.add(grupo.semestre);
    
    // Procesar evaluaciones
    if (grupo.informes) {
      grupo.informes.forEach(informe => {
        if (informe.rubrica) {
          estudiantesEvaluados++;
          
          // Agregar a promedios
          sumaPresentacion += parseFloat(informe.rubrica.presentacion) || 0;
          sumaSustentacion += parseFloat(informe.rubrica.sustentacion) || 0;
          sumaDocumentacion += parseFloat(informe.rubrica.documentacion) || 0;
          sumaInnovacion += parseFloat(informe.rubrica.innovacion) || 0;
          sumaNotaFinal += parseFloat(informe.rubrica.nota_final) || 0;
          cantidadConNotas++;
          
          // Contar resultados
          if (informe.rubrica.observaciones === 'APROBADO' || 
              parseFloat(informe.rubrica.nota_final) >= THRESHOLDS.notas.aprobacion) {
            aprobados++;
          } else {
            reprobados++;
          }
        } else {
          estudiantesPendientes++;
        }
      });
    }
  });
  
  // Calcular promedios
  const promedioGeneral = cantidadConNotas > 0 ? sumaNotaFinal / cantidadConNotas : 0;
  const promedioSecciones = cantidadConNotas > 0 ? {
    presentacion: sumaPresentacion / cantidadConNotas,
    sustentacion: sumaSustentacion / cantidadConNotas,
    documentacion: sumaDocumentacion / cantidadConNotas,
    innovacion: sumaInnovacion / cantidadConNotas
  } : null;
  
  // Calcular tasas
  const tasaCobertura = totalEstudiantes > 0 ? 
    (estudiantesEvaluados / totalEstudiantes) : 0;
  const tasaAprobacion = estudiantesEvaluados > 0 ? 
    (aprobados / estudiantesEvaluados) : 0;
  
  return {
    docenteId: docente.id,
    nombreDocente: docente.nombre_completo || `${docente.nombre} ${docente.apellido}`,
    totalGrupos: grupos.length,
    totalEstudiantes,
    estudiantesEvaluados,
    estudiantesPendientes,
    aprobados,
    reprobados,
    promedioGeneral,
    promedioSecciones,
    tasaCobertura,
    tasaAprobacion,
    materias: Array.from(materiasUniques),
    carreras: Array.from(carrerasUniques),
    semestres: Array.from(semestresUniques).sort((a, b) => a - b),
    clasificacion: clasificarRendimientoDocente(promedioGeneral, tasaCobertura)
  };
};

/**
 * Calcular estadísticas comparativas entre entidades
 * @param {Object} datosCompletos - Datos completos del sistema
 * @returns {Object} Estadísticas comparativas
 */
export const calcularComparativas = (datosCompletos) => {
  
  const { estructuraJerarquica, estudiantes } = datosCompletos;
  
  if (!estructuraJerarquica) {
    return {
      porCarrera: {},
      porSemestre: {},
      porMateria: {},
      tendencias: calcularTendencias(datosCompletos),
      resumen: {
        mejorCarrera: null,
        mejorSemestre: null,
        materiaConMejorRendimiento: null,
        materiasConDatos: 0
      }
    };
  }
  
  // Comparativas por carrera
  const porCarrera = calcularComparativasPorCarrera(estructuraJerarquica);
  
  // Comparativas por semestre
  const porSemestre = calcularComparativasPorSemestre(estructuraJerarquica);
  
  // Comparativas por materia
  const porMateria = calcularComparativasPorMateria(estructuraJerarquica);
  
  // Tendencias temporales
  const tendencias = calcularTendencias(datosCompletos);
  
  return {
    porCarrera,
    porSemestre,
    porMateria,
    tendencias,
    resumen: generarResumenComparativo(porCarrera, porSemestre, porMateria)
  };
};

/**
 * Calcular comparativas por carrera
 * @param {Object} estructuraJerarquica - Estructura jerárquica de datos
 * @returns {Object} Comparativas por carrera
 */
const calcularComparativasPorCarrera = (estructuraJerarquica) => {
  const comparativas = {};
  
  Object.entries(estructuraJerarquica).forEach(([carrera, semestres]) => {
    let totalEstudiantes = 0;
    let totalEvaluados = 0;
    let sumaNota = 0;
    let cantidadNotas = 0;
    let totalGrupos = 0;
    let totalMaterias = 0;
    let materiasConDatos = 0;
    
    Object.values(semestres).forEach(materias => {
      Object.values(materias).forEach(materia => {
        totalMaterias++;
        if (materia.tieneDatos) materiasConDatos++;
        
        const stats = materia.estadisticas;
        totalEstudiantes += stats.totalEstudiantes || 0;
        totalEvaluados += stats.estudiantesEvaluados || 0;
        totalGrupos += stats.totalGrupos || 0;
        
        if (stats.promedios && stats.promedios.notaFinal) {
          sumaNota += stats.promedios.notaFinal * (stats.promedios.cantidadDatos || 1);
          cantidadNotas += stats.promedios.cantidadDatos || 1;
        }
      });
    });
    
    comparativas[carrera] = {
      nombre: carrera,
      totalEstudiantes,
      totalEvaluados,
      totalGrupos,
      totalMaterias,
      materiasConDatos,
      porcentajeCobertura: totalEstudiantes > 0 ? 
        (totalEvaluados / totalEstudiantes) * 100 : 0,
      promedioGeneral: cantidadNotas > 0 ? sumaNota / cantidadNotas : 0,
      porcentajeMaterias: totalMaterias > 0 ? 
        (materiasConDatos / totalMaterias) * 100 : 0
    };
  });
  
  return comparativas;
};

/**
 * Calcular comparativas por semestre
 * @param {Object} estructuraJerarquica - Estructura jerárquica de datos
 * @returns {Object} Comparativas por semestre
 */
const calcularComparativasPorSemestre = (estructuraJerarquica) => {
  const comparativas = {};
  
  // Agregar datos por semestre (agrupando todas las carreras)
  Object.values(estructuraJerarquica).forEach(semestres => {
    Object.entries(semestres).forEach(([semestre, materias]) => {
      if (!comparativas[semestre]) {
        comparativas[semestre] = {
          semestre: parseInt(semestre),
          totalEstudiantes: 0,
          totalEvaluados: 0,
          totalGrupos: 0,
          totalMaterias: 0,
          carrieras: new Set(),
          sumaNota: 0,
          cantidadNotas: 0
        };
      }
      
      Object.values(materias).forEach(materia => {
        comparativas[semestre].carrieras.add(materia.carrera);
        comparativas[semestre].totalMaterias++;
        
        const stats = materia.estadisticas;
        comparativas[semestre].totalEstudiantes += stats.totalEstudiantes || 0;
        comparativas[semestre].totalEvaluados += stats.estudiantesEvaluados || 0;
        comparativas[semestre].totalGrupos += stats.totalGrupos || 0;
        
        if (stats.promedios && stats.promedios.notaFinal) {
          comparativas[semestre].sumaNota += 
            stats.promedios.notaFinal * (stats.promedios.cantidadDatos || 1);
          comparativas[semestre].cantidadNotas += stats.promedios.cantidadDatos || 1;
        }
      });
    });
  });
  
  // Calcular estadísticas finales por semestre
  Object.values(comparativas).forEach(stats => {
    stats.porcentajeCobertura = stats.totalEstudiantes > 0 ? 
      (stats.totalEvaluados / stats.totalEstudiantes) * 100 : 0;
    stats.promedioGeneral = stats.cantidadNotas > 0 ? 
      stats.sumaNota / stats.cantidadNotas : 0;
    stats.carrerasCount = stats.carrieras.size;
    delete stats.sumaNota;
    delete stats.cantidadNotas;
    delete stats.carrieras;
  });
  
  return comparativas;
};

/**
 * Calcular comparativas por materia
 * @param {Object} estructuraJerarquica - Estructura jerárquica de datos
 * @returns {Object} Comparativas por materia
 */
const calcularComparativasPorMateria = (estructuraJerarquica) => {
  const comparativas = {};
  
  Object.values(estructuraJerarquica).forEach(semestres => {
    Object.values(semestres).forEach(materias => {
      Object.entries(materias).forEach(([nombreMateria, materia]) => {
        const key = `${materia.carrera}-${materia.semestre}-${nombreMateria}`;
        
        comparativas[key] = {
          nombre: nombreMateria,
          carrera: materia.carrera,
          semestre: materia.semestre,
          totalDocentes: materia.estadisticas?.totalDocentes || 0,
          totalEstudiantes: materia.estadisticas?.totalEstudiantes || 0,
          totalEvaluados: materia.estadisticas?.estudiantesEvaluados || 0,
          totalGrupos: materia.estadisticas?.totalGrupos || 0,
          porcentajeCobertura: (materia.estadisticas?.tasaCobertura || 0) * 100,
          promedioGeneral: materia.estadisticas?.promedios?.notaFinal || 0,
          tieneDatos: materia.tieneDatos,
          docentesAsignados: materia.docentes?.map(d => d.nombre_completo) || []
        };
      });
    });
  });
  
  return comparativas;
};

/**
 * Calcular tendencias y evolución en el tiempo
 * @param {Object} datosCompletos - Datos completos del sistema
 * @returns {Object} Tendencias calculadas
 */
export const calcularTendencias = (datosCompletos) => {
  // Esta función puede evolucionar para incluir datos históricos
  // Por ahora, retornamos estructura básica
  
  return {
    promediosGenerales: {
      actual: datosCompletos.metadatos?.promedioGeneral || 0,
      tendencia: 'estable', // 'creciente', 'decreciente', 'estable'
      cambioAnual: 0
    },
    cobertura: {
      actual: datosCompletos.metadatos?.tasaCobertura || 0,
      tendencia: 'estable',
      cambioAnual: 0
    },
    porCarrera: {},
    porSemestre: {}
  };
};

/**
 * Clasificar el rendimiento de un docente
 * @param {number} promedio - Promedio general
 * @param {number} cobertura - Tasa de cobertura
 * @returns {string} Clasificación del docente
 */
const clasificarRendimientoDocente = (promedio, cobertura) => {
  if (promedio >= THRESHOLDS.notas.sobresaliente && cobertura >= 0.9) {
    return 'SOBRESALIENTE';
  } else if (promedio >= THRESHOLDS.notas.excelente && cobertura >= 0.8) {
    return 'EXCELENTE';
  } else if (promedio >= THRESHOLDS.notas.aprobacion && cobertura >= 0.7) {
    return 'BUENO';
  } else if (promedio >= THRESHOLDS.notas.aprobacion || cobertura >= 0.6) {
    return 'ACEPTABLE';
  } else {
    return 'NECESITA MEJORAR';
  }
};

/**
 * Calcular ranking de docentes
 * @param {Array} listaDocentes - Lista de estadísticas de docentes
 * @param {string} criterio - Criterio para el ranking
 * @returns {Array} Ranking ordenado
 */
const calcularRankingDocentes = (listaDocentes, criterio) => {
  return listaDocentes
    .filter(d => d[criterio] !== undefined && d[criterio] !== null)
    .sort((a, b) => b[criterio] - a[criterio])
    .map((docente, index) => ({
      posicion: index + 1,
      docenteId: docente.docenteId,
      nombre: docente.nombreDocente,
      valor: docente[criterio],
      criterio: criterio
    }));
};

/**
 * Calcular resumen general de docentes
 * @param {Object} estadisticasPorDocente - Estadísticas individuales
 * @returns {Object} Resumen general
 */
const calcularResumenGeneralDocentes = (estadisticasPorDocente) => {
  const valores = Object.values(estadisticasPorDocente);
  
  return {
    totalDocentes: valores.length,
    promedioGeneralSistema: valores.reduce((sum, d) => sum + d.promedioGeneral, 0) / valores.length,
    coberturaPromedio: valores.reduce((sum, d) => sum + d.tasaCobertura, 0) / valores.length,
    docentesConCoberturaBaja: valores.filter(d => d.tasaCobertura < 0.6).length,
    docentesConPromedioAlto: valores.filter(d => d.promedioGeneral >= 8.0).length,
    distribucionPorCarrera: calcularDistribucionDocentesPorCarrera(valores)
  };
};

/**
 * Calcular distribución de docentes por carrera
 * @param {Array} valores - Lista de estadísticas de docentes
 * @returns {Object} Distribución por carrera
 */
const calcularDistribucionDocentesPorCarrera = (valores) => {
  const distribucion = {};
  
  valores.forEach(docente => {
    docente.carreras.forEach(carrera => {
      if (!distribucion[carrera]) {
        distribucion[carrera] = 0;
      }
      distribucion[carrera]++;
    });
  });
  
  return distribucion;
};

/**
 * Generar resumen comparativo general
 * @param {Object} porCarrera - Comparativas por carrera
 * @param {Object} porSemestre - Comparativas por semestre
 * @param {Object} porMateria - Comparativas por materia
 * @returns {Object} Resumen comparativo
 */
const generarResumenComparativo = (porCarrera, porSemestre, porMateria) => {
  const carrerasList = Object.entries(porCarrera);
  const semestresList = Object.entries(porSemestre);
  const materiasList = Object.entries(porMateria);
  
  let mejorCarrera = null;
  let mejorSemestre = null;
  let materiaConMejorRendimiento = null;
  
  if (carrerasList.length > 0) {
    mejorCarrera = carrerasList.reduce((a, b) => 
      (a[1].promedioGeneral || 0) > (b[1].promedioGeneral || 0) ? a : b
    )[0];
  }
  
  if (semestresList.length > 0) {
    mejorSemestre = semestresList.reduce((a, b) => 
      (a[1].promedioGeneral || 0) > (b[1].promedioGeneral || 0) ? a : b
    )[0];
  }
  
  if (materiasList.length > 0) {
    const materiasConDatos = materiasList.filter(([_, m]) => m.tieneDatos);
    if (materiasConDatos.length > 0) {
      materiaConMejorRendimiento = materiasConDatos.reduce((a, b) => 
        (a[1].promedioGeneral || 0) > (b[1].promedioGeneral || 0) ? a : b
      )[1];
    }
  }
  
  return {
    mejorCarrera,
    mejorSemestre,
    materiaConMejorRendimiento,
    materiasConDatos: materiasList.filter(([_, m]) => m.tieneDatos).length
  };
};

// Exportación por defecto para compatibilidad
const calculationsModule = {
  calcularEstadisticasGlobales,
  calcularEstadisticasPorDocente,
  calcularComparativas,
  calcularTendencias
};

export default calculationsModule;