// src/util/export/formatService.js
import { ESTRUCTURA_RUBRICA } from '../calculo';

/**
 * Convierte un valor de calificación textual a su equivalente numérico
 * @param {string} calificacion - Calificación textual (ej. "EXCELENTE")
 * @returns {number} - Valor numérico equivalente
 */
const calificacionANumero = (calificacion) => {
  switch (calificacion) {
    case 'SOBRESALIENTE': return 10;
    case 'EXCELENTE': return 9;
    case 'MUY BUENO': return 8;
    case 'BUENO': return 7;
    case 'SATISFACTORIO': return 6;
    case 'ACEPTABLE': return 5;
    case 'BÁSICAMENTE ACEPTABLE': return 4;
    case 'INSUFICIENTE': return 3;
    case 'DEFICIENTE': return 2;
    case 'MUY DEFICIENTE': return 1;
    default: return 0;
  }
};
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
 * Obtiene el color de fondo para una calificación
 * @param {string|number} calificacion - Calificación (textual o numérica)
 * @returns {string} - Color hexadecimal para Excel
 */
const getColorCalificacion = (calificacion) => {
  // Si es texto, convertir a número
  let valor = typeof calificacion === 'string' 
    ? calificacionANumero(calificacion) 
    : Number(calificacion);
  
  // Aplicar escala de colores
  if (valor >= 9) return '#D4EDDA'; // Verde claro
  if (valor >= 7) return '#D1ECF1'; // Azul claro
  if (valor >= 5) return '#FFF3CD'; // Amarillo claro
  if (valor >= 3) return '#FBE5D6'; // Naranja claro
  return '#F8D7DA'; // Rojo claro
};

/**
 * Formatea los datos para Excel, creando una matriz de arrays de filas
 * @param {Object} datosExcel - Datos estructurados de evaluaciones
 * @returns {Object} - Objeto con datos formateados y configuración de columnas
 */
// Modificación a la función formatearDatosExcel en formatService.js
// Modificación a la función formatearDatosExcel para garantizar que no haya objetos complejos
export const formatearDatosExcel = (datosExcel) => {
  const { grupo, estudiantes, criterios, incluirDetalles } = datosExcel;

  // Función auxiliar para asegurar que los valores sean primitivos
  const asegurarValorPrimitivo = (valor) => {
    if (valor === null || valor === undefined) return '-';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  };

  // Calcular cantidad total de columnas según las secciones y criterios
  let columnasSeccion = {};
  let totalColumnas = 3; // N°, Código, Estudiante
  
  Object.entries(criterios).forEach(([seccionKey, seccion]) => {
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
  
  // Fila 3: INDICADORES (restaurando esta fila que se había eliminado)
  const indicadoresRow = Array(totalColumnas).fill('');
  indicadoresRow[0] = 'INDICADORES';
  datos.push(indicadoresRow);
  
  // Fila 4: Encabezados de secciones
  const headerSecciones = Array(totalColumnas).fill('');
  headerSecciones[0] = 'N°';
  headerSecciones[1] = 'CÓDIGO';
  headerSecciones[2] = 'ESTUDIANTE';
  
  let colIndice = 3;
  
  // Agregar encabezados de secciones
  Object.entries(criterios).forEach(([seccionKey, seccion]) => {
    // Calcular la posición central de la sección
    const numColumnas = columnasSeccion[seccionKey];
    const posicionCentral = colIndice + Math.floor(numColumnas / 2);
    
    // Agregar el encabezado de sección con su peso (corregido para evitar NaN%)
    const peso = seccion.peso * 100;
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
  
  // Si incluimos detalles, agregar encabezados de criterios
  if (incluirDetalles) {
    Object.entries(criterios).forEach(([seccionKey, seccion]) => {
      seccion.criterios.forEach(criterio => {
        const pesoCriterio = criterio.peso * 100;
        headerCriterios[colIndice] = `${asegurarValorPrimitivo(criterio.nombre).toUpperCase()} ${pesoCriterio}%`;
        colIndice++;
      });
    });
  } else {
    // Solo agregar encabezados de secciones
    Object.keys(criterios).forEach(() => {
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
        // Agregar calificaciones detalladas por criterio
        Object.entries(criterios).forEach(([seccionKey, seccion]) => {
          seccion.criterios.forEach(criterio => {
            // Buscar calificación para este criterio y asegurar que sea un valor primitivo
            const calificacion = estudiante.calificaciones[criterio.id];
            estudianteRow[colIndice] = calificacion ? asegurarValorPrimitivo(calificacion) : '-';
            colIndice++;
          });
        });
      } else {
        // Agregar solo calificaciones por sección
        Object.entries(criterios).forEach(([seccionKey, seccion]) => {
          const calificacionSeccion = estudiante.rubrica[seccionKey.toLowerCase()];
          estudianteRow[colIndice] = safeNumberFormat(calificacionSeccion, 1)
            ? (typeof calificacionSeccion === 'number' 
                ? calificacionSeccion.toFixed(1) 
                : Number(calificacionSeccion).toFixed(1))
            : '-';
          colIndice++;
        });
      }
      
      // Agregar nota final y resultado
      const notaFinal = estudiante.nota_final;
      estudianteRow[colIndice] = safeNumberFormat(notaFinal, 2)
        ? (typeof notaFinal === 'number' 
            ? notaFinal.toFixed(2) 
            : Number(notaFinal).toFixed(2))
        : '-';
      
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
  
  // Agregar anchos para criterios
  Object.entries(criterios).forEach(([seccionKey, seccion]) => {
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
 * Crea un objeto de estilos para aplicar a celdas de Excel
 * @param {Object} options - Opciones de estilo
 * @returns {Object} - Objeto de estilo Excel
 */
export const crearEstiloCelda = (options = {}) => {
  const { 
    fontSize, 
    bold = false, 
    alignment = 'center', 
    backgroundColor, 
    border = true,
    fontColor = '000000'
  } = options;
  
  const estilo = {
    font: {
      bold,
      color: { rgb: fontColor }
    },
    alignment: {
      horizontal: alignment,
      vertical: 'center',
      wrapText: true
    }
  };
  
  if (fontSize) {
    estilo.font.sz = fontSize;
  }
  
  if (backgroundColor) {
    estilo.fill = {
      patternType: 'solid',
      fgColor: { rgb: backgroundColor.replace('#', '') }
    };
  }
  
  if (border) {
    estilo.border = {
      top: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };
  }
  
  return estilo;
};

/**
 * Convierte una calificación textual a su representación visual para Excel
 * @param {string} calificacion - Calificación textual
 * @returns {string} - Representación visual de la calificación
 */
export const formatoVisualCalificacion = (calificacion) => {
  switch (calificacion) {
    case 'SOBRESALIENTE':
      return 'SOBRESALIENTE (10)';
    case 'EXCELENTE':
      return 'EXCELENTE (9)';
    case 'MUY BUENO':
      return 'MUY BUENO (8)';
    case 'BUENO':
      return 'BUENO (7)';
    case 'SATISFACTORIO':
      return 'SATISFACTORIO (6)';
    case 'ACEPTABLE':
      return 'ACEPTABLE (5)';
    case 'BÁSICAMENTE ACEPTABLE':
      return 'BÁSICAMENTE ACEPTABLE (4)';
    case 'INSUFICIENTE':
      return 'INSUFICIENTE (3)';
    case 'DEFICIENTE':
      return 'DEFICIENTE (2)';
    case 'MUY DEFICIENTE':
      return 'MUY DEFICIENTE (1)';
    default:
      return calificacion;
  }
};