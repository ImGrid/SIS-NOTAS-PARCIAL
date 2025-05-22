const pool = require('../database/db');

async function crearRubrica(rubrica) {
  const { presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id } = rubrica;
  
  const query = `
    INSERT INTO rubricas (presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id, fecha_creacion) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) 
    RETURNING id, presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id, fecha_creacion
  `;
  const values = [presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * VERSIÓN OPTIMIZADA: Con JOIN para información del docente y paginación
 */
async function obtenerRubricas(limit = 1000, offset = 0) {
  const query = `
    SELECT 
      r.id, r.presentacion, r.sustentacion, r.documentacion, r.innovacion, 
      r.nota_final, r.observaciones, r.comentarios, r.docente_id, r.fecha_creacion,
      d.nombre_completo as docente_nombre
    FROM rubricas r
    LEFT JOIN docentes d ON r.docente_id = d.id
    ORDER BY r.fecha_creacion DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

async function obtenerRubricaPorId(id) {
  const query = `
    SELECT 
      r.id, r.presentacion, r.sustentacion, r.documentacion, r.innovacion, 
      r.nota_final, r.observaciones, r.comentarios, r.docente_id, r.fecha_creacion,
      d.nombre_completo as docente_nombre
    FROM rubricas r
    LEFT JOIN docentes d ON r.docente_id = d.id
    WHERE r.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function actualizarRubrica(id, rubrica) {
  const { presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id } = rubrica;
  
  const query = `
    UPDATE rubricas 
    SET presentacion = $1, sustentacion = $2, documentacion = $3, innovacion = $4, nota_final = $5, observaciones = $6, comentarios = $7, docente_id = $8 
    WHERE id = $9 
    RETURNING id, presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id, fecha_creacion
  `;
  const values = [presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id, id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function eliminarRubrica(id) {
  const query = `
    DELETE FROM rubricas WHERE id = $1 
    RETURNING id, presentacion, sustentacion, documentacion, innovacion, nota_final, observaciones, comentarios, docente_id
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function obtenerRubricasPorDocenteId(docenteId, limit = 500, offset = 0) {
  const query = `
    SELECT 
      id, presentacion, sustentacion, documentacion, innovacion, 
      nota_final, observaciones, comentarios, docente_id, fecha_creacion
    FROM rubricas 
    WHERE docente_id = $1
    ORDER BY fecha_creacion DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [docenteId, limit, offset]);
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