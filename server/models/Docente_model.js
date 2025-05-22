const pool = require('../database/db');
const docenteCarreraModel = require('./docente_carrera_model');
async function crearDocente(docente) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { carreras, ...datosDocente } = docente;
    const { nombre_completo, correo_electronico, cargo } = datosDocente;

    // Insertar docente básico - SELECT específico
    const queryDocente = `
      INSERT INTO docentes (nombre_completo, correo_electronico, cargo) 
      VALUES ($1, $2, $3) 
      RETURNING id, nombre_completo, correo_electronico, cargo
    `;
    const resultDocente = await client.query(queryDocente, [nombre_completo, correo_electronico, cargo]);
    const docenteCreado = resultDocente.rows[0];
    
    // Insertar carreras en batch si existen - Aprovecha idx_docente_carrera_docente_id
    if (carreras && Array.isArray(carreras) && carreras.length > 0) {
      const values = carreras.map((carrera, index) => 
        `($1, $${index + 2}, CURRENT_TIMESTAMP)`
      ).join(', ');
      
      const queryCarreras = `
        INSERT INTO docente_carrera (docente_id, carrera, fecha_asignacion) 
        VALUES ${values}
      `;
      await client.query(queryCarreras, [docenteCreado.id, ...carreras]);
    }
    
    await client.query('COMMIT');
    
    // Retornar con carreras usando una sola consulta optimizada
    return await obtenerDocentePorId(docenteCreado.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * OPTIMIZADO: Una sola consulta con JSON_AGG - Elimina N+1 problem
 * Aprovecha: idx_docente_carrera_docente_id
 */
async function obtenerDocentes(limit = 1000, offset = 0) {
  const query = `
    SELECT 
      d.id, d.nombre_completo, d.correo_electronico, d.cargo,
      COALESCE(
        JSON_AGG(dc.carrera ORDER BY dc.carrera) FILTER (WHERE dc.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM docentes d
    LEFT JOIN docente_carrera dc ON d.id = dc.docente_id
    GROUP BY d.id, d.nombre_completo, d.correo_electronico, d.cargo
    ORDER BY d.nombre_completo
    LIMIT $1 OFFSET $2
  `;
  
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

/**
 * OPTIMIZADO: Una sola consulta con JSON_AGG
 * Aprovecha: Primary key + idx_docente_carrera_docente_id
 */
async function obtenerDocentePorId(id) {
  const query = `
    SELECT 
      d.id, d.nombre_completo, d.correo_electronico, d.cargo,
      COALESCE(
        JSON_AGG(dc.carrera ORDER BY dc.carrera) FILTER (WHERE dc.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM docentes d
    LEFT JOIN docente_carrera dc ON d.id = dc.docente_id
    WHERE d.id = $1
    GROUP BY d.id, d.nombre_completo, d.correo_electronico, d.cargo
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * OPTIMIZADO: Aprovecha unique key en correo_electronico
 */
async function obtenerDocentePorCorreo(correo) {
  const query = `
    SELECT 
      d.id, d.nombre_completo, d.correo_electronico, d.cargo,
      COALESCE(
        JSON_AGG(dc.carrera ORDER BY dc.carrera) FILTER (WHERE dc.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM docentes d
    LEFT JOIN docente_carrera dc ON d.id = dc.docente_id
    WHERE d.correo_electronico = $1
    GROUP BY d.id, d.nombre_completo, d.correo_electronico, d.cargo
  `;
  
  const result = await pool.query(query, [correo]);
  return result.rows[0];
}

/**
 * OPTIMIZADO: Aprovecha idx_docente_carrera_carrera para filtrar eficientemente
 */
async function obtenerDocentesPorCarrera(carrera, limit = 500, offset = 0) {
  const query = `
    SELECT 
      d.id, d.nombre_completo, d.correo_electronico, d.cargo,
      COALESCE(
        JSON_AGG(dc_all.carrera ORDER BY dc_all.carrera) FILTER (WHERE dc_all.carrera IS NOT NULL), 
        '[]'
      ) as carreras
    FROM docentes d
    INNER JOIN docente_carrera dc_filter ON d.id = dc_filter.docente_id
    LEFT JOIN docente_carrera dc_all ON d.id = dc_all.docente_id
    WHERE dc_filter.carrera = $1
    GROUP BY d.id, d.nombre_completo, d.correo_electronico, d.cargo
    ORDER BY d.nombre_completo
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(query, [carrera, limit, offset]);
  return result.rows;
}

async function actualizarDocente(id, docente) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { carreras, ...datosDocente } = docente;
    const { nombre_completo, correo_electronico, cargo } = datosDocente;

    // Actualizar datos básicos del docente
    const queryDocente = `
      UPDATE docentes 
      SET nombre_completo = $1, correo_electronico = $2, cargo = $3 
      WHERE id = $4 
      RETURNING id, nombre_completo, correo_electronico, cargo
    `;
    const resultDocente = await client.query(queryDocente, [nombre_completo, correo_electronico, cargo, id]);
    
    if (resultDocente.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Si se proporcionaron carreras, actualizamos - Batch operation optimizada
    if (carreras && Array.isArray(carreras)) {
      // Eliminar carreras existentes - Aprovecha idx_docente_carrera_docente_id
      await client.query('DELETE FROM docente_carrera WHERE docente_id = $1', [id]);
      
      // Insertar nuevas carreras en batch
      if (carreras.length > 0) {
        const values = carreras.map((carrera, index) => 
          `($1, $${index + 2}, CURRENT_TIMESTAMP)`
        ).join(', ');
        
        const queryCarreras = `
          INSERT INTO docente_carrera (docente_id, carrera, fecha_asignacion) 
          VALUES ${values}
        `;
        await client.query(queryCarreras, [id, ...carreras]);
      }
    }
    
    await client.query('COMMIT');
    
    // Retornar docente actualizado con carreras
    return await obtenerDocentePorId(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * OPTIMIZADO: Una sola consulta para verificar todas las dependencias
 * Aprovecha todos los índices de foreign keys
 */
async function verificarDependenciasDocente(id) {
  const query = `
    SELECT 
      -- Grupos - Aprovecha idx_grupos_docente_id
      (SELECT COUNT(*) FROM grupos WHERE docente_id = $1) as grupos_count,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'nombre_proyecto', nombre_proyecto, 'carrera', carrera)) 
       FROM grupos WHERE docente_id = $1 LIMIT 10) as grupos_detalle,
      
      -- Rubricas - Aprovecha idx_rubricas_docente_id  
      (SELECT COUNT(*) FROM rubricas WHERE docente_id = $1) as rubricas_count,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'nota_final', nota_final)) 
       FROM rubricas WHERE docente_id = $1 LIMIT 10) as rubricas_detalle,
      
      -- Calificaciones - Aprovecha idx_calificaciones_docente_id
      (SELECT COUNT(*) FROM calificaciones WHERE docente_id = $1) as calificaciones_count,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'asignatura', asignatura)) 
       FROM calificaciones WHERE docente_id = $1 LIMIT 10) as calificaciones_detalle,
      
      -- Informes - Aprovecha idx_informes_docente_id
      (SELECT COUNT(*) FROM informes WHERE docente_id = $1) as informes_count,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'grupo_id', grupo_id)) 
       FROM informes WHERE docente_id = $1 LIMIT 10) as informes_detalle,
      
      -- Borradores - Aprovecha idx_borradores_docente_id
      (SELECT COUNT(*) FROM borradores WHERE docente_id = $1) as borradores_count,
      (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'grupo_id', grupo_id)) 
       FROM borradores WHERE docente_id = $1 LIMIT 10) as borradores_detalle,
      
      -- Carreras - Aprovecha idx_docente_carrera_docente_id
      (SELECT COUNT(*) FROM docente_carrera WHERE docente_id = $1) as carreras_count,
      (SELECT JSON_AGG(carrera) FROM docente_carrera WHERE docente_id = $1) as carreras_detalle
  `;
  
  const result = await pool.query(query, [id]);
  const row = result.rows[0];
  
  return {
    grupos: {
      cantidad: parseInt(row.grupos_count),
      detalle: row.grupos_detalle || []
    },
    rubricas: {
      cantidad: parseInt(row.rubricas_count),
      detalle: row.rubricas_detalle || []
    },
    calificaciones: {
      cantidad: parseInt(row.calificaciones_count),
      detalle: row.calificaciones_detalle || []
    },
    informes: {
      cantidad: parseInt(row.informes_count),
      detalle: row.informes_detalle || []
    },
    borradores: {
      cantidad: parseInt(row.borradores_count),
      detalle: row.borradores_detalle || []
    },
    carreras: {
      cantidad: parseInt(row.carreras_count),
      detalle: row.carreras_detalle || []
    },
    tieneDependencias: (
      parseInt(row.grupos_count) > 0 || 
      parseInt(row.rubricas_count) > 0 || 
      parseInt(row.calificaciones_count) > 0 ||
      parseInt(row.informes_count) > 0 ||
      parseInt(row.borradores_count) > 0 ||
      parseInt(row.carreras_count) > 0
    )
  };
}

/**
 * OPTIMIZADO: Eliminación segura con transacción y limpieza en orden correcto
 */
async function eliminarDocenteSeguro(id, docenteNuevoId = null, borrarGrupos = false) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtener dependencias
    const dependencias = await verificarDependenciasDocente(id);
    
    // Orden de eliminación respetando foreign keys
    // 1. Borradores primero - Aprovecha idx_borradores_docente_id
    if (dependencias.borradores.cantidad > 0) {
      await client.query('DELETE FROM borradores WHERE docente_id = $1', [id]);
    }
    
    // 2. Informes - Aprovecha idx_informes_docente_id
    if (dependencias.informes.cantidad > 0) {
      await client.query('DELETE FROM informes WHERE docente_id = $1', [id]);
    }
    
    // 3. Calificaciones - Aprovecha idx_calificaciones_docente_id
    if (dependencias.calificaciones.cantidad > 0) {
      await client.query('DELETE FROM calificaciones WHERE docente_id = $1', [id]);
    }
    
    // 4. Rúbricas - Aprovecha idx_rubricas_docente_id
    if (dependencias.rubricas.cantidad > 0) {
      await client.query('DELETE FROM rubricas WHERE docente_id = $1', [id]);
    }
    
    // 5. Manejar grupos - Aprovecha idx_grupos_docente_id
    if (dependencias.grupos.cantidad > 0) {
      if (borrarGrupos) {
        // Obtener IDs de grupos para eliminar asignaciones
        const gruposResult = await client.query('SELECT id FROM grupos WHERE docente_id = $1', [id]);
        const grupoIds = gruposResult.rows.map(g => g.id);
        
        if (grupoIds.length > 0) {
          // Eliminar asignaciones - Aprovecha idx_estudiante_grupo_grupo_activo
          const placeholders = grupoIds.map((_, i) => `$${i + 1}`).join(',');
          await client.query(`DELETE FROM estudiante_grupo WHERE grupo_id IN (${placeholders})`, grupoIds);
        }
        
        await client.query('DELETE FROM grupos WHERE docente_id = $1', [id]);
      } else if (docenteNuevoId) {
        await client.query('UPDATE grupos SET docente_id = $1 WHERE docente_id = $2', [docenteNuevoId, id]);
      } else {
        await client.query('UPDATE grupos SET docente_id = NULL WHERE docente_id = $1', [id]);
      }
    }
    
    // 6. Eliminar asignaciones de carrera - Aprovecha idx_docente_carrera_docente_id
    await client.query('DELETE FROM docente_carrera WHERE docente_id = $1', [id]);
    
    // 7. Eliminar docente
    const result = await client.query('DELETE FROM docentes WHERE id = $1 RETURNING id, nombre_completo, correo_electronico, cargo', [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    await client.query('COMMIT');
    
    return {
      docente: result.rows[0],
      dependenciasEliminadas: {
        grupos: dependencias.grupos.cantidad,
        rubricas: dependencias.rubricas.cantidad,
        calificaciones: dependencias.calificaciones.cantidad,
        informes: dependencias.informes.cantidad,
        borradores: dependencias.borradores.cantidad,
        carreras: dependencias.carreras.cantidad
      },
      accionGrupos: borrarGrupos ? 'eliminados' : (docenteNuevoId ? 'reasignados' : 'desasignados')
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Función de compatibilidad
async function eliminarDocente(id) {
  const resultado = await eliminarDocenteSeguro(id);
  return resultado ? resultado.docente : null;
}

/**
 * OPTIMIZADO: Obtener estadísticas de docentes con una sola consulta
 */
async function obtenerEstadisticasDocentes() {
  const query = `
    SELECT 
      COUNT(DISTINCT d.id) as total_docentes,
      COUNT(DISTINCT dc.carrera) as carreras_cubiertas,
      COUNT(DISTINCT g.id) as grupos_asignados,
      COUNT(DISTINCT CASE WHEN g.id IS NOT NULL THEN d.id END) as docentes_con_grupos,
      JSON_AGG(DISTINCT dc.carrera) FILTER (WHERE dc.carrera IS NOT NULL) as lista_carreras
    FROM docentes d
    LEFT JOIN docente_carrera dc ON d.id = dc.docente_id
    LEFT JOIN grupos g ON d.id = g.docente_id
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
}

module.exports = {
  crearDocente,
  obtenerDocentes,
  obtenerDocentePorId,
  actualizarDocente,
  eliminarDocente,
  obtenerDocentePorCorreo,
  // Nuevas funciones:
  verificarDependenciasDocente,
  eliminarDocenteSeguro,
  obtenerDocentesPorCarrera
};