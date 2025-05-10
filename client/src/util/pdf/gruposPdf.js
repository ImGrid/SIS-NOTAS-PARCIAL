// src/util/pdfGenerator.js
import html2pdf from 'html2pdf.js';
import { getPdfStyles } from './pdfStyles';

/**
 * Genera un PDF a partir de un elemento HTML
 * @param {HTMLElement} elementoHTML - Elemento a convertir en PDF
 * @param {string} nombreArchivo - Nombre base del archivo
 * @param {Object} opciones - Opciones adicionales para la generación del PDF
 * @returns {Promise<boolean>} - true si el PDF se generó correctamente
 */
export const generarPDFEvaluacion = async (elementoHTML, nombreArchivo = 'evaluacion-grupal', opciones = {}) => {
  try {
    // Configuración por defecto para html2pdf
    const configuracionPorDefecto = {
      margin: [15, 15, 20, 15], // [top, left, bottom, right] en mm
      filename: `${nombreArchivo}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'landscape',
        compress: true
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: '.page-break-avoid'
      }
    };

    // Combinar opciones por defecto con opciones proporcionadas
    const opcionesFinal = {
      ...configuracionPorDefecto,
      ...opciones
    };

    // Crear copia del elemento para añadir el logo
    const elementoTemporal = document.createElement('div');
    elementoTemporal.innerHTML = elementoHTML.innerHTML;
    
    // Añadir el logo al encabezado
    const encabezado = elementoTemporal.querySelector('.evaluacion-header');
    if (encabezado) {
      const logoContainer = document.createElement('div');
      logoContainer.style.cssText = `
        position: absolute;
        top: 15px;
        left: 20px;
        width: 120px;
        height: 60px;
      `;
      
      const logo = document.createElement('img');
      logo.src = '/EMI_LOGO.jpg';
      logo.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
      `;
      
      logoContainer.appendChild(logo);
      encabezado.style.position = 'relative';
      encabezado.insertBefore(logoContainer, encabezado.firstChild);
      
      // Añadir padding al encabezado para el logo
      encabezado.style.paddingLeft = '150px';
    }

    // Añadir estilos específicos para PDF
    const estilosPDF = document.createElement('style');
    estilosPDF.innerHTML = getPdfStyles();
    elementoTemporal.insertBefore(estilosPDF, elementoTemporal.firstChild);

    // Añadir información adicional en el footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 25px;
      background-color: #f5f5f5;
      border-top: 1px solid #ddd;
      padding: 5px 15px;
      font-size: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    footer.innerHTML = `
      <span>Escuela Militar de Ingeniería - Mcal. Antonio José de Sucre</span>
      <span>Generado el: ${new Date().toLocaleString('es-ES')}</span>
    `;
    
    elementoTemporal.appendChild(footer);

    // Configurar cuerpo temporal para el PDF
    const bodyTemporal = document.createElement('body');
    bodyTemporal.style.cssText = `
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: white;
      color: black;
    `;
    bodyTemporal.appendChild(elementoTemporal);

    // Generar el PDF
    await html2pdf()
      .set(opcionesFinal)
      .from(bodyTemporal)
      .save();

    // Limpiar elementos temporales
    bodyTemporal.remove();
    
    return true;
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return false;
  }
};

/**
 * Genera un nombre de archivo único para el PDF
 * @param {string} nombreBase - Nombre base del archivo
 * @param {string} proyecto - Nombre del proyecto
 * @param {string} fecha - Fecha de evaluación
 * @returns {string} - Nombre del archivo generado
 */
export const generarNombreArchivoPDF = (nombreBase = 'evaluacion', proyecto = '', fecha = '') => {
  // Limpiar caracteres especiales del nombre del proyecto
  const proyectoLimpio = proyecto
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Formatear fecha
  const fechaFormateada = fecha.replace(/\//g, '-');
  
  // Construir nombre del archivo
  let nombreArchivo = nombreBase;
  
  if (proyectoLimpio) {
    nombreArchivo += `-${proyectoLimpio}`;
  }
  
  if (fechaFormateada) {
    nombreArchivo += `-${fechaFormateada}`;
  }
  
  // Añadir timestamp para evitar duplicados
  nombreArchivo += `-${Date.now()}`;
  
  return nombreArchivo;
};

/**
 * Verifica si el navegador soporta la generación de PDF
 * @returns {boolean} - true si el navegador soporta la funcionalidad
 */
export const verificarSoportePDF = () => {
  try {
    // Verifica si html2pdf está disponible
    if (typeof html2pdf === 'undefined') {
      return false;
    }
    
    // Verifica si el navegador soporta las características necesarias
    if (!window.URL || !window.Blob) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar soporte de PDF:', error);
    return false;
  }
};

export default {
  generarPDFEvaluacion,
  generarNombreArchivoPDF,
  verificarSoportePDF
};