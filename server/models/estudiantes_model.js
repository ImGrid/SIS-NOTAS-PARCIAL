const pool = require('../database/db');

async function crearEstudiante(estudiante) {
  const { nombre, apellido, codigo, carrera, semestre, unidad_educativa, } = estudiante;
  const query = 'INSERT INTO estudiantes (nombre, apellido, codigo, carrera, semestre, unidad_educativa, ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
  const values = [nombre, apellido, codigo, carrera, semestre, unidad_educativa, ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerEstudiantes() {
  const result = await pool.query('SELECT * FROM estudiantes');
  return result.rows;
}

async function obtenerEstudiantePorId(id) {
  const result = await pool.query('SELECT * FROM estudiantes WHERE id = $1', [id]);
  return result.rows[0];
}

async function actualizarEstudiante(id, estudiante) {
  const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = estudiante;
  const query = 'UPDATE estudiantes SET nombre = $1, apellido = $2, codigo = $3, carrera = $4, semestre = $5, unidad_educativa = $6 WHERE id = $7 RETURNING *';
  const values = [nombre, apellido, codigo, carrera, semestre, unidad_educativa, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarEstudiante(id) {
  const result = await pool.query('DELETE FROM estudiantes WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

async function obtenerEstudiantesPorGrupoId(grupoId) {
  const query = `
    SELECT e.* 
    FROM estudiantes e
    INNER JOIN estudiante_grupo eg ON e.id = eg.estudiante_id
    WHERE eg.grupo_id = $1 AND eg.activo = true
  `;
  const result = await pool.query(query, [grupoId]);
  return result.rows;
}

async function obtenerEstudiantesPorCarrera(carrera) {
  const result = await pool.query('SELECT * FROM estudiantes WHERE carrera = $1', [carrera]);
  return result.rows;
}

async function obtenerEstudiantesPorSemestre(semestre) {
  const result = await pool.query('SELECT * FROM estudiantes WHERE semestre = $1', [semestre]);
  return result.rows;
}
async function asignarEstudianteAGrupo(estudianteId, grupoId) {
  const query = `
    INSERT INTO estudiante_grupo (estudiante_id, grupo_id) 
    VALUES ($1, $2) 
    ON CONFLICT (estudiante_id, grupo_id) DO UPDATE 
    SET activo = true, fecha_asignacion = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const result = await pool.query(query, [estudianteId, grupoId]);
  return result.rows[0];
}

async function desasignarEstudianteDeGrupo(estudianteId, grupoId) {
  // Cambiamos de UPDATE a DELETE para eliminar completamente el registro
  const query = `
    DELETE FROM estudiante_grupo 
    WHERE estudiante_id = $1 AND grupo_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [estudianteId, grupoId]);
  return result.rows[0];
}

async function estudianteYaAsignadoAMateria(estudianteId, materia) {
  const query = `
    SELECT COUNT(*) as count
    FROM estudiante_grupo eg
    INNER JOIN grupos g ON eg.grupo_id = g.id
    WHERE eg.estudiante_id = $1 
    AND g.materia = $2 
    AND eg.activo = true
  `;
  const result = await pool.query(query, [estudianteId, materia]);
  return result.rows[0].count > 0;
}
async function estudianteYaAsignadoAMateria(estudianteId, materia) {
  const query = `
    SELECT COUNT(*) as count
    FROM estudiante_grupo eg
    INNER JOIN grupos g ON eg.grupo_id = g.id
    WHERE eg.estudiante_id = $1 
    AND g.materia = $2 
    AND eg.activo = true
  `;
  const result = await pool.query(query, [estudianteId, materia]);
  return result.rows[0].count > 0;
}
async function obtenerEstudiantesConEstadoGrupo(docenteId) {
  const query = `
    SELECT 
      e.id,
      e.nombre,
      e.apellido,
      e.codigo,
      e.carrera,
      e.semestre,
      e.unidad_educativa,
      (CASE WHEN COUNT(eg.id) > 0 THEN true ELSE false END) as tiene_grupo,
      (CASE WHEN COUNT(CASE WHEN g.docente_id = $1 THEN 1 ELSE NULL END) > 0 THEN true ELSE false END) as en_grupo_del_docente
    FROM estudiantes e
    LEFT JOIN estudiante_grupo eg ON e.id = eg.estudiante_id AND eg.activo = true
    LEFT JOIN grupos g ON eg.grupo_id = g.id
    GROUP BY e.id, e.nombre, e.apellido, e.codigo, e.carrera, e.semestre, e.unidad_educativa
  `;
  
  try {
    const result = await pool.query(query, [docenteId]);
    return result.rows;
  } catch (error) {
    console.error('Error en la consulta obtenerEstudiantesConEstadoGrupo:', error);
    throw error;
  }
}
module.exports = {
  crearEstudiante,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  eliminarEstudiante,
  obtenerEstudiantesPorGrupoId,
  obtenerEstudiantesPorCarrera,
  obtenerEstudiantesPorSemestre,
  asignarEstudianteAGrupo,         // NUEVO
  desasignarEstudianteDeGrupo,     // NUEVO
  estudianteYaAsignadoAMateria,
  obtenerEstudiantesConEstadoGrupo
};