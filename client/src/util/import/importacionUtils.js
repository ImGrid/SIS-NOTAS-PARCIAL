/**
 * Utilidades principales para importación masiva de estudiantes
 * Orquesta todo el proceso: validación, procesamiento e importación
 */
import { procesarArchivoExcel } from './excelProcessor';
import { 
  validarPermisosDocente,
  validarEstudianteCompleto,
  procesarLoteEstudiantes,
  generarEstadisticasValidacion
} from './validacionImport';
import { createEstudiante } from '../../service/estudianteService';

// Configuración de importación
const CONFIG_IMPORTACION = {
  LOTE_MAXIMO: 50, // Máximo número de estudiantes a importar por lote
  REINTENTOS_MAXIMOS: 3, // Número de reintentos por estudiante en caso de error
  DELAY_ENTRE_LOTES: 100, // Delay en ms entre lotes para no sobrecargar el servidor
  TIMEOUT_POR_ESTUDIANTE: 10000 // Timeout individual por estudiante (10 segundos)
};

/**
 * Clase para manejar el estado y progreso de la importación
 */
class GestorImportacion {
  constructor() {
    this.estado = 'inicializado';
    this.progreso = {
      fase: 'preparacion',
      porcentaje: 0,
      mensaje: 'Inicializando...',
      detalles: null
    };
    this.callbacks = {
      onProgress: null,
      onPhaseChange: null,
      onError: null
    };
    this.resultados = {
      exitosos: [],
      fallidos: [],
      duplicados: [],
      estadisticas: null
    };
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  actualizarProgreso(fase, porcentaje, mensaje, detalles = null) {
    this.progreso = { fase, porcentaje, mensaje, detalles };
    
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(this.progreso);
    }
    
    if (this.callbacks.onPhaseChange && this.progreso.fase !== fase) {
      this.callbacks.onPhaseChange(fase);
    }
  }

  reportarError(error, contexto = '') {
    console.error(`Error en importación ${contexto}:`, error);
    
    if (this.callbacks.onError) {
      this.callbacks.onError(error, contexto);
    }
  }
}

/**
 * Función principal para importar estudiantes desde Excel
 * @param {File} archivo - Archivo Excel a procesar
 * @param {Object} filtros - Filtros aplicados (carrera, semestre, paralelo)
 * @param {Object} callbacks - Callbacks para reportar progreso
 * @param {boolean} soloAnalisis - Si true, solo analiza sin importar
 * @returns {Promise<Object>} Resultado de la importación o análisis
 */
