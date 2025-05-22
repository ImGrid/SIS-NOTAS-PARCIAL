const pool = require('../database/db');

async function crearInforme(informe) {
  const { grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales } = informe;
  
  const query = `
    INSERT INTO informes (grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales, fecha_creacion) 
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
    RETURNING id, grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales, fecha_creacion
  `;
  const values = [grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Con paginación y campos específicos
 */
async function obtenerInformes(limit = 1000, offset = 0) {
  const query = `
    SELECT 
      i.id, i.grupo_id, i.estudiante_id, i.docente_id, i.calificacion_id, i.rubrica_id, 
      i.comentarios_generales, i.fecha_creacion,
      g.nombre_proyecto,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido,
      d.nombre_completo as docente_nombre
    FROM informes i
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
    LEFT JOIN docentes d ON i.docente_id = d.id
    ORDER BY i.fecha_creacion DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

async function obtenerInformePorId(id) {
  const query = `
    SELECT 
      i.id, i.grupo_id, i.estudiante_id, i.docente_id, i.calificacion_id, i.rubrica_id, 
      i.comentarios_generales, i.fecha_creacion,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, e.codigo as estudiante_codigo,
      d.nombre_completo as docente_nombre
    FROM informes i
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
    LEFT JOIN docentes d ON i.docente_id = d.id
    WHERE i.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function actualizarInforme(id, informe) {
  const { grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales } = informe;
  
  const query = `
    UPDATE informes 
    SET grupo_id = $1, estudiante_id = $2, docente_id = $3, calificacion_id = $4, rubrica_id = $5, comentarios_generales = $6 
    WHERE id = $7 
    RETURNING id, grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales, fecha_creacion
  `;
  const values = [grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarInforme(id) {
  const query = `
    DELETE FROM informes WHERE id = $1 
    RETURNING id, grupo_id, estudiante_id, docente_id, calificacion_id, rubrica_id, comentarios_generales
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Consulta más eficiente para informes por grupo
 * Ya no necesita la subconsulta compleja del original
 */
async function obtenerInformesPorGrupoId(grupoId) {
  const query = `
    SELECT 
      i.id, i.grupo_id, i.estudiante_id, i.docente_id, i.calificacion_id, i.rubrica_id,
      i.comentarios_generales, i.fecha_creacion,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, e.codigo as estudiante_codigo,
      r.presentacion, r.sustentacion, r.documentacion, r.innovacion, r.nota_final, r.observaciones
    FROM informes i
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
    LEFT JOIN rubricas r ON i.rubrica_id = r.id
    WHERE i.grupo_id = $1
    ORDER BY e.apellido, e.nombre
  `;
  const result = await pool.query(query, [grupoId]);
  return result.rows;
}

/**
 * VERSIÓN OPTIMIZADA: Usar índices apropiados
 */
async function obtenerInformesPorEstudianteId(estudianteId, limit = 100, offset = 0) {
  const query = `
    SELECT 
      i.id, i.grupo_id, i.estudiante_id, i.docente_id, i.calificacion_id, i.rubrica_id,
      i.comentarios_generales, i.fecha_creacion,
      g.nombre_proyecto, g.carrera, g.semestre
    FROM informes i
    LEFT JOIN grupos g ON i.grupo_id = g.id
    WHERE i.estudiante_id = $1
    ORDER BY i.fecha_creacion DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [estudianteId, limit, offset]);
  return result.rows;
}

async function obtenerInformesPorDocenteId(docenteId, limit = 500, offset = 0) {
  const query = `
    SELECT 
      i.id, i.grupo_id, i.estudiante_id, i.docente_id, i.calificacion_id, i.rubrica_id,
      i.comentarios_generales, i.fecha_creacion,
      g.nombre_proyecto,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido
    FROM informes i
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
    WHERE i.docente_id = $1
    ORDER BY i.fecha_creacion DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [docenteId, limit, offset]);
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