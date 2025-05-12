// utils/pdf/estadisticasPdf.js
import { jsPDF } from "jspdf";
import domtoimage from 'dom-to-image';
import { formatearNota, obtenerFechaActual } from '../helpers/formatHelper';

/**
 * Genera un PDF con el informe de estadísticas utilizando jsPDF directamente
 * @param {Object} params - Parámetros para la generación del PDF
 * @param {HTMLElement} params.elementoDOM - Contenedor principal de estadísticas
 * @param {Object} params.filtros - Filtros aplicados (carrera, semestre, materia)
 * @param {Object} params.docente - Información del docente actual
 * @param {Object} params.graficos - Referencias a los elementos de gráficos
 * @param {Object} params.datos - Datos estadísticos para incluir en el PDF
 * @param {number} params.totalGrupos - Total de grupos
 * @returns {Promise} - Promesa que se resuelve cuando se completa la generación del PDF
 */
export const generarEstadisticasPDF = async ({
  elementoDOM,
  filtros,
  docente,
  graficos,
  datos,
  totalGrupos
}) => {
  console.log("Iniciando generación de PDF con jsPDF");
  
  try {
    // Verificamos referencias de gráficos
    console.log("Referencia gráfico circular:", graficos.graficoCircular);
    console.log("Referencia gráfico barras:", graficos.graficoBarras);
    
    // Crear instancia de jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Valores constantes para formateo del documento
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20; // Margen en mm
    
    // Rastrea la posición vertical actual para añadir contenido
    let yPosition = margin;
    
    // Añadir encabezado con logo
    yPosition = await agregarEncabezadoConLogo(doc, filtros, docente, totalGrupos, yPosition);
    
    // Línea divisoria después de la información de encabezado (con espacio adicional)
    yPosition += 5; // Espacio adicional antes de la línea
    doc.setDrawColor(200, 200, 200); // Gris claro
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10; // Espacio después de la línea
    
    // Título de sección de resumen
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80); // #2c3e50
    doc.text('Resumen de Evaluación', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15; // Aumentado el espacio después del título
    
    // Intentar capturar y añadir el gráfico circular
    if (graficos.graficoCircular) {
      // Título de distribución de resultados
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Distribución de Resultados', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      // Información de total de estudiantes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Total de estudiantes: ${datos.totalEstudiantes || 0}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15; // Más espacio antes del gráfico
      
      try {
        console.log("Capturando gráfico circular con dom-to-image...");
      const dataUrl = await domtoimage.toPng(graficos.graficoCircular, {
      quality: 1.0,
      bgcolor: '#ffffff',
      width: graficos.graficoCircular.offsetWidth * 2,
      height: graficos.graficoCircular.offsetHeight * 2,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left'
          }
        });
        
        // Calcular dimensiones para mantener proporción y no hacerlo demasiado grande
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = 120; // Limitamos la altura máxima del gráfico
        
        const aspectRatio = graficos.graficoCircular.offsetHeight / graficos.graficoCircular.offsetWidth;
        let imgWidth = maxWidth;
        let imgHeight = imgWidth * aspectRatio;
        
        // Si la altura es mayor que el máximo, ajustamos basados en la altura
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight / aspectRatio;
        }
        
        // Añadir la imagen al PDF centrada
        const xPos = margin + (maxWidth - imgWidth) / 2;
        doc.addImage(dataUrl, 'PNG', xPos, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 15; // Más espacio después del gráfico
        console.log("Gráfico circular añadido correctamente");
      } catch (error) {
        console.error('Error al capturar gráfico circular:', error);
        
        // Si falla la captura, agregar texto con los datos
        doc.setFontSize(12);
        doc.text('No se pudo generar el gráfico. Resumen de datos:', margin, yPosition);
        yPosition += 7;
        
        // Añadir información en formato textual
        const aprobados = datos.aprobados || 0;
        const reprobados = datos.reprobados || 0;
        const pendientes = datos.pendientes || 0;
        const total = datos.totalEstudiantes || 0;
        
        const pctAprobados = total ? Math.round((aprobados / total) * 100) : 0;
        const pctReprobados = total ? Math.round((reprobados / total) * 100) : 0;
        const pctPendientes = total ? Math.round((pendientes / total) * 100) : 0;
        
        doc.text(`Aprobados: ${aprobados} (${pctAprobados}%)`, margin + 10, yPosition);
        yPosition += 6;
        doc.text(`Reprobados: ${reprobados} (${pctReprobados}%)`, margin + 10, yPosition);
        yPosition += 6;
        doc.text(`Pendientes: ${pendientes} (${pctPendientes}%)`, margin + 10, yPosition);
        yPosition += 10;
      }
    }
    
    // Verificar si necesitamos una nueva página
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Intentar capturar y añadir el gráfico de barras
    if (graficos.graficoBarras) {
      // Título del gráfico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Calificación Promedio por Sección', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      // Información de promedio general
      const promedioGeneral = datos.promedioGeneral || 0;
      const interpretacion = interpretarNota(promedioGeneral);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Promedio General: ${formatearNota(promedioGeneral)} (${interpretacion})`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15; // Más espacio antes del gráfico
      
      try {
        console.log("Capturando gráfico de barras con dom-to-image...");
        const dataUrl = await domtoimage.toPng(graficos.graficoBarras, {
        quality: 1.0,
        bgcolor: '#ffffff',
        width: graficos.graficoBarras.offsetWidth * 2,
        height: graficos.graficoBarras.offsetHeight * 2,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left'
          }
        });
        
        // Calcular dimensiones para mantener proporción y no hacerlo demasiado grande
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = 120; // Limitamos la altura máxima del gráfico
        
        const aspectRatio = graficos.graficoBarras.offsetHeight / graficos.graficoBarras.offsetWidth;
        let imgWidth = maxWidth;
        let imgHeight = imgWidth * aspectRatio;
        
        // Si la altura es mayor que el máximo, ajustamos basados en la altura
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight / aspectRatio;
        }
        
        // Añadir la imagen al PDF centrada
        const xPos = margin + (maxWidth - imgWidth) / 2;
        doc.addImage(dataUrl, 'PNG', xPos, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 15; // Más espacio después del gráfico
        console.log("Gráfico de barras añadido correctamente");
      } catch (error) {
        console.error('Error al capturar gráfico de barras:', error);
        
        // Si falla la captura, agregar texto con los datos
        doc.setFontSize(12);
        doc.text('No se pudo generar el gráfico. Resumen de datos:', margin, yPosition);
        yPosition += 7;
        
        // Añadir información de cada sección
        if (datos.datosBarras && datos.datosBarras.length) {
          datos.datosBarras.forEach(seccion => {
            doc.text(`${seccion.name}: ${formatearNota(seccion.valor)} (${interpretarNota(seccion.valor)})`, margin + 10, yPosition);
            yPosition += 6;
          });
          yPosition += 4;
        }
      }
    }
    
    // Verificar si necesitamos una nueva página
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Agregar tabla de detalles estadísticos
    yPosition = agregarTablaEstadisticas(doc, datos, yPosition);
    
    // Añadir pie de página
    agregarPiePagina(doc);
    
    // Guardar PDF con nombre basado en filtros
    const nombrePDF = `Estadisticas_${filtros.carrera !== 'TODAS' ? filtros.carrera + '_' : ''}${filtros.semestre !== 'TODOS' ? 'Semestre_' + filtros.semestre + '_' : ''}${filtros.materia !== 'TODAS' ? filtros.materia : 'Todas'}.pdf`;
    
    // Configurar metadatos del PDF
    doc.setProperties({
      title: 'Informe de Estadísticas',
      author: docente?.nombre_completo || 'EMI',
      creator: 'Sistema de Informes EMI',
      subject: 'Estadísticas de Evaluación'
    });
    
    // Guardar el PDF
    doc.save(nombrePDF);
    console.log("PDF generado y descargado exitosamente");
    
    return true;
  } catch (error) {
    console.error('Error detallado al generar PDF de estadísticas:', error);
    throw error;
  }
};

/**
 * Agrega el encabezado con logo al documento PDF
 * @param {jsPDF} doc - Documento PDF
 * @param {Object} filtros - Filtros aplicados
 * @param {Object} docente - Información del docente
 * @param {number} totalGrupos - Total de grupos
 * @param {number} startY - Posición Y inicial
 * @returns {number} - Nueva posición Y
 */
async function agregarEncabezadoConLogo(doc, filtros, docente, totalGrupos, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = startY;
  
  try {
    // Intentar cargar el logo EMI desde la carpeta public
    const logoWidth = 30; // Ancho del logo en mm
    const logoHeight = 15; // Alto del logo en mm
    
    // Agregar el logo a la izquierda del título
    const logoX = margin;
    const logoY = yPos;
    
    // Intentamos cargar y agregar el logo
    try {
      // Asumiendo que el logo está en la carpeta public
      // Nota: En un entorno de producción, es mejor usar una URL absoluta
      doc.addImage('/EMI_LOGO.jpg', 'JPEG', logoX, logoY, logoWidth, logoHeight);
    } catch (logoError) {
      console.warn("No se pudo cargar el logo desde /EMI_LOGO.jpg:", logoError);
      
      // Intentamos con otra ruta relativa
      try {
        doc.addImage('./EMI_LOGO.jpg', 'JPEG', logoX, logoY, logoWidth, logoHeight);
      } catch (logoError2) {
        console.warn("No se pudo cargar el logo desde ./EMI_LOGO.jpg:", logoError2);
        
        // Si no podemos cargar el logo, creamos un placeholder
        doc.setFillColor(44, 62, 80); // #2c3e50
        doc.rect(logoX, logoY, logoWidth, logoHeight, 'F');
        
        doc.setTextColor(255, 255, 255); // Blanco
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EMI', logoX + logoWidth/2, logoY + logoHeight/2 + 2, { align: 'center' });
      }
    }
    
    // Añadir título principal centrado pero dejando espacio para el logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80); // #2c3e50
    doc.text('ESTADÍSTICAS DE EVALUACIÓN', pageWidth / 2, yPos + 10, { align: 'center' });
    
    // Añadir subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(85, 85, 85); // #555555
    doc.text(`Semestre ${new Date().getMonth() < 6 ? 'I' : 'II'}/${new Date().getFullYear()}`, pageWidth / 2, yPos + 20, { align: 'center' });
    
    // Ajustar la posición Y después del título y subtítulo
    yPos += 30;
    
    // Información principal
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // Negro
    
    // Fecha del informe
    doc.text(`Fecha del informe: ${obtenerFechaActual()}`, margin, yPos);
    yPos += 7;
    
    // Docente
    doc.text(`Docente: ${docente ? docente.nombre_completo : 'No especificado'}`, margin, yPos);
    yPos += 7;
    
    // Total de grupos
    doc.text(`Total de grupos: ${totalGrupos}`, margin, yPos);
    yPos += 7;
    
    // Filtros aplicados
    if (filtros.carrera !== 'TODAS') {
      doc.text(`Carrera: ${filtros.carrera}`, margin, yPos);
      yPos += 7;
    }
    
    if (filtros.semestre !== 'TODOS') {
      doc.text(`Semestre: ${filtros.semestre}° Semestre`, margin, yPos);
      yPos += 7;
    }
    
    if (filtros.materia !== 'TODAS') {
      doc.text(`Asignatura: ${filtros.materia}`, margin, yPos);
      yPos += 7;
    }
    
    return yPos;
  } catch (error) {
    console.error("Error al crear encabezado con logo:", error);
    
    // Si falla el encabezado con logo, creamos un encabezado simple
    return agregarEncabezadoSimple(doc, filtros, docente, totalGrupos, startY);
  }
}

/**
 * Función alternativa para crear un encabezado simple si falla el encabezado con logo
 * @param {jsPDF} doc - Documento PDF
 * @param {Object} filtros - Filtros aplicados
 * @param {Object} docente - Información del docente
 * @param {number} totalGrupos - Total de grupos
 * @param {number} startY - Posición Y inicial
 * @returns {number} - Nueva posición Y
 */
function agregarEncabezadoSimple(doc, filtros, docente, totalGrupos, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = startY;
  
  // Añadir título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80); // #2c3e50
  doc.text('ESTADÍSTICAS DE EVALUACIÓN', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Añadir subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(85, 85, 85); // #555555
  doc.text(`Semestre ${new Date().getMonth() < 6 ? 'I' : 'II'}/${new Date().getFullYear()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Información principal
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // Negro
  
  // Fecha del informe
  doc.text(`Fecha del informe: ${obtenerFechaActual()}`, margin, yPos);
  yPos += 7;
  
  // Docente
  doc.text(`Docente: ${docente ? docente.nombre_completo : 'No especificado'}`, margin, yPos);
  yPos += 7;
  
  // Total de grupos
  doc.text(`Total de grupos: ${totalGrupos}`, margin, yPos);
  yPos += 7;
  
  // Filtros aplicados
  if (filtros.carrera !== 'TODAS') {
    doc.text(`Carrera: ${filtros.carrera}`, margin, yPos);
    yPos += 7;
  }
  
  if (filtros.semestre !== 'TODOS') {
    doc.text(`Semestre: ${filtros.semestre}° Semestre`, margin, yPos);
    yPos += 7;
  }
  
  if (filtros.materia !== 'TODAS') {
    doc.text(`Asignatura: ${filtros.materia}`, margin, yPos);
    yPos += 7;
  }
  
  return yPos;
}

/**
 * Añade una tabla con los detalles estadísticos al PDF
 * @param {jsPDF} doc - Documento PDF
 * @param {Object} datos - Datos estadísticos
 * @param {number} startY - Posición Y inicial
 * @returns {number} - Nueva posición Y
 */
function agregarTablaEstadisticas(doc, datos, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = startY + 5;
  
  // Verificar si necesitamos una nueva página
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  }
  
  // Título de la tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80); // #2c3e50
  doc.text('Detalles Estadísticos', margin, yPos);
  yPos += 10;
  
  // Comprobar si tenemos datos para la tabla
  if (!datos.datosBarras || !datos.datosBarras.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('No hay datos disponibles para mostrar.', margin, yPos);
    return yPos + 6;
  }
  
  // Configuración de la tabla
  const headers = ['Sección', 'Promedio', 'Interpretación'];
  const cellWidth = [(pageWidth - (margin * 2)) * 0.4, (pageWidth - (margin * 2)) * 0.25, (pageWidth - (margin * 2)) * 0.35];
  const cellPadding = 3;
  const rowHeight = 10;
  
  // Dibujar encabezados de la tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(44, 62, 80); // #2c3e50
  doc.setTextColor(255, 255, 255); // Blanco
  
  let xPos = margin;
  doc.rect(xPos, yPos, cellWidth[0], rowHeight, 'F');
  doc.text(headers[0], xPos + cellPadding, yPos + rowHeight - cellPadding);
  xPos += cellWidth[0];
  
  doc.rect(xPos, yPos, cellWidth[1], rowHeight, 'F');
  doc.text(headers[1], xPos + cellPadding, yPos + rowHeight - cellPadding);
  xPos += cellWidth[1];
  
  doc.rect(xPos, yPos, cellWidth[2], rowHeight, 'F');
  doc.text(headers[2], xPos + cellPadding, yPos + rowHeight - cellPadding);
  
  yPos += rowHeight;
  
  // Dibujar filas de datos
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // Negro
  
  // Alternar colores de fondo para las filas
  let fillRow = false;
  
  // Filas para cada sección
  for (const seccion of datos.datosBarras) {
    // Verificar si necesitamos otra página
    if (yPos + rowHeight > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
      
      // Repetir encabezados en la nueva página
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setFillColor(44, 62, 80); // #2c3e50
      doc.setTextColor(255, 255, 255); // Blanco
      
      xPos = margin;
      doc.rect(xPos, yPos, cellWidth[0], rowHeight, 'F');
      doc.text(headers[0], xPos + cellPadding, yPos + rowHeight - cellPadding);
      xPos += cellWidth[0];
      
      doc.rect(xPos, yPos, cellWidth[1], rowHeight, 'F');
      doc.text(headers[1], xPos + cellPadding, yPos + rowHeight - cellPadding);
      xPos += cellWidth[1];
      
      doc.rect(xPos, yPos, cellWidth[2], rowHeight, 'F');
      doc.text(headers[2], xPos + cellPadding, yPos + rowHeight - cellPadding);
      
      yPos += rowHeight;
      
      // Restaurar estilo para datos
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Negro
    }
    
    // Color de fondo alternado
    if (fillRow) {
      doc.setFillColor(245, 245, 245); // Gris muy claro
      doc.rect(margin, yPos, cellWidth[0] + cellWidth[1] + cellWidth[2], rowHeight, 'F');
    }
    
    // Escribir datos de la fila
    xPos = margin;
    doc.text(seccion.name, xPos + cellPadding, yPos + rowHeight - cellPadding);
    xPos += cellWidth[0];
    
    doc.text(formatearNota(seccion.valor), xPos + cellPadding, yPos + rowHeight - cellPadding);
    xPos += cellWidth[1];
    
    doc.text(interpretarNota(seccion.valor), xPos + cellPadding, yPos + rowHeight - cellPadding);
    
    yPos += rowHeight;
    fillRow = !fillRow; // Alternar para la siguiente fila
  }
  
  // Agregar fila para el promedio general con formato especial
  if (yPos + rowHeight > pageHeight - 20) {
    doc.addPage();
    yPos = margin;
  }
  
  // Fila de promedio general
  doc.setFillColor(230, 230, 230); // Gris claro
  doc.rect(margin, yPos, cellWidth[0] + cellWidth[1] + cellWidth[2], rowHeight, 'F');
  
  doc.setFont('helvetica', 'bold');
  
  xPos = margin;
  doc.text('Promedio General', xPos + cellPadding, yPos + rowHeight - cellPadding);
  xPos += cellWidth[0];
  
  doc.text(formatearNota(datos.promedioGeneral), xPos + cellPadding, yPos + rowHeight - cellPadding);
  xPos += cellWidth[1];
  
  doc.text(interpretarNota(datos.promedioGeneral), xPos + cellPadding, yPos + rowHeight - cellPadding);
  
  yPos += rowHeight + 5;
  
  return yPos;
}

/**
 * Añade el pie de página al documento PDF
 * @param {jsPDF} doc - Documento PDF
 */
function agregarPiePagina(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Añadir pie de página
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100); // Gris
  doc.text(`Informe generado el ${obtenerFechaActual()} por el Sistema de Gestión Académica EMI`, pageWidth / 2, pageHeight - 10, { align: 'center' });
}

/**
 * Función para interpretar notas
 * @param {number} nota - Nota a interpretar
 * @returns {string} - Interpretación textual de la nota
 */
function interpretarNota(nota) {
  if (isNaN(nota) || nota === null || nota === undefined) return "SIN DATOS";
  if (nota >= 9) return "SOBRESALIENTE";
  if (nota >= 8) return "EXCELENTE";
  if (nota >= 7) return "MUY BUENO";
  if (nota >= 6) return "BUENO";
  if (nota >= 5) return "SATISFACTORIO";
  if (nota >= 4) return "ACEPTABLE";
  if (nota >= 3.5) return "BÁSICAMENTE ACEPTABLE";
  if (nota >= 2.5) return "INSUFICIENTE";
  if (nota >= 1) return "DEFICIENTE";
  return "MUY DEFICIENTE";
}