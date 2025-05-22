const { createAuthService, AuthenticationError } = require('../secutiry/auth');
const docenteModel = require('../models/Docente_model');
const docenteCarreraModel = require('../models/docente_carrera_model');
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
    
    // Obtener las carreras del docente
    const carreras = await docenteCarreraModel.obtenerCarrerasDeDocente(docente.id);
    
    // Crear objeto para el token
    const usuarioParaToken = {
      id: docente.id,
      correo: docente.correo_electronico,
      carreras: carreras
    };
    
    // Generar token JWT
    const token = authService.generateToken(usuarioParaToken);
    
    // Devolver respuesta exitosa con token
    res.json({
      token,
      usuario: {
        ...usuarioParaToken,
        nombre_completo: docente.nombre_completo,
        cargo: docente.cargo
      },
      message: mantener_codigo ? 'Inicio de sesión exitoso. El código permanecerá válido durante 60 minutos.' : 'Inicio de sesión exitoso. El código ha sido eliminado.'
    });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function crearDocente(req, res) {
  try {
    // Si el usuario es un supervisor, verificar que solo asigne carreras a las que tiene acceso
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      if (req.body.carreras && Array.isArray(req.body.carreras)) {
        const carrerasSinAcceso = req.body.carreras.filter(carrera => 
          !req.user.carreras.includes(carrera)
        );
        
        if (carrerasSinAcceso.length > 0) {
          return res.status(403).json({ 
            error: 'No tiene permisos para asignar algunas de las carreras especificadas',
            carrerasSinAcceso
          });
        }
      }
    }
    
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
    let docentes;
    
    // Si el usuario tiene carreras asignadas, filtrar docentes por esas carreras
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Obtener docentes para cada carrera del usuario
      let docentesPorCarrera = [];
      
      for (const carrera of req.user.carreras) {
        const docentesCarrera = await docenteModel.obtenerDocentesPorCarrera(carrera);
        docentesPorCarrera = [...docentesPorCarrera, ...docentesCarrera];
      }
      
      // Eliminar duplicados
      const docentesIds = new Set();
      docentes = docentesPorCarrera.filter(docente => {
        if (docentesIds.has(docente.id)) {
          return false;
        }
        docentesIds.add(docente.id);
        return true;
      });
    } else {
      // Si no hay restricciones, obtener todos los docentes
      docentes = await docenteModel.obtenerDocentes();
    }
    
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
    
    // Si el usuario tiene carreras asignadas, verificar que tenga acceso a este docente
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Verificar si hay al menos una carrera en común
      const tieneAcceso = docente.carreras && docente.carreras.some(carrera => 
        req.user.carreras.includes(carrera)
      );
      
      if (!tieneAcceso) {
        return res.status(403).json({ error: 'No tiene permisos para acceder a este docente' });
      }
    }
    
    res.json(docente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarDocente(req, res) {
  try {
    const id = req.params.id;
    
    // Verificar si el docente existe
    const docenteActual = await docenteModel.obtenerDocentePorId(id);
    if (!docenteActual) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    
    // Si el usuario tiene carreras asignadas, verificar permisos
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Verificar si hay al menos una carrera en común
      const tieneAcceso = docenteActual.carreras && docenteActual.carreras.some(carrera => 
        req.user.carreras.includes(carrera)
      );
      
      if (!tieneAcceso) {
        return res.status(403).json({ error: 'No tiene permisos para actualizar este docente' });
      }
      
      // Si intenta asignar carreras, verificar que solo asigne carreras a las que tiene acceso
      if (req.body.carreras && Array.isArray(req.body.carreras)) {
        const carrerasSinAcceso = req.body.carreras.filter(carrera => 
          !req.user.carreras.includes(carrera)
        );
        
        if (carrerasSinAcceso.length > 0) {
          return res.status(403).json({ 
            error: 'No tiene permisos para asignar algunas de las carreras especificadas',
            carrerasSinAcceso
          });
        }
      }
    }
    
    const docente = await docenteModel.actualizarDocente(id, req.body);
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
    
    // 1.5 Verificar si el usuario tiene permisos para eliminar este docente
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Verificar si hay al menos una carrera en común
      const tieneAcceso = docente.carreras && docente.carreras.some(carrera => 
        req.user.carreras.includes(carrera)
      );
      
      if (!tieneAcceso) {
        return res.status(403).json({ error: 'No tiene permisos para eliminar este docente' });
      }
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
    
    // Verificar si el usuario tiene permisos para ver este docente
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Verificar si hay al menos una carrera en común
      const tieneAcceso = docente.carreras && docente.carreras.some(carrera => 
        req.user.carreras.includes(carrera)
      );
      
      if (!tieneAcceso) {
        return res.status(403).json({ error: 'No tiene permisos para ver este docente' });
      }
    }
    
    // Obtener dependencias
    const dependencias = await docenteModel.verificarDependenciasDocente(id);
    
    // Obtener lista de docentes disponibles para reasignación
    let docentesDisponibles = [];
    
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Para supervisores, mostrar solo docentes de sus carreras
      for (const carrera of req.user.carreras) {
        const docentesCarrera = await docenteModel.obtenerDocentesPorCarrera(carrera);
        docentesDisponibles = [...docentesDisponibles, ...docentesCarrera.filter(d => d.id !== parseInt(id))];
      }
      
      // Eliminar duplicados
      const idsSet = new Set();
      docentesDisponibles = docentesDisponibles.filter(d => {
        if (idsSet.has(d.id)) return false;
        idsSet.add(d.id);
        return true;
      });
    } else {
      // Si no es un supervisor con carreras, mostrar todos los docentes
      const docentes = await docenteModel.obtenerDocentes();
      docentesDisponibles = docentes.filter(d => d.id !== parseInt(id));
    }
    
    // Simplificar para la respuesta
    docentesDisponibles = docentesDisponibles.map(d => ({
      id: d.id,
      nombre_completo: d.nombre_completo,
      correo_electronico: d.correo_electronico,
      carreras: d.carreras
    }));
    
    res.json({
      docente,
      dependencias,
      tieneDependencias: dependencias.tieneDependencias,
      docentesDisponibles
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

/**
 * Gestiona las carreras asignadas a un docente
 */
async function gestionarCarrerasDocente(req, res) {
  try {
    const docenteId = req.params.id;
    const { carreras } = req.body;
    
    if (!Array.isArray(carreras)) {
      return res.status(400).json({ error: 'Se debe proporcionar un array de carreras' });
    }
    
    // Verificar que el docente existe
    const docente = await docenteModel.obtenerDocentePorId(docenteId);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    
    // Verificar límite de 6 carreras
    if (carreras.length > 6) {
      return res.status(400).json({ 
        error: 'Un docente no puede tener más de 6 carreras asignadas',
        carrieras_proporcionadas: carreras.length,
        limite: 6
      });
    }
    
    // Si el usuario tiene carreras asignadas, verificar permisos
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      // Verificar si hay al menos una carrera en común (para edición)
      const tieneAccesoActual = docente.carreras && docente.carreras.some(carrera => 
        req.user.carreras.includes(carrera)
      );
      
      // Verificar si intenta asignar carreras a las que no tiene acceso
      const carrerasSinAcceso = carreras.filter(carrera => 
        !req.user.carreras.includes(carrera)
      );
      
      if (!tieneAccesoActual || carrerasSinAcceso.length > 0) {
        return res.status(403).json({ 
          error: 'No tiene permisos para modificar las carreras de este docente o asignar algunas de las carreras especificadas',
          carrerasSinAcceso
        });
      }
    }
    
    // Asignar las carreras
    const resultado = await docenteCarreraModel.asignarCarrerasADocente(docenteId, carreras);
    
    // Obtener el docente actualizado
    const docenteActualizado = await docenteModel.obtenerDocentePorId(docenteId);
    
    res.json({
      message: 'Carreras actualizadas correctamente',
      docente: docenteActualizado
    });
  } catch (error) {
    console.error('Error al gestionar carreras del docente:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene docentes filtrados por carrera
 */
async function obtenerDocentesPorCarrera(req, res) {
  try {
    const carrera = req.params.carrera;
    
    // Si el usuario tiene carreras asignadas, verificar que tenga acceso a esta carrera
    if (req.user && req.user.carreras && req.user.carreras.length > 0) {
      if (!req.user.carreras.includes(carrera)) {
        return res.status(403).json({ error: 'No tiene acceso a los docentes de esta carrera' });
      }
    }
    
    const docentes = await docenteModel.obtenerDocentesPorCarrera(carrera);
    res.json(docentes);
  } catch (error) {
    console.error('Error al obtener docentes por carrera:', error);
    res.status(500).json({ error: error.message });
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
  verificarDependencias,
  gestionarCarrerasDocente,
  obtenerDocentesPorCarrera
};