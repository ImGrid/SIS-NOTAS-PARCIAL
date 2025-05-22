const pool = require('../database/db');

async function crearGrupo(grupo) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia } = grupo;
  const query = `
    INSERT INTO grupos (nombre_proyecto, carrera, semestre, docente_id, materia) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING id, nombre_proyecto, carrera, semestre, docente_id, materia
  `;
  const values = [nombre_proyecto, carrera, semestre, docente_id, materia];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerGrupos(limit = 1000, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    ORDER BY g.carrera, g.semestre, g.nombre_proyecto
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

async function obtenerGrupoPorId(id) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function actualizarGrupo(id, grupo) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia } = grupo;
  
  const query = `
    UPDATE grupos 
    SET nombre_proyecto = $1, carrera = $2, semestre = $3, docente_id = $4, materia = $5 
    WHERE id = $6 
    RETURNING id, nombre_proyecto, carrera, semestre, docente_id, materia
  `;
  const values = [nombre_proyecto, carrera, semestre, docente_id, materia, id];
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

async function obtenerGruposPorDocenteId(docenteId, limit = 500, offset = 0) {
  const query = `
    SELECT id, nombre_proyecto, carrera, semestre, docente_id, materia
    FROM grupos 
    WHERE docente_id = $1
    ORDER BY carrera, semestre, nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [docenteId, limit, offset]);
  return result.rows;
}

/**
 * VERSIÓN OPTIMIZADA: Usar índice en carrera + paginación
 */
async function obtenerGruposPorCarrera(carrera, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.carrera = $1
    ORDER BY g.semestre, g.nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [carrera, limit, offset]);
  return result.rows;
}

async function obtenerGruposPorSemestre(semestre, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.semestre = $1
    ORDER BY g.carrera, g.nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [semestre, limit, offset]);
  return result.rows;
}

async function obtenerGruposPorMateria(materia, limit = 500, offset = 0) {
  const query = `
    SELECT 
      g.id, g.nombre_proyecto, g.carrera, g.semestre, g.docente_id, g.materia,
      d.nombre_completo as docente_nombre
    FROM grupos g
    LEFT JOIN docentes d ON g.docente_id = d.id
    WHERE g.materia = $1
    ORDER BY g.carrera, g.semestre, g.nombre_proyecto
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [materia, limit, offset]);
  return result.rows;
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
};