export const importarEstudiantesDesdeExcel = async (archivo, filtros = {}, callbacks = {}, soloAnalisis = false) => {
  const gestor = new GestorImportacion();
  gestor.setCallbacks(callbacks);

  try {
    // FASE 1: Validación de permisos
    gestor.actualizarProgreso('validacion', 5, 'Verificando permisos del docente...');
    
    const validacionPermisos = validarPermisosDocente();
    if (!validacionPermisos.valido) {
      throw new Error(`Permisos insuficientes: ${validacionPermisos.errores.join(', ')}`);
    }

    const carrerasPermitidas = validacionPermisos.carreras;

    // FASE 2: Procesamiento del archivo Excel
    gestor.actualizarProgreso('procesamiento', 15, 'Procesando archivo Excel...');
    
    const datosExcel = await procesarArchivoExcel(archivo);
    
    if (!datosExcel.estudiantes || datosExcel.estudiantes.length === 0) {
      throw new Error('No se encontraron estudiantes válidos en el archivo');
    }

    // FASE 3: Aplicar filtros si se especificaron
    let estudiantesFiltrados = datosExcel.estudiantes;
    
    if (filtros.carrera || filtros.semestre || filtros.paralelo) {
      gestor.actualizarProgreso('filtrado', 25, 'Aplicando filtros...');
      estudiantesFiltrados = aplicarFiltros(datosExcel.estudiantes, filtros);
      
      if (estudiantesFiltrados.length === 0) {
        throw new Error('No hay estudiantes que coincidan con los filtros aplicados');
      }
    }

    // FASE 4: Validación de estudiantes
    gestor.actualizarProgreso('validacion', 35, `Validando ${estudiantesFiltrados.length} estudiantes...`);
    
    const resultadosValidacion = await validarEstudiantesEnLote(
      estudiantesFiltrados, 
      carrerasPermitidas,
      (progreso) => {
        const porcentajeBase = 35;
        const rangoPorcentaje = 15; // del 35% al 50%
        const porcentajeActual = porcentajeBase + (progreso.porcentaje * rangoPorcentaje / 100);
        
        gestor.actualizarProgreso(
          'validacion', 
          porcentajeActual, 
          `Validando estudiantes... (${progreso.procesados}/${progreso.total})`
        );
      }
    );

    // FASE 5: Verificación de duplicados
    gestor.actualizarProgreso('duplicados', 50, 'Verificando duplicados...');
    
    const resultadosDuplicados = await procesarLoteEstudiantes(
      resultadosValidacion.validos,
      (progreso) => {
        const porcentajeBase = 50;
        const rangoPorcentaje = 20; // del 50% al 70%
        const porcentajeActual = porcentajeBase + (progreso.porcentaje * rangoPorcentaje / 100);
        
        gestor.actualizarProgreso(
          'duplicados', 
          porcentajeActual, 
          `Verificando duplicados... (${progreso.procesados}/${progreso.total})`
        );
      }
    );

    // Combinar todos los resultados
    const estudiantesParaImportar = resultadosDuplicados.validos;
    const duplicadosTotal = [
      ...resultadosDuplicados.duplicados,
      ...resultadosDuplicados.errores.map(e => ({
        estudiante: e.estudiante,
        razon: e.error,
        sugerencia: 'Revise los datos e intente nuevamente',
        tipoConflicto: 'error'
      }))
    ];
    
    const erroresValidacion = resultadosValidacion.invalidos;

    // FASE 6: Resumen pre-importación
    const resumen = {
      totalProcesados: estudiantesFiltrados.length,
      listos: estudiantesParaImportar.length,
      duplicados: duplicadosTotal.length,
      errores: erroresValidacion.length,
      estudiantesParaImportar,
      duplicados: duplicadosTotal,
      errores: erroresValidacion
    };

    // ✅ NUEVO: Si es solo análisis, retornar aquí sin importar
    if (soloAnalisis) {
      gestor.actualizarProgreso('completado', 100, 'Análisis completado');
      
      return {
        exito: estudiantesParaImportar.length > 0,
        mensaje: estudiantesParaImportar.length > 0 
          ? `Análisis completado: ${estudiantesParaImportar.length} estudiantes listos para importar`
          : 'Análisis completado - No hay estudiantes válidos para importar',
        resumen,
        soloAnalisis: true,
        detalles: {
          archivo: datosExcel.metadata,
          filtros,
          estadisticas: generarEstadisticasValidacion({
            validos: estudiantesParaImportar,
            duplicados: duplicadosTotal,
            errores: erroresValidacion
          })
        }
      };
    }

    if (estudiantesParaImportar.length === 0) {
      gestor.actualizarProgreso('completado', 100, 'Análisis completado - No hay estudiantes para importar');
      
      return {
        exito: false,
        mensaje: 'No hay estudiantes válidos para importar',
        resumen,
        detalles: {
          archivo: datosExcel.metadata,
          filtros,
          estadisticas: generarEstadisticasValidacion({
            validos: [],
            duplicados: duplicadosTotal,
            errores: erroresValidacion
          })
        }
      };
    }

    // FASE 7: Importación masiva (solo si no es soloAnalisis)
    gestor.actualizarProgreso('importacion', 70, `Importando ${estudiantesParaImportar.length} estudiantes...`);
    
    const resultadosImportacion = await importarEstudiantesEnLotes(
      estudiantesParaImportar,
      (progreso) => {
        const porcentajeBase = 70;
        const rangoPorcentaje = 25; // del 70% al 95%
        const porcentajeActual = porcentajeBase + (progreso.porcentaje * rangoPorcentaje / 100);
        
        gestor.actualizarProgreso(
          'importacion',
          porcentajeActual,
          `Importando estudiantes... (${progreso.exitosos + progreso.fallidos}/${progreso.total})`
        );
      }
    );

    // FASE 8: Finalización
    gestor.actualizarProgreso('completado', 100, 'Importación completada');

    // Compilar resultado final
    const resultadoFinal = {
      exito: true,
      mensaje: `Importación completada: ${resultadosImportacion.exitosos.length} estudiantes importados`,
      resumen: {
        ...resumen,
        importados: resultadosImportacion.exitosos.length,
        fallidosImportacion: resultadosImportacion.fallidos.length
      },
      detalles: {
        archivo: datosExcel.metadata,
        filtros,
        importacion: resultadosImportacion,
        duplicados: duplicadosTotal,
        errores: erroresValidacion,
        estadisticas: generarEstadisticasValidacion({
          validos: resultadosImportacion.exitosos,
          duplicados: duplicadosTotal,
          errores: [...erroresValidacion, ...resultadosImportacion.fallidos]
        })
      }
    };

    gestor.resultados = {
      exitosos: resultadosImportacion.exitosos,
      fallidos: resultadosImportacion.fallidos,
      duplicados: duplicadosTotal,
      estadisticas: resultadoFinal.detalles.estadisticas
    };

    return resultadoFinal;

  } catch (error) {
    gestor.reportarError(error, 'proceso general');
    gestor.actualizarProgreso('error', 0, `Error: ${error.message}`);
    
    throw error;
  }
};

