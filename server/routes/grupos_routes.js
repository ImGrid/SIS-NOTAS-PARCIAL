const express = require('express');
const router = express.Router();
const gruposController = require('../controllers/grupos_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarGrupo = (req, res, next) => {
  const { nombre_proyecto, carrera, semestre, docente_id, materia, paralelo } = req.body;
  
  // Validar campos básicos obligatorios
  if (!nombre_proyecto || !carrera || !semestre || !docente_id || !materia) {
    return res.status(400).json({ 
      error: 'Todos los campos básicos son obligatorios: nombre_proyecto, carrera, semestre, docente_id, materia' 
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
  
  if (carrera && paralelo) {
    if (carrera === 'Ciencias Básicas') {
      if (!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
        return res.status(400).json({ 
          error: 'Para Ciencias Básicas el paralelo debe ser A, B, C, D, E, F o G' 
        });
      }
    } else if (paralelo !== 'A') {
      return res.status(400).json({ 
        error: 'Las carreras regulares solo pueden usar el paralelo A' 
      });
    }
  }
  
  next();
};

/**
 * Middleware de validación para paralelo solo
 */
const validarParalelo = (req, res, next) => {
  const { paralelo } = req.params;
  
  if (paralelo && !['A', 'B', 'C', 'D', 'E', 'F','G'].includes(paralelo.toUpperCase())) {
    return res.status(400).json({ 
      error: 'El paralelo debe ser A, B, C, D, E, F o G' 
    });
  }
  
  next();
};

// ===== RUTAS BÁSICAS CRUD =====

router.post('/create', 
  authService.createAuthMiddleware(),
  validarGrupo, 
  gruposController.crearGrupo
);

router.get('/get', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGrupos
);

router.get('/get/:id', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGrupoPorId
);

router.put('/update/:id', 
  authService.createAuthMiddleware(),
  validarGrupo, 
  gruposController.actualizarGrupo
);

router.delete('/delete/:id', 
  authService.createAuthMiddleware(),
  gruposController.eliminarGrupo
);

// ===== RUTAS DE CONSULTA EXISTENTES =====

router.get('/docente/:docenteId', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorDocenteId
);

router.get('/carrera/:carrera', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorCarrera
);

router.get('/semestre/:semestre', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorSemestre
);

router.get('/materia/:materia', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorMateria
);

// ===== NUEVAS RUTAS PARA PARALELOS =====

/**
 * Obtener grupos por carrera y paralelo
 * Útil para filtrar grupos de Ciencias Básicas por paralelo específico
 */
router.get('/carrera-paralelo/:carrera/:paralelo', 
  authService.createAuthMiddleware(),
  validarParametrosParalelo,
  gruposController.obtenerGruposPorCarreraYParalelo
);

/**
 * Obtener grupos por semestre, carrera y paralelo
 * Filtrado más específico para Ciencias Básicas
 */
router.get('/semestre-carrera-paralelo/:semestre/:carrera/:paralelo', 
  authService.createAuthMiddleware(),
  validarParametrosParalelo,
  gruposController.obtenerGruposPorSemestreCarreraYParalelo
);

/**
 * Obtener grupos por semestre y paralelo
 * Ver todos los grupos de un paralelo específico across carreras
 */
router.get('/semestre-paralelo/:semestre/:paralelo', 
  authService.createAuthMiddleware(),
  validarParalelo,
  gruposController.obtenerGruposPorSemestreYParalelo
);

/**
 * Obtener paralelos disponibles para una carrera específica
 * Útil para generar filtros dinámicos en el frontend
 */
router.get('/paralelos-disponibles/:carrera', 
  authService.createAuthMiddleware(),
  gruposController.obtenerParalelosDisponibles
);

// ===== RUTAS DE CONSULTA AVANZADA =====

/**
 * Obtener grupos con información de estudiantes asignados
 * Query params: carrera, semestre, paralelo, limit, offset
 */
router.get('/con-estudiantes', 
  authService.createAuthMiddleware(),
  gruposController.obtenerGruposConEstudiantes
);

/**
 * Obtener estadísticas de grupos por paralelo
 * Solo para Ciencias Básicas
 */
router.get('/estadisticas-paralelo/:carrera', 
  authService.createAuthMiddleware(),
  gruposController.obtenerEstadisticasPorParalelo
);

// ===== RUTAS DE VALIDACIÓN Y VERIFICACIÓN =====

/**
 * Verificar si un estudiante es compatible con un grupo
 * Valida carrera, semestre y paralelo
 */
router.get('/verificar-compatibilidad/:estudianteId/:grupoId', 
  authService.createAuthMiddleware(),
  gruposController.verificarCompatibilidadEstudianteGrupo
);

module.exports = router;