const pool = require('../database/db');

async function crearGrupo(grupo) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia } = grupo;
  const query = 'INSERT INTO grupos (nombre_proyecto, carrera, semestre, docente_id, materia) VALUES ($1, $2, $3, $4, $5) RETURNING *';
  const values = [nombre_proyecto, carrera, semestre, docente_id, materia];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerGrupos() {
  const result = await pool.query('SELECT * FROM grupos');
  return result.rows;
}

async function obtenerGrupoPorId(id) {
  const result = await pool.query('SELECT * FROM grupos WHERE id = $1', [id]);
  return result.rows[0];
}

async function actualizarGrupo(id, grupo) {
  const { nombre_proyecto, carrera, semestre, docente_id, materia } = grupo;
  const query = 'UPDATE grupos SET nombre_proyecto = $1, carrera = $2, semestre = $3, docente_id = $4, materia = $5 WHERE id = $6 RETURNING *';
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

async function obtenerGruposPorDocenteId(docenteId) {
  const result = await pool.query('SELECT * FROM grupos WHERE docente_id = $1', [docenteId]);
  return result.rows;
}

async function obtenerGruposPorCarrera(carrera) {
  const result = await pool.query('SELECT * FROM grupos WHERE carrera = $1', [carrera]);
  return result.rows;
}

async function obtenerGruposPorSemestre(semestre) {
  const result = await pool.query('SELECT * FROM grupos WHERE semestre = $1', [semestre]);
  return result.rows;
}
async function obtenerGruposPorMateria(materia) {
  const result = await pool.query('SELECT * FROM grupos WHERE materia = $1', [materia]);
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