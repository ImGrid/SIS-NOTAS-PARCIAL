// src/util/export/excelService.js
import ExcelJS from 'exceljs';
import { getMisGrupos, getGrupoPorId } from '../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../service/estudianteService';
import { getInformesPorGrupoId } from '../../service/informeService';
import { getRubricaPorId } from '../../service/rubricaService';
import { getBorradorPorDocenteYGrupo } from '../../service/borradorService';
import { ESTRUCTURA_RUBRICA } from '../calculo';
import { formatearDatosExcel as formatearDatosOriginal } from './formartService';

// Función auxiliar para formatear números de manera segura
const safeNumberFormat = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  try {
    const num = typeof value === 'number' ? value : Number(value);
    return !isNaN(num) ? num.toFixed(decimals) : '-';
  } catch (e) {
    console.error('Error al formatear número:', e, value);
    return '-';
  }
};

/**
 * Exporta las evaluaciones de un grupo a un archivo Excel
 * @param {string|number} grupoId - ID del grupo a exportar
 * @param {boolean} incluirDetalles - Si se deben incluir todos los criterios detallados
 * @returns {Promise<void>} - Promesa que se resuelve cuando se completa la exportación
 */
export const exportarEvaluacionesAExcel = async (grupoId, incluirDetalles = true) => {
  try {
    // 1. Obtener datos del grupo
    const grupo = await getGrupoPorId(grupoId);
    if (!grupo) {
      throw new Error(`No se encontró el grupo con ID ${grupoId}`);
    }

    // 2. Obtener estudiantes del grupo
    const estudiantes = await getEstudiantesByGrupoId(grupoId);
    if (!estudiantes || estudiantes.length === 0) {
      throw new Error(`No hay estudiantes asignados al grupo ${grupo.nombre_proyecto}`);
    }

    // 3. Obtener informes y rúbricas del grupo
    const informes = await getInformesPorGrupoId(grupoId);
    
    // 4. Obtener la información del docente actual desde sessionStorage
    const usuarioString = sessionStorage.getItem('usuario');
    if (!usuarioString) {
      throw new Error('No se encontró información del docente en la sesión');
    }
    const usuario = JSON.parse(usuarioString);
    
    // 5. Intentar cargar el borrador (si existe, tendrá información detallada)
    let borrador = null;
    try {
      borrador = await getBorradorPorDocenteYGrupo(usuario.id, grupoId);
    } catch (error) {
      console.log('No se encontró borrador, solo se usarán informes y rúbricas');
    }

    // 6. Construir datos para Excel
    const datosExcel = await construirDatosExcel(
      grupo, 
      estudiantes, 
      informes, 
      borrador, 
      incluirDetalles
    );

    // 7. Crear y descargar el archivo Excel
    await generarArchivoExcel(datosExcel, grupo.nombre_proyecto);
    
  } catch (error) {
    console.error('Error al exportar evaluaciones a Excel:', error);
    throw error;
  }
};

/**
 * Construye los datos para el archivo Excel
 * @param {Object} grupo - Información del grupo
 * @param {Array} estudiantes - Lista de estudiantes
 * @param {Array} informes - Lista de informes
 * @param {Object|null} borrador - Borrador con datos detallados
 * @param {boolean} incluirDetalles - Si se deben incluir todos los criterios
 * @returns {Object} - Datos estructurados para Excel
 */
