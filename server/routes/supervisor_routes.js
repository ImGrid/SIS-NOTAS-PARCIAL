const express = require('express');
const router = express.Router();
const supervisorController = require('../controllers/supervisor_controller');
const { createAuthService } = require('../secutiry/auth');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authService = createAuthService();

const codigoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: 'Demasiados intentos fallidos. Por favor intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const solicitudLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: 'Demasiadas solicitudes de código. Por favor intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para verificar si el usuario es un supervisor
const verificarSupervisor = async (req, res, next) => {
  try {
    // Obtener ID del usuario autenticado
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Importar y usar el modelo en lugar del controlador
    const supervisorModel = require('../models/supervisor_model');
    const supervisor = await supervisorModel.obtenerSupervisorPorId(userId);
    
    if (!supervisor) {
      return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de supervisor' });
    }
    
    next();
  } catch (error) {
    console.error('Error al verificar supervisor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Rutas de autenticación
router.post('/login', solicitudLimiter, supervisorController.loginSupervisor);
router.post('/verificar-codigo', codigoLimiter, supervisorController.verificarCodigoSupervisor);
router.post('/autenticar', codigoLimiter, supervisorController.autenticarSupervisor);
router.post('/verificar-codigo-existente', supervisorController.verificarCodigoExistente);
router.get('/verificar-correo/:correo', supervisorController.verificarCorreoSupervisor);

// Rutas para gestión de supervisores (requieren autenticación y permisos de supervisor)
router.post('/create', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.crearSupervisor
);

router.get('/get', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.obtenerSupervisores
);

router.get('/get/:id', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.obtenerSupervisorPorId
);

router.put('/update/:id', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.actualizarSupervisor
);

router.delete('/delete/:id', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.eliminarSupervisor
);

// NUEVAS RUTAS PARA GESTIÓN DE RÚBRICAS
router.get('/rubricas', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.obtenerTodasRubricas
);

router.get('/rubricas/grupo/:grupoId', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.obtenerRubricasGrupo
);

router.post('/rubricas/habilitar/:grupoId', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.habilitarRubricasGrupo
);

router.get('/rubricas/historial/:grupoId', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.obtenerHistorialHabilitacionesGrupo
);

router.put('/rubricas/desactivar/:habilitacionId', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.desactivarHabilitacion
);

module.exports = router;