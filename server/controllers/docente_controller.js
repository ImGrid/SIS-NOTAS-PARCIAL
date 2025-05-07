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

async function eliminarDocente(req, res) {
  try {
    const docente = await docenteModel.eliminarDocente(req.params.id);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    res.json({ message: 'Docente eliminado', docente });
  } catch (error) {
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
  verificarCodigoExistente
};