const construirDatosExcel = async (
  grupo, 
  estudiantes, 
  informes, 
  borrador, 
  incluirDetalles
) => {
  // Datos básicos del grupo para el encabezado
  const datosGrupo = {
    nombre: grupo.nombre_proyecto,
    carrera: grupo.carrera,
    semestre: grupo.semestre,
    materia: grupo.materia || 'Sin materia',
  };

  // Mapear estudiantes con sus evaluaciones
  const datosEstudiantes = await Promise.all(
    estudiantes.map(async (estudiante) => {
      // Buscar informe para este estudiante
      const informe = informes.find(inf => inf.estudiante_id === estudiante.id);
      
      // Si no hay informe, devolver solo datos básicos
      if (!informe) {
        return {
          codigo: estudiante.codigo,
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
          evaluado: false,
          calificaciones: {}
        };
      }
      
      // Obtener la rúbrica asociada al informe
      let rubrica = null;
      try {
        if (informe.rubrica_id) {
          rubrica = await getRubricaPorId(informe.rubrica_id);
        }
      } catch (error) {
        console.error(`Error al obtener rúbrica ${informe.rubrica_id}:`, error);
      }
      
      // Obtener calificaciones detalladas del borrador si existe
      let calificacionesDetalladas = {};
      if (borrador && borrador.contenido && borrador.contenido[estudiante.id]) {
        calificacionesDetalladas = borrador.contenido[estudiante.id];
      }
      
      // Si no hay calificaciones detalladas, intentar obtenerlas del informe o rúbrica
      if (Object.keys(calificacionesDetalladas).length === 0 && rubrica) {
        // Intentar reconstruir las calificaciones detalladas a partir de las secciones
        // Crear un mapeo de escalas de calificación para cada nivel
        const escalaCalificacion = {
          10: 'SOBRESALIENTE',
          9: 'EXCELENTE',
          8: 'MUY BUENO',
          7: 'BUENO',
          6: 'SATISFACTORIO',
          5: 'ACEPTABLE',
          4: 'BÁSICAMENTE ACEPTABLE',
          3: 'INSUFICIENTE',
          2: 'DEFICIENTE',
          1: 'MUY DEFICIENTE'
        };
        
        // Obtener las calificaciones por sección
        const secciones = {
          presentacion: rubrica.presentacion,
          sustentacion: rubrica.sustentacion,
          documentacion: rubrica.documentacion, 
          innovacion: rubrica.innovacion
        };
        
        Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
          const valorSeccion = secciones[seccionKey.toLowerCase()];
          if (valorSeccion) {
            const escalaValor = Math.round(valorSeccion);
            const calificacionTextual = escalaCalificacion[escalaValor] || 'SATISFACTORIO';
            
            seccion.criterios.forEach(criterio => {
              calificacionesDetalladas[criterio.id] = calificacionTextual;
            });
          }
        });
      }
      
      return {
        codigo: estudiante.codigo,
        nombre: `${estudiante.nombre} ${estudiante.apellido}`,
        evaluado: true,
        rubrica: rubrica,
        calificaciones: calificacionesDetalladas,
        nota_final: rubrica ? rubrica.nota_final : null,
        resultado: rubrica ? rubrica.observaciones : (informe.resultado || null)
      };
    })
  );

  const estructuraCriterios = {};
  
  if (incluirDetalles) {
    Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
      estructuraCriterios[seccionKey] = {
        nombre: seccion.nombre,
        peso: seccion.ponderacion,
        criterios: seccion.criterios.map(criterio => ({
          id: criterio.id,
          nombre: criterio.nombre,
          peso: criterio.peso
        }))
      };
    });
  } else {
    Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
      estructuraCriterios[seccionKey] = {
        nombre: seccion.nombre,
        peso: seccion.ponderacion,
        criterios: []
      };
    });
  }
  
  return {
    grupo: datosGrupo,
    estudiantes: datosEstudiantes,
    criterios: estructuraCriterios,
    incluirDetalles
  };
};

/**
 * Genera y descarga el archivo Excel usando ExcelJS con estilos aplicados
 * @param {Object} datosExcel - Datos estructurados para Excel
 * @param {string} nombreArchivo - Nombre para el archivo
 */
