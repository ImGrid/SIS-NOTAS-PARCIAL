// src/models/docente_carrera_model.js
const pool = require('../database/db');

/**
 * Asigna una carrera a un docente
 * @param {number} docenteId - ID del docente
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Object>} - Objeto con la relación creada
 */
async function asignarCarreraADocente(docenteId, carrera) {
  try {
    const query = `
      INSERT INTO docente_carrera (docente_id, carrera) 
      VALUES ($1, $2) 
      ON CONFLICT (docente_id, carrera) DO NOTHING
      RETURNING *
    `;
    
    const result = await pool.query(query, [docenteId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al asignar carrera a docente:', error);
    throw error;
  }
}

/**
 * Elimina la asignación de una carrera a un docente
 * @param {number} docenteId - ID del docente
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Object>} - Objeto con la relación eliminada
 */
async function eliminarCarreraDeDocente(docenteId, carrera) {
  try {
    const query = 'DELETE FROM docente_carrera WHERE docente_id = $1 AND carrera = $2 RETURNING *';
    const result = await pool.query(query, [docenteId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al eliminar carrera de docente:', error);
    throw error;
  }
}

/**
 * Obtiene todas las carreras asignadas a un docente
 * @param {number} docenteId - ID del docente
 * @returns {Promise<Array>} - Array con los nombres de las carreras
 */
async function obtenerCarrerasDeDocente(docenteId) {
  try {
    const query = 'SELECT carrera FROM docente_carrera WHERE docente_id = $1';
    const result = await pool.query(query, [docenteId]);
    return result.rows.map(row => row.carrera);
  } catch (error) {
    console.error('Error al obtener carreras de docente:', error);
    throw error;
  }
}

/**
 * Obtiene todos los docentes asignados a una carrera
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Array>} - Array con los IDs de los docentes
 */
async function obtenerDocentesPorCarrera(carrera) {
  try {
    const query = 'SELECT docente_id FROM docente_carrera WHERE carrera = $1';
    const result = await pool.query(query, [carrera]);
    return result.rows.map(row => row.docente_id);
  } catch (error) {
    console.error('Error al obtener docentes por carrera:', error);
    throw error;
  }
}

/**
 * Obtiene docentes con información detallada por carrera
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Array>} - Array con objetos de docente
 */
async function obtenerDocentesDetalladosPorCarrera(carrera) {
  try {
    const query = `
      SELECT d.* 
      FROM docentes d
      JOIN docente_carrera dc ON d.id = dc.docente_id
      WHERE dc.carrera = $1
    `;
    const result = await pool.query(query, [carrera]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener docentes detallados por carrera:', error);
    throw error;
  }
}

/**
 * Verifica si un docente está asignado a una carrera específica
 * @param {number} docenteId - ID del docente
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<boolean>} - true si el docente está asignado a la carrera
 */
async function docenteTieneCarrera(docenteId, carrera) {
  try {
    const query = 'SELECT 1 FROM docente_carrera WHERE docente_id = $1 AND carrera = $2';
    const result = await pool.query(query, [docenteId, carrera]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error al verificar si docente tiene carrera:', error);
    throw error;
  }
}

/**
 * Obtiene todas las relaciones docente-carrera
 * @returns {Promise<Array>} - Array con todas las relaciones
 */
async function obtenerTodasRelacionesDocenteCarrera() {
  try {
    const query = `
      SELECT dc.id, dc.docente_id, dc.carrera, dc.fecha_asignacion, d.nombre_completo 
      FROM docente_carrera dc
      JOIN docentes d ON dc.docente_id = d.id
      ORDER BY d.nombre_completo, dc.carrera
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener todas las relaciones docente-carrera:', error);
    throw error;
  }
}

/**
 * Asigna múltiples carreras a un docente
 * @param {number} docenteId - ID del docente
 * @param {Array<string>} carreras - Array con nombres de carreras
 * @returns {Promise<Object>} - Objeto con resultados de la operación
 */
async function asignarCarrerasADocente(docenteId, carreras) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Primero eliminamos todas las carreras existentes
    await client.query('DELETE FROM docente_carrera WHERE docente_id = $1', [docenteId]);
    
    // Luego insertamos las nuevas
    const resultados = [];
    for (const carrera of carreras) {
      const query = `
        INSERT INTO docente_carrera (docente_id, carrera) 
        VALUES ($1, $2) 
        RETURNING *
      `;
      const result = await client.query(query, [docenteId, carrera]);
      resultados.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    return { exito: true, resultados };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al asignar múltiples carreras a docente:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  asignarCarreraADocente,
  eliminarCarreraDeDocente,
  obtenerCarrerasDeDocente,
  obtenerDocentesPorCarrera,
  obtenerDocentesDetalladosPorCarrera,
  docenteTieneCarrera,
  obtenerTodasRelacionesDocenteCarrera,
  asignarCarrerasADocente
};