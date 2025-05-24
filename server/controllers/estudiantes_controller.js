const estudiantesModel = require('../models/estudiantes_model');
const pool = require('../database/db');

/**
 * Valida y normaliza el campo paralelo según la carrera
 */
function validarYNormalizarParalelo(carrera, paralelo) {
  if (carrera === 'Ciencias Básicas') {
    // Para Ciencias Básicas, el paralelo es obligatorio y debe ser A-F
    if (!paralelo || !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      throw new Error('Para Ciencias Básicas el paralelo es obligatorio y debe ser A, B, C, D, E, F O G');
    }
    return paralelo.toUpperCase();
  } else {
    // Para otras carreras, siempre usar 'A'
    return 'A';
  }
}

/**
 * Valida los datos del estudiante incluyendo la lógica de paralelos
 */
function validarDatosEstudiante(datos) {
  const { nombre, apellido, codigo, carrera, semestre, unidad_educativa, paralelo } = datos;
  
  // Validar campos básicos
  if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
    throw new Error('Todos los campos básicos son obligatorios: nombre, apellido, código, carrera, semestre, unidad_educativa');
  }
  
  // Validar que el semestre sea apropiado para la carrera
  const semestreNum = parseInt(semestre);
  if (carrera === 'Ciencias Básicas') {
    if (semestreNum !== 1 && semestreNum !== 2) {
      throw new Error('Ciencias Básicas solo puede tener semestres 1 o 2');
    }
  } else {
    if (semestreNum < 3 || semestreNum > 10) {
      throw new Error('Las carreras regulares deben tener semestres entre 3 y 10');
    }
  }
  
  // Validar y normalizar paralelo
  const paraleloValidado = validarYNormalizarParalelo(carrera, paralelo);
  
  return {
    ...datos,
    paralelo: paraleloValidado
  };
}

