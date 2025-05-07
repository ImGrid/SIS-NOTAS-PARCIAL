// src/util/export/excelService.js
import ExcelJS from 'exceljs';
import { getMisGrupos, getGrupoPorId } from '../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../service/estudianteService';
import { getInformesPorGrupoId } from '../../service/informeService';
import { getRubricaPorId } from '../../service/rubricaService';
import { getBorradorPorDocenteYGrupo } from '../../service/borradorService';
import { ESTRUCTURA_RUBRICA } from '../calculo';
import { formatearDatosExcel } from './formartService';

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
          peso: seccion.peso,
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
          peso: seccion.peso,
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
    
    const getColorPorCalificacion = (calificacion) => {
      if (!calificacion || calificacion === '-' || calificacion === 'Sin evaluar') {
        return '#ffffff';
      }
      
      const encontrado = escalaCalificacion.find(item => 
        item.valor === calificacion || 
        item.numero === calificacion.toString()
      );
      
      return encontrado ? encontrado.color : '#ffffff';
    };
    
    const filas = [];
    datosFormateados.datos.forEach((fila, rowIndex) => {
      const excelRow = worksheet.addRow(fila);
      filas.push(excelRow);
      
      excelRow.eachCell((cell, colIndex) => {
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
        
        if (rowIndex >= 5) {
          // Verificar si es una celda con calificación
          if (colIndex > 3 && colIndex <= datosFormateados.datos[0].length - 2) {
            const valorCelda = cell.value;
            
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
          if (colIndex === datosFormateados.datos[0].length) {
            const resultado = cell.value;
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
                fgColor: { argb: 'FF4444' }
              };
            }
          }
        }
      });
    });    
    // Título del proyecto (Fila 1)
    const tituloCell = worksheet.getCell('A1');
    worksheet.mergeCells('A1:' + worksheet.getColumn(datosFormateados.datos[0].length).letter + '1');
    tituloCell.value = datosFormateados.datos[0][0];
    tituloCell.font = { bold: true, size: 14 };
    tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tituloCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2F0D9' }
    };
    
    // Info del grupo (Fila 2)
    const infoCell = worksheet.getCell('A2');
    worksheet.mergeCells('A2:' + worksheet.getColumn(datosFormateados.datos[0].length).letter + '2');
    infoCell.value = datosFormateados.datos[1][0];
    infoCell.font = { bold: true, size: 12 };
    infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    infoCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2F0D9' } // Verde claro
    };
    
    // Encabezado INDICADORES (Fila 3)
    const indicadoresCell = worksheet.getCell('A3');
    worksheet.mergeCells('A3:' + worksheet.getColumn(datosFormateados.datos[0].length).letter + '3');
    indicadoresCell.value = 'INDICADORES';
    indicadoresCell.font = { bold: true, size: 12 };
    indicadoresCell.alignment = { horizontal: 'center', vertical: 'middle' };
    indicadoresCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE699' } // Amarillo claro
    };
    
    // Encabezados de secciones (Fila 4)
    const filaSeccion = filas[3]; // Índice 3 corresponde a la fila 4
    const totalColumnas = datosFormateados.datos[0].length;
    
    // Combinar celdas para cada sección
    let seccionActual = '';
    let inicioSeccion = 0;
    let finSeccion = 0;
    const seccionesInfo = {};
    
    // Identificar secciones primero
    datosFormateados.datos[3].forEach((valor, index) => {
      if (index >= 3 && valor && valor !== '') {
        // Si es una nueva sección
        if (valor.includes('%')) {
          // Guardar posición y nombre
          const nombreSeccion = valor.split(' ')[0];
          seccionesInfo[nombreSeccion] = {
            posicion: index
          };
        }
      }
    });
    
    // Procesar secciones
    const seccionesList = Object.keys(seccionesInfo);
    seccionesList.forEach((seccion, idx) => {
      const inicioCol = seccionesInfo[seccion].posicion;
      const finCol = idx < seccionesList.length - 1 
        ? seccionesInfo[seccionesList[idx + 1]].posicion - 1
        : totalColumnas - 3; // -3 para nota final y resultado
      
      if (inicioCol < finCol) {
        const letraInicio = worksheet.getColumn(inicioCol).letter;
        const letraFin = worksheet.getColumn(finCol).letter;
        worksheet.mergeCells(`${letraInicio}4:${letraFin}4`);
      }
      
      // Aplicar estilo
      const seccionCell = worksheet.getCell(worksheet.getColumn(inicioCol).letter + '4');
      seccionCell.font = { bold: true, size: 11 };
      seccionCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDEBF7' } // Azul claro
      };
    });
    
    // Dar formato a columnas de N°, CÓDIGO y ESTUDIANTE
    ['A', 'B', 'C'].forEach(col => {
      const cell = worksheet.getCell(col + '4');
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDEBF7' } // Azul claro
      };
    });
    
    // Dar formato a NOTA FINAL y OBSERVACIONES
    const notaFinalCell = worksheet.getCell(worksheet.getColumn(totalColumnas - 1).letter + '4');
    notaFinalCell.font = { bold: true, size: 11 };
    notaFinalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' } // Azul claro
    };
    
    const observacionesCell = worksheet.getCell(worksheet.getColumn(totalColumnas).letter + '4');
    observacionesCell.font = { bold: true, size: 11 };
    observacionesCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' } // Azul claro
    };
    
    // Criterios específicos (Fila 5)
    const filaCriterios = filas[4]; // Índice 4 corresponde a la fila 5
    
    filaCriterios.eachCell((cell, colIndex) => {
      if (cell.value && cell.value !== '') {
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' } // Gris claro
        };
      }
    });
    
    // 5. Establecer anchos de columna
    datosFormateados.anchos.forEach((ancho, index) => {
      // ExcelJS usa índices de columna basados en 1, no en 0
      const colIndex = index + 1;
      worksheet.getColumn(colIndex).width = ancho;
      
      // Ajustar altura para que se vea mejor
      worksheet.getRow(5).height = 80; // Para la fila de criterios
      worksheet.getRow(4).height = 40; // Para la fila de secciones
      worksheet.getRow(3).height = 30; // Para la fila de INDICADORES
    });
    
    // Ajustar altura para las filas de estudiantes
    for (let i = 6; i < filas.length; i++) {
      worksheet.getRow(i).height = 30;
    }
    
    // 6. Guardar archivo (descarga en navegador)
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
  
  // Definimos la estructura de criterios para cada sección
  const estructuraSecciones = {
    'PRESENTACIÓN': { peso: '30%', criterios: 5 },
    'SUSTENTACIÓN': { peso: '30%', criterios: 4 },
    'DOCUMENTACIÓN': { peso: '30%', criterios: 6 },
    'INNOVACIÓN': { peso: '10%', criterios: 2 }
  };
  
  // Determinar cantidad y posición de cada sección
  const seccionesInfo = {};
  let colActual = 4; // Inicia después de N°, CÓDIGO, ESTUDIANTE
  
  Object.entries(estructuraSecciones).forEach(([nombre, info]) => {
    seccionesInfo[nombre] = {
      inicio: colActual,
      fin: colActual + info.criterios - 1,
      peso: info.peso
    };
    colActual += info.criterios;
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
    // Combinar celdas para el encabezado de sección
    worksheet.mergeCells(filaSeccion, info.inicio, filaSeccion, info.fin);
    
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
  
  // Combinar verticalmente las celdas de N°, CÓDIGO, ESTUDIANTE, NOTA FINAL y OBSERVACIONES
  // para que incluyan tanto la fila de encabezados de secciones como la de criterios específicos
  
  // Combinar N°
  worksheet.mergeCells(filaSeccion, 1, filaCriterios, 1);
  
  // Combinar CÓDIGO
  worksheet.mergeCells(filaSeccion, 2, filaCriterios, 2);
  
  // Combinar ESTUDIANTE
  worksheet.mergeCells(filaSeccion, 3, filaCriterios, 3);
  
  // Combinar NOTA FINAL
  worksheet.mergeCells(filaSeccion, notaFinalCol, filaCriterios, notaFinalCol);
  
  // Combinar OBSERVACIONES
  worksheet.mergeCells(filaSeccion, observacionesCol, filaCriterios, observacionesCol);
  
  // Obtener y validar los criterios para cada sección
  const criteriosPorSeccion = {
    'PRESENTACIÓN': [
      'CLARIDAD DE LA EXPOSICIÓN 10%',
      'USO DE HERRAMIENTAS VISUALES 5%',
      'DISTRIBUCIÓN DE TIEMPO 5%',
      'EQUIDAD EN LA PARTICIPACIÓN 5%',
      'COORDINACIÓN Y COHESIÓN GRUPAL 5%'
    ],
    'SUSTENTACIÓN': [
      'CONOCIMIENTO PROFUNDO DEL TEMA 10%',
      'RESPUESTAS A PREGUNTAS DEL DOCENTE 10%',
      'CAPACIDAD DE ANÁLISIS 5%',
      'DESARROLLO DE SOLUCIONES 5%'
    ],
    'DOCUMENTACIÓN': [
      'ESTRUCTURA DEL DOCUMENTO 5%',
      'CLARIDAD Y PRECISIÓN 5%',
      'COMPLEJIDAD DE DISEÑO 5%',
      'JUSTIFICACIÓN TÉCNICA 5%',
      'RESULTADOS CLAROS Y CONCISOS 5%',
      'INTERPRETACIÓN DE RESULTADOS 5%'
    ],
    'INNOVACIÓN': [
      'NIVEL DE CREATIVIDAD EN LA SOLUCIÓN 5%',
      'APLICABILIDAD PRÁCTICA 5%'
    ]
  };
  
  // Establecer los criterios en la fila correspondiente
  let colIndex = 4; // Comenzar después de N°, CÓDIGO, ESTUDIANTE
  
  Object.entries(criteriosPorSeccion).forEach(([seccion, criteriosList]) => {
    criteriosList.forEach((criterio, idx) => {
      const criterioCell = worksheet.getCell(filaCriterios, colIndex);
      criterioCell.value = criterio;
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
    
    console.log(`Procesando ${grupos.length} grupos...`); // Para depuración
    
    // 2. Crear un libro de trabajo con ExcelJS
    const workbook = new ExcelJS.Workbook();
    
    // Crear una sola hoja para todos los grupos
    const worksheet = workbook.addWorksheet('Evaluaciones');
    
    // Variable para llevar la cuenta de filas procesadas
    let filaActual = 1;
    
    // 3. Para cada grupo, agregar sus datos a la única hoja
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i];
      console.log(`Procesando grupo ${i+1}/${grupos.length}: ${grupo.nombre_proyecto}`); // Para depuración
      
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
        
        await aplicarEstilosHoja(worksheet, datosFormateados.datos, datosFormateados.anchos, filaActual);
        
        filaActual += datosFormateados.datos.length;
      } catch (error) {
        console.error(`Error al procesar grupo ${grupo.id} (${grupo.nombre_proyecto}):`, error);
        // Continuar con el siguiente grupo
      }
    }
    
    // Verificar que se hayan agregado datos
    if (filaActual <= 1) {
      throw new Error('No se pudieron generar datos para ningún grupo');
    }
    
    console.log(`Generando archivo con ${grupos.length} grupos en una sola hoja...`);
    
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