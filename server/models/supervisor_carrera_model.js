// src/models/supervisor_carrera_model.js
const pool = require('../database/db');

/**
 * Asigna una carrera a un supervisor
 * @param {number} supervisorId - ID del supervisor
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Object>} - Objeto con la relación creada
 */
async function asignarCarreraASupervisor(supervisorId, carrera) {
  try {
    const query = `
      INSERT INTO supervisor_carrera (supervisor_id, carrera) 
      VALUES ($1, $2) 
      ON CONFLICT (supervisor_id, carrera) DO NOTHING
      RETURNING *
    `;
    
    const result = await pool.query(query, [supervisorId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al asignar carrera a supervisor:', error);
    throw error;
  }
}

/**
 * Elimina la asignación de una carrera a un supervisor
 * @param {number} supervisorId - ID del supervisor
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Object>} - Objeto con la relación eliminada
 */
async function eliminarCarreraDeSupervisor(supervisorId, carrera) {
  try {
    const query = 'DELETE FROM supervisor_carrera WHERE supervisor_id = $1 AND carrera = $2 RETURNING *';
    const result = await pool.query(query, [supervisorId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al eliminar carrera de supervisor:', error);
    throw error;
  }
}

/**
 * Obtiene todas las carreras asignadas a un supervisor
 * @param {number} supervisorId - ID del supervisor
 * @returns {Promise<Array>} - Array con los nombres de las carreras
 */
async function obtenerCarrerasDeSupervisor(supervisorId) {
  try {
    const query = 'SELECT carrera FROM supervisor_carrera WHERE supervisor_id = $1';
    const result = await pool.query(query, [supervisorId]);
    return result.rows.map(row => row.carrera);
  } catch (error) {
    console.error('Error al obtener carreras de supervisor:', error);
    throw error;
  }
}

/**
 * Obtiene todos los supervisores asignados a una carrera
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Array>} - Array con los IDs de los supervisores
 */
async function obtenerSupervisoresPorCarrera(carrera) {
  try {
    const query = 'SELECT supervisor_id FROM supervisor_carrera WHERE carrera = $1';
    const result = await pool.query(query, [carrera]);
    return result.rows.map(row => row.supervisor_id);
  } catch (error) {
    console.error('Error al obtener supervisores por carrera:', error);
    throw error;
  }
}

/**
 * Obtiene supervisores con información detallada por carrera
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<Array>} - Array con objetos de supervisor
 */
async function obtenerSupervisoresDetalladosPorCarrera(carrera) {
  try {
    const query = `
      SELECT s.* 
      FROM supervisores s
      JOIN supervisor_carrera sc ON s.id = sc.supervisor_id
      WHERE sc.carrera = $1
    `;
    const result = await pool.query(query, [carrera]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener supervisores detallados por carrera:', error);
    throw error;
  }
}

/**
 * Verifica si un supervisor está asignado a una carrera específica
 * @param {number} supervisorId - ID del supervisor
 * @param {string} carrera - Nombre de la carrera
 * @returns {Promise<boolean>} - true si el supervisor está asignado a la carrera
 */
async function supervisorTieneCarrera(supervisorId, carrera) {
  try {
    const query = 'SELECT 1 FROM supervisor_carrera WHERE supervisor_id = $1 AND carrera = $2';
    const result = await pool.query(query, [supervisorId, carrera]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error al verificar si supervisor tiene carrera:', error);
    throw error;
  }
}

/**
 * Obtiene todas las relaciones supervisor-carrera
 * @returns {Promise<Array>} - Array con todas las relaciones
 */
async function obtenerTodasRelacionesSupervisorCarrera() {
  try {
    const query = `
      SELECT sc.id, sc.supervisor_id, sc.carrera, sc.fecha_asignacion, s.nombre_completo 
      FROM supervisor_carrera sc
      JOIN supervisores s ON sc.supervisor_id = s.id
      ORDER BY s.nombre_completo, sc.carrera
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener todas las relaciones supervisor-carrera:', error);
    throw error;
  }
}

/**
 * Asigna múltiples carreras a un supervisor
 * @param {number} supervisorId - ID del supervisor
 * @param {Array<string>} carreras - Array con nombres de carreras
 * @returns {Promise<Object>} - Objeto con resultados de la operación
 */
async function asignarCarrerasASupervisor(supervisorId, carreras) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Primero eliminamos todas las carreras existentes
    await client.query('DELETE FROM supervisor_carrera WHERE supervisor_id = $1', [supervisorId]);
    
    // Luego insertamos las nuevas
    const resultados = [];
    for (const carrera of carreras) {
      const query = `
        INSERT INTO supervisor_carrera (supervisor_id, carrera) 
        VALUES ($1, $2) 
        RETURNING *
      `;
      const result = await client.query(query, [supervisorId, carrera]);
      resultados.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    return { exito: true, resultados };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al asignar múltiples carreras a supervisor:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  asignarCarreraASupervisor,
  eliminarCarreraDeSupervisor,
  obtenerCarrerasDeSupervisor,
  obtenerSupervisoresPorCarrera,
  obtenerSupervisoresDetalladosPorCarrera,
  supervisorTieneCarrera,
  obtenerTodasRelacionesSupervisorCarrera,
  asignarCarrerasASupervisor
};