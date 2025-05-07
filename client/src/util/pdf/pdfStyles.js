// utils/pdf/pdfStyles.js (Corrección Final)

/**
 * Objeto con estilos para PDF en formato de objetos JavaScript
 * Estos estilos se aplican en línea a los elementos del PDF
 */
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