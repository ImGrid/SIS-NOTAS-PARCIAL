const express = require('express');
const router = express.Router();
const informesController = require('../controllers/informe_controller');
const pool = require('../database/db'); 
const auth = require('../secutiry/auth');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarInforme = async (req, res, next) => {
  const { grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id } = req.body;
  if (!grupo_id || !estudiante_id || !docente_id || !calificacion_id || !rubrica_id) {
    return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes' });
  }
  //todo esto es para ver si los id de las claves foraneas existen dentro de la tabla
  try {
    const grupo = await pool.query('SELECT id FROM grupos WHERE id = $1', [grupo_id]);
    if (grupo.rows.length === 0) {
      return res.status(400).json({ error: 'grupo_id no válido' });
    }

    const estudiante = await pool.query('SELECT id FROM estudiantes WHERE id = $1', [estudiante_id]);
    if (estudiante.rows.length === 0) {
      return res.status(400).json({ error: 'estudiante_id no válido' });
    }

    const docente = await pool.query('SELECT id FROM docentes WHERE id = $1', [docente_id]);
    if (docente.rows.length === 0) {
      return res.status(400).json({ error: 'docente_id no válido' });
    }

    const calificacion = await pool.query('SELECT id FROM calificaciones WHERE id = $1', [calificacion_id]);
    if (calificacion.rows.length === 0) {
      return res.status(400).json({ error: 'calificacion_id no válido' });
    }

    const rubrica = await pool.query('SELECT id FROM rubricas WHERE id = $1', [rubrica_id]);
    if (rubrica.rows.length === 0) {
      return res.status(400).json({ error: 'rubrica_id no válido' });
    }

    next();
  } catch (error) {
    console.error('Error al validar el informe:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
router.post('/create', authService.createAuthMiddleware(), 
  validarInforme, informesController.crearInforme);


router.get('/get', authService.createAuthMiddleware(), 
  informesController.obtenerInformes);

router.get('/get/:id', authService.createAuthMiddleware(), 
  informesController.obtenerInformePorId);

router.put('/update/:id', authService.createAuthMiddleware(), 
  validarInforme, informesController.actualizarInforme);

router.delete('/delete/:id', authService.createAuthMiddleware(), 
  informesController.eliminarInforme);

router.get('/grupo/:grupoId', authService.createAuthMiddleware(), 
  informesController.obtenerInformesPorGrupoId);

router.get('/estudiante/:estudianteId', authService.createAuthMiddleware(), 
  informesController.obtenerInformesPorEstudianteId);

router.get('/docente/:docenteId', authService.createAuthMiddleware(), 
  informesController.obtenerInformesPorDocenteId);

router.get('/calificacion/:calificacionId', authService.createAuthMiddleware(), 
  informesController.obtenerInformesPorCalificacionId);

router.get('/rubrica/:rubricaId', authService.createAuthMiddleware(), 
  informesController.obtenerInformesPorRubricaId);

module.exports = router;