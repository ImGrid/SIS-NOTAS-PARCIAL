const gruposModel = require('../models/grupos_model');

/**
 * Valida y normaliza el campo paralelo según la carrera
 */
function validarYNormalizarParalelo(carrera, paralelo) {
  if (carrera === 'Ciencias Básicas') {
    // Para Ciencias Básicas, el paralelo es obligatorio y debe ser A-F
    if (!paralelo || !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      throw new Error('Para Ciencias Básicas el paralelo es obligatorio y debe ser A, B, C, D, E, F o G');
    }
    return paralelo.toUpperCase();
  } else {
    // Para otras carreras, siempre usar 'A'
    return 'A';
  }
}

function validarDatosGrupo(datos) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia, paralelo } = datos;
  
  // Validar campos básicos
  if (!nombre_proyecto || !carrera || !semestre || !docente_id || !materia) {
    throw new Error('Todos los campos básicos son obligatorios: nombre_proyecto, carrera, semestre, docente_id, materia');
  }
  
  // Validar que el semestre sea apropiado para la carrera
  const semestreNum = parseInt(semestre);
  if (carrera === 'Ciencias Básicas') {
    if (semestreNum !== 1 && semestreNum !== 2) {
      throw new Error('Ciencias Básicas solo puede tener semestres 1 o 2');
    }
  } else {
    if (semestreNum < 3 || semestreNum > 10) {
      throw new Error('Las carreras regulares deben tener semestres entre 3 y 10');
    }
  }
  
  // Validar y normalizar paralelo
  const paraleloValidado = validarYNormalizarParalelo(carrera, paralelo);
  
  return {
    ...datos,
    paralelo: paraleloValidado
  };
}

