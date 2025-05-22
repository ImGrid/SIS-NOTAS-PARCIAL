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

const verificarSupervisor = async (req, res, next) => {
  try {
    // Obtener ID del usuario autenticado
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Importar y usar el modelo en lugar del controlador
    const supervisorModel = require('../models/supervisor_model');
    
    // Agregar log para depurar
    console.log('Verificando supervisor con ID:', userId);
    
    const supervisor = await supervisorModel.obtenerSupervisorPorId(userId);
    
    // Agregar log para ver el resultado de la consulta
    console.log('Resultado de la consulta:', supervisor);
    
    if (!supervisor) {
      return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de supervisor' });
    }
    
    // Agregar los datos del supervisor al request para uso posterior
    req.supervisor = supervisor;
    
    next();
  } catch (error) {
    console.error('Error al verificar supervisor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para validar datos de supervisor
const validarSupervisor = (req, res, next) => {
  const { nombre_completo, correo_electronico, cargo } = req.body;
  if (!nombre_completo || !correo_electronico || !cargo) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  next();
};

// Rutas de autenticación (públicas)
router.post('/login', solicitudLimiter, supervisorController.loginSupervisor);
router.post('/verificar-codigo', codigoLimiter, supervisorController.verificarCodigoSupervisor);
router.post('/autenticar', codigoLimiter, supervisorController.autenticarSupervisor);
router.post('/verificar-codigo-existente', supervisorController.verificarCodigoExistente);
router.get('/verificar-correo/:correo', supervisorController.verificarCorreoSupervisor);

// Rutas para gestión de supervisores (requieren autenticación y permisos de supervisor)
router.post('/create', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  validarSupervisor,
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
  validarSupervisor,
  supervisorController.actualizarSupervisor
);

router.delete('/delete/:id', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.eliminarSupervisor
);

// Rutas para gestión de carreras de supervisor
router.post('/carreras/:id',
  authService.createAuthMiddleware(),
  verificarSupervisor,
  supervisorController.gestionarCarrerasSupervisor
);

router.get('/carrera/:carrera',
  authService.createAuthMiddleware(),
  verificarSupervisor,
  supervisorController.obtenerSupervisoresPorCarrera
);

// RUTAS PARA GESTIÓN DE RÚBRICAS
router.get('/rubricas', 
  authService.createAuthMiddleware(), 
  verificarSupervisor, 
  supervisorController.obtenerTodasRubricas
);

router.get('/rubricas/grupo/:grupoId', 
  authService.createAuthMiddleware(), 
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
  supervisorController.desactivarHabilitacion
);

module.exports = router;