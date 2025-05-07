// utils/pdf/informesNotasPdf.js (Corrección Final)
import html2pdf from 'html2pdf.js';
import { estilosPDF, aplicarEstilos, configurarAnchoColumnas } from './pdfStyles';
import { formatearFecha, obtenerFechaActual, formatearNota, calcularPorcentajeAprobacion } from '../helpers/formatHelper';

/**
 * Genera un PDF con el informe de notas
 * @param {Object} params - Parámetros para la generación del PDF
 * @param {HTMLElement} params.elementoDOM - Elemento DOM con el contenido a convertir
 * @param {Object} params.filtros - Filtros aplicados (carrera, semestre, materia)
 * @param {Object} params.docente - Información del docente actual
 * @param {Object} params.datosFiltrados - Datos filtrados para mostrar en el PDF
 * @param {number} params.totalGrupos - Total de grupos
 * @returns {Promise} - Promesa que se resuelve cuando se completa la generación del PDF
 */
export const generarInformeNotasPDF = async ({
  elementoDOM,
  filtros,
  docente,
  datosFiltrados,
  totalGrupos
}) => {
  try {
    // Clonar el contenido para no modificar el original
    const clonContenido = elementoDOM.cloneNode(true);
    clonContenido.classList.add('generando-pdf');
    
    // Aplicar estilos generales para el PDF
    aplicarEstilos(clonContenido, estilosPDF.contenidoPDF);
    
    // Preparar el contenido para el PDF
    prepararEncabezadoPDF(clonContenido, docente, filtros, totalGrupos);
    
    // Reorganizar el contenido para mejorar la estructura del PDF
    reorganizarContenidoPDF(clonContenido);
    
    // Configurar opciones específicas para html2pdf
    const opciones = {
      margin: [10, 10, 10, 10],
      filename: `Informe_Notas_${filtros.carrera !== 'TODAS' ? filtros.carrera + '_' : ''}${filtros.semestre !== 'TODOS' ? 'Semestre_' + filtros.semestre + '_' : ''}${filtros.materia !== 'TODAS' ? filtros.materia : 'Todas'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        foreignObjectRendering: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'landscape',
        compress: true,
        hotfixes: ["px_scaling"]
      },
      pagebreak: {
        mode: ['avoid-all'],
        before: '.nueva-seccion-pdf',
        avoid: '.evitar-salto-pagina'
      }
    };
    
    // Agregar al DOM temporalmente
    document.body.appendChild(clonContenido);
    
    // Generar el PDF
    await html2pdf()
      .from(clonContenido)
      .set(opciones)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        // Ajustar el PDF para evitar problemas con páginas en blanco
        pdf.setProperties({
          title: 'Informe de Notas',
          author: docente?.nombre_completo || 'EMI',
          creator: 'Sistema de Informes EMI'
        });
      })
      .save();

    // Limpiar - remover el elemento clonado
    document.body.removeChild(clonContenido);
    
    return true;
  } catch (error) {
    // Manejo de errores
    console.error('Error al generar PDF:', error);
    
    const clonContenido = document.querySelector('.generando-pdf');
    if (clonContenido && document.body.contains(clonContenido)) {
      document.body.removeChild(clonContenido);
    }
    
    throw error;
  }
};

/**
 * Reorganiza el contenido para evitar problemas en la generación del PDF
 * @param {HTMLElement} elemento - Elemento DOM clonado
 */
function reorganizarContenidoPDF(elemento) {
  // Aplicar estilos generales al contenedor para corregir el layout en el PDF
  aplicarEstilos(elemento, {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px'
  });
  
  // Asegurarse de que cada sección esté en una página diferente
  const secciones = elemento.querySelectorAll('.seccion-carrera-semestre');
  
  secciones.forEach((seccion, index) => {
    // Aplicar estilos a la sección para mantenerla en una sola página
    aplicarEstilos(seccion, {
      pageBreakBefore: index > 0 ? 'always' : 'auto',
      pageBreakInside: 'avoid',
      pageBreakAfter: 'auto',
      margin: '0 0 30px 0',
      padding: '10px',
      border: '1px solid #e0e0e0',
      borderRadius: '5px'
    });
    
    // Marcar como una nueva sección para el control de saltos de página
    seccion.classList.add(index > 0 ? 'nueva-seccion-pdf' : 'primera-seccion-pdf');
    
    // Asegurarse de que el encabezado de sección esté con su contenido
    const encabezadoSeccion = seccion.querySelector('h3');
    if (encabezadoSeccion) {
      encabezadoSeccion.classList.add('evitar-salto-pagina');
      aplicarEstilos(encabezadoSeccion, estilosPDF.seccionHeader);
    }
    
    // Mantener estadísticas junto con su encabezado
    const estadisticas = seccion.querySelector('.estadisticas-seccion');
    if (estadisticas) {
      estadisticas.classList.add('evitar-salto-pagina');
    }
    
    // Asegurarse de que la tabla esté completa en una página
    const tablaContainer = seccion.querySelector('.evaluacion-estudiantes');
    if (tablaContainer) {
      aplicarEstilos(tablaContainer, {
        pageBreakInside: 'avoid',
        maxWidth: '100%',
        overflowX: 'visible'
      });
      
      // Aplicar estilos a la tabla
      const tabla = tablaContainer.querySelector('.tabla-evaluacion');
      if (tabla) {
        aplicarEstilosTabla(tabla);
      }
    }
  });
  
  // Asegurarse de que el encabezado principal esté en la primera página
  const encabezadoPDF = elemento.querySelector('.pdf-header');
  if (encabezadoPDF) {
    encabezadoPDF.classList.add('evitar-salto-pagina');
    aplicarEstilos(encabezadoPDF, {
      pageBreakAfter: 'avoid',
      marginBottom: '20px'
    });
  }
}

/**
 * Aplica estilos a una tabla para mejorar su visualización en el PDF
 * @param {HTMLElement} tabla - Elemento tabla
 */
function aplicarEstilosTabla(tabla) {
  // Aplicar estilos básicos a la tabla
  aplicarEstilos(tabla, estilosPDF.tabla);
  
  // Configurar ancho específico para cada columna
  configurarAnchoColumnas(tabla);
  
  // Asegurar que los encabezados de columna se vean correctamente
  const encabezados = tabla.querySelectorAll('th');
  encabezados.forEach(encabezado => {
    aplicarEstilos(encabezado, estilosPDF.encabezado);
  });
  
  // Aplicar estilos a todas las celdas
  const celdas = tabla.querySelectorAll('td');
  celdas.forEach(celda => {
    // Detectar si la celda contiene la palabra "REPROBADO" o "APROBADO"
    const esReprobado = celda.textContent.includes('REPROBADO');
    const esAprobado = celda.textContent.includes('APROBADO');
    
    // Básico para todas las celdas
    const estiloBase = celda.style.textAlign === 'center' ? 
      estilosPDF.celdaCentrada : estilosPDF.celda;
    
    aplicarEstilos(celda, estiloBase);
    
    // Añadir estilo específico para la columna Resultado
    if (esReprobado) {
      aplicarEstilos(celda, estilosPDF.reprobado);
      celda.style.whiteSpace = 'nowrap';
    } else if (esAprobado) {
      aplicarEstilos(celda, estilosPDF.aprobado);
      celda.style.whiteSpace = 'nowrap';
    }
  });
  
  // Asegurar que las filas no se corten entre páginas
  const filas = tabla.querySelectorAll('tr');
  filas.forEach(fila => {
    aplicarEstilos(fila, {
      pageBreakInside: 'avoid',
      height: 'auto'
    });
  });
}

/**
 * Prepara el encabezado del PDF con logo e información
 * @param {HTMLElement} elemento - Elemento DOM del contenido clonado
 * @param {Object} docente - Información del docente
 * @param {Object} filtros - Filtros aplicados (carrera, semestre, materia)
 * @param {number} totalGrupos - Total de grupos disponibles
 */
function prepararEncabezadoPDF(elemento, docente, filtros, totalGrupos) {
  // Obtener el elemento de encabezado del PDF
  const pdfHeader = elemento.querySelector('.pdf-header');
  
  if (pdfHeader) {
    // Limpiar contenido previo
    pdfHeader.innerHTML = '';
    aplicarEstilos(pdfHeader, {
      width: '100%', 
      margin: '0 auto 20px auto',
      padding: '0',
      boxSizing: 'border-box',
      pageBreakAfter: 'avoid'
    });
    
    // Crear contenedor flexible para encabezado
    const headerFlexContainer = document.createElement('div');
    headerFlexContainer.className = 'pdf-header-flex';
    aplicarEstilos(headerFlexContainer, estilosPDF.headerFlex);
    
    // Crear contenedor para logo
    const logoContainer = document.createElement('div');
    logoContainer.className = 'pdf-logo-container';
    aplicarEstilos(logoContainer, estilosPDF.logoContainer);
    
    // Crear elemento de imagen para logo
    const logoImg = document.createElement('img');
    logoImg.src = '/EMI_LOGO.jpg';
    logoImg.alt = 'Logo EMI';
    logoImg.className = 'pdf-logo';
    aplicarEstilos(logoImg, estilosPDF.logo);
    logoContainer.appendChild(logoImg);
    
    // Crear contenedor para texto del encabezado
    const headerTextContainer = document.createElement('div');
    headerTextContainer.className = 'pdf-header-text';
    aplicarEstilos(headerTextContainer, estilosPDF.headerText);
    
    // Crear títulos
    const h1 = document.createElement('h1');
    h1.textContent = 'INFORME DE NOTAS FINALES';
    aplicarEstilos(h1, estilosPDF.titulo);
    
    const h2 = document.createElement('h2');
    h2.textContent = `Gestion ${new Date().getMonth() < 6 ? 'I' : 'II'}/${new Date().getFullYear()}`;
    aplicarEstilos(h2, estilosPDF.subtitulo);
    
    // Crear div para la información del informe
    const infoDiv = document.createElement('div');
    infoDiv.className = 'pdf-info';
    aplicarEstilos(infoDiv, estilosPDF.infoContainer);
    
    // Ítems de información a mostrar
    const infoItems = [
      { text: `Fecha del informe: ${obtenerFechaActual()}` },
      { text: `Docente: ${docente ? docente.nombre_completo : 'No especificado'}` },
      { text: `Total de grupos: ${totalGrupos}` },
      ...(filtros.carrera !== 'TODAS' ? [{ text: `Carrera: ${filtros.carrera}` }] : []),
      ...(filtros.semestre !== 'TODOS' ? [{ text: `Semestre: ${filtros.semestre}° Semestre` }] : []),
      ...(filtros.materia !== 'TODAS' ? [{ text: `Asignatura: ${filtros.materia}` }] : [])
    ];
    
    // Agregar cada ítem de información al contenedor
    infoItems.forEach(item => {
      const div = document.createElement('div');
      div.textContent = item.text;
      aplicarEstilos(div, estilosPDF.infoItem);
      infoDiv.appendChild(div);
    });
    
    // Agregar elementos en el orden correcto
    headerTextContainer.appendChild(h1);
    headerTextContainer.appendChild(h2);
    headerTextContainer.appendChild(infoDiv);
    
    // Estructura final: Logo | Texto
    headerFlexContainer.appendChild(logoContainer);
    headerFlexContainer.appendChild(headerTextContainer);
    
    // Reemplazar el contenido del encabezado
    pdfHeader.appendChild(headerFlexContainer);
  }
}