const pool = require('../database/db');
const docenteCarreraModel = require('./docente_carrera_model');

async function crearDocente(docente) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Extraer carreras (si existen) y el resto de datos del docente
    const { carreras, ...datosDocente } = docente;
    const { nombre_completo, correo_electronico, cargo } = datosDocente;

    // Insertar docente básico
    const queryDocente = 'INSERT INTO docentes (nombre_completo, correo_electronico, cargo) VALUES ($1, $2, $3) RETURNING *';
    const valuesDocente = [nombre_completo, correo_electronico, cargo];
    const resultDocente = await client.query(queryDocente, valuesDocente);
    const docenteCreado = resultDocente.rows[0];
    
    // Si hay carreras especificadas, asignarlas
    if (carreras && Array.isArray(carreras) && carreras.length > 0) {
      for (const carrera of carreras) {
        const queryCarrera = 'INSERT INTO docente_carrera (docente_id, carrera) VALUES ($1, $2)';
        await client.query(queryCarrera, [docenteCreado.id, carrera]);
      }
    }
    
    await client.query('COMMIT');
    
    // Obtener las carreras asignadas
    const carrerasAsignadas = await docenteCarreraModel.obtenerCarrerasDeDocente(docenteCreado.id);
    
    // Devolver docente con sus carreras
    return {
      ...docenteCreado,
      carreras: carrerasAsignadas
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerDocentes() {
  try {
    // Primero obtenemos todos los docentes
    const result = await pool.query('SELECT * FROM docentes');
    const docentes = result.rows;
    
    // Para cada docente, obtenemos sus carreras
    for (const docente of docentes) {
      const carreras = await docenteCarreraModel.obtenerCarrerasDeDocente(docente.id);
      docente.carreras = carreras;
    }
    
    return docentes;
  } catch (error) {
    console.error('Error al obtener docentes con carreras:', error);
    throw error;
  }
}

async function obtenerDocentePorId(id) {
  try {
    const result = await pool.query('SELECT * FROM docentes WHERE id = $1', [id]);
    const docente = result.rows[0];
    
    if (docente) {
      // Obtener carreras asignadas
      const carreras = await docenteCarreraModel.obtenerCarrerasDeDocente(docente.id);
      docente.carreras = carreras;
    }
    
    return docente;
  } catch (error) {
    console.error('Error al obtener docente por ID con carreras:', error);
    throw error;
  }
}

async function obtenerDocentePorCorreo(correo) {
  try {
    // Obtener el docente básico
    const result = await pool.query('SELECT * FROM docentes WHERE correo_electronico = $1', [correo]);
    const docente = result.rows[0];
    
    if (docente) {
      // Obtener sus carreras asignadas
      const carreras = await docenteCarreraModel.obtenerCarrerasDeDocente(docente.id);
      docente.carreras = carreras;
    }
    
    return docente;
  } catch (error) {
    console.error('Error al obtener docente por correo con carreras:', error);
    throw error;
  }
}

async function actualizarDocente(id, docente) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Extraer carreras (si existen) y el resto de datos del docente
    const { carreras, ...datosDocente } = docente;
    const { nombre_completo, correo_electronico, cargo } = datosDocente;

    // Actualizar datos básicos del docente
    const queryDocente = 'UPDATE docentes SET nombre_completo = $1, correo_electronico = $2, cargo = $3 WHERE id = $4 RETURNING *';
    const valuesDocente = [nombre_completo, correo_electronico, cargo, id];
    const resultDocente = await client.query(queryDocente, valuesDocente);
    
    // Si no hay docente para actualizar, terminamos
    if (resultDocente.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    const docenteActualizado = resultDocente.rows[0];
    
    // Si se proporcionaron carreras, actualizamos asignaciones
    if (carreras && Array.isArray(carreras)) {
      // Primero eliminamos asignaciones existentes
      await client.query('DELETE FROM docente_carrera WHERE docente_id = $1', [id]);
      
      // Luego insertamos las nuevas
      for (const carrera of carreras) {
        const queryCarrera = 'INSERT INTO docente_carrera (docente_id, carrera) VALUES ($1, $2)';
        await client.query(queryCarrera, [id, carrera]);
      }
    }
    
    await client.query('COMMIT');
    
    // Obtener las carreras actualizadas
    const carrerasActualizadas = await docenteCarreraModel.obtenerCarrerasDeDocente(id);
    
    // Devolver docente con sus carreras
    return {
      ...docenteActualizado,
      carreras: carrerasActualizadas
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica si un docente tiene dependencias (grupos, rúbricas, calificaciones, informes, etc.)
 * @param {number} id - ID del docente
 * @returns {Promise<Object>} - Objeto con información sobre las dependencias
 */
async function verificarDependenciasDocente(id) {
  // Se utiliza un objeto para almacenar toda la información de las consultas
  const dependencias = {
    grupos: {
      cantidad: 0,
      detalle: []
    },
    rubricas: {
      cantidad: 0,
      detalle: []
    },
    calificaciones: {
      cantidad: 0,
      detalle: []
    },
    informes: {
      cantidad: 0,
      detalle: []
    },
    borradores: {
      cantidad: 0,
      detalle: []
    },
    carreras: {
      cantidad: 0,
      detalle: []
    }
  };

  // Buscar grupos asociados
  const gruposQuery = await pool.query(`
    SELECT id, nombre_proyecto, carrera, semestre, materia
    FROM grupos
    WHERE docente_id = $1
  `, [id]);
  
  dependencias.grupos.cantidad = gruposQuery.rows.length;
  dependencias.grupos.detalle = gruposQuery.rows;

  // Buscar rúbricas
  const rubricasQuery = await pool.query(`
    SELECT id, presentacion, sustentacion, documentacion, innovacion, nota_final
    FROM rubricas
    WHERE docente_id = $1
  `, [id]);
  
  dependencias.rubricas.cantidad = rubricasQuery.rows.length;
  dependencias.rubricas.detalle = rubricasQuery.rows;

  // Buscar calificaciones
  const calificacionesQuery = await pool.query(`
    SELECT id, gestion, periodo, asignatura, estudiante_id
    FROM calificaciones 
    WHERE docente_id = $1
  `, [id]);
  
  dependencias.calificaciones.cantidad = calificacionesQuery.rows.length;
  dependencias.calificaciones.detalle = calificacionesQuery.rows;

  // Buscar informes
  const informesQuery = await pool.query(`
    SELECT id, grupo_id, estudiante_id, calificacion_id, rubrica_id
    FROM informes
    WHERE docente_id = $1
  `, [id]);
  
  dependencias.informes.cantidad = informesQuery.rows.length;
  dependencias.informes.detalle = informesQuery.rows;

  // Buscar borradores
  const borradoresQuery = await pool.query(`
    SELECT id, grupo_id, progreso
    FROM borradores
    WHERE docente_id = $1
  `, [id]);
  
  dependencias.borradores.cantidad = borradoresQuery.rows.length;
  dependencias.borradores.detalle = borradoresQuery.rows;

  // Buscar carreras asignadas
  const carrerasQuery = await pool.query(`
    SELECT carrera
    FROM docente_carrera
    WHERE docente_id = $1
  `, [id]);
  
  dependencias.carreras.cantidad = carrerasQuery.rows.length;
  dependencias.carreras.detalle = carrerasQuery.rows;

  // Calcular si tiene dependencias
  dependencias.tieneDependencias = (
    dependencias.grupos.cantidad > 0 || 
    dependencias.rubricas.cantidad > 0 || 
    dependencias.calificaciones.cantidad > 0 ||
    dependencias.informes.cantidad > 0 ||
    dependencias.borradores.cantidad > 0 ||
    dependencias.carreras.cantidad > 0
  );

  return dependencias;
}

/**
 * Elimina un docente y maneja sus dependencias de forma segura
 * @param {number} id - ID del docente
 * @param {number|null} docenteNuevoId - ID del docente al que reasignar (opcional)
 * @param {boolean} borrarGrupos - Si es true, elimina los grupos en lugar de reasignarlos
 * @returns {Promise<Object>} - Resultado de la eliminación con detalles
 */
async function eliminarDocenteSeguro(id, docenteNuevoId = null, borrarGrupos = false) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Obtener dependencias para informar al usuario
    const dependencias = await verificarDependenciasDocente(id);
    
    // 2. Eliminar borradores primero
    if (dependencias.borradores.cantidad > 0) {
      await client.query('DELETE FROM borradores WHERE docente_id = $1', [id]);
    }
    
    // 3. Eliminar informes
    if (dependencias.informes.cantidad > 0) {
      await client.query('DELETE FROM informes WHERE docente_id = $1', [id]);
    }
    
    // 4. Eliminar calificaciones
    if (dependencias.calificaciones.cantidad > 0) {
      await client.query('DELETE FROM calificaciones WHERE docente_id = $1', [id]);
    }
    
    // 5. Eliminar rúbricas
    if (dependencias.rubricas.cantidad > 0) {
      await client.query('DELETE FROM rubricas WHERE docente_id = $1', [id]);
    }
    
    // 6. Manejar grupos según la opción elegida
    if (dependencias.grupos.cantidad > 0) {
      if (borrarGrupos) {
        // Si se solicitó borrar grupos, primero eliminamos sus asignaciones
        const grupoIds = dependencias.grupos.detalle.map(g => g.id);
        
        // Eliminar asignaciones de estudiantes a estos grupos
        if (grupoIds.length > 0) {
          const placeholders = grupoIds.map((_, i) => `$${i + 1}`).join(',');
          await client.query(`DELETE FROM estudiante_grupo WHERE grupo_id IN (${placeholders})`, grupoIds);
        }
        
        // Ahora eliminar los grupos
        await client.query('DELETE FROM grupos WHERE docente_id = $1', [id]);
      } else if (docenteNuevoId) {
        // Reasignar a otro docente
        await client.query('UPDATE grupos SET docente_id = $1 WHERE docente_id = $2', [docenteNuevoId, id]);
      } else {
        // Si no se especifica docente nuevo, dejar como NULL
        await client.query('UPDATE grupos SET docente_id = NULL WHERE docente_id = $1', [id]);
      }
    }
    
    // 7. Eliminar asignaciones de carrera
    await client.query('DELETE FROM docente_carrera WHERE docente_id = $1', [id]);
    
    // 8. Finalmente eliminar el docente
    const result = await client.query('DELETE FROM docentes WHERE id = $1 RETURNING *', [id]);
    
    // Si no se encontró docente para eliminar
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
    console.error('Error en eliminarDocenteSeguro:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function eliminarDocente(id) {
  // Esta función se mantiene para compatibilidad, pero ahora utiliza la versión segura
  const resultado = await eliminarDocenteSeguro(id);
  // Devolvemos solo el docente para mantener compatibilidad con el código existente
  return resultado ? resultado.docente : null;
}

/**
 * Obtiene docentes filtrados por carrera
 * @param {string} carrera - Carrera para filtrar
 * @returns {Promise<Array>} - Lista de docentes de la carrera especificada
 */
async function obtenerDocentesPorCarrera(carrera) {
  try {
    const query = `
      SELECT d.* 
      FROM docentes d
      JOIN docente_carrera dc ON d.id = dc.docente_id
      WHERE dc.carrera = $1
      ORDER BY d.nombre_completo
    `;
    
    const result = await pool.query(query, [carrera]);
    const docentes = result.rows;
    
    // Para cada docente, obtenemos sus carreras completas
    for (const docente of docentes) {
      const carreras = await docenteCarreraModel.obtenerCarrerasDeDocente(docente.id);
      docente.carreras = carreras;
    }
    
    return docentes;
  } catch (error) {
    console.error('Error al obtener docentes por carrera:', error);
    throw error;
  }
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