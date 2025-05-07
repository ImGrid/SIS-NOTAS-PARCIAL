const rubricasModel = require('../models/rubrica_model');

async function crearRubrica(req, res) {
  try {
    const rubrica = await rubricasModel.crearRubrica(req.body);
    res.status(201).json(rubrica);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerRubricas(req, res) {
  try {
    const rubricas = await rubricasModel.obtenerRubricas();
    res.json(rubricas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerRubricaPorId(req, res) {
  try {
    const rubrica = await rubricasModel.obtenerRubricaPorId(req.params.id);
    if (!rubrica) {
      return res.status(404).json({ error: 'Rúbrica no encontrada' });
    }
    res.json(rubrica);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarRubrica(req, res) {
  try {
    const rubrica = await rubricasModel.actualizarRubrica(req.params.id, req.body);
    if (!rubrica) {
      return res.status(404).json({ error: 'Rúbrica no encontrada' });
    }
    res.json(rubrica);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function eliminarRubrica(req, res) {
  try {
    const rubrica = await rubricasModel.eliminarRubrica(req.params.id);
    if (!rubrica) {
      return res.status(404).json({ error: 'Rúbrica no encontrada' });
    }
    res.json({ message: 'Rúbrica eliminada', rubrica });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerRubricasPorDocenteId(req, res) {
  try {
    const rubricas = await rubricasModel.obtenerRubricasPorDocenteId(req.params.docenteId);
    res.json(rubricas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearRubrica,
  obtenerRubricas,
  obtenerRubricaPorId,
  actualizarRubrica,
  eliminarRubrica,
  obtenerRubricasPorDocenteId,
};