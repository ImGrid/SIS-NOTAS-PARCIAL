const informesModel = require('../models/informe_model');

async function crearInforme(req, res) {
  try {
    const informe = await informesModel.crearInforme(req.body);
    res.status(201).json(informe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformes(req, res) {
  try {
    const informes = await informesModel.obtenerInformes();
    res.json(informes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformePorId(req, res) {
  try {
    const informe = await informesModel.obtenerInformePorId(req.params.id);
    if (!informe) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }
    res.json(informe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarInforme(req, res) {
  try {
    const informe = await informesModel.actualizarInforme(req.params.id, req.body);
    if (!informe) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }
    res.json(informe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function eliminarInforme(req, res) {
  try {
    const informe = await informesModel.eliminarInforme(req.params.id);
    if (!informe) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }
    res.json({ message: 'Informe eliminado', informe });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformesPorGrupoId(req, res) {
  try {
    const informes = await informesModel.obtenerInformesPorGrupoId(req.params.grupoId);
    res.json(informes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformesPorEstudianteId(req, res) {
  try {
    const informes = await informesModel.obtenerInformesPorEstudianteId(req.params.estudianteId);
    res.json(informes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformesPorDocenteId(req, res) {
  try {
    const informes = await informesModel.obtenerInformesPorDocenteId(req.params.docenteId);
    res.json(informes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformesPorCalificacionId(req, res) {
  try {
    const informes = await informesModel.obtenerInformesPorCalificacionId(req.params.calificacionId);
    res.json(informes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerInformesPorRubricaId(req, res) {
  try {
    const informes = await informesModel.obtenerInformesPorRubricaId(req.params.rubricaId);
    res.json(informes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearInforme,
  obtenerInformes,
  obtenerInformePorId,
  actualizarInforme,
  eliminarInforme,
  obtenerInformesPorGrupoId,
  obtenerInformesPorEstudianteId,
  obtenerInformesPorDocenteId,
  obtenerInformesPorCalificacionId,
  obtenerInformesPorRubricaId,
};