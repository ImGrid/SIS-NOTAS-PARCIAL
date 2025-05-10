// src/util/pdfStyles.js

/**
 * Estilos específicos para la generación de PDF
 * Estos estilos se aplican SOLO al generar el PDF, no afectan la vista del sistema
 */
export const getPdfStyles = () => `
  /* Estilos generales para PDF */
  .pdf-container {
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  
  /* Ocultar elementos no deseados en el PDF */
  .sidebar,
  .btn-volver,
  .btn-imprimir,
  .nav-link,
  .navbar,
  .acciones-container {
    display: none !important;
  }
  
  /* Ajustar márgenes del contenido principal */
  .content-with-sidebar {
    margin-left: 0 !important;
    padding: 0 !important;
  }
  
  /* Estilos para el encabezado del PDF */
  .evaluacion-header {
    background-color: #2c3e50 !important;
    color: #ffffff !important;
    padding: 20px 20px 20px 160px !important;
    text-align: center;
    position: relative;
    margin-bottom: 20px;
    page-break-after: avoid;
  }
  
  .evaluacion-header h1 {
    color: #ffffff !important;
    font-size: 24px !important;
    margin: 0 0 8px 0 !important;
    font-weight: bold;
  }
  
  .evaluacion-header h2 {
    color: #e6c350 !important;
    font-size: 18px !important;
    margin: 0 !important;
    font-weight: normal;
  }
  
  /* Información del proyecto */
  .proyecto-info-container {
    margin-bottom: 25px;
    page-break-after: avoid;
  }
  
  .proyecto-info {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    background: #f9f9f9;
    padding: 15px;
    border-radius: 5px;
  }
  
  .proyecto-info-item {
    margin-bottom: 8px;
  }
  
  .proyecto-info-label {
    font-weight: bold;
    color: #333;
    font-size: 12px;
    margin-bottom: 3px;
  }
  
  .proyecto-info-value {
    color: #000;
    font-size: 12px;
  }
  
  /* Tabla de evaluación */
  .evaluacion-estudiantes {
    margin-bottom: 30px;
  }
  
  .evaluacion-estudiantes h3 {
    color: #2c3e50;
    font-size: 16px;
    margin-bottom: 10px;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 8px;
  }
  
  .tabla-evaluacion {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    table-layout: fixed;
  }
  
  .tabla-evaluacion thead th {
    background-color: #2c3e50 !important;
    color: #ffffff !important;
    padding: 8px 5px;
    text-align: center;
    border: 1px solid #000;
    font-weight: bold;
    font-size: 11px;
  }
  
  .tabla-evaluacion tbody td {
    padding: 6px 5px;
    text-align: center;
    border: 1px solid #000;
    font-size: 11px;
    background: #fff;
  }
  
  .tabla-evaluacion tbody tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  /* Ajustes específicos para columnas */
  .tabla-evaluacion td:nth-child(1) {
    width: 10%;
  }
  
  .tabla-evaluacion td:nth-child(2) {
    text-align: left;
    padding-left: 8px;
    width: 20%;
  }
  
  .tabla-evaluacion td:nth-child(3),
  .tabla-evaluacion td:nth-child(4),
  .tabla-evaluacion td:nth-child(5),
  .tabla-evaluacion td:nth-child(6),
  .tabla-evaluacion td:nth-child(7) {
    width: 12%;
  }
  
  .tabla-evaluacion td:nth-child(8) {
    width: 14%;
  }
  
  /* Estilos para notas */
  .nota-valor {
    background-color: transparent !important;
    padding: 0 !important;
    border: none !important;
    color: #000 !important;
  }
  
  /* Estilos para resultados aprobado/reprobado */
  .aprobado {
    color: #000 !important;
    background-color: transparent !important;
    padding: 0 !important;
    border: none !important;
    font-weight: bold;
  }
  
  .reprobado {
    color: #000 !important;
    background-color: transparent !important;
    padding: 0 !important;
    border: none !important;
    font-weight: bold;
  }
  
  /* Control de saltos de página */
  .page-break-before {
    page-break-before: always;
  }
  
  .page-break-after {
    page-break-after: always;
  }
  
  .page-break-avoid {
    page-break-inside: avoid;
  }
  
  /* Evitar saltos de página dentro de la tabla */
  .tabla-evaluacion {
    page-break-inside: auto;
  }
  
  .tabla-evaluacion thead {
    display: table-header-group;
  }
  
  .tabla-evaluacion tbody {
    display: table-row-group;
  }
  
  .tabla-evaluacion tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  /* Footer */
  .pdf-footer {
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
  }
  
  /* Ajustes para impresión */
  @media print {
    body {
      margin: 0;
      padding: 0;
    }
    
    .evaluacion-container {
      padding: 15px;
    }
    
    /* Asegurar que el contenido se ajuste a la página */
    .tabla-evaluacion {
      width: 100% !important;
    }
  }
  
  /* Estilo para el logo (solo visible en PDF) */
  .logo-emi-pdf {
    position: absolute;
    top: 15px;
    left: 20px;
    width: 120px;
    height: 60px;
  }
  
  .logo-emi-pdf img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

/**
 * Estilos adicionales para diferentes tipos de reportes
 * Puedes extender esta función para manejar diferentes estilos según el tipo de PDF
 */
export const getCustomPdfStyles = (tipo = 'evaluacion') => {
  const estilosBase = getPdfStyles();
  
  switch (tipo) {
    case 'evaluacion':
      return estilosBase;
    
    case 'resumen':
      return estilosBase + `
        /* Estilos adicionales para resumen */
        .tabla-evaluacion {
          font-size: 10px;
        }
      `;
    
    case 'detallado':
      return estilosBase + `
        /* Estilos adicionales para reporte detallado */
        .evaluacion-header {
          page-break-after: auto;
        }
      `;
    
    default:
      return estilosBase;
  }
};

export default {
  getPdfStyles,
  getCustomPdfStyles
};
export const estilosPDF = {
  // Estilos del contenedor principal
  contenidoPDF: {
    backgroundColor: 'white',
    color: 'black',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif'
  },
  
  // Estilos del encabezado
  headerFlex: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center', // Alinear verticalmente al centro
    width: '100%',
    marginBottom: '20px',
    padding: '0',
    pageBreakAfter: 'avoid'
  },
  
  headerText: {
    flex: '1',
    textAlign: 'center', // Centrar el texto del encabezado
    paddingRight: '0', // Eliminar padding derecho
    marginLeft: '20px' // Espacio entre logo y texto
  },
  
  logoContainer: {
    flexShrink: '0', // No contraer el contenedor del logo
    width: '120px', // Ancho fijo para el logo
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  logo: {
    width: '100%',
    height: 'auto',
    display: 'block',
    maxHeight: '90px'
  },
  
  titulo: {
    textAlign: 'center',
    fontSize: '24px',
    margin: '0 0 5px 0',
    fontWeight: 'bold',
    padding: '0'
  },
  
  subtitulo: {
    textAlign: 'center',
    fontSize: '18px',
    margin: '0 0 15px 0',
    fontWeight: 'normal',
    padding: '0'
  },
  
  // Estilos para la sección de información
  infoContainer: {
    margin: '15px auto', // Centrar horizontalmente
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    backgroundColor: '#f8f9fa',
    maxWidth: '90%', // Limitar el ancho para centrar
    textAlign: 'left' // Alinear el texto a la izquierda dentro del contenedor
  },
  
  infoItem: {
    margin: '4px 0',
    fontSize: '12px',
    lineHeight: '1.4'
  },
  
  // Estilos para las tablas - ajustados para corregir problemas
  tabla: {
    borderCollapse: 'collapse',
    width: '100%',
    margin: '15px 0',
    tableLayout: 'fixed', // Fijar el ancho de las columnas
    fontSize: '10px', // Reducir tamaño de fuente para evitar desbordamiento
    border: '1px solid #333',
    pageBreakInside: 'avoid' // Evitar que la tabla se corte entre páginas
  },
  
  celda: {
    border: '1px solid #333',
    padding: '5px',
    textAlign: 'left',
    whiteSpace: 'normal', // Permitir saltos de línea
    wordWrap: 'break-word', // Permitir que las palabras se rompan
    fontSize: '10px'
  },
  
  celdaCentrada: {
    border: '1px solid #333',
    padding: '5px',
    textAlign: 'center',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    fontSize: '10px'
  },
  
  encabezado: {
    backgroundColor: '#2c3e50',
    color: 'white',
    fontWeight: 'bold',
    border: '1px solid #333',
    padding: '6px',
    textAlign: 'center',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    fontSize: '10px'
  },
  
  // Estilos para las secciones
  seccion: {
    pageBreakInside: 'avoid',
    pageBreakBefore: 'auto',
    pageBreakAfter: 'auto',
    marginBottom: '30px',
    width: '100%',
    border: '1px solid #eee',
    padding: '10px',
    boxSizing: 'border-box',
    backgroundColor: 'white'
  },
  
  seccionHeader: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    borderBottom: '2px solid #2c3e50',
    paddingBottom: '5px',
    color: '#2c3e50',
    pageBreakAfter: 'avoid'
  },
  
  // Estilos para estados de notas
  aprobado: {
    color: '#2ecc71',
    fontWeight: 'bold'
  },
  
  reprobado: {
    color: '#e74c3c',
    fontWeight: 'bold'
  },
  
  pendiente: {
    color: '#7f8c8d',
    fontWeight: 'bold'
  }
};

/**
 * Estilos específicos para el PDF de estadísticas
 * Extiende los estilos base con componentes específicos para gráficos
 */
export const estilosEstadisticasPDF = {
  // Contenedor principal para el PDF de estadísticas
  contenedorPDF: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    backgroundColor: 'white',
    color: 'black'
  },
  
  // Estilos heredados del PDF base
  encabezado: {
    ...estilosPDF.headerFlex,
    width: '100%',
    marginBottom: '30px',
    pageBreakAfter: 'avoid'
  },
  
  headerFlex: estilosPDF.headerFlex,
  headerText: estilosPDF.headerText,
  logoContainer: estilosPDF.logoContainer,
  logo: estilosPDF.logo,
  titulo: estilosPDF.titulo,
  subtitulo: estilosPDF.subtitulo,
  infoContainer: estilosPDF.infoContainer,
  infoItem: estilosPDF.infoItem,
  
  // Estilos específicos para la sección de resumen
  seccionResumen: {
    width: '100%',
    marginBottom: '30px',
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '5px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    pageBreakInside: 'avoid'
  },
  
  tituloSeccion: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    borderBottom: '2px solid #2c3e50',
    paddingBottom: '8px',
    color: '#2c3e50',
    textAlign: 'center'
  },
  
  // Estilos para el contenedor de gráficos
  contenedorGraficos: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '30px',
    marginBottom: '30px'
  },
  
  // Estilos para cada contenedor de gráfico
  graficoContainer: {
    width: '100%',
    marginBottom: '25px',
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  
  tituloGrafico: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#2c3e50',
    textAlign: 'center',
    width: '100%'
  },
  
  // Estilos para la imagen del gráfico
  imagenGrafico: {
    maxWidth: '100%',
    height: 'auto',
    marginTop: '10px',
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '4px'
  },
  
  // Estilos para la información de estudiantes
  infoEstudiantes: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '15px',
    padding: '5px 10px',
    backgroundColor: '#e8f4fd',
    borderRadius: '4px',
    border: '1px solid #cce5ff',
    color: '#0c5460'
  },
  
  // Estilos para la información de promedio
  infoPromedio: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '15px',
    padding: '5px 10px',
    backgroundColor: '#e8f4fd',
    borderRadius: '4px',
    border: '1px solid #cce5ff',
    color: '#0c5460',
    textAlign: 'center'
  },
  
  // Estilos para la tabla de detalles
  tablaContainer: {
    width: '100%',
    marginTop: '20px',
    marginBottom: '20px',
    pageBreakInside: 'avoid'
  },
  
  tituloTabla: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#2c3e50',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '5px'
  },
  
  tabla: {
    ...estilosPDF.tabla,
    width: '100%',
    margin: '0 auto'
  },
  
  encabezadoTabla: {
    ...estilosPDF.encabezado,
    fontSize: '12px'
  },
  
  celda: {
    ...estilosPDF.celda,
    fontSize: '12px',
    padding: '8px'
  },
  
  filaPromedio: {
    backgroundColor: '#f2f2f2'
  },
  
  // Estilos para el pie de página
  piePagina: {
    width: '100%',
    borderTop: '1px solid #e0e0e0',
    paddingTop: '10px',
    marginTop: '30px',
    fontSize: '10px',
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  }
};

/**
 * Aplica estilos en línea a un elemento DOM
 * @param {HTMLElement} elemento - Elemento al que aplicar los estilos
 * @param {Object} estilos - Objeto con los estilos a aplicar
 */
export const aplicarEstilos = (elemento, estilos) => {
  if (!elemento || !estilos) return;
  
  Object.keys(estilos).forEach(propiedad => {
    elemento.style[propiedad] = estilos[propiedad];
  });
};

/**
 * Establece anchos específicos para cada columna de la tabla
 * @param {HTMLElement} tabla - Elemento de tabla
 */
export const configurarAnchoColumnas = (tabla) => {
  if (!tabla) return;
  
  // Estilos específicos para la tabla
  tabla.style.borderCollapse = 'collapse';
  tabla.style.width = '100%';
  tabla.style.tableLayout = 'fixed';
  tabla.style.border = '1px solid #333';
  
  const columnas = tabla.querySelectorAll('th');
  if (columnas.length >= 11) {
    // Configurar anchos específicos y estilos adicionales para encabezados
    const anchos = [
      '2%',    // #
      '6%',    // Código
      '13%',   // Estudiante
      '10%',   // Grupo
      '11%',    // Presentación
      '11%',    // Sustentación
      '11%',    // Documentación
      '9%',    // Innovación
      '7%',    // Nota Final
      '10%',   // Fecha
      '10%'    // Resultado (aumentado para evitar cortes)
    ];
    
    columnas.forEach((columna, index) => {
      if (index < anchos.length) {
        columna.style.width = anchos[index];
      }
      
      // Aplicar estilos adicionales al encabezado
      columna.style.backgroundColor = '#2c3e50';
      columna.style.color = 'white';
      columna.style.fontWeight = 'bold';
      columna.style.padding = '6px';
      columna.style.textAlign = 'center';
      columna.style.border = '1px solid #333';
      columna.style.overflow = 'hidden';
      columna.style.textOverflow = 'ellipsis';
      columna.style.whiteSpace = 'nowrap';
    });
    
    // También aplicar anchos a las celdas en los mismos índices
    const filas = tabla.querySelectorAll('tbody tr');
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      celdas.forEach((celda, index) => {
        if (index < anchos.length) {
          celda.style.width = anchos[index];
        }
        
        // Asegurar que la celda de Resultado mantenga su contenido
        if (index === 10) { // Columna de Resultado
          celda.style.whiteSpace = 'nowrap'; // No permitir saltos de línea
        }
        
        // Estilos comunes para todas las celdas
        celda.style.border = '1px solid #333';
        celda.style.padding = '5px';
        
        // Alineación según el tipo de dato
        if (index >= 4 && index <= 9) { // Columnas numéricas
          celda.style.textAlign = 'center';
        }
      });
      
      // Evitar que la fila se corte entre páginas
      fila.style.pageBreakInside = 'avoid';
    });
  }
};