const pool = require('../database/db');
const supervisorCarreraModel = require('./supervisor_carrera_model');

async function crearSupervisor(supervisor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { carreras, ...datosSupervisor } = supervisor;
    const { nombre_completo, correo_electronico, cargo } = datosSupervisor;

    // Insertar supervisor básico - SELECT específico
    const querySupervisor = `
      INSERT INTO supervisores (nombre_completo, correo_electronico, cargo) 
      VALUES ($1, $2, $3) 
      RETURNING id, nombre_completo, correo_electronico, cargo
    `;
    const resultSupervisor = await client.query(querySupervisor, [nombre_completo, correo_electronico, cargo]);
    const supervisorCreado = resultSupervisor.rows[0];
    
    // Insertar carreras en batch si existen - Aprovecha idx_supervisor_carrera_supervisor_id
    if (carreras && Array.isArray(carreras) && carreras.length > 0) {
      const values = carreras.map((carrera, index) => 
        `($1, $${index + 2}, CURRENT_TIMESTAMP)`
      ).join(', ');
      
      const queryCarreras = `
        INSERT INTO supervisor_carrera (supervisor_id, carrera, fecha_asignacion) 
        VALUES ${values}
      `;
      await client.query(queryCarreras, [supervisorCreado.id, ...carreras]);
    }
    
    await client.query('COMMIT');
    
    // Retornar con carreras usando consulta optimizada
    return await obtenerSupervisorPorId(supervisorCreado.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * OPTIMIZADO: Una sola consulta con JSON_AGG - Elimina N+1 problem
 * Aprovecha: idx_supervisor_carrera_supervisor_id
 */
async function obtenerSupervisores(limit = 500, offset = 0) {
  const query = `
    SELECT 
      s.id, s.nombre_completo, s.correo_electronico, s.cargo,
      COALESCE(
        JSON_AGG(sc.carrera ORDER BY sc.carrera) FILTER (WHERE sc.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM supervisores s
    LEFT JOIN supervisor_carrera sc ON s.id = sc.supervisor_id
    GROUP BY s.id, s.nombre_completo, s.correo_electronico, s.cargo
    ORDER BY s.nombre_completo
    LIMIT $1 OFFSET $2
  `;
  
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

/**
 * OPTIMIZADO: Una sola consulta con JSON_AGG
 * Aprovecha: Primary key + idx_supervisor_carrera_supervisor_id
 */
async function obtenerSupervisorPorId(id) {
  const query = `
    SELECT 
      s.id, s.nombre_completo, s.correo_electronico, s.cargo,
      COALESCE(
        JSON_AGG(sc.carrera ORDER BY sc.carrera) FILTER (WHERE sc.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM supervisores s
    LEFT JOIN supervisor_carrera sc ON s.id = sc.supervisor_id
    WHERE s.id = $1
    GROUP BY s.id, s.nombre_completo, s.correo_electronico, s.cargo
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * OPTIMIZADO: Aprovecha unique key en correo_electronico
 */
async function obtenerSupervisorPorCorreo(correo) {
  const query = `
    SELECT 
      s.id, s.nombre_completo, s.correo_electronico, s.cargo,
      COALESCE(
        JSON_AGG(sc.carrera ORDER BY sc.carrera) FILTER (WHERE sc.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM supervisores s
    LEFT JOIN supervisor_carrera sc ON s.id = sc.supervisor_id
    WHERE s.correo_electronico = $1
    GROUP BY s.id, s.nombre_completo, s.correo_electronico, s.cargo
  `;
  
  const result = await pool.query(query, [correo]);
  return result.rows[0];
}

/**
 * OPTIMIZADO: Aprovecha idx_supervisor_carrera_carrera para filtrar eficientemente
 */
async function obtenerSupervisoresPorCarrera(carrera, limit = 200, offset = 0) {
  const query = `
    SELECT 
      s.id, s.nombre_completo, s.correo_electronico, s.cargo,
      COALESCE(
        JSON_AGG(sc_all.carrera ORDER BY sc_all.carrera) FILTER (WHERE sc_all.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM supervisores s
    INNER JOIN supervisor_carrera sc_filter ON s.id = sc_filter.supervisor_id
    LEFT JOIN supervisor_carrera sc_all ON s.id = sc_all.supervisor_id
    WHERE sc_filter.carrera = $1
    GROUP BY s.id, s.nombre_completo, s.correo_electronico, s.cargo
    ORDER BY s.nombre_completo
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(query, [carrera, limit, offset]);
  return result.rows;
}

async function actualizarSupervisor(id, supervisor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { carreras, ...datosSupervisor } = supervisor;
    const { nombre_completo, correo_electronico, cargo } = datosSupervisor;

    // Actualizar datos básicos del supervisor
    const querySupervisor = `
      UPDATE supervisores 
      SET nombre_completo = $1, correo_electronico = $2, cargo = $3 
      WHERE id = $4 
      RETURNING id, nombre_completo, correo_electronico, cargo
    `;
    const resultSupervisor = await client.query(querySupervisor, [nombre_completo, correo_electronico, cargo, id]);
    
    if (resultSupervisor.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Si se proporcionaron carreras, actualizamos - Batch operation optimizada
    if (carreras && Array.isArray(carreras)) {
      // Eliminar carreras existentes - Aprovecha idx_supervisor_carrera_supervisor_id
      await client.query('DELETE FROM supervisor_carrera WHERE supervisor_id = $1', [id]);
      
      // Insertar nuevas carreras en batch
      if (carreras.length > 0) {
        const values = carreras.map((carrera, index) => 
          `($1, $${index + 2}, CURRENT_TIMESTAMP)`
        ).join(', ');
        
        const queryCarreras = `
          INSERT INTO supervisor_carrera (supervisor_id, carrera, fecha_asignacion) 
          VALUES ${values}
        `;
        await client.query(queryCarreras, [id, ...carreras]);
      }
    }
    
    await client.query('COMMIT');
    
    // Retornar supervisor actualizado con carreras
    return await obtenerSupervisorPorId(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function eliminarSupervisor(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Eliminar asignaciones de carrera - Aprovecha idx_supervisor_carrera_supervisor_id
    await client.query('DELETE FROM supervisor_carrera WHERE supervisor_id = $1', [id]);
    
    // 2. Manejar habilitaciones - Aprovecha idx_habilitaciones_supervisor_id
    // Desactivar habilitaciones activas
    await client.query(`
      UPDATE habilitaciones_rubricas
      SET activa = false, 
          fecha_desactivacion = CURRENT_TIMESTAMP,
          supervisor_desactivacion_id = NULL
      WHERE supervisor_id = $1 AND activa = true
    `, [id]);
    
    // Limpiar referencias de supervisor_desactivacion_id
    await client.query(`
      UPDATE habilitaciones_rubricas
      SET supervisor_desactivacion_id = NULL
      WHERE supervisor_desactivacion_id = $1
    `, [id]);
    
    // 3. Eliminar el supervisor
    const result = await client.query(
      'DELETE FROM supervisores WHERE id = $1 RETURNING id, nombre_completo, correo_electronico, cargo', 
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Verifica si un correo corresponde a un supervisor
async function verificarCorreoSupervisor(correo) {
  const supervisor = await obtenerSupervisorPorCorreo(correo);
  return !!supervisor;
}

// Verifica la clave secreta del sistema
async function autenticarSupervisor(correo, claveSecreta) {
  try {
    const supervisor = await obtenerSupervisorPorCorreo(correo);
    
    if (!supervisor) {
      return { success: false, message: 'Supervisor no encontrado' };
    }
    
    if (claveSecreta !== process.env.ADMIN_SECRET_KEY) {
      return { success: false, message: 'Clave secreta incorrecta' };
    }
    
    return { 
      success: true, 
      supervisor: {
        id: supervisor.id,
        correo: supervisor.correo_electronico,
        nombre: supervisor.nombre_completo,
        cargo: supervisor.cargo,
        carreras: supervisor.carreras
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * FUNCIONES OPTIMIZADAS PARA GESTIÓN DE RÚBRICAS
 */

/**
 * OPTIMIZADA: Una consulta eficiente con LEFT JOINs
 * Aprovecha: idx_grupos_carrera, idx_informes_grupo_id, idx_rubricas_docente_id
 */
async function obtenerTodasRubricas(carrerasFiltro = [], limit = 1000, offset = 0) {
  let query = `
    SELECT 
      r.id as rubrica_id, r.presentacion, r.sustentacion, r.documentacion, r.innovacion, 
      r.nota_final, r.observaciones, r.comentarios, r.docente_id, r.fecha_creacion,
      d.nombre_completo AS docente_nombre,
      i.id AS informe_id, i.grupo_id, i.estudiante_id, i.comentarios_generales,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia,
      e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido, e.codigo AS estudiante_codigo
    FROM rubricas r
    LEFT JOIN docentes d ON r.docente_id = d.id
    LEFT JOIN informes i ON r.id = i.rubrica_id
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
  `;
  
  const params = [];
  
  // Aplicar filtro de carreras si se proporciona - Aprovecha idx_grupos_carrera
  if (carrerasFiltro && carrerasFiltro.length > 0) {
    const placeholders = carrerasFiltro.map((_, i) => `$${i + 1}`).join(',');
    query += ` WHERE g.carrera IN (${placeholders})`;
    params.push(...carrerasFiltro);
  }
  
  query += ` ORDER BY g.carrera, g.id, r.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * OPTIMIZADA: Aprovecha idx_informes_grupo_id directamente
 */
async function obtenerRubricasPorGrupo(grupoId) {
  const query = `
    SELECT 
      r.id as rubrica_id, r.presentacion, r.sustentacion, r.documentacion, r.innovacion, 
      r.nota_final, r.observaciones, r.comentarios, r.docente_id, r.fecha_creacion,
      d.nombre_completo AS docente_nombre,
      i.id AS informe_id, i.estudiante_id, i.comentarios_generales,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia,
      e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido, e.codigo AS estudiante_codigo
    FROM informes i
    INNER JOIN rubricas r ON r.id = i.rubrica_id
    LEFT JOIN docentes d ON r.docente_id = d.id
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
    WHERE i.grupo_id = $1
    ORDER BY e.apellido, e.nombre
  `;
  
  const result = await pool.query(query, [grupoId]);
  return result.rows;
}

/**
 * OPTIMIZADA: Una sola consulta en lugar de dos separadas
 * Aprovecha: idx_estudiante_grupo_grupo_activo, idx_informes_grupo_id
 */
async function contarEstudiantesEInformes(grupoId) {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM estudiante_grupo WHERE grupo_id = $1 AND activo = true) AS total_estudiantes,
      (SELECT COUNT(*) FROM informes WHERE grupo_id = $1) AS total_informes
  `;
  
  const result = await pool.query(query, [grupoId]);
  return {
    total_estudiantes: parseInt(result.rows[0].total_estudiantes),
    total_informes: parseInt(result.rows[0].total_informes)
  };
}

async function habilitarRubricaGrupo(grupoId, supervisorId, motivo) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Registrar la habilitación
    const insertQuery = `
      INSERT INTO habilitaciones_rubricas (
        grupo_id, supervisor_id, motivo, fecha_habilitacion, activa
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true)
      RETURNING id, grupo_id, supervisor_id, motivo, fecha_habilitacion, activa
    `;
    
    const habilitacionResult = await client.query(insertQuery, [grupoId, supervisorId, motivo]);
    
    // 2. Verificar que existan informes - Aprovecha idx_informes_grupo_id
    const informesQuery = 'SELECT COUNT(*) as count FROM informes WHERE grupo_id = $1';
    const informesResult = await client.query(informesQuery, [grupoId]);
    
    if (parseInt(informesResult.rows[0].count) === 0) {
      await client.query('ROLLBACK');
      throw new Error('No hay informes para habilitar en este grupo');
    }
    
    await client.query('COMMIT');
    
    return {
      habilitacion: habilitacionResult.rows[0],
      informes_afectados: parseInt(informesResult.rows[0].count)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * OPTIMIZADA: Aprovecha idx_habilitaciones_grupo_id y idx_habilitaciones_activa
 */
async function verificarHabilitacionActiva(grupoId) {
  const query = `
    SELECT id, grupo_id, supervisor_id, motivo, fecha_habilitacion, activa
    FROM habilitaciones_rubricas 
    WHERE grupo_id = $1 AND activa = true
    ORDER BY fecha_habilitacion DESC 
    LIMIT 1
  `;
  
  const result = await pool.query(query, [grupoId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * OPTIMIZADA: Aprovecha idx_habilitaciones_grupo_id con JOIN
 */
async function obtenerHistorialHabilitaciones(grupoId, limit = 50, offset = 0) {
  const query = `
    SELECT 
      h.id, h.grupo_id, h.supervisor_id, h.motivo, 
      h.fecha_habilitacion, h.activa, h.fecha_desactivacion,
      s.nombre_completo AS supervisor_nombre,
      sd.nombre_completo AS supervisor_desactivacion_nombre
    FROM habilitaciones_rubricas h
    LEFT JOIN supervisores s ON h.supervisor_id = s.id
    LEFT JOIN supervisores sd ON h.supervisor_desactivacion_id = sd.id
    WHERE h.grupo_id = $1
    ORDER BY h.fecha_habilitacion DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(query, [grupoId, limit, offset]);
  return result.rows;
}

async function desactivarHabilitacion(habilitacionId, supervisorDesactivacionId = null) {
  try {
    const query = `
      UPDATE habilitaciones_rubricas 
      SET 
        activa = false,
        fecha_desactivacion = CURRENT_TIMESTAMP,
        supervisor_desactivacion_id = $2
      WHERE id = $1
      RETURNING id, grupo_id, supervisor_id, motivo, fecha_habilitacion, activa, fecha_desactivacion
    `;
    
    const result = await pool.query(query, [habilitacionId, supervisorDesactivacionId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
}

module.exports = {
  crearSupervisor,
  obtenerSupervisores,
  obtenerSupervisorPorId,
  obtenerSupervisorPorCorreo,
  actualizarSupervisor,
  eliminarSupervisor,
  verificarCorreoSupervisor,
  autenticarSupervisor,
  
  // Funciones para gestión de rúbricas
  obtenerTodasRubricas,
  obtenerRubricasPorGrupo,
  contarEstudiantesEInformes,
  habilitarRubricaGrupo,
  verificarHabilitacionActiva,
  obtenerHistorialHabilitaciones,
  desactivarHabilitacion,
  
  // Función para obtener supervisores por carrera
  obtenerSupervisoresPorCarrera
};