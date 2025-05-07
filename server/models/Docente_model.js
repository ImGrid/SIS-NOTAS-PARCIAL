const pool = require('../database/db');

async function crearDocente(docente) {
  const { nombre_completo, correo_electronico, cargo } = docente;
  const query = 'INSERT INTO docentes (nombre_completo, correo_electronico, cargo) VALUES ($1, $2, $3) RETURNING *';
  const values = [nombre_completo, correo_electronico, cargo];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerDocentes() {
  const result = await pool.query('SELECT * FROM docentes');
  return result.rows;
}

async function obtenerDocentePorId(id) {
  const result = await pool.query('SELECT * FROM docentes WHERE id = $1', [id]);
  return result.rows[0];
}

async function actualizarDocente(id, docente) {
  const { nombre_completo, correo_electronico, cargo } = docente;
  const query = 'UPDATE docentes SET nombre_completo = $1, correo_electronico = $2, cargo = $3 WHERE id = $4 RETURNING *';
  const values = [nombre_completo, correo_electronico, cargo, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarDocente(id) {
  const result = await pool.query('DELETE FROM docentes WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}
async function obtenerDocentePorCorreo(correo) {
  const result = await pool.query('SELECT * FROM docentes WHERE correo_electronico = $1', [correo]);
  return result.rows[0];
}
module.exports = {
  crearDocente,
  obtenerDocentes,
  obtenerDocentePorId,
  actualizarDocente,
  eliminarDocente,
  obtenerDocentePorCorreo
};