/**
 * Aplica filtros a la lista de estudiantes extraídos del Excel
 * @param {Array} estudiantes - Lista de estudiantes del Excel
 * @param {Object} filtros - Filtros a aplicar
 * @returns {Array} Estudiantes filtrados
 */
const aplicarFiltros = (estudiantes, filtros) => {
  let resultado = [...estudiantes];

  if (filtros.carrera) {
    resultado = resultado.filter(e => 
      e.carrera && e.carrera.toLowerCase().trim() === filtros.carrera.toLowerCase().trim()
    );
  }

  if (filtros.semestre) {
    const semestreNum = parseInt(filtros.semestre, 10);
    resultado = resultado.filter(e => e.semestre === semestreNum);
  }

  if (filtros.paralelo) {
    resultado = resultado.filter(e => 
      (e.paralelo || 'A').toUpperCase() === filtros.paralelo.toUpperCase()
    );
  }

  return resultado;
};

/**
 * Valida una lista de estudiantes en paralelo
 * @param {Array} estudiantes - Estudiantes a validar
 * @param {Array} carrerasPermitidas - Carreras permitidas para el docente
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<Object>} Resultados de validación
 */
const validarEstudiantesEnLote = async (estudiantes, carrerasPermitidas, onProgress = null) => {
  const resultado = {
    validos: [],
    invalidos: []
  };

  let procesados = 0;

  for (const estudiante of estudiantes) {
    try {
      const validacion = validarEstudianteCompleto(estudiante, carrerasPermitidas);
      
      if (validacion.valido) {
        resultado.validos.push(validacion.estudianteValidado);
      } else {
        resultado.invalidos.push({
          estudiante,
          errores: validacion.errores,
          fila: estudiante.numeroFila
        });
      }
    } catch (error) {
      resultado.invalidos.push({
        estudiante,
        errores: [`Error de validación: ${error.message}`],
        fila: estudiante.numeroFila
      });
    }

    procesados++;
    
    if (onProgress) {
      onProgress({
        procesados,
        total: estudiantes.length,
        porcentaje: Math.round((procesados / estudiantes.length) * 100)
      });
    }
  }

  return resultado;
};

/**
 * Importa estudiantes en lotes para evitar sobrecargar el servidor
 * @param {Array} estudiantes - Estudiantes validados para importar
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<Object>} Resultados de la importación
 */
