const express = require('express');
const router = express.Router();
const borradoresController = require('../controllers/borradores_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarBorrador = async (req, res, next) => {
  const { docente_id, grupo_id, contenido, progreso } = req.body;
  
  // Verificar campos obligatorios
  if (!docente_id || !grupo_id || !contenido) {
    return res.status(400).json({ error: 'Los campos docente_id, grupo_id, y contenido son obligatorios' });
  }
  
  // Verificar que el contenido sea un objeto válido
  if (typeof contenido !== 'object') {
    return res.status(400).json({ error: 'El campo contenido debe ser un objeto JSON válido' });
  }
  
  // Verificar que el progreso sea un número entre 0 y 100
  if (progreso !== undefined && (typeof progreso !== 'number' || progreso < 0 || progreso > 100)) {
    return res.status(400).json({ error: 'El campo progreso debe ser un número entre 0 y 100' });
  }
  
  try {
    // Verificar que docente_id existe
    const docente = await pool.query('SELECT id FROM docentes WHERE id = $1', [docente_id]);
    if (docente.rows.length === 0) {
      return res.status(400).json({ error: 'docente_id no válido' });
    }
    
    // Verificar que grupo_id existe
    const grupo = await pool.query('SELECT id FROM grupos WHERE id = $1', [grupo_id]);
    if (grupo.rows.length === 0) {
      return res.status(400).json({ error: 'grupo_id no válido' });
    }
    
    next();
  } catch (error) {
    console.error('Error al validar el borrador:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Rutas para los borradores
router.post('/create', 
  authService.createAuthMiddleware(), 
  validarBorrador, 
  borradoresController.crearBorrador
);

router.get('/get', 
  authService.createAuthMiddleware(), 
  borradoresController.obtenerBorradores
);

router.get('/get/:id', 
  authService.createAuthMiddleware(), 
  borradoresController.obtenerBorradorPorId
);

router.get('/docente-grupo/:docenteId/:grupoId', 
  authService.createAuthMiddleware(), 
  borradoresController.obtenerBorradorPorDocenteYGrupo
);

router.put('/update/:id', 
  authService.createAuthMiddleware(), 
  validarBorrador, 
  borradoresController.actualizarBorrador
);

router.delete('/delete/:id', 
  authService.createAuthMiddleware(), 
  borradoresController.eliminarBorrador
);

router.delete('/delete/docente-grupo/:docenteId/:grupoId', 
  authService.createAuthMiddleware(), 
  borradoresController.eliminarBorradorPorDocenteYGrupo
);

router.get('/docente/:docenteId', 
  authService.createAuthMiddleware(), 
  borradoresController.obtenerBorradoresPorDocenteId
);

module.exports = router;