async function crearEstudiante(req, res) {
  try {
    // Validar y normalizar datos
    const datosValidados = validarDatosEstudiante(req.body);
    
    // Verificar si ya existe un estudiante con el mismo código, semestre y paralelo
    const codigoExiste = await estudiantesModel.verificarCodigoExistente(
      datosValidados.codigo, 
      datosValidados.semestre, 
      datosValidados.paralelo
    );
    
    if (codigoExiste) {
      return res.status(400).json({ 
        error: `Ya existe un estudiante con el código ${datosValidados.codigo} en el semestre ${datosValidados.semestre}, paralelo ${datosValidados.paralelo}` 
      });
    }
    
    const estudiante = await estudiantesModel.crearEstudiante(datosValidados);
    res.status(201).json(estudiante);
  } catch (error) {
    if (error.code === '23505') { 
      // Violación de restricción UNIQUE en base de datos
      if (error.detail && error.detail.includes('estudiantes_codigo_semestre_paralelo_key')) {
        return res.status(400).json({ 
          error: 'Ya existe un estudiante con este código en el mismo semestre y paralelo' 
        });
      } else {
        return res.status(400).json({ error: 'El código de estudiante ya está en uso' });
      }
    }
    
    // Error de validación
    if (error.message.includes('paralelo') || error.message.includes('semestre')) {
      return res.status(400).json({ error: error.message });
    }
    
    // Otros tipos de errores
    console.error('Error al crear estudiante:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantes(req, res) {
  try {
    const estudiantes = await estudiantesModel.obtenerEstudiantes();
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantePorId(req, res) {
  try {
    const estudiante = await estudiantesModel.obtenerEstudiantePorId(req.params.id);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    res.json(estudiante);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Actualiza un estudiante con validación de cambios críticos.
 * Si se cambia carrera, semestre o paralelo y el estudiante tiene dependencias, 
 * se requiere confirmación explícita para limpiar esas dependencias.
 */
async function actualizarEstudiante(req, res) {
  try {
    const id = req.params.id;
    
    // 1. Obtener datos actuales del estudiante
    const estudianteActual = await estudiantesModel.obtenerEstudiantePorId(id);
    if (!estudianteActual) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // 2. Validar y normalizar los nuevos datos
    const nuevosDatosValidados = validarDatosEstudiante(req.body);
    
    // 3. Verificar si hay cambios en campos críticos
    const cambioSemestre = nuevosDatosValidados.semestre !== estudianteActual.semestre.toString();
    const cambioCarrera = nuevosDatosValidados.carrera !== estudianteActual.carrera;
    const cambioParalelo = nuevosDatosValidados.paralelo !== estudianteActual.paralelo;
    
    // 4. Verificar que el nuevo código no esté en uso (excluyendo el estudiante actual)
    if (nuevosDatosValidados.codigo !== estudianteActual.codigo || 
        cambioSemestre || cambioParalelo) {
      const codigoExiste = await estudiantesModel.verificarCodigoExistente(
        nuevosDatosValidados.codigo, 
        nuevosDatosValidados.semestre, 
        nuevosDatosValidados.paralelo,
        id // Excluir el estudiante actual
      );
      
      if (codigoExiste) {
        return res.status(400).json({ 
          error: `Ya existe otro estudiante con el código ${nuevosDatosValidados.codigo} en el semestre ${nuevosDatosValidados.semestre}, paralelo ${nuevosDatosValidados.paralelo}` 
        });
      }
    }
    
    // 5. Si no hay cambios críticos, actualizar normalmente
    if (!cambioSemestre && !cambioCarrera && !cambioParalelo) {
      const estudiante = await estudiantesModel.actualizarEstudiante(id, nuevosDatosValidados);
      return res.json(estudiante);
    }
    
    // 6. Si hay cambios críticos, verificar dependencias
    const dependencias = await estudiantesModel.verificarDependenciasEstudiante(id);
    
    // 7. Verificar modo de operación (confirmar o no la limpieza de dependencias)
    const confirmarLimpieza = req.query.confirmar_limpieza === 'true';
    
    // Si hay dependencias y no se ha confirmado la limpieza, devolver advertencia
    if (dependencias.tieneDependencias && !confirmarLimpieza) {
      return res.status(409).json({ 
        error: 'El cambio de carrera, semestre o paralelo afectará elementos relacionados',
        dependencias,
        mensaje: 'Para continuar, confirme la operación con ?confirmar_limpieza=true en la URL',
        campos_afectados: {
          cambioSemestre,
          cambioCarrera,
          cambioParalelo
        }
      });
    }
    
    // 8. Si se confirma la limpieza o no hay dependencias, proceder con la actualización
    if (confirmarLimpieza || !dependencias.tieneDependencias) {
      // Si hay dependencias confirmadas, usar el método con limpieza
      if (dependencias.tieneDependencias) {
        const resultado = await estudiantesModel.actualizarEstudianteConLimpieza(id, nuevosDatosValidados);
        return res.json(resultado);
      } else {
        // Sin dependencias, actualizar normalmente
        const estudiante = await estudiantesModel.actualizarEstudiante(id, nuevosDatosValidados);
        return res.json(estudiante);
      }
    }
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'El código de estudiante ya está en uso en ese semestre y paralelo' });
    }
    
    // Error de validación
    if (error.message.includes('paralelo') || error.message.includes('semestre')) {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Error al actualizar estudiante:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina un estudiante y todas sus dependencias de forma segura
 */
async function eliminarEstudiante(req, res) {
  try {
    const id = req.params.id;
    
    // 1. Verificar existencia del estudiante
    const estudiante = await estudiantesModel.obtenerEstudiantePorId(id);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // 2. Verificar si tiene dependencias antes de eliminar
    const dependencias = await estudiantesModel.verificarDependenciasEstudiante(id);
    
    // 3. Verificar si se ha confirmado la eliminación con dependencias
    const confirmarEliminacion = req.query.confirmar === 'true';
    
    // 4. Si tiene dependencias y no se ha confirmado, mostrar advertencia
    if (dependencias.tieneDependencias && !confirmarEliminacion) {
      return res.status(409).json({
        error: 'El estudiante tiene elementos relacionados que se eliminarán',
        dependencias,
        mensaje: 'Para confirmar la eliminación con todas sus dependencias, use ?confirmar=true en la URL'
      });
    }
    
    // 5. Proceder con la eliminación segura
    const resultado = await estudiantesModel.eliminarEstudianteSeguro(id);
    
    if (!resultado) {
      return res.status(404).json({ error: 'Estudiante no encontrado o ya eliminado' });
    }
    
    res.json({ 
      mensaje: 'Estudiante eliminado correctamente',
      estudiante: resultado.estudiante,
      dependenciasEliminadas: resultado.dependenciasEliminadas
    });
  } catch (error) {
    console.error('Error en eliminarEstudiante:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantesPorGrupoId(req, res) {
  try {
    const grupoId = req.params.grupoId;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorGrupoId(grupoId);
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantesPorCarrera(req, res) {
  try {
    const carrera = req.params.carrera;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorCarrera(carrera);
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantesPorSemestre(req, res) {
  try {
    const semestre = req.params.semestre;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorSemestre(semestre);
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener estudiantes por carrera y paralelo
 */
async function obtenerEstudiantesPorCarreraYParalelo(req, res) {
  try {
    const { carrera, paralelo } = req.params;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorCarreraYParalelo(carrera, paralelo);
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener estudiantes por semestre, carrera y paralelo
 */
async function obtenerEstudiantesPorSemestreCarreraYParalelo(req, res) {
  try {
    const { semestre, carrera, paralelo } = req.params;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorSemestreCarreraYParalelo(semestre, carrera, paralelo);
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener paralelos disponibles para una carrera
 */
async function obtenerParalelosDisponibles(req, res) {
  try {
    const { carrera } = req.params;
    const paralelos = await estudiantesModel.obtenerParalelosDisponiblesPorCarrera(carrera);
    res.json(paralelos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function asignarEstudianteAGrupo(req, res) {
  try {
    const { estudianteId, grupoId } = req.body;
    const asignacion = await estudiantesModel.asignarEstudianteAGrupo(estudianteId, grupoId);
    res.status(201).json(asignacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function desasignarEstudianteDeGrupo(req, res) {
  try {
    const { estudianteId, grupoId } = req.body;
    const asignacion = await estudiantesModel.desasignarEstudianteDeGrupo(estudianteId, grupoId);
    res.json(asignacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function verificarMateria(req, res) {
  try {
    const { estudianteId, materia } = req.params;
    const yaAsignado = await estudiantesModel.estudianteYaAsignadoAMateria(estudianteId, materia);
    res.json(yaAsignado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantesConEstadoGrupo(req, res) {
  try {
    // Verificar dónde guarda el middleware la información del usuario
    const docenteId = req.usuario?.id || req.user?.id || req.auth?.id;
    
    // Verificación adicional
    if (!docenteId) {
      return res.status(400).json({ error: 'No se pudo obtener el ID del docente de la sesión' });
    }
    
    const estudiantes = await estudiantesModel.obtenerEstudiantesConEstadoGrupo(docenteId);
    res.json(estudiantes);
  } catch (error) {
    console.error('Error en obtenerEstudiantesConEstadoGrupo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantesPorSemestreYCarrera(req, res) {
  try {
    const semestre = req.params.semestre;
    const carrera = req.params.carrera;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorSemestreYCarrera(semestre, carrera);
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerEstudiantesPorMateria(req, res) {
  try {
    const materia = req.params.materia;
    const estudiantes = await estudiantesModel.obtenerEstudiantesPorMateriaConEstado(materia);
    res.json(estudiantes);
  } catch (error) {
    console.error('Error al obtener estudiantes por materia:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Verifica las dependencias de un estudiante sin realizar cambios
 */
async function verificarDependencias(req, res) {
  try {
    const id = req.params.id;
    
    // Verificar que exista el estudiante
    const estudiante = await estudiantesModel.obtenerEstudiantePorId(id);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // Obtener dependencias
    const dependencias = await estudiantesModel.verificarDependenciasEstudiante(id);
    
    res.json({
      estudiante,
      dependencias,
      tieneDependencias: dependencias.tieneDependencias
    });
  } catch (error) {
    console.error('Error al verificar dependencias:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Verificar si un código está disponible
 */
async function verificarCodigoDisponible(req, res) {
  try {
    const { codigo, semestre, paralelo } = req.query;
    const excludeId = req.query.exclude_id || null;
    
    if (!codigo || !semestre || !paralelo) {
      return res.status(400).json({ 
        error: 'Se requieren los parámetros: codigo, semestre, paralelo' 
      });
    }
    
    const existe = await estudiantesModel.verificarCodigoExistente(codigo, semestre, paralelo, excludeId);
    
    res.json({
      codigo,
      semestre,
      paralelo,
      disponible: !existe,
      mensaje: existe ? 'El código ya está en uso en ese semestre y paralelo' : 'El código está disponible'
    });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearEstudiante,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  eliminarEstudiante,
  obtenerEstudiantesPorGrupoId,
  obtenerEstudiantesPorCarrera,
  obtenerEstudiantesPorSemestre,
  asignarEstudianteAGrupo,
  desasignarEstudianteDeGrupo,
  verificarMateria,
  obtenerEstudiantesConEstadoGrupo,
  obtenerEstudiantesPorSemestreYCarrera,
  obtenerEstudiantesPorMateria,
  verificarDependencias,
  // Nuevas funciones para paralelos:
  obtenerEstudiantesPorCarreraYParalelo,
  obtenerEstudiantesPorSemestreCarreraYParalelo,
  obtenerParalelosDisponibles,
  verificarCodigoDisponible
};