const express = require('express');
const router = express.Router();
const gruposController = require('../controllers/grupos_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarGrupo = (req, res, next) => {
  const { nombre_proyecto, carrera, semestre, docente_id, materia } = req.body;
  if (!nombre_proyecto || !carrera || !semestre || !docente_id || !materia) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  next();
};

router.post('/create', authService.createAuthMiddleware(),
  validarGrupo, 
  gruposController.crearGrupo);

router.get('/get', authService.createAuthMiddleware(),
  gruposController.obtenerGrupos);

router.get('/get/:id', authService.createAuthMiddleware(),
  gruposController.obtenerGrupoPorId);

router.put('/update/:id', authService.createAuthMiddleware(),
  validarGrupo, gruposController.actualizarGrupo);

router.delete('/delete/:id', authService.createAuthMiddleware(),
  gruposController.eliminarGrupo);

router.get('/docente/:docenteId', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorDocenteId);

router.get('/carrera/:carrera', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorCarrera);

router.get('/semestre/:semestre', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorSemestre);

router.get('/materia/:materia', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorMateria);
module.exports = router;