const importarEstudiantesEnLotes = async (estudiantes, onProgress = null) => {
  const resultado = {
    exitosos: [],
    fallidos: [],
    progreso: {
      total: estudiantes.length,
      exitosos: 0,
      fallidos: 0
    }
  };

  // Dividir en lotes
  const lotes = [];
  for (let i = 0; i < estudiantes.length; i += CONFIG_IMPORTACION.LOTE_MAXIMO) {
    lotes.push(estudiantes.slice(i, i + CONFIG_IMPORTACION.LOTE_MAXIMO));
  }

  // Procesar cada lote
  for (const [indiceLote, lote] of lotes.entries()) {
    console.log(`Procesando lote ${indiceLote + 1}/${lotes.length} (${lote.length} estudiantes)`);

    // Procesar estudiantes del lote en paralelo
    const promesasLote = lote.map(estudiante => 
      importarEstudianteConReintentos(estudiante)
    );

    try {
      const resultadosLote = await Promise.allSettled(promesasLote);
      
      // Procesar resultados del lote
      resultadosLote.forEach((resultadoPromesa, indiceEnLote) => {
        const estudiante = lote[indiceEnLote];
        
        if (resultadoPromesa.status === 'fulfilled') {
          resultado.exitosos.push({
            estudiante,
            resultado: resultadoPromesa.value,
            fila: estudiante.numeroFila
          });
          resultado.progreso.exitosos++;
        } else {
          resultado.fallidos.push({
            estudiante,
            error: resultadoPromesa.reason?.message || 'Error desconocido',
            fila: estudiante.numeroFila
          });
          resultado.progreso.fallidos++;
        }
      });

      // Reportar progreso
      if (onProgress) {
        onProgress({
          ...resultado.progreso,
          porcentaje: Math.round(((resultado.progreso.exitosos + resultado.progreso.fallidos) / resultado.progreso.total) * 100)
        });
      }

      // Delay entre lotes para no sobrecargar el servidor
      if (indiceLote < lotes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG_IMPORTACION.DELAY_ENTRE_LOTES));
      }

    } catch (error) {
      console.error(`Error procesando lote ${indiceLote + 1}:`, error);
      
      // Marcar todo el lote como fallido
      lote.forEach(estudiante => {
        resultado.fallidos.push({
          estudiante,
          error: `Error en lote: ${error.message}`,
          fila: estudiante.numeroFila
        });
        resultado.progreso.fallidos++;
      });
    }
  }

  return resultado;
};

/**
 * Importa un estudiante individual con reintentos
 * @param {Object} estudiante - Estudiante validado a importar
 * @returns {Promise<Object>} Resultado de la importación
 */
const importarEstudianteConReintentos = async (estudiante) => {
  let ultimoError = null;

  for (let intento = 1; intento <= CONFIG_IMPORTACION.REINTENTOS_MAXIMOS; intento++) {
    try {
      // Crear timeout para cada intento individual
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al crear estudiante')), CONFIG_IMPORTACION.TIMEOUT_POR_ESTUDIANTE);
      });

      const importacionPromise = createEstudiante(estudiante);
      
      const resultado = await Promise.race([importacionPromise, timeoutPromise]);
      
      // Si llegamos aquí, la importación fue exitosa
      return resultado;

    } catch (error) {
      ultimoError = error;
      
      // Si es el último intento, lanzar el error
      if (intento === CONFIG_IMPORTACION.REINTENTOS_MAXIMOS) {
        throw error;
      }
      
      // Delay antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 1000 * intento));
    }
  }

  // No debería llegar aquí, pero por seguridad
  throw ultimoError || new Error('Error desconocido en importación');
};

/**
 * Genera un reporte detallado de la importación
 * @param {Object} resultados - Resultados de la importación
 * @param {Object} metadata - Metadata del archivo y proceso
 * @returns {Object} Reporte formateado
 */
