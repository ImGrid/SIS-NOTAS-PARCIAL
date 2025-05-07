const express = require('express');
const router = express.Router();
const rubricasController = require('../controllers/rubrica_controller');
const pool = require('../database/db'); // Importa la conexión a la base de datos
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarRubrica = async (req, res, next) => {
  const { presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id } = req.body;
  if (!presentacion || !sustentacion || !documentacion || !innovacion || !nota_final || !docente_id) {
    return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes' });
  }

  try {
    // Verificar si docente_id existe
    const docente = await pool.query('SELECT id FROM docentes WHERE id = $1', [docente_id]);
    if (docente.rows.length === 0) {
      return res.status(400).json({ error: 'docente_id no válido' });
    }

    next();
  } catch (error) {
    console.error('Error al validar la rúbrica:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

router.post('/create', authService.createAuthMiddleware(),
  validarRubrica, rubricasController.crearRubrica);

router.get('/get', authService.createAuthMiddleware(),
  rubricasController.obtenerRubricas);

router.get('/get/:id', authService.createAuthMiddleware(),
  rubricasController.obtenerRubricaPorId);

router.put('/update/:id', authService.createAuthMiddleware(),
  validarRubrica, rubricasController.actualizarRubrica);

router.delete('/delete/:id', authService.createAuthMiddleware(),
  rubricasController.eliminarRubrica);

router.get('/docente/:docenteId', authService.createAuthMiddleware(),
  rubricasController.obtenerRubricasPorDocenteId);

module.exports = router;