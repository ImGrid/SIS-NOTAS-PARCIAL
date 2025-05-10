// utils/pdf/estadisticasPdf.js
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { estilosPDF, estilosEstadisticasPDF, aplicarEstilos } from './pdfStyles';
import { formatearNota, obtenerFechaActual } from '../helpers/formatHelper';

/**
 * Genera un PDF con el informe de estadísticas
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
  try {
    // Crear un contenedor temporal para el PDF
    const contenedorPDF = document.createElement('div');
    contenedorPDF.className = 'pdf-estadisticas-container';
    contenedorPDF.style.visibility = 'hidden';
    contenedorPDF.style.position = 'absolute';
    contenedorPDF.style.left = '-9999px';
    contenedorPDF.style.width = '1024px'; // Ancho fijo para el diseño
    
    // Aplicar estilos al contenedor
    aplicarEstilos(contenedorPDF, estilosEstadisticasPDF.contenedorPDF);
    
    // Añadir al DOM temporalmente (necesario para html2canvas)
    document.body.appendChild(contenedorPDF);
    
    // Preparar el contenido del PDF
    await prepararContenidoPDF(contenedorPDF, filtros, docente, graficos, datos, totalGrupos);
    
    // Configurar opciones para html2pdf
    const opciones = {
      margin: [10, 10, 10, 10],
      filename: `Estadisticas_${filtros.carrera !== 'TODAS' ? filtros.carrera + '_' : ''}${filtros.semestre !== 'TODOS' ? 'Semestre_' + filtros.semestre + '_' : ''}${filtros.materia !== 'TODAS' ? filtros.materia : 'Todas'}.pdf`,
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
        orientation: 'portrait',
        compress: true,
        hotfixes: ["px_scaling"]
      },
      pagebreak: {
        mode: ['avoid-all'],
        before: '.nueva-seccion-pdf',
        avoid: '.evitar-salto-pagina'
      }
    };
    
    // Generar el PDF
    await html2pdf()
      .from(contenedorPDF)
      .set(opciones)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        // Ajustar propiedades del PDF
        pdf.setProperties({
          title: 'Informe de Estadísticas',
          author: docente?.nombre_completo || 'EMI',
          creator: 'Sistema de Informes EMI'
        });
      })
      .save();
    
    // Limpiar - remover el elemento temporal
    document.body.removeChild(contenedorPDF);
    
    return true;
  } catch (error) {
    console.error('Error al generar PDF de estadísticas:', error);
    
    // Intentar limpiar el DOM si hubo error
    const elementoTemporal = document.querySelector('.pdf-estadisticas-container');
    if (elementoTemporal && document.body.contains(elementoTemporal)) {
      document.body.removeChild(elementoTemporal);
    }
    
    throw error;
  }
};

/**
 * Prepara el contenido del PDF agregando todos los elementos necesarios
 * @param {HTMLElement} contenedor - Contenedor donde se armará el PDF
 * @param {Object} filtros - Filtros aplicados
 * @param {Object} docente - Información del docente
 * @param {Object} graficos - Referencias a los elementos de gráficos
 * @param {Object} datos - Datos estadísticos
 * @param {number} totalGrupos - Total de grupos
 */
