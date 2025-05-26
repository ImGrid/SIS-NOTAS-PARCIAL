/**
 * Validaciones específicas para importación de estudiantes
 * Maneja validaciones de negocio, permisos y reglas específicas por carrera
 */
import { 
  validarDatosEstudiante,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  verificarCodigoDisponible,
  getSemestresDisponibles
} from '../../service/estudianteService';

// Constantes de validación
const REGLAS_VALIDACION = {
  CARRERAS_VALIDAS: [
    'Ingeniería de Sistemas',
    'Ingeniería de Sistemas Electronicos', 
    'Ingeniería Agroindustrial',
    'Ciencias Básicas',
    'Ingeniería Comercial',
    'Ingeniería Civil',
    'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual',
    'Tec. Sup. en Informática',
    'Tec. Sup. en Análisis de Sistemas',
    'Tec. Sup. en Programación de Sistemas',
    'Tec. Sup. en Sistemas Electrónicos',
    'Técnico Superior en Energías Renovables'
  ],
  PARALELOS_CIENCIAS_BASICAS: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  CODIGO_REGEX: /^[A-Z0-9\-]{3,20}$/,
  NOMBRE_REGEX: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/
};

/**
 * Obtiene las carreras asignadas al docente desde sessionStorage
 * @returns {Array} Lista de carreras asignadas
 */
const obtenerCarrerasDocente = () => {
  try {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) return [];
    
    const usuario = JSON.parse(usuarioStr);
    if (!usuario || !usuario.carreras) return [];
    
    if (!Array.isArray(usuario.carreras)) {
      return typeof usuario.carreras === 'string' ? [usuario.carreras] : [];
    }
    
    return usuario.carreras.filter(carrera => carrera && carrera.trim() !== '');
  } catch (error) {
    console.error('Error al obtener carreras del docente:', error);
    return [];
  }
};

/**
 * Valida permisos del docente para importar estudiantes
 * @returns {Object} Resultado de validación de permisos
 */
export const validarPermisosDocente = () => {
  const carrerasAsignadas = obtenerCarrerasDocente();
  
  const resultado = {
    valido: false,
    carreras: [],
    errores: []
  };
  
  if (carrerasAsignadas.length === 0) {
    resultado.errores.push('No tiene carreras asignadas. Contacte con el administrador.');
    return resultado;
  }
  
  resultado.valido = true;
  resultado.carreras = carrerasAsignadas;
  return resultado;
};

/**
 * Normaliza y valida el nombre de una carrera
 * @param {string} carrera - Nombre de carrera a validar
 * @param {Array} carrerasPermitidas - Carreras que el docente puede manejar
 * @returns {Object} Resultado de validación
 */
export const validarCarrera = (carrera, carrerasPermitidas) => {
  const resultado = {
    valido: false,
    carreraNormalizada: '',
    errores: []
  };
  
  if (!carrera || typeof carrera !== 'string') {
    resultado.errores.push('Carrera no especificada');
    return resultado;
  }
  
  const carreraLimpia = carrera.trim();
  
  // Buscar coincidencia exacta (case insensitive)
  const carreraEncontrada = REGLAS_VALIDACION.CARRERAS_VALIDAS.find(
    c => c.toLowerCase() === carreraLimpia.toLowerCase()
  );
  
  if (!carreraEncontrada) {
    resultado.errores.push(`Carrera "${carrera}" no es válida. Carreras válidas: ${REGLAS_VALIDACION.CARRERAS_VALIDAS.join(', ')}`);
    return resultado;
  }
  
  // Verificar permisos del docente
  const tienePermiso = carrerasPermitidas.some(
    cp => cp.toLowerCase().trim() === carreraEncontrada.toLowerCase()
  );
  
  if (!tienePermiso) {
    resultado.errores.push(`No tiene permisos para importar estudiantes de "${carreraEncontrada}". Sus carreras asignadas: ${carrerasPermitidas.join(', ')}`);
    return resultado;
  }
  
  resultado.valido = true;
  resultado.carreraNormalizada = carreraEncontrada;
  return resultado;
};

/**
 * Valida y normaliza el semestre según la carrera
 * @param {number} semestre - Semestre a validar
 * @param {string} carrera - Carrera del estudiante
 * @returns {Object} Resultado de validación
 */
