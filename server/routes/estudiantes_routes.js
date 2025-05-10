const express = require('express');
const router = express.Router();
const estudiantesController = require('../controllers/estudiantes_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarEstudiante = async (req, res, next) => {
  const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = req.body;
  if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
    return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes' });
  }

  next();
};

router.post('/create', authService.createAuthMiddleware(),
  validarEstudiante, estudiantesController.crearEstudiante);

router.get('/get', authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantes);

router.get('/get/:id', authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantePorId);

router.put('/update/:id', authService.createAuthMiddleware(),
  validarEstudiante, estudiantesController.actualizarEstudiante);

router.delete('/delete/:id', authService.createAuthMiddleware(),
  estudiantesController.eliminarEstudiante);

router.get('/grupo/:grupoId', authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorGrupoId);

router.get('/carrera/:carrera', authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorCarrera);

router.get('/semestre/:semestre', authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorSemestre);

  router.post('/asignar-grupo', authService.createAuthMiddleware(),
  estudiantesController.asignarEstudianteAGrupo);

router.post('/desasignar-grupo', authService.createAuthMiddleware(),
  estudiantesController.desasignarEstudianteDeGrupo);

router.get('/verificar-materia/:estudianteId/:materia', 
  authService.createAuthMiddleware(),
  estudiantesController.verificarMateria
);
router.get('/con-estado-grupo', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesConEstadoGrupo
);
router.get('/semestre-carrera/:semestre/:carrera', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorSemestreYCarrera
);
module.exports = router; 