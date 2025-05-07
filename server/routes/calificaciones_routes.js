const express = require('express');
const router = express.Router();
const calificacionesController = require('../controllers/calificaciones_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarCalificacion = async (req, res, next) => {
    const { gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id } = req.body;
    if (!gestion || !periodo || !fecha || !asignatura || !rubrica_id || !docente_id || !estudiante_id) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes' });
    }
  
    try {
      // Verificar si rubrica_id existe
      const rubrica = await pool.query('SELECT id FROM rubricas WHERE id = $1', [rubrica_id]);
      if (rubrica.rows.length === 0) {
        return res.status(400).json({ error: 'rubrica_id no válido' });
      }
  
      // Verificar si docente_id existe
      const docente = await pool.query('SELECT id FROM docentes WHERE id = $1', [docente_id]);
      if (docente.rows.length === 0) {
        return res.status(400).json({ error: 'docente_id no válido' });
      }
  
      // Verificar si estudiante_id existe
      const estudiante = await pool.query('SELECT id FROM estudiantes WHERE id = $1', [estudiante_id]);
      if (estudiante.rows.length === 0) {
        return res.status(400).json({ error: 'estudiante_id no válido' });
      }
  
      next();
    } catch (error) {
      console.error('Error al validar la calificación:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

router.post('/create', authService.createAuthMiddleware(), 
  validarCalificacion, calificacionesController.crearCalificacion);

router.get('/get', authService.createAuthMiddleware(), calificacionesController.obtenerCalificaciones);

router.get('/get/:id', authService.createAuthMiddleware(), 
  calificacionesController.obtenerCalificacionPorId);

router.put('/update/:id', authService.createAuthMiddleware(), 
  validarCalificacion, calificacionesController.actualizarCalificacion);

router.delete('/delete/:id', authService.createAuthMiddleware(), 
  calificacionesController.eliminarCalificacion);

router.get('/estudiante/:estudianteId', authService.createAuthMiddleware(), 
  calificacionesController.obtenerCalificacionesPorEstudianteId);

router.get('/docente/:docenteId', authService.createAuthMiddleware(), 
  calificacionesController.obtenerCalificacionesPorDocenteId);

router.get('/rubrica/:rubricaId', authService.createAuthMiddleware(), 
  calificacionesController.obtenerCalificacionesPorRubricaId);

module.exports = router;