/**
 * Procesador de archivos Excel para importación de estudiantes
 * Maneja la lectura, validación y extracción de datos desde archivos Excel
 */
import * as XLSX from 'xlsx';

// Configuración del formato esperado del Excel
const FORMATO_EXCEL = {
  COLUMNAS_REQUERIDAS: ['codigo', 'nombre', 'apellido', 'carrera', 'semestre'],
  COLUMNAS_OPCIONALES: ['paralelo'],
  EXTENSIONES_VALIDAS: ['.xlsx', '.xls'],
  TAMANO_MAXIMO: 5 * 1024 * 1024, // 5MB
  MAX_FILAS: 1000 // Máximo 1000 estudiantes por importación
};

// Mapeo de nombres de columnas que el usuario podría usar
const MAPEO_COLUMNAS = {
  // Código
  'codigo': 'codigo',
  'código': 'codigo',
  'code': 'codigo',
  'student_code': 'codigo',
  'codigo_estudiante': 'codigo',
  'cod': 'codigo',
  
  // Nombre
  'nombre': 'nombre',
  'nombres': 'nombre',
  'first_name': 'nombre',
  'name': 'nombre',
  'primer_nombre': 'nombre',
  
  // Apellido
  'apellido': 'apellido',
  'apellidos': 'apellido',
  'last_name': 'apellido',
  'surname': 'apellido',
  'primer_apellido': 'apellido',
  
  // Carrera
  'carrera': 'carrera',
  'career': 'carrera',
  'programa': 'carrera',
  'especialidad': 'carrera',
  'career_name': 'carrera',
  
  // Semestre
  'semestre': 'semestre',
  'semester': 'semestre',
  'nivel': 'semestre',
  'sem': 'semestre',
  'periodo': 'semestre',
  
  // Paralelo
  'paralelo': 'paralelo',
  'parallel': 'paralelo',
  'seccion': 'paralelo',
  'grupo': 'paralelo',
  'division': 'paralelo'
};

/**
 * Valida que el archivo sea un Excel válido
 * @param {File} archivo - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
export const validarArchivo = (archivo) => {
  const resultado = {
    valido: false,
    errores: [],
    advertencias: []
  };

  // Verificar que existe el archivo
  if (!archivo) {
    resultado.errores.push('No se ha seleccionado ningún archivo');
    return resultado;
  }

  // Verificar extensión
  const extension = archivo.name.toLowerCase().substring(archivo.name.lastIndexOf('.'));
  if (!FORMATO_EXCEL.EXTENSIONES_VALIDAS.includes(extension)) {
    resultado.errores.push(`Formato de archivo no válido. Solo se aceptan: ${FORMATO_EXCEL.EXTENSIONES_VALIDAS.join(', ')}`);
    return resultado;
  }

  // Verificar tamaño
  if (archivo.size > FORMATO_EXCEL.TAMANO_MAXIMO) {
    resultado.errores.push(`El archivo es demasiado grande. Tamaño máximo: ${FORMATO_EXCEL.TAMANO_MAXIMO / (1024 * 1024)}MB`);
    return resultado;
  }

  // Verificar que no esté vacío
  if (archivo.size === 0) {
    resultado.errores.push('El archivo está vacío');
    return resultado;
  }

  resultado.valido = true;
  return resultado;
};

/**
 * Normaliza los nombres de las columnas según el mapeo definido
 * @param {Array} headers - Headers originales del Excel
 * @returns {Object} Headers normalizados y mapeo
 */
const normalizarHeaders = (headers) => {
  const headersNormalizados = {};
  const mapeoUtilizado = {};
  const columnasFaltantes = [];
  const columnasIgnoradas = [];

  // Limpiar y normalizar headers
  const headersLimpios = headers.map(header => {
    if (!header || typeof header !== 'string') return '';
    return header.toString().toLowerCase().trim().replace(/\s+/g, '_');
  });

  // Mapear cada header
  headersLimpios.forEach((header, index) => {
    const headerOriginal = headers[index];

    if (MAPEO_COLUMNAS[header]) {
      const columnaEstandar = MAPEO_COLUMNAS[header];
      headersNormalizados[columnaEstandar] = index;
      mapeoUtilizado[headerOriginal] = columnaEstandar;
    } else if (header && header.trim() !== '') {
      columnasIgnoradas.push(headerOriginal);
      console.log(` Header ignorado: "${headerOriginal}" (normalizado: "${header}")`)
    }
  });

  // Verificar columnas requeridas
  FORMATO_EXCEL.COLUMNAS_REQUERIDAS.forEach(columna => {
    if (headersNormalizados[columna] === undefined) {
      columnasFaltantes.push(columna);
      console.log(`Columna faltante: "${columna}"`);
    }
  });
  return {
    headersNormalizados,
    mapeoUtilizado,
    columnasFaltantes,
    columnasIgnoradas
  };
};

