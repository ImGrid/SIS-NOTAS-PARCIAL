const estudiantesModel = require('../models/estudiantes_model');
const pool = require('../database/db');

async function crearEstudiante(req, res) {
  try {
    const estudiante = await estudiantesModel.crearEstudiante(req.body);
    res.status(201).json(estudiante);
  } catch (error) {
    if (error.code === '23505') { // Código de error de PostgreSQL para violación de restricción UNIQUE
      return res.status(400).json({ error: 'El código de estudiante ya está en uso' });
    }
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
 * Si se cambia carrera o semestre y el estudiante tiene dependencias, 
 * se requiere confirmación explícita para limpiar esas dependencias.
 */
async function actualizarEstudiante(req, res) {
  try {
    const id = req.params.id;
    const nuevosDatos = req.body;
    
    // 1. Obtener datos actuales del estudiante
    const estudianteActual = await estudiantesModel.obtenerEstudiantePorId(id);
    if (!estudianteActual) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    
    // 2. Verificar si hay cambios en campos críticos (semestre o carrera)
    const cambioSemestre = nuevosDatos.semestre && nuevosDatos.semestre !== estudianteActual.semestre.toString();
    const cambioCarrera = nuevosDatos.carrera && nuevosDatos.carrera !== estudianteActual.carrera;
    
    // 3. Si no hay cambios críticos, actualizar normalmente
    if (!cambioSemestre && !cambioCarrera) {
      const estudiante = await estudiantesModel.actualizarEstudiante(id, nuevosDatos);
      return res.json(estudiante);
    }
    
    // 4. Si hay cambios críticos, verificar dependencias
    const dependencias = await estudiantesModel.verificarDependenciasEstudiante(id);
    
    // 5. Verificar modo de operación (confirmar o no la limpieza de dependencias)
    const confirmarLimpieza = req.query.confirmar_limpieza === 'true';
    
    // Si hay dependencias y no se ha confirmado la limpieza, devolver advertencia
    if (dependencias.tieneDependencias && !confirmarLimpieza) {
      return res.status(409).json({ 
        error: 'El cambio de carrera o semestre afectará elementos relacionados',
        dependencias,
        mensaje: 'Para continuar, confirme la operación con ?confirmar_limpieza=true en la URL',
        campos_afectados: {
          cambioSemestre,
          cambioCarrera
        }
      });
    }
    
    // 6. Si se confirma la limpieza o no hay dependencias, proceder con la actualización
    if (confirmarLimpieza || !dependencias.tieneDependencias) {
      // Si hay dependencias confirmadas, usar el método con limpieza
      if (dependencias.tieneDependencias) {
        const resultado = await estudiantesModel.actualizarEstudianteConLimpieza(id, nuevosDatos);
        return res.json(resultado);
      } else {
        // Sin dependencias, actualizar normalmente
        const estudiante = await estudiantesModel.actualizarEstudiante(id, nuevosDatos);
        return res.json(estudiante);
      }
    }
  } catch (error) {
    if (error.code === '23505') { // Violación de restricción UNIQUE
      return res.status(400).json({ error: 'El código de estudiante ya está en uso' });
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
  verificarDependencias // Nuevo endpoint para verificar dependencias
};