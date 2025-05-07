const gruposModel = require('../models/grupos_model');

async function crearGrupo(req, res) {
  try {
    const grupo = await gruposModel.crearGrupo(req.body);
    res.status(201).json(grupo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGrupos(req, res) {
  try {
    const grupos = await gruposModel.obtenerGrupos();
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGrupoPorId(req, res) {
  try {
    const grupo = await gruposModel.obtenerGrupoPorId(req.params.id);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json(grupo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
async function obtenerGruposPorMateria(req, res) {
  try {
    const materia = req.params.materia;
    const grupos = await gruposModel.obtenerGruposPorMateria(materia);
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
async function actualizarGrupo(req, res) {
  try {
    const grupo = await gruposModel.actualizarGrupo(req.params.id, req.body);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json(grupo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function eliminarGrupo(req, res) {
  try {
    const grupo = await gruposModel.eliminarGrupo(req.params.id);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json({ message: 'Grupo eliminado', grupo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorDocenteId(req, res) {
  try {
    const docenteId = req.params.docenteId;
    const grupos = await gruposModel.obtenerGruposPorDocenteId(docenteId);
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorCarrera(req, res) {
  try {
    const carrera = req.params.carrera;
    const grupos = await gruposModel.obtenerGruposPorCarrera(carrera);
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorSemestre(req, res) {
  try {
    const semestre = req.params.semestre;
    const grupos = await gruposModel.obtenerGruposPorSemestre(semestre);
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearGrupo,
  obtenerGrupos,
  obtenerGrupoPorId,
  actualizarGrupo,
  eliminarGrupo,
  obtenerGruposPorDocenteId,
  obtenerGruposPorCarrera,
  obtenerGruposPorSemestre,
  obtenerGruposPorMateria,
};