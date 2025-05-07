const pool = require('../database/db');

async function crearCalificacion(calificacion) {
  const { gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id } = calificacion;
  const query = 'INSERT INTO calificaciones (gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
  const values = [gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerCalificaciones() {
  const result = await pool.query('SELECT * FROM calificaciones');
  return result.rows;
}

async function obtenerCalificacionPorId(id) {
  const result = await pool.query('SELECT * FROM calificaciones WHERE id = $1', [id]);
  return result.rows[0];
}

async function actualizarCalificacion(id, calificacion) {
  const { gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id } = calificacion;
  const query = 'UPDATE calificaciones SET gestion = $1, periodo = $2, fecha = $3, asignatura = $4, rubrica_id = $5, docente_id = $6, estudiante_id = $7 WHERE id = $8 RETURNING *';
  const values = [gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarCalificacion(id) {
  const result = await pool.query('DELETE FROM calificaciones WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

async function obtenerCalificacionesPorEstudianteId(estudianteId) {
  const result = await pool.query('SELECT * FROM calificaciones WHERE estudiante_id = $1', [estudianteId]);
  return result.rows;
}

async function obtenerCalificacionesPorDocenteId(docenteId) {
  const result = await pool.query('SELECT * FROM calificaciones WHERE docente_id = $1', [docenteId]);
  return result.rows;
}

async function obtenerCalificacionesPorRubricaId(rubricaId) {
  const result = await pool.query('SELECT * FROM calificaciones WHERE rubrica_id = $1', [rubricaId]);
  return result.rows;
}

module.exports = {
  crearCalificacion,
  obtenerCalificaciones,
  obtenerCalificacionPorId,
  actualizarCalificacion,
  eliminarCalificacion,
  obtenerCalificacionesPorEstudianteId,
  obtenerCalificacionesPorDocenteId,
  obtenerCalificacionesPorRubricaId,
};