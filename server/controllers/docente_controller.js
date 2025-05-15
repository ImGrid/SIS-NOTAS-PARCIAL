const { createAuthService, AuthenticationError } = require('../secutiry/auth');
const docenteModel = require('../models/Docente_model');
const codigoVerificacionModel = require('../models/codigo_verificacion_model');
const emailService = require('../utils/email');

const authService = createAuthService();

/**
 * Primera etapa del proceso de login - Solicita un código de verificación
 */
async function loginDocente(req, res) {
  try {
    const { correo_electronico } = req.body;
    
    if (!correo_electronico) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }
    
    // Verificar si el docente existe
    const docente = await docenteModel.obtenerDocentePorCorreo(correo_electronico);

    if (!docente) {
      return res.status(401).json({ error: 'Correo electrónico no registrado' });
    }

    // Generar y enviar código de verificación
    try {
      // Crear código de verificación en la base de datos
      const codigoGenerado = await codigoVerificacionModel.crearCodigoVerificacion(correo_electronico);
      
      // Enviar código por correo
      await emailService.enviarCodigoVerificacion(correo_electronico, codigoGenerado.codigo);
      
      // Devolver respuesta exitosa
      res.json({ 
        message: 'Se ha enviado un código de verificación a su correo.',
        correo_electronico: correo_electronico,
        expiracion: 60 // Indicar que el código es válido por 60 minutos
      });
    } catch (error) {
      console.error('Error al enviar código:', error);
      res.status(500).json({ error: 'Error al enviar código de verificación. Intente nuevamente.' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Segunda etapa del proceso de login - Verifica el código y genera token
 */
async function verificarCodigo(req, res) {
  try {
    const { correo_electronico, codigo, mantener_codigo = true } = req.body;
    
    if (!correo_electronico || !codigo) {
      return res.status(400).json({ error: 'Correo y código son requeridos' });
    }
    
    // Verificar si el docente existe
    const docente = await docenteModel.obtenerDocentePorCorreo(correo_electronico);
    
    if (!docente) {
      return res.status(401).json({ error: 'Correo electrónico no registrado' });
    }
    
    // Verificar el código - pasar el parámetro mantenerCodigo
    const esValido = await codigoVerificacionModel.verificarCodigo(correo_electronico, codigo, mantener_codigo);
    
    if (!esValido) {
      return res.status(401).json({ error: 'Código inválido o expirado' });
    }
    
    // Crear objeto para el token
    const usuarioParaToken = {
      id: docente.id,
      correo: docente.correo_electronico
    };
    
    // Generar token JWT
    const token = authService.generateToken(usuarioParaToken);
    
    // Devolver respuesta exitosa con token
    res.json({
      token,
      usuario: usuarioParaToken,
      message: mantener_codigo ? 'Inicio de sesión exitoso. El código permanecerá válido durante 60 minutos.' : 'Inicio de sesión exitoso. El código ha sido eliminado.'
    });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function crearDocente(req, res) {
  try {
    const docente = await docenteModel.crearDocente(req.body);
    res.status(201).json(docente);
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function obtenerDocentes(req, res) {
  try {
    const docentes = await docenteModel.obtenerDocentes();
    res.json(docentes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerDocentePorId(req, res) {
  try {
    const docente = await docenteModel.obtenerDocentePorId(req.params.id);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    res.json(docente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarDocente(req, res) {
  try {
    const docente = await docenteModel.actualizarDocente(req.params.id, req.body);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    res.json(docente);
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina un docente con todas sus dependencias, con opciones para manejar grupos
 */
async function eliminarDocente(req, res) {
  try {
    const id = req.params.id;
    
    // 1. Verificar existencia del docente
    const docente = await docenteModel.obtenerDocentePorId(id);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    
    // 2. Verificar si tiene dependencias antes de eliminar
    const dependencias = await docenteModel.verificarDependenciasDocente(id);
    
    // 3. Verificar si se ha confirmado la eliminación con dependencias
    const confirmarEliminacion = req.query.confirmar === 'true';
    
    // 4. Obtener opciones para manejo de grupos
    const docenteNuevoId = req.query.reasignar_a ? parseInt(req.query.reasignar_a) : null;
    const borrarGrupos = req.query.borrar_grupos === 'true';
    
    // 5. Si tiene dependencias y no se ha confirmado, mostrar advertencia
    if (dependencias.tieneDependencias && !confirmarEliminacion) {
      return res.status(409).json({
        error: 'El docente tiene elementos relacionados que serán afectados',
        dependencias,
        mensaje: 'Para confirmar la eliminación, use ?confirmar=true en la URL',
        opciones: {
          reasignar: 'Para reasignar grupos a otro docente: ?confirmar=true&reasignar_a=ID',
          borrar: 'Para eliminar grupos: ?confirmar=true&borrar_grupos=true'
        }
      });
    }
    
    // 6. Proceder con la eliminación segura
    const resultado = await docenteModel.eliminarDocenteSeguro(id, docenteNuevoId, borrarGrupos);
    
    if (!resultado) {
      return res.status(404).json({ error: 'Docente no encontrado o ya eliminado' });
    }
    
    let mensajeGrupos = '';
    if (dependencias.grupos.cantidad > 0) {
      if (borrarGrupos) {
        mensajeGrupos = `Se eliminaron ${dependencias.grupos.cantidad} grupos.`;
      } else if (docenteNuevoId) {
        mensajeGrupos = `Se reasignaron ${dependencias.grupos.cantidad} grupos al docente con ID ${docenteNuevoId}.`;
      } else {
        mensajeGrupos = `${dependencias.grupos.cantidad} grupos quedaron sin docente asignado.`;
      }
    }
    
    res.json({ 
      mensaje: `Docente "${docente.nombre_completo}" eliminado correctamente. ${mensajeGrupos}`,
      docente: resultado.docente,
      dependenciasEliminadas: resultado.dependenciasEliminadas,
      accionGrupos: resultado.accionGrupos
    });
  } catch (error) {
    console.error('Error en eliminarDocente:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Verifica las dependencias de un docente sin realizar cambios
 */
async function verificarDependencias(req, res) {
  try {
    const id = req.params.id;
    
    // Verificar que exista el docente
    const docente = await docenteModel.obtenerDocentePorId(id);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    
    // Obtener dependencias
    const dependencias = await docenteModel.verificarDependenciasDocente(id);
    
    // Obtener lista de docentes disponibles para reasignación
    const docentes = await docenteModel.obtenerDocentes();
    const docentesDisponibles = docentes
      .filter(d => d.id !== parseInt(id)) // Excluir el docente actual
      .map(d => ({
        id: d.id,
        nombre_completo: d.nombre_completo,
        correo_electronico: d.correo_electronico
      }));
    
    res.json({
      docente,
      dependencias,
      tieneDependencias: dependencias.tieneDependencias,
      docentesDisponibles: docentesDisponibles
    });
  } catch (error) {
    console.error('Error al verificar dependencias:', error);
    res.status(500).json({ error: error.message });
  }
}

async function verificarCodigoExistente(req, res) {
  try {
    const { correo_electronico } = req.body;
    
    if (!correo_electronico) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }
    
    // Verificar si el docente existe
    const docente = await docenteModel.obtenerDocentePorCorreo(correo_electronico);

    if (!docente) {
      return res.status(401).json({ error: 'Correo electrónico no registrado' });
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
      // No hay código vigente, procedemos como antes
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

module.exports = {
  crearDocente,
  obtenerDocentes,
  obtenerDocentePorId,
  actualizarDocente,
  eliminarDocente,
  loginDocente,
  verificarCodigo,
  verificarCodigoExistente,
  // Nueva función:
  verificarDependencias
};