async function prepararContenidoPDF(contenedor, filtros, docente, graficos, datos, totalGrupos) {
  // 1. Crear encabezado con logo e información
  const encabezado = crearEncabezadoPDF(filtros, docente, totalGrupos);
  contenedor.appendChild(encabezado);
  
  // 2. Crear sección de resumen de evaluación
  const seccionResumen = document.createElement('div');
  seccionResumen.className = 'pdf-resumen-seccion';
  aplicarEstilos(seccionResumen, estilosEstadisticasPDF.seccionResumen);
  
  // Título de la sección
  const tituloResumen = document.createElement('h3');
  tituloResumen.textContent = 'Resumen de Evaluación';
  aplicarEstilos(tituloResumen, estilosEstadisticasPDF.tituloSeccion);
  seccionResumen.appendChild(tituloResumen);
  
  // 3. Crear contenedor para los gráficos
  const contenedorGraficos = document.createElement('div');
  contenedorGraficos.className = 'pdf-graficos-container';
  aplicarEstilos(contenedorGraficos, estilosEstadisticasPDF.contenedorGraficos);
  
  // 4. Capturar y agregar el gráfico circular
  if (graficos.graficoCircular) {
    const graficoCircularContainer = document.createElement('div');
    graficoCircularContainer.className = 'pdf-grafico';
    aplicarEstilos(graficoCircularContainer, estilosEstadisticasPDF.graficoContainer);
    
    // Título del gráfico
    const tituloGraficoCircular = document.createElement('h4');
    tituloGraficoCircular.textContent = 'Distribución de Resultados';
    aplicarEstilos(tituloGraficoCircular, estilosEstadisticasPDF.tituloGrafico);
    graficoCircularContainer.appendChild(tituloGraficoCircular);
    
    // Agregar información de estudiantes
    const infoEstudiantes = document.createElement('div');
    infoEstudiantes.className = 'pdf-info-estudiantes';
    aplicarEstilos(infoEstudiantes, estilosEstadisticasPDF.infoEstudiantes);
    infoEstudiantes.textContent = `Total de estudiantes: ${datos.totalEstudiantes || 0}`;
    graficoCircularContainer.appendChild(infoEstudiantes);
    
    // Capturar y agregar la imagen del gráfico
    try {
      const canvasCircular = await html2canvas(graficos.graficoCircular, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      const imgCircular = document.createElement('img');
      imgCircular.src = canvasCircular.toDataURL('image/png');
      aplicarEstilos(imgCircular, estilosEstadisticasPDF.imagenGrafico);
      graficoCircularContainer.appendChild(imgCircular);
    } catch (error) {
      console.error('Error al capturar gráfico circular:', error);
      // Agregar un mensaje de error
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'No se pudo generar el gráfico';
      graficoCircularContainer.appendChild(errorMsg);
    }
    
    contenedorGraficos.appendChild(graficoCircularContainer);
  }
  
  // 5. Capturar y agregar el gráfico de barras
  if (graficos.graficoBarras) {
    const graficoBarrasContainer = document.createElement('div');
    graficoBarrasContainer.className = 'pdf-grafico';
    aplicarEstilos(graficoBarrasContainer, estilosEstadisticasPDF.graficoContainer);
    
    // Título del gráfico
    const tituloGraficoBarras = document.createElement('h4');
    tituloGraficoBarras.textContent = 'Calificación Promedio por Sección';
    aplicarEstilos(tituloGraficoBarras, estilosEstadisticasPDF.tituloGrafico);
    graficoBarrasContainer.appendChild(tituloGraficoBarras);
    
    // Agregar información de promedio general
    const infoPromedio = document.createElement('div');
    infoPromedio.className = 'pdf-info-promedio';
    aplicarEstilos(infoPromedio, estilosEstadisticasPDF.infoPromedio);
    
    const promedioGeneral = datos.promedioGeneral || 0;
    const interpretacion = interpretarNota(promedioGeneral);
    
    infoPromedio.innerHTML = `
      <span class="promedio-label">Promedio General:</span> 
      <span class="promedio-value">${formatearNota(promedioGeneral)}</span>
      <span class="interpretacion">(${interpretacion})</span>
    `;
    graficoBarrasContainer.appendChild(infoPromedio);
    
    // Capturar y agregar la imagen del gráfico
    try {
      const canvasBarras = await html2canvas(graficos.graficoBarras, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      const imgBarras = document.createElement('img');
      imgBarras.src = canvasBarras.toDataURL('image/png');
      aplicarEstilos(imgBarras, estilosEstadisticasPDF.imagenGrafico);
      graficoBarrasContainer.appendChild(imgBarras);
    } catch (error) {
      console.error('Error al capturar gráfico de barras:', error);
      // Agregar un mensaje de error
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'No se pudo generar el gráfico';
      graficoBarrasContainer.appendChild(errorMsg);
    }
    
    contenedorGraficos.appendChild(graficoBarrasContainer);
  }
  
  seccionResumen.appendChild(contenedorGraficos);
  
  // 6. Agregar tabla de detalles estadísticos
  if (datos.datosBarras && datos.datosBarras.length) {
    const tablaContainer = document.createElement('div');
    tablaContainer.className = 'pdf-tabla-container evitar-salto-pagina';
    aplicarEstilos(tablaContainer, estilosEstadisticasPDF.tablaContainer);
    
    const tituloTabla = document.createElement('h4');
    tituloTabla.textContent = 'Detalles Estadísticos';
    aplicarEstilos(tituloTabla, estilosEstadisticasPDF.tituloTabla);
    tablaContainer.appendChild(tituloTabla);
    
    // Crear tabla
    const tabla = document.createElement('table');
    aplicarEstilos(tabla, estilosEstadisticasPDF.tabla);
    
    // Encabezado de la tabla
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Sección', 'Promedio', 'Interpretación'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      aplicarEstilos(th, estilosEstadisticasPDF.encabezadoTabla);
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    tabla.appendChild(thead);
    
    // Cuerpo de la tabla
    const tbody = document.createElement('tbody');
    
    // Filas de datos
    datos.datosBarras.forEach(seccion => {
      const tr = document.createElement('tr');
      
      // Celda para el nombre de la sección
      const tdNombre = document.createElement('td');
      tdNombre.textContent = seccion.name;
      aplicarEstilos(tdNombre, estilosEstadisticasPDF.celda);
      tr.appendChild(tdNombre);
      
      // Celda para el promedio
      const tdPromedio = document.createElement('td');
      tdPromedio.textContent = formatearNota(seccion.valor);
      aplicarEstilos(tdPromedio, estilosEstadisticasPDF.celda);
      aplicarEstilos(tdPromedio, { textAlign: 'center' });
      tr.appendChild(tdPromedio);
      
      // Celda para la interpretación
      const tdInterpretacion = document.createElement('td');
      tdInterpretacion.textContent = interpretarNota(seccion.valor);
      aplicarEstilos(tdInterpretacion, estilosEstadisticasPDF.celda);
      tr.appendChild(tdInterpretacion);
      
      tbody.appendChild(tr);
    });
    
    // Fila para el promedio general
    const trPromedio = document.createElement('tr');
    aplicarEstilos(trPromedio, estilosEstadisticasPDF.filaPromedio);
    
    const tdTituloPromedio = document.createElement('td');
    tdTituloPromedio.innerHTML = '<strong>Promedio General</strong>';
    aplicarEstilos(tdTituloPromedio, estilosEstadisticasPDF.celda);
    trPromedio.appendChild(tdTituloPromedio);
    
    const tdValorPromedio = document.createElement('td');
    tdValorPromedio.innerHTML = `<strong>${formatearNota(datos.promedioGeneral)}</strong>`;
    aplicarEstilos(tdValorPromedio, estilosEstadisticasPDF.celda);
    aplicarEstilos(tdValorPromedio, { textAlign: 'center' });
    trPromedio.appendChild(tdValorPromedio);
    
    const tdInterpretacionPromedio = document.createElement('td');
    tdInterpretacionPromedio.innerHTML = `<strong>${interpretarNota(datos.promedioGeneral)}</strong>`;
    aplicarEstilos(tdInterpretacionPromedio, estilosEstadisticasPDF.celda);
    trPromedio.appendChild(tdInterpretacionPromedio);
    
    tbody.appendChild(trPromedio);
    tabla.appendChild(tbody);
    
    tablaContainer.appendChild(tabla);
    seccionResumen.appendChild(tablaContainer);
  }
  
  // Agregar todo al contenedor principal
  contenedor.appendChild(seccionResumen);
  
  // 7. Agregar pie de página
  const piePagina = document.createElement('div');
  piePagina.className = 'pdf-footer';
  aplicarEstilos(piePagina, estilosEstadisticasPDF.piePagina);
  piePagina.textContent = `Informe generado el ${obtenerFechaActual()} por el Sistema de Gestión Académica EMI`;
  contenedor.appendChild(piePagina);
}

/**
 * Crea el encabezado del PDF con logo e información
 * @param {Object} filtros - Filtros aplicados
 * @param {Object} docente - Información del docente
 * @param {number} totalGrupos - Total de grupos
 * @returns {HTMLElement} - Elemento DOM con el encabezado
 */
function crearEncabezadoPDF(filtros, docente, totalGrupos) {
  // Crear contenedor del encabezado
  const encabezado = document.createElement('div');
  encabezado.className = 'pdf-header evitar-salto-pagina';
  aplicarEstilos(encabezado, estilosEstadisticasPDF.encabezado);
  
  // Crear contenedor flexible para encabezado
  const headerFlexContainer = document.createElement('div');
  headerFlexContainer.className = 'pdf-header-flex';
  aplicarEstilos(headerFlexContainer, estilosEstadisticasPDF.headerFlex);
  
  // Crear contenedor para logo
  const logoContainer = document.createElement('div');
  logoContainer.className = 'pdf-logo-container';
  aplicarEstilos(logoContainer, estilosEstadisticasPDF.logoContainer);
  
  // Crear elemento de imagen para logo
  const logoImg = document.createElement('img');
  logoImg.src = '/EMI_LOGO.jpg';
  logoImg.alt = 'Logo EMI';
  logoImg.className = 'pdf-logo';
  aplicarEstilos(logoImg, estilosEstadisticasPDF.logo);
  logoContainer.appendChild(logoImg);
  
  // Crear contenedor para texto del encabezado
  const headerTextContainer = document.createElement('div');
  headerTextContainer.className = 'pdf-header-text';
  aplicarEstilos(headerTextContainer, estilosEstadisticasPDF.headerText);
  
  // Crear títulos
  const h1 = document.createElement('h1');
  h1.textContent = 'ESTADÍSTICAS DE EVALUACIÓN';
  aplicarEstilos(h1, estilosEstadisticasPDF.titulo);
  
  const h2 = document.createElement('h2');
  h2.textContent = `Semestre ${new Date().getMonth() < 6 ? 'I' : 'II'}/${new Date().getFullYear()}`;
  aplicarEstilos(h2, estilosEstadisticasPDF.subtitulo);
  
  // Crear div para la información del informe
  const infoDiv = document.createElement('div');
  infoDiv.className = 'pdf-info';
  aplicarEstilos(infoDiv, estilosEstadisticasPDF.infoContainer);
  
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
    aplicarEstilos(div, estilosEstadisticasPDF.infoItem);
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
  encabezado.appendChild(headerFlexContainer);
  
  return encabezado;
}

/**
 * Función para interpretar notas (copiada de la lógica del componente)
 * @param {number} nota - Nota a interpretar
 * @returns {string} - Interpretación textual de la nota
 */
function interpretarNota(nota) {
  if (isNaN(nota) || nota === null || nota === undefined) return "SIN DATOS";
  if (nota >= 9.5) return "SOBRESALIENTE";
  if (nota >= 8.5) return "EXCELENTE";
  if (nota >= 7.5) return "MUY BUENO";
  if (nota >= 6.5) return "BUENO";
  if (nota >= 5.5) return "SATISFACTORIO";
  if (nota >= 4.5) return "ACEPTABLE";
  if (nota >= 3.5) return "BÁSICAMENTE ACEPTABLE";
  if (nota >= 2.5) return "INSUFICIENTE";
  if (nota >= 1.5) return "DEFICIENTE";
  return "MUY DEFICIENTE";
}