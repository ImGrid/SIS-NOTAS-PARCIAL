const pool = require('../database/db');

async function crearInforme(informe) {
  const { grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales } = informe;
  const query = 'INSERT INTO informes (grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
  const values = [grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerInformes() {
  const result = await pool.query('SELECT * FROM informes');
  return result.rows;
}

async function obtenerInformePorId(id) {
  const result = await pool.query('SELECT * FROM informes WHERE id = $1', [id]);
  return result.rows[0];
}

async function actualizarInforme(id, informe) {
  const { grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales } = informe;
  const query = 'UPDATE informes SET grupo_id = $1, estudiante_id = $2, docente_id = $3, calificacion_id = $4, rubrica_id = $5, comentarios_generales = $6 WHERE id = $7 RETURNING *';
  const values = [grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarInforme(id) {
  const result = await pool.query('DELETE FROM informes WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

async function obtenerInformesPorGrupoId(grupoId) {
  // Consulta para obtener solo el informe más reciente para cada estudiante en un grupo
  const query = `
    SELECT i.* FROM informes i
    INNER JOIN (
      SELECT estudiante_id, MAX(id) as max_id
      FROM informes
      WHERE grupo_id = $1
      GROUP BY estudiante_id
    ) as recent ON i.id = recent.max_id
    ORDER BY i.estudiante_id
  `;
  const result = await pool.query(query, [grupoId]);
  return result.rows;
}

async function obtenerInformesPorEstudianteId(estudianteId) {
  const result = await pool.query('SELECT * FROM informes WHERE estudiante_id = $1', [estudianteId]);
  return result.rows;
}

async function obtenerInformesPorDocenteId(docenteId) {
  const result = await pool.query('SELECT * FROM informes WHERE docente_id = $1', [docenteId]);
  return result.rows;
}

async function obtenerInformesPorCalificacionId(calificacionId) {
  const result = await pool.query('SELECT * FROM informes WHERE calificacion_id = $1', [calificacionId]);
  return result.rows;
}

async function obtenerInformesPorRubricaId(rubricaId) {
  const result = await pool.query('SELECT * FROM informes WHERE rubrica_id = $1', [rubricaId]);
  return result.rows;
}

module.exports = {
  crearInforme,
  obtenerInformes,
  obtenerInformePorId,
  actualizarInforme,
  eliminarInforme,
  obtenerInformesPorGrupoId,
  obtenerInformesPorEstudianteId,
  obtenerInformesPorDocenteId,
  obtenerInformesPorCalificacionId,
  obtenerInformesPorRubricaId,
};