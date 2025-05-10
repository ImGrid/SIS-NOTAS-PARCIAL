const estudiantesModel = require('../models/estudiantes_model');

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

async function actualizarEstudiante(req, res) {
  try {
    const estudiante = await estudiantesModel.actualizarEstudiante(req.params.id, req.body);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    res.json(estudiante);
  } catch (error) {
    if (error.code === '23505') { // Código de error de PostgreSQL para violación de restricción UNIQUE
      return res.status(400).json({ error: 'El código de estudiante ya está en uso' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function eliminarEstudiante(req, res) {
  try {
    const estudiante = await estudiantesModel.eliminarEstudiante(req.params.id);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    res.json({ message: 'Estudiante eliminado', estudiante });
  } catch (error) {
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
module.exports = {
  crearEstudiante,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  eliminarEstudiante,
  obtenerEstudiantesPorGrupoId,
  obtenerEstudiantesPorCarrera,
  obtenerEstudiantesPorSemestre,
  asignarEstudianteAGrupo,         // NUEVO
  desasignarEstudianteDeGrupo,
  verificarMateria,
  obtenerEstudiantesConEstadoGrupo,
  obtenerEstudiantesPorSemestreYCarrera
};