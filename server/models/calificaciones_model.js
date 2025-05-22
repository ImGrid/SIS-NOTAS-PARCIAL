const pool = require('../database/db');

async function crearCalificacion(calificacion) {
  const { gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id } = calificacion;
  
  const query = `
    INSERT INTO calificaciones (gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING id, gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id
  `;
  const values = [gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Con JOINs para información relacionada y paginación
 */
async function obtenerCalificaciones(limit = 1000, offset = 0) {
  const query = `
    SELECT 
      c.id, c.gestion, c.periodo, c.fecha, c.asignatura, c.rubrica_id, c.docente_id, c.estudiante_id,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, e.codigo as estudiante_codigo,
      d.nombre_completo as docente_nombre,
      r.nota_final
    FROM calificaciones c
    LEFT JOIN estudiantes e ON c.estudiante_id = e.id
    LEFT JOIN docentes d ON c.docente_id = d.id
    LEFT JOIN rubricas r ON c.rubrica_id = r.id
    ORDER BY c.gestion DESC, c.periodo DESC, c.fecha DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

async function obtenerCalificacionPorId(id) {
  const query = `
    SELECT 
      c.id, c.gestion, c.periodo, c.fecha, c.asignatura, c.rubrica_id, c.docente_id, c.estudiante_id,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, e.codigo as estudiante_codigo,
      d.nombre_completo as docente_nombre,
      r.nota_final, r.observaciones
    FROM calificaciones c
    LEFT JOIN estudiantes e ON c.estudiante_id = e.id
    LEFT JOIN docentes d ON c.docente_id = d.id
    LEFT JOIN rubricas r ON c.rubrica_id = r.id
    WHERE c.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function actualizarCalificacion(id, calificacion) {
  const { gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id } = calificacion;
  
  const query = `
    UPDATE calificaciones 
    SET gestion = $1, periodo = $2, fecha = $3, asignatura = $4, rubrica_id = $5, docente_id = $6, estudiante_id = $7 
    WHERE id = $8 
    RETURNING id, gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id
  `;
  const values = [gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarCalificacion(id) {
  const query = `
    DELETE FROM calificaciones WHERE id = $1 
    RETURNING id, gestion, periodo, fecha, asignatura, rubrica_id, docente_id, estudiante_id
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function obtenerCalificacionesPorEstudianteId(estudianteId, limit = 100, offset = 0) {
  const query = `
    SELECT 
      c.id, c.gestion, c.periodo, c.fecha, c.asignatura, c.rubrica_id, c.docente_id, c.estudiante_id,
      d.nombre_completo as docente_nombre,
      r.nota_final, r.observaciones
    FROM calificaciones c
    LEFT JOIN docentes d ON c.docente_id = d.id
    LEFT JOIN rubricas r ON c.rubrica_id = r.id
    WHERE c.estudiante_id = $1
    ORDER BY c.gestion DESC, c.periodo DESC, c.fecha DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [estudianteId, limit, offset]);
  return result.rows;
}

async function obtenerCalificacionesPorDocenteId(docenteId, limit = 500, offset = 0) {
  const query = `
    SELECT 
      c.id, c.gestion, c.periodo, c.fecha, c.asignatura, c.rubrica_id, c.docente_id, c.estudiante_id,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, e.codigo as estudiante_codigo,
      r.nota_final
    FROM calificaciones c
    LEFT JOIN estudiantes e ON c.estudiante_id = e.id
    LEFT JOIN rubricas r ON c.rubrica_id = r.id
    WHERE c.docente_id = $1
    ORDER BY c.fecha DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [docenteId, limit, offset]);
  return result.rows;
}

async function obtenerCalificacionesPorRubricaId(rubricaId, limit = 100, offset = 0) {
  const query = `
    SELECT 
      c.id, c.gestion, c.periodo, c.fecha, c.asignatura, c.rubrica_id, c.docente_id, c.estudiante_id,
      e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, e.codigo as estudiante_codigo
    FROM calificaciones c
    LEFT JOIN estudiantes e ON c.estudiante_id = e.id
    WHERE c.rubrica_id = $1
    ORDER BY c.fecha DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [rubricaId, limit, offset]);
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