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
async function obtenerEstudiantesPorSemestreYCarrera(semestre, carrera) {
  // Esta consulta filtra estudiantes que coincidan con el semestre Y la carrera
  const query = 'SELECT * FROM estudiantes WHERE semestre = $1 AND carrera = $2';
  const result = await pool.query(query, [semestre, carrera]);
  return result.rows;
}
async function obtenerEstudiantesPorMateriaConEstado(materia) {
  const query = `
    WITH estudiantes_grupo AS (
      -- Todos los estudiantes asignados a grupos de esta materia
      SELECT 
        e.id, e.nombre, e.apellido, e.codigo, e.carrera, e.semestre,
        e.unidad_educativa, g.id as grupo_id, g.nombre_proyecto,
        g.materia
      FROM estudiantes e
      JOIN estudiante_grupo eg ON e.id = eg.estudiante_id
      JOIN grupos g ON eg.grupo_id = g.id
      WHERE g.materia = $1 AND eg.activo = true
    ), 
    informes_rubricas AS (
      -- Todos los informes con sus rúbricas de los grupos de esta materia
      SELECT 
        i.*, r.presentacion, r.sustentacion, r.documentacion, 
        r.innovacion, r.nota_final, r.observaciones 
      FROM informes i
      LEFT JOIN rubricas r ON i.rubrica_id = r.id
      JOIN grupos g ON i.grupo_id = g.id
      WHERE g.materia = $1
    )
    SELECT 
      eg.id, eg.nombre, eg.apellido, eg.codigo, eg.carrera, eg.semestre,
      eg.unidad_educativa, eg.grupo_id, eg.nombre_proyecto, eg.materia,
      ir.id as informe_id, ir.nota_final, ir.observaciones,
      CASE 
        WHEN ir.id IS NULL THEN 'PENDIENTE'
        WHEN ir.observaciones = 'APROBADO' OR ir.nota_final >= 5.1 THEN 'APROBADO'
        ELSE 'REPROBADO'
      END as estado
    FROM estudiantes_grupo eg
    LEFT JOIN informes_rubricas ir ON eg.id = ir.estudiante_id AND eg.grupo_id = ir.grupo_id
    ORDER BY eg.apellido, eg.nombre
  `;
  
  const result = await pool.query(query, [materia]);
  return result.rows;
}
// En estudiantes_model.js
async function obtenerEstudiantesUnicosPorSemestreYCarreraConEstado(semestre, carrera) {
  const query = `
    WITH estudiantes_base AS (
      -- Estudiantes básicos de este semestre y carrera
      SELECT 
        e.id, e.nombre, e.apellido, e.codigo, e.carrera, e.semestre,
        e.unidad_educativa, 
        EXISTS (
          SELECT 1 FROM estudiante_grupo eg 
          JOIN grupos g ON eg.grupo_id = g.id
          WHERE eg.estudiante_id = e.id AND eg.activo = true
        ) as asignado_a_grupo
      FROM estudiantes e
      WHERE e.semestre = $1 AND e.carrera = $2
    ),
    estudiantes_con_informes AS (
      -- Estudiantes con sus informes (si existen)
      SELECT 
        eb.*,
        i.id as informe_id,
        r.nota_final,
        r.observaciones
      FROM estudiantes_base eb
      LEFT JOIN informes i ON eb.id = i.estudiante_id
      LEFT JOIN rubricas r ON i.rubrica_id = r.id
    )
    SELECT 
      id, nombre, apellido, codigo, carrera, semestre, unidad_educativa,
      asignado_a_grupo,
      informe_id,
      nota_final,
      observaciones,
      CASE 
        WHEN asignado_a_grupo = false THEN 'NO_ASIGNADO'
        WHEN informe_id IS NULL THEN 'PENDIENTE'
        WHEN observaciones = 'APROBADO' OR nota_final >= 5.1 THEN 'APROBADO'
        ELSE 'REPROBADO'
      END as estado
    FROM estudiantes_con_informes
    ORDER BY apellido, nombre
  `;
  
  const result = await pool.query(query, [semestre, carrera]);
  return result.rows;
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
  obtenerEstudiantesConEstadoGrupo,
  obtenerEstudiantesPorSemestreYCarrera,
  obtenerEstudiantesUnicosPorSemestreYCarreraConEstado
};