export const validarSemestre = (semestre, carrera) => {
  const resultado = {
    valido: false,
    semestreNormalizado: null,
    errores: []
  };
  
  if (!semestre || typeof semestre !== 'number') {
    resultado.errores.push('Semestre debe ser un número');
    return resultado;
  }
  
  if (!Number.isInteger(semestre) || semestre < 1 || semestre > 10) {
    resultado.errores.push('Semestre debe ser un número entero entre 1 y 10');
    return resultado;
  }
  
  // Validaciones específicas por carrera
  if (carrera === 'Ciencias Básicas') {
    if (semestre !== 1 && semestre !== 2) {
      resultado.errores.push('Ciencias Básicas solo puede tener semestres 1 o 2');
      return resultado;
    }
  } else {
    if (semestre < 3 || semestre > 10) {
      resultado.errores.push('Las carreras regulares deben tener semestres entre 3 y 10');
      return resultado;
    }
  }
  
  resultado.valido = true;
  resultado.semestreNormalizado = semestre;
  return resultado;
};

/**
 * Valida y normaliza el paralelo según la carrera
 * @param {string} paralelo - Paralelo especificado
 * @param {string} carrera - Carrera del estudiante
 * @returns {Object} Resultado de validación
 */
export const validarParalelo = (paralelo, carrera) => {
  const resultado = {
    valido: false,
    paraleloNormalizado: '',
    errores: []
  };
  
  const necesitaParalelo = carreraNecesitaParalelo(carrera);
  
  if (necesitaParalelo) {
    // Para Ciencias Básicas, el paralelo es obligatorio
    if (!paralelo || typeof paralelo !== 'string') {
      resultado.errores.push('Paralelo es obligatorio para Ciencias Básicas');
      return resultado;
    }
    
    const paraleloUpper = paralelo.toUpperCase().trim();
    
    if (!REGLAS_VALIDACION.PARALELOS_CIENCIAS_BASICAS.includes(paraleloUpper)) {
      resultado.errores.push(`Paralelo "${paralelo}" no es válido para Ciencias Básicas. Paralelos válidos: ${REGLAS_VALIDACION.PARALELOS_CIENCIAS_BASICAS.join(', ')}`);
      return resultado;
    }
    
    resultado.paraleloNormalizado = paraleloUpper;
  } else {
    // Para otras carreras, auto-asignar 'A'
    resultado.paraleloNormalizado = getParaleloPorDefecto(carrera);
  }
  
  resultado.valido = true;
  return resultado;
};

/**
 * Valida el formato y unicidad de un código de estudiante
 * @param {string} codigo - Código a validar
 * @returns {Object} Resultado de validación
 */
export const validarCodigo = (codigo) => {
  const resultado = {
    valido: false,
    codigoNormalizado: '',
    errores: []
  };
  
  if (!codigo || typeof codigo !== 'string') {
    resultado.errores.push('Código es obligatorio');
    return resultado;
  }
  
  const codigoLimpio = codigo.trim().toUpperCase();
  
  if (!REGLAS_VALIDACION.CODIGO_REGEX.test(codigoLimpio)) {
    resultado.errores.push('Código debe tener entre 3-20 caracteres, solo letras y números (sin espacios ni caracteres especiales)');
    return resultado;
  }
  
  resultado.valido = true;
  resultado.codigoNormalizado = codigoLimpio;
  return resultado;
};

/**
 * Valida nombres y apellidos
 * @param {string} texto - Nombre o apellido a validar
 * @param {string} tipo - 'nombre' o 'apellido'
 * @returns {Object} Resultado de validación
 */
export const validarNombre = (texto, tipo = 'nombre') => {
  const resultado = {
    valido: false,
    textoNormalizado: '',
    errores: []
  };
  
  if (!texto || typeof texto !== 'string') {
    resultado.errores.push(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} es obligatorio`);
    return resultado;
  }
  
  const textoLimpio = texto.trim();
  
  if (!REGLAS_VALIDACION.NOMBRE_REGEX.test(textoLimpio)) {
    resultado.errores.push(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} debe tener entre 2-50 caracteres, solo letras y espacios`);
    return resultado;
  }
  
  // Formatear correctamente (Primera letra mayúscula)
  const textoFormateado = textoLimpio
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
  
  resultado.valido = true;
  resultado.textoNormalizado = textoFormateado;
  return resultado;
};

/**
 * Valida completamente un estudiante desde el Excel
 * @param {Object} estudiante - Datos del estudiante extraídos del Excel
 * @param {Array} carrerasPermitidas - Carreras que puede manejar el docente
 * @returns {Object} Resultado de validación completa
 */
