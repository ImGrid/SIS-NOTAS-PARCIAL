// src/models/docente_carrera_model.js
const pool = require('../database/db');
async function asignarCarreraADocente(docenteId, carrera) {
  try {
    const query = `
      INSERT INTO docente_carrera (docente_id, carrera, fecha_asignacion) 
      VALUES ($1, $2, CURRENT_TIMESTAMP) 
      ON CONFLICT (docente_id, carrera) DO UPDATE SET fecha_asignacion = CURRENT_TIMESTAMP
      RETURNING id, docente_id, carrera, fecha_asignacion
    `;
    
    const result = await pool.query(query, [docenteId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al asignar carrera a docente:', error);
    throw error;
  }
}

async function eliminarCarreraDeDocente(docenteId, carrera) {
  try {
    const query = `
      DELETE FROM docente_carrera WHERE docente_id = $1 AND carrera = $2 
      RETURNING id, docente_id, carrera, fecha_asignacion
    `;
    const result = await pool.query(query, [docenteId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al eliminar carrera de docente:', error);
    throw error;
  }
}

/**
 * VERSIÓN OPTIMIZADA: Usar índice en docente_id
 */
async function obtenerCarrerasDeDocente(docenteId) {
  try {
    const query = `
      SELECT carrera 
      FROM docente_carrera 
      WHERE docente_id = $1
      ORDER BY carrera
    `;
    const result = await pool.query(query, [docenteId]);
    return result.rows.map(row => row.carrera);
  } catch (error) {
    console.error('Error al obtener carreras de docente:', error);
    throw error;
  }
}

/**
 * VERSIÓN OPTIMIZADA: Usar índice en carrera
 */
async function obtenerDocentesPorCarrera(carrera) {
  try {
    const query = `
      SELECT docente_id 
      FROM docente_carrera 
      WHERE carrera = $1
      ORDER BY docente_id
    `;
    const result = await pool.query(query, [carrera]);
    return result.rows.map(row => row.docente_id);
  } catch (error) {
    console.error('Error al obtener docentes por carrera:', error);
    throw error;
  }
}

/**
 * VERSIÓN OPTIMIZADA: JOIN eficiente con información completa del docente
 */
async function obtenerDocentesDetalladosPorCarrera(carrera) {
  try {
    const query = `
      SELECT 
        d.id, d.nombre_completo, d.correo_electronico, d.cargo,
        dc.fecha_asignacion
      FROM docentes d
      INNER JOIN docente_carrera dc ON d.id = dc.docente_id
      WHERE dc.carrera = $1
      ORDER BY d.nombre_completo
    `;
    const result = await pool.query(query, [carrera]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener docentes detallados por carrera:', error);
    throw error;
  }
}

/**
 * VERSIÓN OPTIMIZADA: Consulta directa usando índice único
 */
async function docenteTieneCarrera(docenteId, carrera) {
  try {
    const query = `
      SELECT 1 FROM docente_carrera 
      WHERE docente_id = $1 AND carrera = $2 
      LIMIT 1
    `;
    const result = await pool.query(query, [docenteId, carrera]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error al verificar si docente tiene carrera:', error);
    throw error;
  }
}

/**
 * VERSIÓN OPTIMIZADA: JOIN eficiente con información del docente
 */
async function obtenerTodasRelacionesDocenteCarrera(limit = 1000, offset = 0) {
  try {
    const query = `
      SELECT 
        dc.id, dc.docente_id, dc.carrera, dc.fecha_asignacion, 
        d.nombre_completo, d.correo_electronico
      FROM docente_carrera dc
      INNER JOIN docentes d ON dc.docente_id = d.id
      ORDER BY d.nombre_completo, dc.carrera
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener todas las relaciones docente-carrera:', error);
    throw error;
  }
}

/**
 * VERSIÓN OPTIMIZADA: Operación en batch más eficiente
 */
async function asignarCarrerasADocente(docenteId, carreras) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Eliminar carreras existentes
    await client.query('DELETE FROM docente_carrera WHERE docente_id = $1', [docenteId]);
    
    // Insertar nuevas carreras en batch si hay carreras
    if (carreras && carreras.length > 0) {
      const values = carreras.map((carrera, index) => 
        `($1, $${index + 2}, CURRENT_TIMESTAMP)`
      ).join(', ');
      
      const query = `
        INSERT INTO docente_carrera (docente_id, carrera, fecha_asignacion) 
        VALUES ${values}
        RETURNING *
      `;
      
      const result = await client.query(query, [docenteId, ...carreras]);
      
      await client.query('COMMIT');
      return { exito: true, resultados: result.rows };
    }
    
    await client.query('COMMIT');
    return { exito: true, resultados: [] };
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