const express = require('express');
const router = express.Router();
const docenteController = require('../controllers/docente_controller');
const { createAuthService } = require('../secutiry/auth');
const rateLimit = require('express-rate-limit');

const authService = createAuthService();

// Limitador para intentos de verificación de código (prevenir ataques de fuerza bruta)
const codigoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // limitar a 10 intentos por ventana
  message: 'Demasiados intentos fallidos. Por favor intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const solicitudLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 solicitudes por hora
  message: 'Demasiadas solicitudes de código. Por favor intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const validarDocente = (req, res, next) => {
  const { nombre_completo, correo_electronico, cargo } = req.body;
  if (!nombre_completo || !correo_electronico || !cargo) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  next();
};

// Middleware para verificar si el usuario es un supervisor
const verificarSupervisor = async (req, res, next) => {
  try {
    // Obtener ID del usuario autenticado
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Importar y usar el modelo para verificar si es supervisor
    const supervisorModel = require('../models/supervisor_model');
    const supervisor = await supervisorModel.obtenerSupervisorPorId(userId);
    
    if (!supervisor) {
      return res.status(403).json({ error: 'Esta acción requiere permisos de supervisor' });
    }
    
    next();
  } catch (error) {
    console.error('Error al verificar supervisor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Rutas de autenticación
router.post('/login', solicitudLimiter, docenteController.loginDocente);
router.post('/verificar-codigo', codigoLimiter, docenteController.verificarCodigo);
router.post('/verificar-codigo-existente', docenteController.verificarCodigoExistente);

// Rutas protegidas que requieren autenticación
router.post('/create', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, // Solo los supervisores pueden crear docentes
  validarDocente, 
  docenteController.crearDocente
);

router.get('/get', 
  authService.createAuthMiddleware(), 
  docenteController.obtenerDocentes
);

router.get('/get/:id', 
  authService.createAuthMiddleware(), 
  docenteController.obtenerDocentePorId
);

router.put('/update/:id', 
  authService.createAuthMiddleware(), 
  validarDocente, 
  docenteController.actualizarDocente
);

router.delete('/delete/:id', 
  authService.createAuthMiddleware(), 
  docenteController.eliminarDocente
);

// Nueva ruta para verificar dependencias
router.get('/verificar-dependencias/:id',
  authService.createAuthMiddleware(),
  docenteController.verificarDependencias
);

// Nuevas rutas para gestionar carreras
router.post('/carreras/:id', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, // Solo supervisores pueden asignar carreras
  docenteController.gestionarCarrerasDocente
);

router.get('/carrera/:carrera',
  authService.createAuthMiddleware(),
  docenteController.obtenerDocentesPorCarrera
);

module.exports = router;