async function crearGrupo(req, res) {
  try {
    // Validar y normalizar datos
    const datosValidados = validarDatosGrupo(req.body);
    
    const grupo = await gruposModel.crearGrupo(datosValidados);
    res.status(201).json(grupo);
  } catch (error) {
    // Error de validación
    if (error.message.includes('paralelo') || error.message.includes('semestre')) {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Error al crear grupo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGrupos(req, res) {
  try {
    const { limit = 1000, offset = 0 } = req.query;
    const grupos = await gruposModel.obtenerGrupos(parseInt(limit), parseInt(offset));
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGrupoPorId(req, res) {
  try {
    const grupo = await gruposModel.obtenerGrupoPorId(req.params.id);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json(grupo);
  } catch (error) {
    console.error('Error al obtener grupo por ID:', error);
    res.status(500).json({ error: error.message });
  }
}

async function actualizarGrupo(req, res) {
  try {
    // Validar y normalizar datos
    const datosValidados = validarDatosGrupo(req.body);
    
    const grupo = await gruposModel.actualizarGrupo(req.params.id, datosValidados);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json(grupo);
  } catch (error) {
    // Error de validación
    if (error.message.includes('paralelo') || error.message.includes('semestre')) {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Error al actualizar grupo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function eliminarGrupo(req, res) {
  try {
    const grupo = await gruposModel.eliminarGrupo(req.params.id);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json({ message: 'Grupo eliminado', grupo });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorDocenteId(req, res) {
  try {
    const docenteId = req.params.docenteId;
    const { limit = 500, offset = 0 } = req.query;
    const grupos = await gruposModel.obtenerGruposPorDocenteId(docenteId, parseInt(limit), parseInt(offset));
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por docente:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorCarrera(req, res) {
  try {
    const carrera = req.params.carrera;
    const { limit = 500, offset = 0 } = req.query;
    const grupos = await gruposModel.obtenerGruposPorCarrera(carrera, parseInt(limit), parseInt(offset));
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por carrera:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorSemestre(req, res) {
  try {
    const semestre = req.params.semestre;
    const { limit = 500, offset = 0 } = req.query;
    const grupos = await gruposModel.obtenerGruposPorSemestre(semestre, parseInt(limit), parseInt(offset));
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por semestre:', error);
    res.status(500).json({ error: error.message });
  }
}

async function obtenerGruposPorMateria(req, res) {
  try {
    const materia = req.params.materia;
    const { limit = 500, offset = 0 } = req.query;
    const grupos = await gruposModel.obtenerGruposPorMateria(materia, parseInt(limit), parseInt(offset));
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por materia:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener grupos por carrera y paralelo
 */
async function obtenerGruposPorCarreraYParalelo(req, res) {
  try {
    const { carrera, paralelo } = req.params;
    const { limit = 500, offset = 0 } = req.query;
    
    // Validar paralelo según carrera
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
    
    const grupos = await gruposModel.obtenerGruposPorCarreraYParalelo(
      carrera, 
      paralelo.toUpperCase(), 
      parseInt(limit), 
      parseInt(offset)
    );
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por carrera y paralelo:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener grupos por semestre, carrera y paralelo
 */
async function obtenerGruposPorSemestreCarreraYParalelo(req, res) {
  try {
    const { semestre, carrera, paralelo } = req.params;
    const { limit = 500, offset = 0 } = req.query;
    
    // Validar paralelo según carrera
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
    
    const grupos = await gruposModel.obtenerGruposPorSemestreCarreraYParalelo(
      semestre, 
      carrera, 
      paralelo.toUpperCase(), 
      parseInt(limit), 
      parseInt(offset)
    );
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por semestre, carrera y paralelo:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener grupos por semestre y paralelo
 */
async function obtenerGruposPorSemestreYParalelo(req, res) {
  try {
    const { semestre, paralelo } = req.params;
    const { limit = 500, offset = 0 } = req.query;
    
    // Validar que el paralelo sea válido
    if (!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(paralelo.toUpperCase())) {
      return res.status(400).json({ 
        error: 'El paralelo debe ser A, B, C, D, E, F o G' 
      });
    }
    
    const grupos = await gruposModel.obtenerGruposPorSemestreYParalelo(
      semestre, 
      paralelo.toUpperCase(), 
      parseInt(limit), 
      parseInt(offset)
    );
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos por semestre y paralelo:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener paralelos disponibles para una carrera
 */
async function obtenerParalelosDisponibles(req, res) {
  try {
    const { carrera } = req.params;
    const paralelos = await gruposModel.obtenerParalelosDisponiblesPorCarrera(carrera);
    res.json(paralelos);
  } catch (error) {
    console.error('Error al obtener paralelos disponibles:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener grupos con información de estudiantes
 */
async function obtenerGruposConEstudiantes(req, res) {
  try {
    const { carrera, semestre, paralelo } = req.query;
    const { limit = 1000, offset = 0 } = req.query;
    
    const filtros = {};
    if (carrera) filtros.carrera = carrera;
    if (semestre) filtros.semestre = parseInt(semestre);
    if (paralelo) filtros.paralelo = paralelo.toUpperCase();
    
    const grupos = await gruposModel.obtenerGruposConEstudiantes(
      filtros, 
      parseInt(limit), 
      parseInt(offset)
    );
    res.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos con estudiantes:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Verificar compatibilidad de estudiante con grupo
 */
async function verificarCompatibilidadEstudianteGrupo(req, res) {
  try {
    const { estudianteId, grupoId } = req.params;
    
    if (!estudianteId || !grupoId) {
      return res.status(400).json({ error: 'Se requieren estudianteId y grupoId' });
    }
    
    const compatibilidad = await gruposModel.verificarCompatibilidadEstudianteGrupo(
      estudianteId, 
      grupoId
    );
    
    res.json(compatibilidad);
  } catch (error) {
    console.error('Error al verificar compatibilidad:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * NUEVA FUNCIÓN: Obtener estadísticas de grupos por paralelo
 * Útil para reportes de Ciencias Básicas
 */
async function obtenerEstadisticasPorParalelo(req, res) {
  try {
    const { carrera } = req.params;
    
    if (carrera !== 'Ciencias Básicas') {
      return res.status(400).json({ 
        error: 'Las estadísticas por paralelo solo aplican para Ciencias Básicas' 
      });
    }
    
    // Obtener todos los grupos de Ciencias Básicas
    const grupos = await gruposModel.obtenerGruposPorCarrera(carrera, 1000, 0);
    
    // Agrupar estadísticas por paralelo
    const estadisticas = {};
    
    grupos.forEach(grupo => {
      const paralelo = grupo.paralelo;
      if (!estadisticas[paralelo]) {
        estadisticas[paralelo] = {
          paralelo,
          total_grupos: 0,
          grupos_por_semestre: {},
          materias: new Set()
        };
      }
      
      estadisticas[paralelo].total_grupos++;
      
      // Contar por semestre
      const semestre = grupo.semestre;
      if (!estadisticas[paralelo].grupos_por_semestre[semestre]) {
        estadisticas[paralelo].grupos_por_semestre[semestre] = 0;
      }
      estadisticas[paralelo].grupos_por_semestre[semestre]++;
      
      // Agregar materia
      estadisticas[paralelo].materias.add(grupo.materia);
    });
    
    // Convertir Sets a arrays para JSON
    Object.values(estadisticas).forEach(stat => {
      stat.materias = Array.from(stat.materias);
    });
    
    res.json(Object.values(estadisticas));
  } catch (error) {
    console.error('Error al obtener estadísticas por paralelo:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearGrupo,
  obtenerGrupos,
  obtenerGrupoPorId,
  actualizarGrupo,
  eliminarGrupo,
  obtenerGruposPorDocenteId,
  obtenerGruposPorCarrera,
  obtenerGruposPorSemestre,
  obtenerGruposPorMateria,
  // Nuevas funciones para paralelos:
  obtenerGruposPorCarreraYParalelo,
  obtenerGruposPorSemestreCarreraYParalelo,
  obtenerGruposPorSemestreYParalelo,
  obtenerParalelosDisponibles,
  obtenerGruposConEstudiantes,
  verificarCompatibilidadEstudianteGrupo,
  obtenerEstadisticasPorParalelo
};