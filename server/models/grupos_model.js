const pool = require('../database/db');

async function crearGrupo(grupo) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia, paralelo } = grupo;
  
  // Asegurar que paralelo tenga un valor por defecto
  const paraleloFinal = paralelo || 'A';
  
  const query = `
    INSERT INTO grupos (nombre_proyecto, carrera, semestre, docente_id, materia, paralelo) 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING id, nombre_proyecto, carrera, semestre, docente_id, materia, paralelo
  `;
  const values = [nombre_proyecto, carrera, semestre, docente_id, materia, paraleloFinal];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Con paginación y ordenamiento que incluye paralelo
 * Aprovecha: idx_grupos_carrera_semestre_paralelo
 */
async function obtenerGrupos(limit = 1000, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    ORDER BY g.carrera, g.semestre, g.paralelo, g.nombre_proyecto
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

async function obtenerGrupoPorId(id) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function actualizarGrupo(id, grupo) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia, paralelo } = grupo;
  
  // Asegurar que paralelo tenga un valor por defecto
  const paraleloFinal = paralelo || 'A';
  
  const query = `
    UPDATE grupos 
    SET nombre_proyecto = $1, carrera = $2, semestre = $3, docente_id = $4, materia = $5, paralelo = $6 
    WHERE id = $7 
    RETURNING id, nombre_proyecto, carrera, semestre, docente_id, materia, paralelo
  `;
  const values = [nombre_proyecto, carrera, semestre, docente_id, materia, paraleloFinal, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarGrupo(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Primero eliminamos todos los registros relacionados en estudiante_grupo
    await client.query('DELETE FROM estudiante_grupo WHERE grupo_id = $1', [id]);
    
    // Ahora podemos eliminar el grupo con seguridad
    const result = await client.query('DELETE FROM grupos WHERE id = $1 RETURNING *', [id]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * VERSIÓN OPTIMIZADA: Aprovecha idx_grupos_docente_id
 */
async function obtenerGruposPorDocenteId(docenteId, limit = 500, offset = 0) {
  const query = `
    SELECT id, nombre_proyecto, carrera, semestre, docente_id, materia, paralelo
    FROM grupos 
    WHERE docente_id = $1
    ORDER BY carrera, semestre, paralelo, nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [docenteId, limit, offset]);
  return result.rows;
}

/**
 * VERSIÓN OPTIMIZADA: Aprovecha idx_grupos_carrera_semestre_paralelo
 */
async function obtenerGruposPorCarrera(carrera, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.carrera = $1
    ORDER BY g.semestre, g.paralelo, g.nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [carrera, limit, offset]);
  return result.rows;
}

/**
 * VERSIÓN OPTIMIZADA: Aprovecha idx_grupos_carrera_semestre_paralelo
 */
async function obtenerGruposPorSemestre(semestre, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.semestre = $1
    ORDER BY g.carrera, g.paralelo, g.nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [semestre, limit, offset]);
  return result.rows;
}

/**
 * VERSIÓN OPTIMIZADA: Aprovecha idx_grupos_materia
 */
async function obtenerGruposPorMateria(materia, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.materia = $1
    ORDER BY g.carrera, g.semestre, g.paralelo, g.nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [materia, limit, offset]);
  return result.rows;
}

/**
 * NUEVA FUNCIÓN: Obtener grupos por carrera y paralelo
 * Especialmente útil para Ciencias Básicas
 * Aprovecha: idx_grupos_carrera_semestre_paralelo
 */
async function obtenerGruposPorCarreraYParalelo(carrera, paralelo, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.carrera = $1 AND g.paralelo = $2
    ORDER BY g.semestre, g.nombre_proyecto
    LIMIT $3 OFFSET $4
  `;
  const result = await pool.query(query, [carrera, paralelo, limit, offset]);
  return result.rows;
}

/**
 * NUEVA FUNCIÓN: Obtener grupos por semestre, carrera y paralelo
 * Filtrado específico para Ciencias Básicas
 * Aprovecha: idx_grupos_carrera_semestre_paralelo (consulta exacta)
 */
async function obtenerGruposPorSemestreCarreraYParalelo(semestre, carrera, paralelo, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.semestre = $1 AND g.carrera = $2 AND g.paralelo = $3
    ORDER BY g.nombre_proyecto
    LIMIT $4 OFFSET $5
  `;
  const result = await pool.query(query, [semestre, carrera, paralelo, limit, offset]);
  return result.rows;
}

/**
 * NUEVA FUNCIÓN: Obtener grupos por semestre y paralelo
 * Útil para ver todos los grupos de un paralelo específico across carreras
 */
async function obtenerGruposPorSemestreYParalelo(semestre, paralelo, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.semestre = $1 AND g.paralelo = $2
    ORDER BY g.carrera, g.nombre_proyecto
    LIMIT $3 OFFSET $4
  `;
  const result = await pool.query(query, [semestre, paralelo, limit, offset]);
  return result.rows;
}

/**
 * NUEVA FUNCIÓN: Obtener paralelos disponibles para una carrera específica
 * Útil para generar filtros dinámicos
 */
async function obtenerParalelosDisponiblesPorCarrera(carrera) {
  const query = `
    SELECT DISTINCT paralelo 
    FROM grupos 
    WHERE carrera = $1 
    ORDER BY paralelo
  `;
  const result = await pool.query(query, [carrera]);
  return result.rows.map(row => row.paralelo);
}

/**
 * NUEVA FUNCIÓN: Obtener grupos con estudiantes asignados
 * Incluye información del paralelo para reportes
 * Aprovecha: múltiples índices en JOIN
 */
async function obtenerGruposConEstudiantes(filtros = {}, limit = 1000, offset = 0) {
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  // Construir condiciones WHERE dinámicamente
  if (filtros.carrera) {
    whereConditions.push(`g.carrera = $${paramIndex}`);
    params.push(filtros.carrera);
    paramIndex++;
  }
  
  if (filtros.semestre) {
    whereConditions.push(`g.semestre = $${paramIndex}`);
    params.push(filtros.semestre);
    paramIndex++;
  }
  
  if (filtros.paralelo) {
    whereConditions.push(`g.paralelo = $${paramIndex}`);
    params.push(filtros.paralelo);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo,
      d.nombre_completo as docente_nombre,
      COUNT(eg.estudiante_id) as total_estudiantes,
      ARRAY_AGG(
        CASE WHEN eg.estudiante_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'id', e.id,
            'nombre', e.nombre,
            'apellido', e.apellido,
            'codigo', e.codigo,
            'paralelo', e.paralelo
          )
        END
      ) FILTER (WHERE eg.estudiante_id IS NOT NULL) as estudiantes
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    LEFT JOIN estudiante_grupo eg ON g.id = eg.grupo_id AND eg.activo = true
    LEFT JOIN estudiantes e ON eg.estudiante_id = e.id
    ${whereClause}
    GROUP BY g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia, g.paralelo, d.nombre_completo
    ORDER BY g.carrera, g.semestre, g.paralelo, g.nombre_proyecto
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * NUEVA FUNCIÓN: Verificar compatibilidad de estudiante con grupo
 * Valida que el estudiante pueda ser asignado al grupo (mismo paralelo para Ciencias Básicas)
 */
async function verificarCompatibilidadEstudianteGrupo(estudianteId, grupoId) {
  const query = `
    SELECT 
      e.carrera as estudiante_carrera,
      e.semestre as estudiante_semestre,
      e.paralelo as estudiante_paralelo,
      g.carrera as grupo_carrera,
      g.semestre as grupo_semestre,
      g.paralelo as grupo_paralelo
    FROM estudiantes e
    CROSS JOIN grupos g
    WHERE e.id = $1 AND g.id = $2
  `;
  const result = await pool.query(query, [estudianteId, grupoId]);
  
  if (result.rows.length === 0) {
    return {
      compatible: false,
      razon: 'Estudiante o grupo no encontrado'
    };
  }
  
  const { estudiante_carrera, estudiante_semestre, estudiante_paralelo, 
          grupo_carrera, grupo_semestre, grupo_paralelo } = result.rows[0];
  
  // Verificar carrera
  if (estudiante_carrera !== grupo_carrera) {
    return {
      compatible: false,
      razon: `Carrera incompatible: estudiante (${estudiante_carrera}) vs grupo (${grupo_carrera})`
    };
  }
  
  // Verificar semestre
  if (estudiante_semestre !== grupo_semestre) {
    return {
      compatible: false,
      razon: `Semestre incompatible: estudiante (${estudiante_semestre}) vs grupo (${grupo_semestre})`
    };
  }
  
  // Verificar paralelo (crítico para Ciencias Básicas)
  if (estudiante_paralelo !== grupo_paralelo) {
    return {
      compatible: false,
      razon: `Paralelo incompatible: estudiante (${estudiante_paralelo}) vs grupo (${grupo_paralelo})`
    };
  }
  
  return {
    compatible: true,
    razon: 'Estudiante compatible con el grupo'
  };
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
  obtenerParalelosDisponiblesPorCarrera,
  obtenerGruposConEstudiantes,
  verificarCompatibilidadEstudianteGrupo
};