const generarArchivoExcel = async (datosExcel, nombreArchivo) => {
  const datosFormateados = formatearDatosExcel(datosExcel);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Evaluaciones');
  
  // Aplicar estilos a la hoja
  await aplicarEstilosHoja(worksheet, datosFormateados.datos, datosFormateados.anchos, 1);
  
  // Guardar archivo (descarga en navegador)
  const nombreCompleto = `${nombreArchivo.replace(/[^\w\s]/gi, '')}_Evaluaciones.xlsx`;
  
  // Para entorno de navegador, generar blob y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Crear un elemento <a> para descargar
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = nombreCompleto;
  
  // Añadir al DOM, hacer clic y eliminar
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formatea los datos para Excel, creando una matriz de arrays de filas
 * @param {Object} datosExcel - Datos estructurados de evaluaciones
 * @returns {Object} - Objeto con datos formateados y configuración de columnas
 */
export const formatearDatosExcel = (datosExcel) => {
  const { grupo, estudiantes, incluirDetalles } = datosExcel;

  // Función auxiliar para asegurar que los valores sean primitivos
  const asegurarValorPrimitivo = (valor) => {
    if (valor === null || valor === undefined) return '-';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  };

  // Calcular cantidad total de columnas según las secciones y criterios
  // IMPORTANTE: Ahora usamos directamente ESTRUCTURA_RUBRICA para contar criterios
  let columnasSeccion = {};
  let totalColumnas = 3; // N°, Código, Estudiante
  
  Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
    // Si incluimos detalles, contar cada criterio
    if (incluirDetalles && seccion.criterios.length > 0) {
      columnasSeccion[seccionKey] = seccion.criterios.length;
      totalColumnas += seccion.criterios.length;
    } else {
      // Solo una columna para la sección
      columnasSeccion[seccionKey] = 1;
      totalColumnas += 1;
    }
  });
  
  totalColumnas += 2; // Nota final y Resultado
  
  // Matriz de datos para Excel (array de arrays)
  const datos = [];
  
  // Fila 1: Título principal
  const tituloRow = Array(totalColumnas).fill('');
  tituloRow[0] = `PROYECTO GRUPAL: ${asegurarValorPrimitivo(grupo.nombre)}`;
  datos.push(tituloRow);
  
  // Fila 2: Información del grupo
  const infoRow = Array(totalColumnas).fill('');
  infoRow[0] = `${asegurarValorPrimitivo(grupo.carrera)} | Semestre ${asegurarValorPrimitivo(grupo.semestre)} | ${asegurarValorPrimitivo(grupo.materia)}`;
  datos.push(infoRow);
  
  // Fila 3: INDICADORES
  const indicadoresRow = Array(totalColumnas).fill('');
  indicadoresRow[0] = 'INDICADORES';
  datos.push(indicadoresRow);
  
  // Fila 4: Encabezados de secciones
  const headerSecciones = Array(totalColumnas).fill('');
  headerSecciones[0] = 'N°';
  headerSecciones[1] = 'CÓDIGO';
  headerSecciones[2] = 'ESTUDIANTE';
  
  let colIndice = 3;
  
  // Agregar encabezados de secciones usando ESTRUCTURA_RUBRICA
  Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
    // Calcular la posición central de la sección
    const numColumnas = columnasSeccion[seccionKey];
    
    // Agregar el encabezado de sección con su peso (correcto según la nueva estructura)
    const peso = seccion.ponderacion * 100;
    headerSecciones[colIndice] = `${asegurarValorPrimitivo(seccion.nombre).toUpperCase()} ${peso}%`;
    
    // Avanzar para la siguiente sección
    colIndice += numColumnas;
  });
  
  // Agregar columnas finales
  headerSecciones[colIndice] = 'NOTA FINAL';
  headerSecciones[colIndice + 1] = 'OBSERVACIONES';
  
  datos.push(headerSecciones);
  
  // Fila 5: Encabezados de criterios
  const headerCriterios = Array(totalColumnas).fill('');
  headerCriterios[0] = '';
  headerCriterios[1] = '';
  headerCriterios[2] = '';
  
  colIndice = 3;
  
  // Si incluimos detalles, agregar encabezados de criterios basados en la nueva estructura
  if (incluirDetalles) {
    Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
      seccion.criterios.forEach(criterio => {
        const pesoCriterio = criterio.peso * 100;
        headerCriterios[colIndice] = `${asegurarValorPrimitivo(criterio.nombre).toUpperCase()} ${pesoCriterio}%`;
        colIndice++;
      });
    });
  } else {
    // Solo agregar encabezados de secciones
    Object.keys(ESTRUCTURA_RUBRICA).forEach(() => {
      headerCriterios[colIndice] = '';
      colIndice++;
    });
  }
  
  headerCriterios[colIndice] = '';
  headerCriterios[colIndice + 1] = '';
  
  datos.push(headerCriterios);
  
  // Filas de estudiantes con sus calificaciones
  estudiantes.forEach((estudiante, index) => {
    const estudianteRow = Array(totalColumnas).fill('-');
    estudianteRow[0] = index + 1;
    estudianteRow[1] = asegurarValorPrimitivo(estudiante.codigo);
    estudianteRow[2] = asegurarValorPrimitivo(estudiante.nombre);
    
    colIndice = 3;
    
    // Si el estudiante está evaluado, agregar calificaciones
    if (estudiante.evaluado && estudiante.rubrica) {
      if (incluirDetalles) {
        // Agregar calificaciones detalladas por criterio usando la nueva estructura
        Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
          seccion.criterios.forEach(criterio => {
            // Buscar calificación para este criterio usando el ID correcto
            const calificacion = estudiante.calificaciones[criterio.id];
            estudianteRow[colIndice] = calificacion ? asegurarValorPrimitivo(calificacion) : '-';
            colIndice++;
          });
        });
      } else {
        // Agregar solo calificaciones por sección
        Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
          const calificacionSeccion = estudiante.rubrica[seccionKey.toLowerCase()];
          estudianteRow[colIndice] = safeNumberFormat(calificacionSeccion, 1);
          colIndice++;
        });
      }
      
      // Agregar nota final y resultado
      const notaFinal = estudiante.nota_final;
      estudianteRow[colIndice] = safeNumberFormat(notaFinal, 2);
      
      // Corregir para mostrar APROBADO/REPROBADO correctamente
      const resultadoTexto = estudiante.resultado && asegurarValorPrimitivo(estudiante.resultado).toUpperCase();
      estudianteRow[colIndice + 1] = resultadoTexto === 'APROBADO' || resultadoTexto === 'REPROBADO' 
        ? resultadoTexto 
        : (resultadoTexto || '-');
    } else {
      // Si no está evaluado, dejar valores por defecto
      const numColumnasCriterios = totalColumnas - 5; // Restar N°, Código, Estudiante, Nota Final, Resultado
      for (let i = 0; i < numColumnasCriterios; i++) {
        estudianteRow[colIndice + i] = 'Sin evaluar';
      }
      estudianteRow[totalColumnas - 2] = '-';
      estudianteRow[totalColumnas - 1] = '-';
    }
    
    datos.push(estudianteRow);
  });
  
  // Definir anchos de columna
  const anchos = [
    5,  // N°
    12, // Código
    25, // Estudiante
  ];
  
  // Agregar anchos para criterios usando la nueva estructura
  Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
    if (incluirDetalles) {
      seccion.criterios.forEach(() => {
        anchos.push(15); // Ancho para cada criterio
      });
    } else {
      anchos.push(15); // Ancho para cada sección
    }
  });
  
  // Agregar anchos para columnas finales
  anchos.push(10); // Nota Final
  anchos.push(15); // Resultado
  
  return {
    datos,
    anchos,
  };
};