export const generarReporteImportacion = (resultados, metadata = {}) => {
  const { exitosos, fallidos, duplicados, estadisticas } = resultados;
  
  const reporte = {
    resumen: {
      timestamp: new Date().toISOString(),
      archivo: metadata.archivoNombre || 'Archivo desconocido',
      total_procesados: estadisticas?.total || 0,
      exitosos: exitosos?.length || 0,
      duplicados: duplicados?.length || 0,
      errores: fallidos?.length || 0,
      tasa_exito: estadisticas?.validos?.porcentaje || 0
    },
    
    detalles: {
      exitosos: exitosos?.map(e => ({
        fila: e.fila,
        codigo: e.estudiante.codigo,
        nombre: `${e.estudiante.nombre} ${e.estudiante.apellido}`,
        carrera: e.estudiante.carrera,
        semestre: e.estudiante.semestre,
        paralelo: e.estudiante.paralelo
      })) || [],
      
      duplicados: duplicados?.map(d => ({
        fila: d.estudiante?.numeroFila || d.estudiante?.fila,
        codigo: d.estudiante.codigo,
        nombre: `${d.estudiante.nombre} ${d.estudiante.apellido}`,
        razon: d.razon,
        sugerencia: d.sugerencia
      })) || [],
      
      errores: fallidos?.map(f => ({
        fila: f.fila || f.estudiante?.numeroFila,
        codigo: f.estudiante?.codigo || 'N/A',
        nombre: f.estudiante ? `${f.estudiante.nombre} ${f.estudiante.apellido}` : 'N/A',
        error: f.error || (Array.isArray(f.errores) ? f.errores.join(', ') : 'Error desconocido')
      })) || []
    }
  };
  
  return reporte;
};

/**
 * Exporta reporte a CSV
 * @param {Object} reporte - Reporte generado
 * @param {string} tipo - Tipo de sección ('exitosos', 'duplicados', 'errores', 'completo')
 * @returns {Blob} Archivo CSV
 */
export const exportarReporteCSV = (reporte, tipo = 'completo') => {
  let contenidoCSV = '';
  
  if (tipo === 'completo' || tipo === 'exitosos') {
    contenidoCSV += 'ESTUDIANTES IMPORTADOS EXITOSAMENTE\n';
    contenidoCSV += 'Fila,Código,Nombre,Carrera,Semestre,Paralelo\n';
    
    reporte.detalles.exitosos.forEach(e => {
      contenidoCSV += `${e.fila},"${e.codigo}","${e.nombre}","${e.carrera}",${e.semestre},"${e.paralelo}"\n`;
    });
    
    contenidoCSV += '\n';
  }
  
  if (tipo === 'completo' || tipo === 'duplicados') {
    contenidoCSV += 'ESTUDIANTES DUPLICADOS (IGNORADOS)\n';
    contenidoCSV += 'Fila,Código,Nombre,Razón,Sugerencia\n';
    
    reporte.detalles.duplicados.forEach(d => {
      contenidoCSV += `${d.fila},"${d.codigo}","${d.nombre}","${d.razon}","${d.sugerencia}"\n`;
    });
    
    contenidoCSV += '\n';
  }
  
  if (tipo === 'completo' || tipo === 'errores') {
    contenidoCSV += 'ERRORES DE IMPORTACIÓN\n';
    contenidoCSV += 'Fila,Código,Nombre,Error\n';
    
    reporte.detalles.errores.forEach(e => {
      contenidoCSV += `${e.fila},"${e.codigo}","${e.nombre}","${e.error}"\n`;
    });
  }
  
  return new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Descarga reporte CSV
 * @param {Object} reporte - Reporte a descargar
 * @param {string} nombre - Nombre del archivo
 * @param {string} tipo - Tipo de reporte
 */
export const descargarReporteCSV = (reporte, nombre = null, tipo = 'completo') => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const nombreArchivo = nombre || `reporte_importacion_${timestamp}.csv`;
  
  const blob = exportarReporteCSV(reporte, tipo);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

const importacionUtilsDefault = {
  importarEstudiantesDesdeExcel,
  generarReporteImportacion,
  exportarReporteCSV,
  descargarReporteCSV,
  CONFIG_IMPORTACION
};

export default importacionUtilsDefault;