/**
 * Extrae y valida los datos del archivo Excel
 * @param {File} archivo - Archivo Excel a procesar
 * @returns {Promise<Object>} Datos extraídos y validados
 */
export const procesarArchivoExcel = async (archivo) => {
  return new Promise((resolve, reject) => {
    try {
      // Validar archivo antes de procesar
      const validacionArchivo = validarArchivo(archivo);
      if (!validacionArchivo.valido) {
        reject(new Error(`Archivo inválido: ${validacionArchivo.errores.join(', ')}`));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellStyles: false,
            sheetStubs: false
          });

          // Obtener la primera hoja
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            reject(new Error('El archivo Excel está vacío o no contiene hojas'));
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });

          if (!jsonData || jsonData.length === 0) {
            reject(new Error('La hoja de Excel está vacía'));
            return;
          }

          // Extraer headers (primera fila)
          const headers = jsonData[0];
          if (!headers || headers.length === 0) {
            reject(new Error('No se encontraron encabezados en la primera fila'));
            return;
          }
          // Validar y normalizar headers
          const resultadoHeaders = normalizarHeaders(headers);
          
          if (resultadoHeaders.columnasFaltantes.length > 0) {
            reject(new Error(`Columnas requeridas faltantes: ${resultadoHeaders.columnasFaltantes.join(', ')}. Formato esperado: ${FORMATO_EXCEL.COLUMNAS_REQUERIDAS.join(', ')}`));
            return;
          }

          // Extraer filas de datos (saltando el header)
          const filasData = jsonData.slice(1);
          
          if (filasData.length === 0) {
            reject(new Error('No hay datos para importar (solo se encontró la fila de encabezados)'));
            return;
          }

          if (filasData.length > FORMATO_EXCEL.MAX_FILAS) {
            reject(new Error(`Demasiadas filas. Máximo permitido: ${FORMATO_EXCEL.MAX_FILAS}, encontradas: ${filasData.length}`));
            return;
          }

          // Procesar cada fila
          const estudiantesProcesados = [];
          const erroresPorFila = [];

          filasData.forEach((fila, index) => {
            const numeroFila = index + 2; // +2 porque empezamos desde fila 2 (saltamos header)
            
            try {
              // Verificar que la fila no esté completamente vacía
              const filaVacia = fila.every(celda => !celda || celda.toString().trim() === '');
              if (filaVacia) {
                // Ignorar filas vacías silenciosamente
                return;
              }

              const estudiante = extraerDatosEstudiante(fila, resultadoHeaders.headersNormalizados, numeroFila);
              if (estudiante) {
                estudiantesProcesados.push(estudiante);
              }
            } catch (error) {
              erroresPorFila.push({
                fila: numeroFila,
                error: error.message,
                datos: fila
              });
            }
          });

          resolve({
            estudiantes: estudiantesProcesados,
            metadata: {
              archivoNombre: archivo.name,
              totalFilas: filasData.length,
              filasVacias: filasData.length - estudiantesProcesados.length - erroresPorFila.length,
              mapeoColumnas: resultadoHeaders.mapeoUtilizado,
              columnasIgnoradas: resultadoHeaders.columnasIgnoradas
            },
            erroresPorFila
          });

        } catch (error) {
          reject(new Error(`Error al procesar el archivo Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(archivo);

    } catch (error) {
      reject(new Error(`Error inesperado: ${error.message}`));
    }
  });
};

/**
 * Extrae los datos de un estudiante desde una fila del Excel
 * @param {Array} fila - Fila de datos del Excel
 * @param {Object} headers - Mapeo de headers normalizados
 * @param {number} numeroFila - Número de fila para mensajes de error
 * @returns {Object} Datos del estudiante extraídos
 */
const extraerDatosEstudiante = (fila, headers, numeroFila) => {
  const errores = [];

  // Función auxiliar para obtener valor de celda limpio
  const obtenerValor = (columna) => {
    const index = headers[columna];
    if (index === undefined || index >= fila.length) return '';
    
    const valor = fila[index];
    if (valor === null || valor === undefined) return '';
    
    return valor.toString().trim();
  };

  // Extraer datos básicos
  const codigo = obtenerValor('codigo').toUpperCase();
  const nombre = obtenerValor('nombre');
  const apellido = obtenerValor('apellido');
  const carrera = obtenerValor('carrera');
  const semestreStr = obtenerValor('semestre');
  const paralelo = obtenerValor('paralelo').toUpperCase();

  // Validar campos obligatorios
  if (!codigo) errores.push('Código es obligatorio');
  if (!nombre) errores.push('Nombre es obligatorio');
  if (!apellido) errores.push('Apellido es obligatorio');
  if (!carrera) errores.push('Carrera es obligatoria');
  if (!semestreStr) errores.push('Semestre es obligatorio');

  // Validar y convertir semestre
  let semestre = null;
  if (semestreStr) {
    // Intentar extraer número del semestre (puede venir como "3er", "4to", "3", etc.)
    const semestreMatch = semestreStr.match(/(\d+)/);
    if (semestreMatch) {
      semestre = parseInt(semestreMatch[1], 10);
      if (isNaN(semestre) || semestre < 1 || semestre > 10) {
        errores.push('Semestre debe ser un número entre 1 y 10');
      }
    } else {
      errores.push('Formato de semestre inválido (debe contener un número)');
    }
  }

  // ✅ CORRECCIÓN: Validar código permitiendo guiones
  if (codigo && !/^[A-Z0-9\-]+$/.test(codigo)) {
    errores.push('Código debe contener solo letras, números y guiones (sin espacios ni otros caracteres especiales)');
  }

  // Validar longitud de campos
  if (codigo && codigo.length > 20) errores.push('Código demasiado largo (máximo 20 caracteres)');
  if (nombre && nombre.length > 50) errores.push('Nombre demasiado largo (máximo 50 caracteres)');
  if (apellido && apellido.length > 50) errores.push('Apellido demasiado largo (máximo 50 caracteres)');
  if (carrera && carrera.length > 100) errores.push('Nombre de carrera demasiado largo (máximo 100 caracteres)');

  // Si hay errores, lanzar excepción con información
  if (errores.length > 0) {
    throw new Error(`Fila ${numeroFila}: ${errores.join(', ')}`);
  }

  return {
    codigo,
    nombre: formatearTexto(nombre),
    apellido: formatearTexto(apellido),
    carrera: formatearTexto(carrera),
    semestre,
    paralelo: paralelo || '', // Puede estar vacío, se asignará después según la carrera
    numeroFila,
    // Campo que se auto-asignará
    unidad_educativa: 'Cochabamba'
  };
};

/**
 * Formatea texto para nombres y apellidos (Primera letra mayúscula)
 * @param {string} texto - Texto a formatear
 * @returns {string} Texto formateado
 */
const formatearTexto = (texto) => {
  if (!texto) return '';
  
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ')
    .trim();
};

/**
 * Genera un template de Excel para que los usuarios sepan el formato correcto
 * @returns {Blob} Archivo Excel de ejemplo
 */
export const generarTemplateExcel = () => {
  const datosEjemplo = [
    // Headers
    ['Codigo', 'Nombre', 'Apellido', 'Carrera', 'Semestre', 'Paralelo'],
    // Ejemplos con todas las carreras disponibles
    ['C12719-1', 'Juan Carlos', 'Pérez García', 'Ingeniería de Sistemas', '5', 'A'],
    ['ISE001-2', 'María Elena', 'Rodríguez López', 'Ingeniería de Sistemas Electronicos', '6', 'A'],
    ['AGR002-3', 'Ana Sofia', 'Morales Vargas', 'Ingeniería Agroindustrial', '4', 'A'],
    ['CB001-A', 'Luis Fernando', 'González Torrez', 'Ciencias Básicas', '1', 'B'],
    ['CB002-B', 'Carmen Rosa', 'Flores Mendoza', 'Ciencias Básicas', '2', 'C'],
    ['COM003-4', 'Roberto Carlos', 'Vásquez Silva', 'Ingeniería Comercial', '7', 'A'],
    ['CIV004-5', 'Patricia Isabel', 'Herrera Castro', 'Ingeniería Civil', '8', 'A'],
    ['DGR005-6', 'Miguel Angel', 'Sandoval Roque', 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual', '3', 'A'],
    ['INF006-7', 'Claudia Paola', 'Mamani Quispe', 'Tec. Sup. en Informática', '4', 'A'],
    ['SEL009-X', 'Daniel Rodrigo', 'Cortez Montaño', 'Tec. Sup. en Sistemas Electrónicos', '4', 'A'],
    ['ENR010-1', 'Valeria Nicole', 'Jiménez Pardo', 'Técnico Superior en Energías Renovables', '6', 'A'],
    ['TCC009-X', 'Daniel Rodrigo', 'Cortez Montaño', 'Tec. Sup. Contrucción Civil', '5', 'A'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(datosEjemplo);
  
  // Ajustar ancho de columnas
  const wscols = [
    { wch: 12 }, // Codigo
    { wch: 20 }, // Nombre
    { wch: 20 }, // Apellido
    { wch: 25 }, // Carrera
    { wch: 10 }, // Semestre
    { wch: 10 }  // Paralelo
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Descarga el template de Excel
 * @param {string} nombreArchivo - Nombre para el archivo descargado
 */
export const descargarTemplate = (nombreArchivo = 'template_importacion_estudiantes.xlsx') => {
  const blob = generarTemplateExcel();
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

// Exportar constantes individualmente para facilitar import
export { FORMATO_EXCEL };

const excelProcessorUtils = {
  validarArchivo,
  procesarArchivoExcel,
  generarTemplateExcel,
  descargarTemplate,
  FORMATO_EXCEL
};

export default excelProcessorUtils;