/**
 * Aplica estilos a una hoja de Excel
 * @param {ExcelJS.Worksheet} worksheet - Hoja de trabajo de ExcelJS
 * @param {Array} datos - Datos formateados para Excel
 * @param {Array} anchos - Anchos de columnas
 * @param {number} filaInicial - Número de fila donde empezar a insertar datos (1-based)
 */
const aplicarEstilosHoja = async (worksheet, datos, anchos, filaInicial = 1) => {
  // Función auxiliar para asegurar que los valores sean primitivos
  const asegurarValorPrimitivo = (valor) => {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'object') return JSON.stringify(valor);
    return valor;
  };
  
  // Definir escala de colores para calificaciones
  const escalaCalificacion = [
    { valor: 'SOBRESALIENTE', numero: '10', color: '#30eb30' },
    { valor: 'EXCELENTE', numero: '9', color: '#92d050' },
    { valor: 'MUY BUENO', numero: '8', color: '#ffda9e' },
    { valor: 'BUENO', numero: '7', color: '#b5dcfd' },
    { valor: 'SATISFACTORIO', numero: '6', color: '#00bfff' },
    { valor: 'ACEPTABLE', numero: '5', color: '#ffcc00' },
    { valor: 'BÁSICAMENTE ACEPTABLE', numero: '4', color: '#ffee00' },
    { valor: 'INSUFICIENTE', numero: '3', color: '#cd853f' },
    { valor: 'DEFICIENTE', numero: '2', color: '#ff4444' },
    { valor: 'MUY DEFICIENTE', numero: '1', color: '#ff0000' },
  ];
  
  // Función para obtener color basado en calificación
  const getColorPorCalificacion = (calificacion) => {
    if (!calificacion || calificacion === '-' || calificacion === 'Sin evaluar') {
      return '#ffffff'; // blanco para valores vacíos
    }
    
    const strCalificacion = String(calificacion);
    const encontrado = escalaCalificacion.find(item => 
      item.valor === strCalificacion || 
      item.numero === strCalificacion
    );
    
    return encontrado ? encontrado.color : '#ffffff';
  };
  
  // 1. Agregar filas con datos y aplicar estilos
  const filas = [];
  
  // CAMBIO: Usar la estructura actual de criterios desde ESTRUCTURA_RUBRICA
  // en lugar de la estructura hardcodeada anterior
  const seccionesInfo = {};
  let colActual = 4; // Inicia después de N°, CÓDIGO, ESTUDIANTE
  
  Object.entries(ESTRUCTURA_RUBRICA).forEach(([nombreSeccion, seccion]) => {
    const numCriterios = seccion.criterios.length;
    seccionesInfo[seccion.nombre] = {
      inicio: colActual,
      fin: colActual + numCriterios - 1,
      peso: seccion.ponderacion * 100 + '%',
      criterios: seccion.criterios.map(criterio => ({
        nombre: criterio.nombre,
        peso: criterio.peso * 100 + '%'
      }))
    };
    colActual += numCriterios;
  });
  
  // Agregar datos a la hoja
  datos.forEach((fila, rowIndex) => {
    const excelRow = worksheet.addRow([]);
    filas.push(excelRow);
    
    // Ajustar el índice de fila para coincidir con filaInicial
    const actualRowIndex = filaInicial + rowIndex;
    
    // Agregar valores a la fila
    fila.forEach((valor, colIndex) => {
      const cell = worksheet.getCell(actualRowIndex, colIndex + 1);
      // Asegurar que el valor sea un tipo primitivo que ExcelJS pueda manejar
      cell.value = asegurarValorPrimitivo(valor);
      
      // Configuración básica para todas las celdas
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true
      };
      
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Para las filas de estudiantes (después de las cabeceras - ahora a partir de la fila 6)
      if (rowIndex >= 5) {
        // Verificar si es una celda con calificación (columnas después de las 3 primeras)
        if (colIndex > 2 && colIndex < datos[0].length - 2) {
          const valorCelda = valor;
          
          // Aplicar color según la calificación
          if (valorCelda && valorCelda !== '-' && valorCelda !== 'Sin evaluar') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: getColorPorCalificacion(valorCelda).replace('#', '') }
            };
          }
        }
        
        // Dar formato especial a la columna de OBSERVACIONES
        if (colIndex === datos[0].length - 1) {
          const resultado = String(valor);
          if (resultado === 'APROBADO') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: '92D050' } // Verde
            };
          } else if (resultado === 'REPROBADO') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF4444' } // Rojo
            };
          }
        }
      }
    });
  });
  
  // 2. Aplicar estilos específicos a las cabeceras
  
  // Título del proyecto (Fila 1)
  const tituloCell = worksheet.getCell(filaInicial, 1);
  worksheet.mergeCells(filaInicial, 1, filaInicial, datos[0].length);
  tituloCell.value = datos[0][0];
  tituloCell.font = { bold: true, size: 14 };
  tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
  tituloCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E2F0D9' } // Verde claro
  };
  
  // Info del grupo (Fila 2)
  const infoCell = worksheet.getCell(filaInicial + 1, 1);
  worksheet.mergeCells(filaInicial + 1, 1, filaInicial + 1, datos[0].length);
  infoCell.value = datos[1][0];
  infoCell.font = { bold: true, size: 12 };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  infoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E2F0D9' } // Verde claro
  };
  
  // Fila 3: INDICADORES (restaurada)
  const indicadoresCell = worksheet.getCell(filaInicial + 2, 1);
  worksheet.mergeCells(filaInicial + 2, 1, filaInicial + 2, datos[0].length);
  indicadoresCell.value = 'INDICADORES';
  indicadoresCell.font = { bold: true, size: 12 };
  indicadoresCell.alignment = { horizontal: 'center', vertical: 'middle' };
  indicadoresCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE699' } // Amarillo claro
  };
  
  // Encabezados de secciones (Fila 4)
  const filaSeccion = filaInicial + 3; // Ahora es la fila 4
  const totalColumnas = datos[0].length;
  
  // Aplicar N°, CÓDIGO y ESTUDIANTE
  const nroCell = worksheet.getCell(filaSeccion, 1);
  nroCell.value = 'N°';
  nroCell.font = { bold: true, size: 11 };
  nroCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' } // Azul claro
  };
  
  const codigoCell = worksheet.getCell(filaSeccion, 2);
  codigoCell.value = 'CÓDIGO';
  codigoCell.font = { bold: true, size: 11 };
  codigoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' } // Azul claro
  };
  
  const estudianteCell = worksheet.getCell(filaSeccion, 3);
  estudianteCell.value = 'ESTUDIANTE';
  estudianteCell.font = { bold: true, size: 11 };
  estudianteCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' } // Azul claro
  };
  
  // Agregar encabezados de secciones
  Object.entries(seccionesInfo).forEach(([nombre, info]) => {
    // IMPORTANTE: Evitar fusionar celdas que puedan estar ya fusionadas
    try {
      // Solo fusionar si el rango de fusión tiene sentido (inicio <= fin)
      if (info.inicio <= info.fin) {
        worksheet.mergeCells(filaSeccion, info.inicio, filaSeccion, info.fin);
      }
      
      // Asignar valor y estilo
      const seccionCell = worksheet.getCell(filaSeccion, info.inicio);
      seccionCell.value = `${nombre} ${info.peso}`;
      seccionCell.font = { bold: true, size: 11 };
      seccionCell.alignment = { horizontal: 'center', vertical: 'middle' };
      seccionCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE699' } // Fondo amarillo claro
      };
    } catch (e) {
      console.warn(`No se pudo fusionar sección ${nombre}:`, e.message);
    }
  });
  
  // NOTA FINAL y OBSERVACIONES
  const notaFinalCol = totalColumnas - 1;
  const observacionesCol = totalColumnas;
  
  const notaFinalCell = worksheet.getCell(filaSeccion, notaFinalCol);
  notaFinalCell.value = 'NOTA FINAL';
  notaFinalCell.font = { bold: true, size: 11 };
  notaFinalCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' } // Azul claro
  };
  
  const observacionesCell = worksheet.getCell(filaSeccion, observacionesCol);
  observacionesCell.value = 'OBSERVACIONES';
  observacionesCell.font = { bold: true, size: 11 };
  observacionesCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' } // Azul claro
  };
  
  // Criterios específicos (Fila 5)
  const filaCriterios = filaInicial + 4; // Ahora es la fila 5
  
  // IMPORTANTE: Usar try/catch para manejar posibles errores al fusionar celdas
  try {
    // Combinar verticalmente las celdas de N°, CÓDIGO, ESTUDIANTE, NOTA FINAL y OBSERVACIONES
    worksheet.mergeCells(filaSeccion, 1, filaCriterios, 1);
    worksheet.mergeCells(filaSeccion, 2, filaCriterios, 2);
    worksheet.mergeCells(filaSeccion, 3, filaCriterios, 3);
    worksheet.mergeCells(filaSeccion, notaFinalCol, filaCriterios, notaFinalCol);
    worksheet.mergeCells(filaSeccion, observacionesCol, filaCriterios, observacionesCol);
  } catch (e) {
    console.warn('Error al fusionar celdas verticales:', e.message);
  }
  
  // Establecer los criterios en la fila correspondiente utilizando la estructura actual
  let colIndex = 4; // Comenzar después de N°, CÓDIGO, ESTUDIANTE
  
  Object.entries(seccionesInfo).forEach(([nombreSeccion, info]) => {
    info.criterios.forEach(criterio => {
      const criterioCell = worksheet.getCell(filaCriterios, colIndex);
      criterioCell.value = `${criterio.nombre} ${criterio.peso}`;
      criterioCell.font = { bold: true, size: 10 };
      criterioCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      criterioCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F2F2F2' } // Gris claro
      };
      colIndex++;
    });
  });
  
  // 3. Establecer anchos de columna
  anchos.forEach((ancho, index) => {
    // ExcelJS usa índices de columna basados en 1, no en 0
    const colIndex = index + 1;
    worksheet.getColumn(colIndex).width = ancho;
  });
  
  // 4. Ajustar altura de filas
  worksheet.getRow(filaInicial).height = 30; // Título del proyecto
  worksheet.getRow(filaInicial + 1).height = 25; // Info del grupo
  worksheet.getRow(filaInicial + 2).height = 30; // INDICADORES
  worksheet.getRow(filaInicial + 3).height = 40; // Encabezados de secciones
  worksheet.getRow(filaInicial + 4).height = 80; // Criterios
  
  // Ajustar altura para las filas de estudiantes
  for (let i = filaInicial + 5; i < filaInicial + datos.length; i++) {
    worksheet.getRow(i).height = 30;
  }
};

