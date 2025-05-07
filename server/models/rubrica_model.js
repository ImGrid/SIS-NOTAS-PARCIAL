const pool = require('../database/db');

async function crearRubrica(rubrica) {
  const { presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id } = rubrica;
  const query = 'INSERT INTO rubricas (presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
  const values = [presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerRubricas() {
  const result = await pool.query('SELECT * FROM rubricas');
  return result.rows;
}

async function obtenerRubricaPorId(id) {
  const result = await pool.query('SELECT * FROM rubricas WHERE id = $1', [id]);
  return result.rows[0];
}

async function actualizarRubrica(id, rubrica) {
  const { presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id } = rubrica;
  const query = 'UPDATE rubricas SET presentacion = $1, sustentacion = $2, documentacion = $3, innovacion = $4, nota_final = $5, observaciones = $6, comentarios = $7, docente_id = $8 WHERE id = $9 RETURNING *';
  const values = [presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarRubrica(id) {
  const result = await pool.query('DELETE FROM rubricas WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

async function obtenerRubricasPorDocenteId(docenteId) {
  const result = await pool.query('SELECT * FROM rubricas WHERE docente_id = $1', [docenteId]);
  return result.rows;
}

module.exports = {
  crearRubrica,
  obtenerRubricas,
  obtenerRubricaPorId,
  actualizarRubrica,
  eliminarRubrica,
  obtenerRubricasPorDocenteId,
};