const pool = require('../database/db');

async function crearBorrador(borrador) {
  const { docente_id, grupo_id, contenido, observaciones, progreso } = borrador;
  
  // Verificar si ya existe un borrador para este docente y grupo
  const existente = await obtenerBorradorPorDocenteYGrupo(docente_id, grupo_id);
  
  if (existente) {
    // Si existe, actualizar en lugar de crear
    return actualizarBorrador(existente.id, borrador);
  }
  
  // Si no existe, crear nuevo
  const query = 'INSERT INTO borradores (docente_id, grupo_id, contenido, observaciones, progreso, ultima_modificacion, creado) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *';
  const values = [docente_id, grupo_id, contenido, observaciones, progreso];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerBorradores() {
  const result = await pool.query('SELECT * FROM borradores');
  return result.rows;
}

async function obtenerBorradorPorId(id) {
  const result = await pool.query('SELECT * FROM borradores WHERE id = $1', [id]);
  return result.rows[0];
}

async function obtenerBorradorPorDocenteYGrupo(docenteId, grupoId) {
  const result = await pool.query('SELECT * FROM borradores WHERE docente_id = $1 AND grupo_id = $2', [docenteId, grupoId]);
  return result.rows[0];
}

async function actualizarBorrador(id, borrador) {
  const { docente_id, grupo_id, contenido, observaciones, progreso } = borrador;
  
  const query = 'UPDATE borradores SET docente_id = $1, grupo_id = $2, contenido = $3, observaciones = $4, progreso = $5, ultima_modificacion = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *';
  const values = [docente_id, grupo_id, contenido, observaciones, progreso, id];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarBorrador(id) {
  const result = await pool.query('DELETE FROM borradores WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

async function eliminarBorradorPorDocenteYGrupo(docenteId, grupoId) {
  const result = await pool.query('DELETE FROM borradores WHERE docente_id = $1 AND grupo_id = $2 RETURNING *', [docenteId, grupoId]);
  return result.rows[0];
}

async function obtenerBorradoresPorDocenteId(docenteId) {
  const result = await pool.query('SELECT * FROM borradores WHERE docente_id = $1', [docenteId]);
  return result.rows;
}

async function obtenerBorradoresPorGrupoId(grupoId) {
  const result = await pool.query('SELECT * FROM borradores WHERE grupo_id = $1', [grupoId]);
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