/**
 * Exporta evaluaciones de todos los grupos del docente usando ExcelJS con estilos completos
 * @param {boolean} incluirDetalles - Si se deben incluir todos los criterios
 * @returns {Promise<void>} - Promesa que se resuelve cuando se completa la exportación
 */
export const exportarTodasLasEvaluaciones = async (incluirDetalles = false) => {
  try {
    // 1. Obtener todos los grupos del docente
    const grupos = await getMisGrupos();
    if (!grupos || grupos.length === 0) {
      throw new Error('No hay grupos asignados para exportar');
    }
    
    console.log(`Procesando ${grupos.length} grupos...`);
    
    // 2. Crear un libro de trabajo con ExcelJS
    const workbook = new ExcelJS.Workbook();
    
    // Crear una sola hoja para todos los grupos
    const worksheet = workbook.addWorksheet('Evaluaciones');
    
    // Variable para llevar la cuenta de filas procesadas
    let filaActual = 1;
    let gruposExitosos = 0;
    
    // 3. Para cada grupo, agregar sus datos a la única hoja
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i];
      console.log(`Procesando grupo ${i+1}/${grupos.length}: ${grupo.nombre_proyecto}`);
      
      try {
        // Obtener datos del grupo
        const estudiantes = await getEstudiantesByGrupoId(grupo.id);
        if (!estudiantes || estudiantes.length === 0) {
          console.log(`Grupo ${grupo.id} (${grupo.nombre_proyecto}) no tiene estudiantes, omitiendo...`);
          continue;
        }
        
        const informes = await getInformesPorGrupoId(grupo.id);
        
        // Obtener borrador si existe
        const usuarioString = sessionStorage.getItem('usuario');
        if (!usuarioString) {
          throw new Error('No se encontró información del docente en la sesión');
        }
        const usuario = JSON.parse(usuarioString);
        
        let borrador = null;
        try {
          borrador = await getBorradorPorDocenteYGrupo(usuario.id, grupo.id);
        } catch (error) {
          console.log(`No se encontró borrador para grupo ${grupo.id}`);
        }
        
        // Construir datos para Excel
        const datosExcel = await construirDatosExcel(
          grupo, 
          estudiantes, 
          informes, 
          borrador, 
          incluirDetalles
        );
        
        // Formatear datos
        const datosFormateados = formatearDatosExcel(datosExcel);
        
        try {
          await aplicarEstilosHoja(worksheet, datosFormateados.datos, datosFormateados.anchos, filaActual);
          filaActual += datosFormateados.datos.length + 2; // Agregar un espacio entre grupos
          gruposExitosos++;
          
          // Agregar una fila separadora entre grupos
          const separadorRow = worksheet.getRow(filaActual - 1);
          separadorRow.height = 10;
        } catch (error) {
          console.error(`Error al aplicar estilos para grupo ${grupo.id} (${grupo.nombre_proyecto}):`, error);
          // Continuar con el siguiente grupo
        }
      } catch (error) {
        console.error(`Error al procesar grupo ${grupo.id} (${grupo.nombre_proyecto}):`, error);
        // Continuar con el siguiente grupo
      }
    }
    
    // Verificar que se hayan agregado datos
    if (gruposExitosos <= 0) {
      throw new Error('No se pudieron generar datos para ningún grupo');
    }
    
    console.log(`Generando archivo con ${gruposExitosos} grupos en una sola hoja...`);
    
    // 4. Generar el archivo y descargarlo (para navegador)
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Crear un elemento <a> para descargar
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'Todas_las_Evaluaciones.xlsx';
    
    // Añadir al DOM, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error al exportar todas las evaluaciones:', error);
    throw error;
  }
};