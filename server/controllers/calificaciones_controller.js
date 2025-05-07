const calificacionesModel = require('../models/calificaciones_model');

async function crearCalificacion(req, res) {
  try {
    const calificacion = await calificacionesModel.crearCalificacion(req.body);
    res.status(201).json(calificacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerCalificaciones(req, res) {
  try {
    const calificaciones = await calificacionesModel.obtenerCalificaciones();
    res.json(calificaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerCalificacionPorId(req, res) {
  try {
    const calificacion = await calificacionesModel.obtenerCalificacionPorId(req.params.id);
    if (!calificacion) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }
    res.json(calificacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarCalificacion(req, res) {
  try {
    const calificacion = await calificacionesModel.actualizarCalificacion(req.params.id, req.body);
    if (!calificacion) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }
    res.json(calificacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function eliminarCalificacion(req, res) {
  try {
    const calificacion = await calificacionesModel.eliminarCalificacion(req.params.id);
    if (!calificacion) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }
    res.json({ message: 'Calificación eliminada', calificacion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerCalificacionesPorEstudianteId(req, res) {
  try {
    const estudianteId = req.params.estudianteId;
    const calificaciones = await calificacionesModel.obtenerCalificacionesPorEstudianteId(estudianteId);
    res.json(calificaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerCalificacionesPorDocenteId(req, res) {
  try {
    const docenteId = req.params.docenteId;
    const calificaciones = await calificacionesModel.obtenerCalificacionesPorDocenteId(docenteId);
    res.json(calificaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerCalificacionesPorRubricaId(req, res) {
  try {
    const rubricaId = req.params.rubricaId;
    const calificaciones = await calificacionesModel.obtenerCalificacionesPorRubricaId(rubricaId);
    res.json(calificaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearCalificacion,
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  actualizarCalificacion,
  eliminarCalificacion,
  obtenerCalificacionesPorEstudianteId,
  obtenerCalificacionesPorDocenteId,
  obtenerCalificacionesPorRubricaId,
};