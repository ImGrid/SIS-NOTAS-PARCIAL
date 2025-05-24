const express = require('express');
const router = express.Router();
const estudiantesController = require('../controllers/estudiantes_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarEstudiante = async (req, res, next) => {
  const { nombre, apellido, codigo, carrera, semestre, unidad_educativa, paralelo } = req.body;
  
  // Validar campos básicos obligatorios
  if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
    return res.status(400).json({ 
      error: 'Todos los campos básicos son obligatorios: nombre, apellido, código, carrera, semestre, unidad_educativa' 
    });
  }
  
  // Validación específica para Ciencias Básicas
  if (carrera === 'Ciencias Básicas') {
    if (!paralelo || !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Para Ciencias Básicas el paralelo es obligatorio y debe ser A, B, C, D, E, F o G' 
      });
    }
    
    // Validar semestre para Ciencias Básicas (solo 1 y 2)
    const semestreNum = parseInt(semestre);
    if (semestreNum !== 1 && semestreNum !== 2) {
      return res.status(400).json({ 
        error: 'Ciencias Básicas solo puede tener semestres 1 o 2' 
      });
    }
  } else {
    // Para otras carreras, el paralelo debe ser 'A' (se asigna automáticamente si no viene)
    if (paralelo && paralelo !== 'A') {
      return res.status(400).json({ 
        error: 'Las carreras regulares solo pueden usar el paralelo A' 
      });
    }
    
    // Validar semestre para otras carreras (3 a 10)
    const semestreNum = parseInt(semestre);
    if (semestreNum < 3 || semestreNum > 10) {
      return res.status(400).json({ 
        error: 'Las carreras regulares deben tener semestres entre 3 y 10' 
      });
    }
    
    // Asegurar paralelo 'A' para carreras regulares
    req.body.paralelo = 'A';
  }
  
  next();
};

/**
 * Middleware de validación para parámetros de consulta con paralelo
 */
const validarParametrosParalelo = (req, res, next) => {
  const { carrera, paralelo } = req.params;
  
  if (carrera === 'Ciencias Básicas') {
    if (!paralelo || !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Para Ciencias Básicas el paralelo debe ser A, B, C, D, E, F o G' 
      });
    }
  } else if (paralelo && paralelo !== 'A') {
    return res.status(400).json({ 
      error: 'Las carreras regulares solo pueden usar el paralelo A' 
    });
  }
  
  next();
};

// ===== RUTAS BÁSICAS CRUD =====

router.post('/create', 
  authService.createAuthMiddleware(),
  validarEstudiante, 
  estudiantesController.crearEstudiante
);

router.get('/get', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantes
);

router.get('/get/:id', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantePorId
);

router.put('/update/:id', 
  authService.createAuthMiddleware(),
  validarEstudiante, 
  estudiantesController.actualizarEstudiante
);

router.delete('/delete/:id', 
  authService.createAuthMiddleware(),
  estudiantesController.eliminarEstudiante
);

// ===== RUTAS DE CONSULTA EXISTENTES =====

router.get('/grupo/:grupoId', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorGrupoId
);

router.get('/carrera/:carrera', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorCarrera
);

router.get('/semestre/:semestre', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorSemestre
);

router.get('/semestre-carrera/:semestre/:carrera', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorSemestreYCarrera
);

router.get('/materia/:materia', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesPorMateria
);

router.get('/con-estado-grupo', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerEstudiantesConEstadoGrupo
);

// ===== NUEVAS RUTAS PARA PARALELOS =====

/**
 * Obtener estudiantes por carrera y paralelo
 * Útil para filtrar estudiantes de Ciencias Básicas por paralelo específico
 */
router.get('/carrera-paralelo/:carrera/:paralelo', 
  authService.createAuthMiddleware(),
  validarParametrosParalelo,
  estudiantesController.obtenerEstudiantesPorCarreraYParalelo
);

/**
 * Obtener estudiantes por semestre, carrera y paralelo
 * Filtrado más específico para Ciencias Básicas
 */
router.get('/semestre-carrera-paralelo/:semestre/:carrera/:paralelo', 
  authService.createAuthMiddleware(),
  validarParametrosParalelo,
  estudiantesController.obtenerEstudiantesPorSemestreCarreraYParalelo
);

/**
 * Obtener paralelos disponibles para una carrera específica
 * Útil para generar filtros dinámicos en el frontend
 */
router.get('/paralelos-disponibles/:carrera', 
  authService.createAuthMiddleware(),
  estudiantesController.obtenerParalelosDisponibles
);

// ===== RUTAS DE VALIDACIÓN Y VERIFICACIÓN =====

/**
 * Verificar si un código está disponible en un semestre y paralelo específico
 * Query params: codigo, semestre, paralelo, exclude_id (opcional)
 */
router.get('/verificar-codigo-disponible', 
  authService.createAuthMiddleware(),
  estudiantesController.verificarCodigoDisponible
);

/**
 * Verificar dependencias de un estudiante
 */
router.get('/verificar-dependencias/:id', 
  authService.createAuthMiddleware(),
  estudiantesController.verificarDependencias
);

// ===== RUTAS DE ASIGNACIÓN A GRUPOS =====

router.post('/asignar-grupo', 
  authService.createAuthMiddleware(),
  estudiantesController.asignarEstudianteAGrupo
);

router.post('/desasignar-grupo', 
  authService.createAuthMiddleware(),
  estudiantesController.desasignarEstudianteDeGrupo
);

router.get('/verificar-materia/:estudianteId/:materia', 
  authService.createAuthMiddleware(),
  estudiantesController.verificarMateria
);

module.exports = router;