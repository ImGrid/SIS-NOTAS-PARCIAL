const supervisorModel = require('../models/supervisor_model');
const { createAuthService, AuthenticationError } = require('../secutiry/auth');
const codigoVerificacionModel = require('../models/codigo_verificacion_model');
const emailService = require('../utils/email');
require('dotenv').config();
const grupoModel = require('../models/grupos_model');
const authService = createAuthService();

async function loginSupervisor(req, res) {
  try {
    const { correo_electronico } = req.body;
    
    if (!correo_electronico) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }
    
    // Verificar si es un supervisor
    const supervisor = await supervisorModel.obtenerSupervisorPorCorreo(correo_electronico);

    if (!supervisor) {
      return res.status(401).json({ error: 'Correo electrónico no registrado como supervisor' });
    }

    // Generar y enviar código de verificación
    try {
      // Crear código de verificación
      const codigoGenerado = await codigoVerificacionModel.crearCodigoVerificacion(correo_electronico);
      
      // Enviar código por correo
      await emailService.enviarCodigoVerificacion(correo_electronico, codigoGenerado.codigo);
      
      // Devolver respuesta exitosa
      res.json({ 
        message: 'Se ha enviado un código de verificación a su correo.',
        correo_electronico: correo_electronico,
        expiracion: 60 // 60 minutos
      });
    } catch (error) {
      console.error('Error al enviar código:', error);
      res.status(500).json({ error: 'Error al enviar código de verificación. Intente nuevamente.' });
    }
  } catch (error) {
    console.error('Error en login de supervisor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Segunda etapa - Verifica el código y solicita clave secreta
 */
async function verificarCodigoSupervisor(req, res) {
  try {
    const { correo_electronico, codigo, mantener_codigo = true } = req.body;
    
    if (!correo_electronico || !codigo) {
      return res.status(400).json({ error: 'Correo y código son requeridos' });
    }
    const supervisor = await supervisorModel.obtenerSupervisorPorCorreo(correo_electronico);
    
    if (!supervisor) {
      return res.status(401).json({ error: 'Correo electrónico no registrado como supervisor' });
    }

    const esValido = await codigoVerificacionModel.verificarCodigo(correo_electronico, codigo, mantener_codigo);
    
    if (!esValido) {
      return res.status(401).json({ error: 'Código inválido o expirado' });
    }
    
    res.json({
      message: 'Código verificado correctamente. Ahora debe ingresar la clave secreta del sistema.',
      verificado: true,
      correo_electronico: correo_electronico
    });
  } catch (error) {
    console.error('Error al verificar código de supervisor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
/**
 * Tercera etapa - Verifica la clave secreta y genera token
 */
async function autenticarSupervisor(req, res) {
  try {
    const { correo_electronico, codigo, clave_secreta } = req.body;
    
    if (!correo_electronico || !codigo || !clave_secreta) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    // Verificar código nuevamente (podría omitirse si se implementa sesión)
    const esCodigoValido = await codigoVerificacionModel.verificarCodigo(correo_electronico, codigo);
    
    if (!esCodigoValido) {
      return res.status(401).json({ error: 'Código inválido o expirado' });
    }
    
    // Autenticar con la clave secreta
    const resultado = await supervisorModel.autenticarSupervisor(correo_electronico, clave_secreta);
    
    if (!resultado.success) {
      return res.status(401).json({ error: resultado.message });
    }
    
    // Limpiar código de verificación después de autenticación exitosa
    await codigoVerificacionModel.eliminarCodigosAnteriores(correo_electronico);
    
    // Crear objeto para el token
    const usuarioParaToken = {
      id: resultado.supervisor.id,
      correo: resultado.supervisor.correo
    };
    
    // Generar token JWT
    const token = authService.generateToken(usuarioParaToken);
    
    // Devolver respuesta exitosa con token
    res.json({
      token,
      usuario: resultado.supervisor,
      message: 'Inicio de sesión exitoso como supervisor'
    });
  } catch (error) {
    console.error('Error al autenticar supervisor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function crearSupervisor(req, res) {
  try {
    const supervisor = await supervisorModel.crearSupervisor(req.body);
    res.status(201).json(supervisor);
  } catch (error) {
    if (error.code === '23505') { // Código de error PostgreSQL para violación de restricción UNIQUE
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function obtenerSupervisores(req, res) {
  try {
    const supervisores = await supervisorModel.obtenerSupervisores();
    res.json(supervisores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerSupervisorPorId(req, res) {
  try {
    const supervisor = await supervisorModel.obtenerSupervisorPorId(req.params.id);
    if (!supervisor) {
      return res.status(404).json({ error: 'Supervisor no encontrado' });
    }
    res.json(supervisor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarSupervisor(req, res) {
  try {
    const supervisor = await supervisorModel.actualizarSupervisor(req.params.id, req.body);
    if (!supervisor) {
      return res.status(404).json({ error: 'Supervisor no encontrado' });
    }
    res.json(supervisor);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function eliminarSupervisor(req, res) {
  try {
    const supervisor = await supervisorModel.eliminarSupervisor(req.params.id);
    if (!supervisor) {
      return res.status(404).json({ error: 'Supervisor no encontrado' });
    }
    res.json({ message: 'Supervisor eliminado', supervisor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Verificar si un correo corresponde a un supervisor
async function verificarCorreoSupervisor(req, res) {
  try {
    const { correo } = req.params;
    const esSupervisor = await supervisorModel.verificarCorreoSupervisor(correo);
    res.json({ esSupervisor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Verifica si el supervisor tiene un código de verificación vigente
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
async function verificarCodigoExistente(req, res) {
  try {
    const { correo_electronico } = req.body;
    
    if (!correo_electronico) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }
    
    // Verificar si existe el supervisor
    const supervisor = await supervisorModel.obtenerSupervisorPorCorreo(correo_electronico);

    if (!supervisor) {
      return res.status(401).json({ error: 'Correo electrónico no registrado como supervisor' });
    }

    // Verificar si existe un código vigente
    const codigoExistente = await codigoVerificacionModel.verificarCodigoExistente(correo_electronico);
    
    if (codigoExistente) {
      // Calcular tiempo restante en minutos
      const fechaExpiracion = new Date(codigoExistente.expiracion);
      const ahora = new Date();
      const minutosRestantes = Math.floor((fechaExpiracion - ahora) / 60000);
      
      // Hay un código vigente
      return res.json({
        message: 'Ya tiene un código de verificación activo. Revise su correo o solicite uno nuevo.',
        correo_electronico,
        codigo_existente: true,
        expiracion: minutosRestantes
      });
    } else {
      // No hay código vigente
      return res.json({
        message: 'No hay código activo. Debe solicitar uno nuevo.',
        correo_electronico,
        codigo_existente: false
      });
    }
  } catch (error) {
    console.error('Error al verificar código existente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * NUEVAS FUNCIONES PARA GESTIÓN DE RÚBRICAS
 */

/**
 * Obtiene todas las rúbricas del sistema
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
async function obtenerTodasRubricas(req, res) {
  try {
    const rubricas = await supervisorModel.obtenerTodasRubricas();
    
    // Procesar y agrupar los resultados por grupo
    const gruposMap = new Map();
    
    rubricas.forEach(fila => {
      if (!fila.grupo_id) return; // Ignorar rúbricas sin grupo asociado
      
      // Si el grupo no está en el mapa, inicializarlo
      if (!gruposMap.has(fila.grupo_id)) {
        gruposMap.set(fila.grupo_id, {
          id: fila.grupo_id,
          nombre_proyecto: fila.nombre_proyecto,
          carrera: fila.carrera,
          semestre: fila.semestre,
          materia: fila.materia,
          total_estudiantes: parseInt(fila.total_estudiantes) || 0,
          total_informes: parseInt(fila.total_informes) || 0,
          estado: 'pendiente', // Valor por defecto
          rubricas: []
        });
      }
      
      const grupo = gruposMap.get(fila.grupo_id);
      
      // Si esta fila tiene informe y rubrica, añadirla al grupo
      if (fila.informe_id && fila.id) {
        // Verificar si ya existe esta rúbrica en el grupo para evitar duplicados
        const rubricaExistente = grupo.rubricas.find(r => r.id === fila.id);
        
        if (!rubricaExistente) {
          grupo.rubricas.push({
            id: fila.id,
            presentacion: fila.presentacion,
            sustentacion: fila.sustentacion,
            documentacion: fila.documentacion,
            innovacion: fila.innovacion,
            nota_final: fila.nota_final,
            observaciones: fila.observaciones,
            comentarios: fila.comentarios,
            docente_id: fila.docente_id,
            docente_nombre: `${fila.docente_nombre || ''} ${fila.docente_apellido || ''}`.trim(),
            docente_correo: fila.docente_correo,
            fecha_creacion: fila.created_at,
            fecha_actualizacion: fila.updated_at
          });
        }
      }
      
      // Determinar el estado del grupo
      if (grupo.total_informes === 0) {
        grupo.estado = 'sin_rubrica';
        grupo.texto_estado = 'Sin Rúbrica';
      } else if (grupo.total_informes < grupo.total_estudiantes) {
        grupo.estado = 'pendiente';
        grupo.texto_estado = 'Pendiente';
      } else {
        grupo.estado = 'finalizado';
        grupo.texto_estado = 'Finalizado';
      }
    });
    
    // Convertir el mapa a un array
    const grupos = Array.from(gruposMap.values());
    
    res.json({
      total: grupos.length,
      grupos
    });
  } catch (error) {
    console.error('Error al obtener rúbricas:', error);
    res.status(500).json({ error: 'Error interno al obtener rúbricas' });
  }
}

/**
 * Obtiene las rúbricas de un grupo específico
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
async function obtenerRubricasGrupo(req, res) {
  try {
    const { grupoId } = req.params;
    
    if (!grupoId) {
      return res.status(400).json({ error: 'ID de grupo es requerido' });
    }
    
    // Primero verificar si el grupo existe usando el modelo
    const grupoModel = require('../models/grupos_model'); // Asegúrate de importar el modelo al inicio del archivo
    const grupo = await grupoModel.obtenerGrupoPorId(grupoId);
    
    if (!grupo) {
      return res.status(404).json({ 
        error: 'Grupo no encontrado',
        grupo: null,
        estudiantes: [],
        total_estudiantes: 0
      });
    }
    
    // Obtener información de contadores (con manejo de errores)
    let contadores = { total_estudiantes: 0, total_informes: 0 };
    try {
      contadores = await supervisorModel.contarEstudiantesEInformes(grupoId);
    } catch (error) {
      console.error('Error al obtener contadores:', error);
      // Continuar con valores por defecto
    }
    
    // Determinar el estado del grupo
    let estado = 'sin_rubrica';
    let textoEstado = 'Sin Rúbrica';
    
    if (contadores.total_informes > 0) {
      if (contadores.total_informes < contadores.total_estudiantes) {
        estado = 'pendiente';
        textoEstado = 'Pendiente';
      } else {
        estado = 'finalizado';
        textoEstado = 'Finalizado';
      }
    }
    
    // Verificar si tiene una habilitación activa (con manejo de errores)
    let habilitacionActiva = null;
    try {
      habilitacionActiva = await supervisorModel.verificarHabilitacionActiva(grupoId);
    } catch (error) {
      console.error('Error al verificar habilitación:', error);
      // Continuar con valor por defecto
    }
    
    // Obtener las rúbricas del grupo (con manejo de errores)
    let rubricas = [];
    try {
      rubricas = await supervisorModel.obtenerRubricasPorGrupo(grupoId);
    } catch (error) {
      console.error('Error al obtener rúbricas:', error);
      // Continuar con array vacío
    }
    
    // Procesar datos y organizar por estudiante
    const estudiantes = [];
    const informacionGrupo = rubricas.length > 0 ? {
      nombre_proyecto: rubricas[0].nombre_proyecto || grupo.nombre_proyecto,
      carrera: rubricas[0].carrera || grupo.carrera,
      semestre: rubricas[0].semestre || grupo.semestre,
      materia: rubricas[0].materia || grupo.materia,
      docente_nombre: rubricas[0].docente_nombre ? 
        `${rubricas[0].docente_nombre || ''} ${rubricas[0].docente_apellido || ''}`.trim() : '',
      docente_id: rubricas[0].docente_id || grupo.docente_id
    } : {
      nombre_proyecto: grupo.nombre_proyecto,
      carrera: grupo.carrera,
      semestre: grupo.semestre,
      materia: grupo.materia,
      docente_id: grupo.docente_id,
      docente_nombre: ''
    };
    
    // Agrupar por estudiante
    rubricas.forEach(rubrica => {
      // Verificar si ya existe este estudiante
      if (!rubrica.estudiante_id) return; // Ignorar entradas sin estudiante
      
      const estudianteExistente = estudiantes.find(e => e.id === rubrica.estudiante_id);
      
      if (!estudianteExistente) {
        estudiantes.push({
          id: rubrica.estudiante_id,
          nombre: `${rubrica.estudiante_nombre || ''} ${rubrica.estudiante_apellido || ''}`.trim(),
          codigo: rubrica.estudiante_codigo,
          informe_id: rubrica.informe_id,
          rubrica_id: rubrica.id,
          calificaciones: {
            presentacion: rubrica.presentacion,
            sustentacion: rubrica.sustentacion,
            documentacion: rubrica.documentacion,
            innovacion: rubrica.innovacion,
            nota_final: rubrica.nota_final
          },
          resultado: rubrica.informe_resultado,
          comentarios: rubrica.comentarios
        });
      }
    });
    
    res.json({
      grupo: {
        id: parseInt(grupoId),
        ...informacionGrupo,
        total_estudiantes: parseInt(contadores.total_estudiantes) || 0,
        total_informes: parseInt(contadores.total_informes) || 0,
        estado,
        texto_estado: textoEstado,
        habilitacion_activa: !!habilitacionActiva,
        detalle_habilitacion: habilitacionActiva
      },
      estudiantes,
      total_estudiantes: estudiantes.length
    });
    
  } catch (error) {
    console.error('Error general en obtenerRubricasGrupo:', error);
    res.status(500).json({ 
      error: 'Error interno al obtener rúbricas del grupo',
      mensaje: error.message,
      grupo: null,
      estudiantes: [],
      total_estudiantes: 0
    });
  }
}

/**
 * Habilita la edición de las rúbricas de un grupo
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
async function habilitarRubricasGrupo(req, res) {
  try {
    const { grupoId } = req.params;
    const { motivo } = req.body;
    const supervisorId = req.user.id;
    
    if (!grupoId) {
      return res.status(400).json({ error: 'ID de grupo es requerido' });
    }
    
    if (!motivo || motivo.trim() === '') {
      return res.status(400).json({ error: 'El motivo de habilitación es requerido' });
    }
    
    // Verificar si ya existe una habilitación activa
    const habilitacionExistente = await supervisorModel.verificarHabilitacionActiva(grupoId);
    
    if (habilitacionExistente) {
      return res.status(400).json({ 
        error: 'Este grupo ya tiene una habilitación activa',
        habilitacion: habilitacionExistente
      });
    }
    
    // Verificar contadores
    const contadores = await supervisorModel.contarEstudiantesEInformes(grupoId);
    
    // Solo se puede habilitar grupos que tengan informes y que estén "finalizados"
    if (contadores.total_informes === 0) {
      return res.status(400).json({ 
        error: 'No se puede habilitar un grupo sin informes' 
      });
    }
    
    if (contadores.total_informes < contadores.total_estudiantes) {
      return res.status(400).json({ 
        error: 'Este grupo aún no está finalizado, está en estado pendiente' 
      });
    }
    
    // Realizar la habilitación
    const resultado = await supervisorModel.habilitarRubricaGrupo(grupoId, supervisorId, motivo);
    
    res.json({
      message: 'Habilitación realizada con éxito',
      resultado
    });
  } catch (error) {
    console.error('Error al habilitar rúbricas:', error);
    res.status(500).json({ error: error.message || 'Error al habilitar rúbricas' });
  }
}

/**
 * Obtiene el historial de habilitaciones para un grupo
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
async function obtenerHistorialHabilitacionesGrupo(req, res) {
  try {
    const { grupoId } = req.params;
    
    if (!grupoId) {
      return res.status(400).json({ error: 'ID de grupo es requerido' });
    }
    
    const historial = await supervisorModel.obtenerHistorialHabilitaciones(grupoId);
    
    res.json({
      total: historial.length,
      historial
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial de habilitaciones' });
  }
}

/**
 * Desactiva una habilitación específica
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
async function desactivarHabilitacion(req, res) {
  try {
    const { habilitacionId } = req.params;
    
    if (!habilitacionId) {
      return res.status(400).json({ error: 'ID de habilitación es requerido' });
    }
    
    console.log(`[PRODUCCION] Intentando desactivar habilitación: ${habilitacionId}`);
    
    // Primero verificar si la habilitación existe y está activa
    const verificacion = await pool.query(
      'SELECT * FROM habilitaciones_rubricas WHERE id = $1',
      [habilitacionId]
    );
    
    if (verificacion.rows.length === 0) {
      console.log(`[PRODUCCION] Habilitación no encontrada: ${habilitacionId}`);
      return res.status(404).json({ error: 'Habilitación no encontrada' });
    }
    
    const habilitacion = verificacion.rows[0];
    
    if (!habilitacion.activa) {
      console.log(`[PRODUCCION] Habilitación ${habilitacionId} ya está desactivada`);
      return res.status(400).json({ error: 'Esta habilitación ya está desactivada' });
    }
    
    // Ahora intentar la desactivación
    const resultado = await supervisorModel.desactivarHabilitacion(habilitacionId);
    
    if (!resultado) {
      console.log(`[PRODUCCION] Fallo al desactivar, resultado nulo`);
      return res.status(500).json({ error: 'Error al procesar la desactivación' });
    }
    
    console.log(`[PRODUCCION] Habilitación desactivada exitosamente: ${habilitacionId}`);
    
    res.json({
      message: 'Habilitación desactivada con éxito',
      habilitacion: resultado
    });
  } catch (error) {
    console.error('[PRODUCCION] Error completo al desactivar:', {
      mensaje: error.message,
      codigo: error.code,
      stack: error.stack,
      params: req.params
    });
    res.status(500).json({ 
      error: 'Error al desactivar habilitación',
      detalle: error.message
    });
  }
}

module.exports = {
    crearSupervisor,
    obtenerSupervisores,
    obtenerSupervisorPorId,
    actualizarSupervisor,
    eliminarSupervisor,
    verificarCorreoSupervisor,
    loginSupervisor,
    verificarCodigoSupervisor,
    autenticarSupervisor,
    verificarCodigoExistente,
    obtenerTodasRubricas,
    obtenerRubricasGrupo,
    obtenerHistorialHabilitacionesGrupo,
    habilitarRubricasGrupo,
    desactivarHabilitacion
  };