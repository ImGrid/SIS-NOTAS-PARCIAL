const express = require('express');
const router = express.Router();
const gruposController = require('../controllers/grupos_controller');
const pool = require('../database/db');
const { createAuthService } = require('../secutiry/auth');

const authService = createAuthService();

const validarGrupo = (req, res, next) => {
  const { nombre_proyecto, carrera, semestre, docente_id, materia } = req.body;
  if (!nombre_proyecto || !carrera || !semestre || !docente_id || !materia) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  next();
};

router.post('/create', authService.createAuthMiddleware(),
  validarGrupo, 
  gruposController.crearGrupo);

router.get('/get', authService.createAuthMiddleware(),
  gruposController.obtenerGrupos);

router.get('/get/:id', authService.createAuthMiddleware(),
  gruposController.obtenerGrupoPorId);

router.put('/update/:id', authService.createAuthMiddleware(),
  validarGrupo, gruposController.actualizarGrupo);

router.delete('/delete/:id', authService.createAuthMiddleware(),
  gruposController.eliminarGrupo);

router.get('/docente/:docenteId', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorDocenteId);

router.get('/carrera/:carrera', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorCarrera);

router.get('/semestre/:semestre', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorSemestre);

router.get('/materia/:materia', authService.createAuthMiddleware(),
  gruposController.obtenerGruposPorMateria);
router.get('/habilitacion/:grupoId', authService.createAuthMiddleware(),
  async (req, res) => {
    try {
      const { grupoId } = req.params;
      const docenteId = req.user.id;
      
      // Verificar primero si el grupo pertenece al docente
      const grupo = await gruposModel.obtenerGrupoPorId(grupoId);
      
      // No bloqueamos acceso a grupos de otros docentes para permitir colaboración
      // pero mantenemos un registro del acceso para auditoría
      if (grupo && grupo.docente_id !== docenteId) {
        console.log(`Docente ${docenteId} accediendo a grupo ${grupoId} de otro docente`);
      }
      
      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }
      
      // Importar y usar el modelo de supervisor solo para verificar habilitación
      const supervisorModel = require('../models/supervisor_model');
      const habilitacion = await supervisorModel.verificarHabilitacionActiva(grupoId);
      
      res.json({
        habilitacion_activa: !!habilitacion,
        grupo_id: parseInt(grupoId),
        estado: 'finalizado' // Estado por defecto para grupos con evaluaciones finalizadas
      });
    } catch (error) {
      console.error('Error al verificar habilitación:', error);
      res.status(500).json({ 
        error: 'Error al verificar estado de habilitación',
        habilitacion_activa: false
      });
    }
  }
);
module.exports = router;