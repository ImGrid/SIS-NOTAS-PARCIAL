const pool = require('../database/db');

async function crearBorrador(borrador) {
  const { docente_id, grupo_id, contenido, observaciones, progreso } = borrador;
  
  // Usar UPSERT (INSERT ... ON CONFLICT) para mejor rendimiento
  const query = `
    INSERT INTO borradores (docente_id, grupo_id, contenido, observaciones, progreso, ultima_modificacion, creado) 
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (docente_id, grupo_id) 
    DO UPDATE SET 
      contenido = EXCLUDED.contenido,
      observaciones = EXCLUDED.observaciones,
      progreso = EXCLUDED.progreso,
      ultima_modificacion = CURRENT_TIMESTAMP
    RETURNING id, docente_id, grupo_id, contenido, observaciones, progreso, ultima_modificacion, creado
  `;
  const values = [docente_id, grupo_id, contenido, observaciones, progreso];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Con paginación y JOIN para información del docente/grupo
 */
async function obtenerBorradores(limit = 500, offset = 0) {
  const query = `
    SELECT 
      b.id, b.docente_id, b.grupo_id, b.contenido, b.observaciones, b.progreso, 
      b.ultima_modificacion, b.creado,
      d.nombre_completo as docente_nombre,
      g.nombre_proyecto, g.carrera, g.semestre
    FROM borradores b
    LEFT JOIN docentes d ON b.docente_id = d.id
    LEFT JOIN grupos g ON b.grupo_id = g.id
    ORDER BY b.ultima_modificacion DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

async function obtenerBorradorPorId(id) {
  const query = `
    SELECT 
      b.id, b.docente_id, b.grupo_id, b.contenido, b.observaciones, b.progreso, 
      b.ultima_modificacion, b.creado,
      d.nombre_completo as docente_nombre,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia
    FROM borradores b
    LEFT JOIN docentes d ON b.docente_id = d.id
    LEFT JOIN grupos g ON b.grupo_id = g.id
    WHERE b.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Usar índice único compuesto
 */
async function obtenerBorradorPorDocenteYGrupo(docenteId, grupoId) {
  const query = `
    SELECT 
      b.id, b.docente_id, b.grupo_id, b.contenido, b.observaciones, b.progreso, 
      b.ultima_modificacion, b.creado,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia
    FROM borradores b
    LEFT JOIN grupos g ON b.grupo_id = g.id
    WHERE b.docente_id = $1 AND b.grupo_id = $2
  `;
  const result = await pool.query(query, [docenteId, grupoId]);
  return result.rows[0];
}

async function actualizarBorrador(id, borrador) {
  const { docente_id, grupo_id, contenido, observaciones, progreso } = borrador;
  
  const query = `
    UPDATE borradores 
    SET docente_id = $1, grupo_id = $2, contenido = $3, observaciones = $4, progreso = $5, ultima_modificacion = CURRENT_TIMESTAMP 
    WHERE id = $6 
    RETURNING id, docente_id, grupo_id, contenido, observaciones, progreso, ultima_modificacion, creado
  `;
  const values = [docente_id, grupo_id, contenido, observaciones, progreso, id];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarBorrador(id) {
  const query = `
    DELETE FROM borradores WHERE id = $1 
    RETURNING id, docente_id, grupo_id, contenido, observaciones, progreso
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function eliminarBorradorPorDocenteYGrupo(docenteId, grupoId) {
  const query = `
    DELETE FROM borradores WHERE docente_id = $1 AND grupo_id = $2 
    RETURNING id, docente_id, grupo_id, contenido, observaciones, progreso
  `;
  const result = await pool.query(query, [docenteId, grupoId]);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Usar índice en docente_id con paginación
 */
async function obtenerBorradoresPorDocenteId(docenteId, limit = 100, offset = 0) {
  const query = `
    SELECT 
      b.id, b.docente_id, b.grupo_id, b.contenido, b.observaciones, b.progreso, 
      b.ultima_modificacion, b.creado,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia
    FROM borradores b
    LEFT JOIN grupos g ON b.grupo_id = g.id
    WHERE b.docente_id = $1
    ORDER BY b.ultima_modificacion DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [docenteId, limit, offset]);
  return result.rows;
}

async function obtenerBorradoresPorGrupoId(grupoId, limit = 50, offset = 0) {
  const query = `
    SELECT 
      b.id, b.docente_id, b.grupo_id, b.contenido, b.observaciones, b.progreso, 
      b.ultima_modificacion, b.creado,
      d.nombre_completo as docente_nombre
    FROM borradores b
    LEFT JOIN docentes d ON b.docente_id = d.id
    WHERE b.grupo_id = $1
    ORDER BY b.ultima_modificacion DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [grupoId, limit, offset]);
  return result.rows;
}

module.exports = {
  crearBorrador,
  obtenerBorradores,
  obtenerBorradorPorId,
  obtenerBorradorPorDocenteYGrupo,
  actualizarBorrador,
  eliminarBorrador,
  eliminarBorradorPorDocenteYGrupo,
  obtenerBorradoresPorDocenteId,
  obtenerBorradoresPorGrupoId
};