export const validarEstudianteCompleto = (estudiante, carrerasPermitidas) => {
  const resultado = {
    valido: false,
    estudianteValidado: null,
    errores: [],
    advertencias: []
  };
  
  // Validar cada campo individualmente
  const validacionCodigo = validarCodigo(estudiante.codigo);
  const validacionNombre = validarNombre(estudiante.nombre, 'nombre');
  const validacionApellido = validarNombre(estudiante.apellido, 'apellido');
  const validacionCarrera = validarCarrera(estudiante.carrera, carrerasPermitidas);
  
  // Continuar solo si la carrera es válida (necesaria para validar semestre y paralelo)
  let validacionSemestre = { valido: false, errores: ['Carrera no válida'] };
  let validacionParalelo = { valido: false, errores: ['Carrera no válida'] };
  
  if (validacionCarrera.valido) {
    validacionSemestre = validarSemestre(estudiante.semestre, validacionCarrera.carreraNormalizada);
    validacionParalelo = validarParalelo(estudiante.paralelo, validacionCarrera.carreraNormalizada);
  }
  
  // Recopilar errores
  const todasLasValidaciones = [
    validacionCodigo,
    validacionNombre, 
    validacionApellido,
    validacionCarrera,
    validacionSemestre,
    validacionParalelo
  ];
  
  todasLasValidaciones.forEach(validacion => {
    if (!validacion.valido) {
      resultado.errores.push(...validacion.errores);
    }
  });
  
  // Si hay errores, retornar inmediatamente
  if (resultado.errores.length > 0) {
    return resultado;
  }
  
  // Crear estudiante validado y normalizado
  const estudianteValidado = {
    codigo: validacionCodigo.codigoNormalizado,
    nombre: validacionNombre.textoNormalizado,
    apellido: validacionApellido.textoNormalizado,
    carrera: validacionCarrera.carreraNormalizada,
    semestre: validacionSemestre.semestreNormalizado,
    paralelo: validacionParalelo.paraleloNormalizado,
    unidad_educativa: 'Cochabamba',
    numeroFila: estudiante.numeroFila
  };
  
  // Validación final usando el servicio (adicional)
  try {
    validarDatosEstudiante(estudianteValidado);
  } catch (error) {
    resultado.errores.push(`Validación final falló: ${error.message}`);
    return resultado;
  }
  
  // Agregar advertencias si aplica
  if (estudianteValidado.carrera !== 'Ciencias Básicas' && estudiante.paralelo && estudiante.paralelo !== 'A') {
    resultado.advertencias.push(`Paralelo "${estudiante.paralelo}" ignorado (se asignó "A" automáticamente para carreras regulares)`);
  }
  
  resultado.valido = true;
  resultado.estudianteValidado = estudianteValidado;
  return resultado;
};

/**
 * Verifica si un estudiante ya existe (duplicado)
 * @param {Object} estudiante - Estudiante validado a verificar
 * @returns {Promise<Object>} Resultado de verificación de duplicado
 */
export const verificarDuplicado = async (estudiante) => {
  const resultado = {
    esDuplicado: false,
    tipoConflicto: null,
    mensaje: '',
    sugerencia: ''
  };
  
  try {
    const respuesta = await verificarCodigoDisponible(
      estudiante.codigo,
      estudiante.semestre,
      estudiante.paralelo
    );
    
    if (!respuesta.disponible) {
      resultado.esDuplicado = true;
      
      // Determinar tipo de conflicto
      if (respuesta.conflicto) {
        const { semestre_existente, paralelo_existente, carrera_existente } = respuesta.conflicto;
        
        if (semestre_existente === estudiante.semestre && paralelo_existente === estudiante.paralelo) {
          resultado.tipoConflicto = 'exacto';
          resultado.mensaje = `El estudiante ya existe exactamente en ${semestre_existente}º semestre, paralelo ${paralelo_existente}`;
          resultado.sugerencia = 'Se ignorará esta entrada ya que el estudiante ya está registrado correctamente';
        } else {
          resultado.tipoConflicto = 'diferente';
          resultado.mensaje = `El estudiante ya existe en ${semestre_existente}º semestre, paralelo ${paralelo_existente} (${carrera_existente})`;
          resultado.sugerencia = 'Si necesita cambiar sus datos, edítelo manualmente desde la lista de estudiantes';
        }
      } else {
        resultado.tipoConflicto = 'desconocido';
        resultado.mensaje = 'El código ya está en uso';
        resultado.sugerencia = 'Verifique manualmente en la lista de estudiantes';
      }
    }
    
  } catch (error) {
    console.error('Error al verificar duplicado:', error);
    // En caso de error, asumir que no es duplicado para no bloquear la importación
    resultado.esDuplicado = false;
  }
  
  return resultado;
};

