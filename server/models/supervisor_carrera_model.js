// src/models/supervisor_carrera_model.js
const pool = require('../database/db');

async function asignarCarreraASupervisor(supervisorId, carrera) {
  try {
    const query = `
      INSERT INTO supervisor_carrera (supervisor_id, carrera, fecha_asignacion) 
      VALUES ($1, $2, CURRENT_TIMESTAMP) 
      ON CONFLICT (supervisor_id, carrera) DO UPDATE SET fecha_asignacion = CURRENT_TIMESTAMP
      RETURNING id, supervisor_id, carrera, fecha_asignacion
    `;
    
    const result = await pool.query(query, [supervisorId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al asignar carrera a supervisor:', error);
    throw error;
  }
}

async function eliminarCarreraDeSupervisor(supervisorId, carrera) {
  try {
    const query = `
      DELETE FROM supervisor_carrera WHERE supervisor_id = $1 AND carrera = $2 
      RETURNING id, supervisor_id, carrera, fecha_asignacion
    `;
    const result = await pool.query(query, [supervisorId, carrera]);
    return result.rows[0];
  } catch (error) {
    console.error('Error al eliminar carrera de supervisor:', error);
    throw error;
  }
}

async function obtenerCarrerasDeSupervisor(supervisorId) {
  try {
    const query = `
      SELECT carrera 
      FROM supervisor_carrera 
      WHERE supervisor_id = $1
      ORDER BY carrera
    `;
    const result = await pool.query(query, [supervisorId]);
    return result.rows.map(row => row.carrera);
  } catch (error) {
    console.error('Error al obtener carreras de supervisor:', error);
    throw error;
  }
}

async function obtenerSupervisoresPorCarrera(carrera) {
  try {
    const query = `
      SELECT supervisor_id 
      FROM supervisor_carrera 
      WHERE carrera = $1
      ORDER BY supervisor_id
    `;
    const result = await pool.query(query, [carrera]);
    return result.rows.map(row => row.supervisor_id);
  } catch (error) {
    console.error('Error al obtener supervisores por carrera:', error);
    throw error;
  }
}

async function obtenerSupervisoresDetalladosPorCarrera(carrera) {
  try {
    const query = `
      SELECT 
        s.id, s.nombre_completo, s.correo_electronico, s.cargo,
        sc.fecha_asignacion
      FROM supervisores s
      INNER JOIN supervisor_carrera sc ON s.id = sc.supervisor_id
      WHERE sc.carrera = $1
      ORDER BY s.nombre_completo
    `;
    const result = await pool.query(query, [carrera]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener supervisores detallados por carrera:', error);
    throw error;
  }
}

async function supervisorTieneCarrera(supervisorId, carrera) {
  try {
    const query = `
      SELECT 1 FROM supervisor_carrera 
      WHERE supervisor_id = $1 AND carrera = $2 
      LIMIT 1
    `;
    const result = await pool.query(query, [supervisorId, carrera]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error al verificar si supervisor tiene carrera:', error);
    throw error;
  }
}

async function obtenerTodasRelacionesSupervisorCarrera(limit = 1000, offset = 0) {
  try {
    const query = `
      SELECT 
        sc.id, sc.supervisor_id, sc.carrera, sc.fecha_asignacion, 
        s.nombre_completo, s.correo_electronico
      FROM supervisor_carrera sc
      INNER JOIN supervisores s ON sc.supervisor_id = s.id
      ORDER BY s.nombre_completo, sc.carrera
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener todas las relaciones supervisor-carrera:', error);
    throw error;
  }
}

async function asignarCarrerasASupervisor(supervisorId, carreras) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Eliminar carreras existentes
    await client.query('DELETE FROM supervisor_carrera WHERE supervisor_id = $1', [supervisorId]);
    
    // Insertar nuevas carreras en batch si hay carreras
    if (carreras && carreras.length > 0) {
      const values = carreras.map((carrera, index) => 
        `($1, $${index + 2}, CURRENT_TIMESTAMP)`
      ).join(', ');
      
      const query = `
        INSERT INTO supervisor_carrera (supervisor_id, carrera, fecha_asignacion) 
        VALUES ${values}
        RETURNING *
      `;
      
      const result = await client.query(query, [supervisorId, ...carreras]);
      
      await client.query('COMMIT');
      return { exito: true, resultados: result.rows };
    }
    
    await client.query('COMMIT');
    return { exito: true, resultados: [] };
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