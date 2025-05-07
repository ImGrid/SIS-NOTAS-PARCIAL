const borradoresModel = require('../models/borradores_model');

async function crearBorrador(req, res) {
  try {
    // Extraer datos de la petición
    const borrador = req.body;
    
    // Verificar que el docente del token sea el mismo que intenta crear el borrador
    // Esto es para prevenir que un docente cree borradores para otro
    if (req.usuario && req.usuario.id && borrador.docente_id) {
      if (req.usuario.id !== borrador.docente_id.toString()) {
        return res.status(403).json({ error: 'No autorizado para crear borrador para otro docente' });
      }
    }
    
    const resultado = await borradoresModel.crearBorrador(borrador);
    res.status(201).json(resultado);
  } catch (error) {
    console.error('Error en crearBorrador:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerBorradores(req, res) {
  try {
    const borradores = await borradoresModel.obtenerBorradores();
    res.json(borradores);
  } catch (error) {
    console.error('Error en obtenerBorradores:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerBorradorPorId(req, res) {
  try {
    const borrador = await borradoresModel.obtenerBorradorPorId(req.params.id);
    
    if (!borrador) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }
    
    // Verificar que el docente del token sea el dueño del borrador
    if (req.usuario && req.usuario.id) {
      if (req.usuario.id !== borrador.docente_id.toString()) {
        return res.status(403).json({ error: 'No autorizado para acceder a este borrador' });
      }
    }
    
    res.json(borrador);
  } catch (error) {
    console.error('Error en obtenerBorradorPorId:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerBorradorPorDocenteYGrupo(req, res) {
  try {
    const docenteId = req.params.docenteId;
    const grupoId = req.params.grupoId;
    
    // Verificar que el docente del token sea el mismo que consulta
    if (req.usuario && req.usuario.id) {
      if (req.usuario.id !== docenteId.toString()) {
        return res.status(403).json({ error: 'No autorizado para acceder a borradores de otro docente' });
      }
    }
    
    const borrador = await borradoresModel.obtenerBorradorPorDocenteYGrupo(docenteId, grupoId);
    
    if (!borrador) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }
    
    res.json(borrador);
  } catch (error) {
    console.error('Error en obtenerBorradorPorDocenteYGrupo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function actualizarBorrador(req, res) {
  try {
    const id = req.params.id;
    const borrador = req.body;
    
    // Verificar que el borrador existe
    const existente = await borradoresModel.obtenerBorradorPorId(id);
    
    if (!existente) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }
    
    // Verificar que el docente del token sea el dueño del borrador
    if (req.usuario && req.usuario.id) {
      if (req.usuario.id !== existente.docente_id.toString()) {
        return res.status(403).json({ error: 'No autorizado para modificar este borrador' });
      }
    }
    
    const resultado = await borradoresModel.actualizarBorrador(id, borrador);
    res.json(resultado);
  } catch (error) {
    console.error('Error en actualizarBorrador:', error);
    res.status(500).json({ error: error.message });
  }
}

async function eliminarBorrador(req, res) {
  try {
    const id = req.params.id;
    
    // Verificar que el borrador existe
    const existente = await borradoresModel.obtenerBorradorPorId(id);
    
    if (!existente) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }
    
    // Verificar que el docente del token sea el dueño del borrador
    if (req.usuario && req.usuario.id) {
      if (req.usuario.id !== existente.docente_id.toString()) {
        return res.status(403).json({ error: 'No autorizado para eliminar este borrador' });
      }
    }
    
    const resultado = await borradoresModel.eliminarBorrador(id);
    res.json({ message: 'Borrador eliminado', borrador: resultado });
  } catch (error) {
    console.error('Error en eliminarBorrador:', error);
    res.status(500).json({ error: error.message });
  }
}

async function eliminarBorradorPorDocenteYGrupo(req, res) {
  try {
    const docenteId = req.params.docenteId;
    const grupoId = req.params.grupoId;
    
    // Verificar que el docente del token sea el mismo que solicita eliminar
    if (req.usuario && req.usuario.id) {
      if (req.usuario.id !== docenteId.toString()) {
        return res.status(403).json({ error: 'No autorizado para eliminar borradores de otro docente' });
      }
    }
    
    const resultado = await borradoresModel.eliminarBorradorPorDocenteYGrupo(docenteId, grupoId);
    
    if (!resultado) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }
    
    res.json({ message: 'Borrador eliminado', borrador: resultado });
  } catch (error) {
    console.error('Error en eliminarBorradorPorDocenteYGrupo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerBorradoresPorDocenteId(req, res) {
  try {
    const docenteId = req.params.docenteId;
    
    // Verificar que el docente del token sea el mismo que consulta
    if (req.usuario && req.usuario.id) {
      if (req.usuario.id !== docenteId.toString()) {
        return res.status(403).json({ error: 'No autorizado para acceder a borradores de otro docente' });
      }
    }
    
    const borradores = await borradoresModel.obtenerBorradoresPorDocenteId(docenteId);
    res.json(borradores);
  } catch (error) {
    console.error('Error en obtenerBorradoresPorDocenteId:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearBorrador,
  obtenerBorradores,
  obtenerBorradorPorId,
  obtenerBorradorPorDocenteYGrupo,
  actualizarBorrador,
  eliminarBorrador,
  eliminarBorradorPorDocenteYGrupo,
  obtenerBorradoresPorDocenteId
};