/**
 * Procesa un lote de estudiantes verificando duplicados en paralelo
 * @param {Array} estudiantes - Lista de estudiantes validados
 * @param {Function} onProgress - Callback para reportar progreso (opcional)
 * @returns {Promise<Object>} Resultados de procesamiento de lote
 */
export const procesarLoteEstudiantes = async (estudiantes, onProgress = null) => {
  const resultado = {
    validos: [],
    duplicados: [],
    errores: []
  };
  
  // Procesar en paralelo con límite de concurrencia
  const CONCURRENCIA_MAXIMA = 5;
  const lotes = [];
  
  for (let i = 0; i < estudiantes.length; i += CONCURRENCIA_MAXIMA) {
    lotes.push(estudiantes.slice(i, i + CONCURRENCIA_MAXIMA));
  }
  
  let procesados = 0;
  
  for (const lote of lotes) {
    try {
      const promesasLote = lote.map(async (estudiante) => {
        try {
          const verificacionDuplicado = await verificarDuplicado(estudiante);
          
          if (verificacionDuplicado.esDuplicado) {
            return {
              tipo: 'duplicado',
              estudiante,
              conflicto: verificacionDuplicado
            };
          } else {
            return {
              tipo: 'valido',
              estudiante
            };
          }
        } catch (error) {
          return {
            tipo: 'error',
            estudiante,
            error: error.message
          };
        }
      });
      
      const resultadosLote = await Promise.all(promesasLote);
      
      // Categorizar resultados
      resultadosLote.forEach(res => {
        switch (res.tipo) {
          case 'valido':
            resultado.validos.push(res.estudiante);
            break;
          case 'duplicado':
            resultado.duplicados.push({
              estudiante: res.estudiante,
              razon: res.conflicto.mensaje,
              sugerencia: res.conflicto.sugerencia,
              tipoConflicto: res.conflicto.tipoConflicto
            });
            break;
          case 'error':
            resultado.errores.push({
              estudiante: res.estudiante,
              error: res.error
            });
            break;
        }
      });
      
      procesados += lote.length;
      
      // Reportar progreso si se proporcionó callback
      if (onProgress) {
        onProgress({
          procesados,
          total: estudiantes.length,
          porcentaje: Math.round((procesados / estudiantes.length) * 100)
        });
      }
      
    } catch (error) {
      console.error('Error procesando lote:', error);
      // Agregar todo el lote como errores
      lote.forEach(estudiante => {
        resultado.errores.push({
          estudiante,
          error: `Error en procesamiento: ${error.message}`
        });
      });
    }
  }
  
  return resultado;
};

/**
 * Genera estadísticas de validación para mostrar al usuario
 * @param {Object} resultados - Resultados de procesamiento
 * @returns {Object} Estadísticas formateadas
 */
export const generarEstadisticasValidacion = (resultados) => {
  const { validos, duplicados, errores } = resultados;
  
  const total = validos.length + duplicados.length + errores.length;
  
  return {
    total,
    validos: {
      cantidad: validos.length,
      porcentaje: total > 0 ? Math.round((validos.length / total) * 100) : 0
    },
    duplicados: {
      cantidad: duplicados.length,
      porcentaje: total > 0 ? Math.round((duplicados.length / total) * 100) : 0,
      tiposConflicto: {
        exactos: duplicados.filter(d => d.tipoConflicto === 'exacto').length,
        diferentes: duplicados.filter(d => d.tipoConflicto === 'diferente').length
      }
    },
    errores: {
      cantidad: errores.length,
      porcentaje: total > 0 ? Math.round((errores.length / total) * 100) : 0
    }
  };
};

const validacionImportUtils = {
  validarPermisosDocente,
  validarCarrera,
  validarSemestre,
  validarParalelo,
  validarCodigo,
  validarNombre,
  validarEstudianteCompleto,
  verificarDuplicado,
  procesarLoteEstudiantes,
  generarEstadisticasValidacion,
  REGLAS_VALIDACION
};

export default validacionImportUtils;