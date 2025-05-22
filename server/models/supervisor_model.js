const pool = require('../database/db');
const supervisorCarreraModel = require('./supervisor_carrera_model');

async function crearSupervisor(supervisor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Extraer carreras (si existen) y el resto de datos del supervisor
    const { carreras, ...datosSupervisor } = supervisor;
    const { nombre_completo, correo_electronico, cargo } = datosSupervisor;

    // Insertar supervisor básico
    const querySupervisor = 'INSERT INTO supervisores (nombre_completo, correo_electronico, cargo) VALUES ($1, $2, $3) RETURNING *';
    const valuesSupervisor = [nombre_completo, correo_electronico, cargo];
    const resultSupervisor = await client.query(querySupervisor, valuesSupervisor);
    const supervisorCreado = resultSupervisor.rows[0];
    
    // Si hay carreras especificadas, asignarlas
    if (carreras && Array.isArray(carreras) && carreras.length > 0) {
      for (const carrera of carreras) {
        const queryCarrera = 'INSERT INTO supervisor_carrera (supervisor_id, carrera) VALUES ($1, $2)';
        await client.query(queryCarrera, [supervisorCreado.id, carrera]);
      }
    }
    
    await client.query('COMMIT');
    
    // Obtener las carreras asignadas
    const carrerasAsignadas = await supervisorCarreraModel.obtenerCarrerasDeSupervisor(supervisorCreado.id);
    
    // Devolver supervisor con sus carreras
    return {
      ...supervisorCreado,
      carreras: carrerasAsignadas
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function obtenerSupervisores() {
  try {
    // Primero obtenemos todos los supervisores
    const result = await pool.query('SELECT * FROM supervisores');
    const supervisores = result.rows;
    
    // Para cada supervisor, obtenemos sus carreras
    for (const supervisor of supervisores) {
      const carreras = await supervisorCarreraModel.obtenerCarrerasDeSupervisor(supervisor.id);
      supervisor.carreras = carreras;
    }
    
    return supervisores;
  } catch (error) {
    console.error('Error al obtener supervisores con carreras:', error);
    throw error;
  }
}

async function obtenerSupervisorPorId(id) {
  try {
    const result = await pool.query('SELECT * FROM supervisores WHERE id = $1', [id]);
    const supervisor = result.rows[0];
    
    if (supervisor) {
      // Obtener carreras asignadas
      const carreras = await supervisorCarreraModel.obtenerCarrerasDeSupervisor(supervisor.id);
      supervisor.carreras = carreras;
    }
    
    return supervisor;
  } catch (error) {
    console.error('Error al obtener supervisor por ID con carreras:', error);
    throw error;
  }
}

async function obtenerSupervisorPorCorreo(correo) {
  try {
    // Obtener el supervisor básico
    const result = await pool.query('SELECT * FROM supervisores WHERE correo_electronico = $1', [correo]);
    const supervisor = result.rows[0];
    
    if (supervisor) {
      // Obtener sus carreras asignadas
      const carreras = await supervisorCarreraModel.obtenerCarrerasDeSupervisor(supervisor.id);
      supervisor.carreras = carreras;
    }
    
    return supervisor;
  } catch (error) {
    console.error('Error al obtener supervisor por correo con carreras:', error);
    throw error;
  }
}

async function actualizarSupervisor(id, supervisor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Extraer carreras (si existen) y el resto de datos del supervisor
    const { carreras, ...datosSupervisor } = supervisor;
    const { nombre_completo, correo_electronico, cargo } = datosSupervisor;

    // Actualizar datos básicos del supervisor
    const querySupervisor = 'UPDATE supervisores SET nombre_completo = $1, correo_electronico = $2, cargo = $3 WHERE id = $4 RETURNING *';
    const valuesSupervisor = [nombre_completo, correo_electronico, cargo, id];
    const resultSupervisor = await client.query(querySupervisor, valuesSupervisor);
    
    // Si no hay supervisor para actualizar, terminamos
    if (resultSupervisor.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    const supervisorActualizado = resultSupervisor.rows[0];
    
    // Si se proporcionaron carreras, actualizamos asignaciones
    if (carreras && Array.isArray(carreras)) {
      // Primero eliminamos asignaciones existentes
      await client.query('DELETE FROM supervisor_carrera WHERE supervisor_id = $1', [id]);
      
      // Luego insertamos las nuevas
      for (const carrera of carreras) {
        const queryCarrera = 'INSERT INTO supervisor_carrera (supervisor_id, carrera) VALUES ($1, $2)';
        await client.query(queryCarrera, [id, carrera]);
      }
    }
    
    await client.query('COMMIT');
    
    // Obtener las carreras actualizadas
    const carrerasActualizadas = await supervisorCarreraModel.obtenerCarrerasDeSupervisor(id);
    
    // Devolver supervisor con sus carreras
    return {
      ...supervisorActualizado,
      carreras: carrerasActualizadas
    };
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
    
    // 1. Eliminar asignaciones de carrera
    await client.query('DELETE FROM supervisor_carrera WHERE supervisor_id = $1', [id]);
    
    // 2. Eliminar historial de habilitaciones (si es necesario)
    // Esta parte debe adaptarse según tu esquema específico
    const queryHabilitaciones = `
      SELECT id FROM habilitaciones_rubricas 
      WHERE supervisor_id = $1 OR supervisor_desactivacion_id = $1
    `;
    const habilitaciones = await client.query(queryHabilitaciones, [id]);
    
    if (habilitaciones.rows.length > 0) {
      // Desactivar habilitaciones activas
      await client.query(`
        UPDATE habilitaciones_rubricas
        SET activa = false, 
            fecha_desactivacion = CURRENT_TIMESTAMP,
            supervisor_desactivacion_id = NULL
        WHERE supervisor_id = $1 AND activa = true
      `, [id]);
      
      // Limpiar referencias
      await client.query(`
        UPDATE habilitaciones_rubricas
        SET supervisor_desactivacion_id = NULL
        WHERE supervisor_desactivacion_id = $1
      `, [id]);
    }
    
    // 3. Finalmente eliminar el supervisor
    const result = await client.query('DELETE FROM supervisores WHERE id = $1 RETURNING *', [id]);
    
    // Si no se encontró supervisor para eliminar
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en eliminarSupervisor:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Verifica si un correo corresponde a un supervisor
async function verificarCorreoSupervisor(correo) {
  const supervisor = await obtenerSupervisorPorCorreo(correo);
  return !!supervisor; // Devuelve true si existe, false si no
}

// Verifica la clave secreta del sistema
async function autenticarSupervisor(correo, claveSecreta) {
  try {
    // Verificar si existe el supervisor
    const supervisor = await obtenerSupervisorPorCorreo(correo);
    
    if (!supervisor) {
      return { success: false, message: 'Supervisor no encontrado' };
    }
    
    // Verificar la clave secreta
    if (claveSecreta !== process.env.ADMIN_SECRET_KEY) {
      return { success: false, message: 'Clave secreta incorrecta' };
    }
    
    // Autenticación exitosa
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
    console.error('Error al autenticar supervisor:', error);
    throw error;
  }
}

/**
 * FUNCIONES PARA GESTIÓN DE RÚBRICAS
 */

/**
 * Obtiene todas las rúbricas del sistema con información relacionada
 * @param {Array<string>} carrerasFiltro - Optionalmente filtrar por estas carreras
 * @returns {Promise<Array>} - Lista de rúbricas con información de docentes y grupos
 */
async function obtenerTodasRubricas(carrerasFiltro = []) {
  let query = `
    SELECT 
      r.id, r.presentacion, r.sustentacion, r.documentacion, r.innovacion, 
      r.nota_final, r.observaciones, r.comentarios, r.docente_id, r.fecha_creacion,
      d.nombre_completo AS docente_nombre,
      i.id AS informe_id, i.grupo_id, i.estudiante_id, i.comentarios_generales,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia,
      e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido, e.codigo AS estudiante_codigo,
      (
        SELECT COUNT(*) 
        FROM informes 
        WHERE grupo_id = g.id
      ) AS total_informes,
      (
        SELECT COUNT(*) 
        FROM estudiante_grupo 
        WHERE grupo_id = g.id AND activo = true
      ) AS total_estudiantes
    FROM rubricas r
    LEFT JOIN docentes d ON r.docente_id = d.id
    LEFT JOIN informes i ON r.id = i.rubrica_id
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
  `;
  
  // Aplicar filtro de carreras si se proporciona
  if (carrerasFiltro && carrerasFiltro.length > 0) {
    query += ` WHERE g.carrera IN (${carrerasFiltro.map((_, i) => `$${i + 1}`).join(',')})`;
  }
  
  query += ` ORDER BY g.id, r.id`;
  
  const params = carrerasFiltro || [];
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener todas las rúbricas:', error);
    throw error;
  }
}

/**
 * Obtiene las rúbricas asociadas a un grupo específico
 * @param {number} grupoId - ID del grupo a consultar
 * @returns {Promise<Array>} - Lista de rúbricas del grupo
 */
async function obtenerRubricasPorGrupo(grupoId) {
  const query = `
    SELECT 
      r.id, r.presentacion, r.sustentacion, r.documentacion, r.innovacion, 
      r.nota_final, r.observaciones, r.comentarios, r.docente_id, r.fecha_creacion,
      d.nombre_completo AS docente_nombre,
      i.id AS informe_id, i.estudiante_id, i.comentarios_generales,
      g.nombre_proyecto, g.carrera, g.semestre, g.materia,
      e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido, e.codigo AS estudiante_codigo
    FROM informes i
    LEFT JOIN rubricas r ON r.id = i.rubrica_id
    LEFT JOIN docentes d ON r.docente_id = d.id
    LEFT JOIN grupos g ON i.grupo_id = g.id
    LEFT JOIN estudiantes e ON i.estudiante_id = e.id
    WHERE i.grupo_id = $1
    ORDER BY e.apellido, e.nombre
  `;
  
  try {
    const result = await pool.query(query, [grupoId]);
    return result.rows;
  } catch (error) {
    console.error(`Error al obtener rúbricas del grupo ${grupoId}:`, error);
    return []; // Retornar array vacío en caso de error
  }
}

/**
 * Cuenta el número de estudiantes y el número de informes para un grupo
 * @param {number} grupoId - ID del grupo
 * @returns {Promise<Object>} - Objeto con contadores
 */
async function contarEstudiantesEInformes(grupoId) {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM estudiante_grupo WHERE grupo_id = $1 AND activo = true) AS total_estudiantes,
      (SELECT COUNT(*) FROM informes WHERE grupo_id = $1) AS total_informes
  `;
  
  try {
    const result = await pool.query(query, [grupoId]);
    return result.rows[0];
  } catch (error) {
    console.error(`Error al contar estudiantes e informes para grupo ${grupoId}:`, error);
    return { total_estudiantes: 0, total_informes: 0 }; // Valor por defecto en caso de error
  }
}

/**
 * Crea un registro de habilitación de rúbrica para un grupo
 * @param {number} grupoId - ID del grupo
 * @param {number} supervisorId - ID del supervisor que realiza la habilitación
 * @param {string} motivo - Motivo de la habilitación
 * @returns {Promise<Object>} - Registro de habilitación creado
 */
async function habilitarRubricaGrupo(grupoId, supervisorId, motivo) {
  // Iniciar una transacción
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Registrar la habilitación
    const insertQuery = `
      INSERT INTO habilitaciones_rubricas (
        grupo_id, supervisor_id, motivo, fecha_habilitacion
      ) VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    
    const habilitacionResult = await client.query(insertQuery, [
      grupoId, supervisorId, motivo
    ]);
    
    // 2. Verificar que existan informes para este grupo
    const informesQuery = 'SELECT id FROM informes WHERE grupo_id = $1';
    const informesResult = await client.query(informesQuery, [grupoId]);
    
    if (informesResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('No hay informes para habilitar en este grupo');
    }
    
    // Confirmar la transacción
    await client.query('COMMIT');
    
    return {
      habilitacion: habilitacionResult.rows[0],
      informes_afectados: informesResult.rows.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica si un grupo tiene habilitaciones activas
 * @param {number} grupoId - ID del grupo a verificar
 * @returns {Promise<boolean>} - true si tiene habilitaciones activas
 */
async function verificarHabilitacionActiva(grupoId) {
  try {
    const query = `
      SELECT * FROM habilitaciones_rubricas 
      WHERE grupo_id = $1 AND activa = true
      ORDER BY fecha_habilitacion DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [grupoId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error al verificar habilitación para el grupo ${grupoId}:`, error);
    return null; // Retornar null en caso de error
  }
}

/**
 * Obtiene el historial de habilitaciones para un grupo
 * @param {number} grupoId - ID del grupo
 * @returns {Promise<Array>} - Lista de habilitaciones
 */
async function obtenerHistorialHabilitaciones(grupoId) {
  const query = `
    SELECT 
      h.id, h.grupo_id, h.supervisor_id, h.motivo, 
      h.fecha_habilitacion, h.activa,
      s.nombre_completo AS supervisor_nombre
    FROM habilitaciones_rubricas h
    JOIN supervisores s ON h.supervisor_id = s.id
    WHERE h.grupo_id = $1
    ORDER BY h.fecha_habilitacion DESC
  `;
  
  const result = await pool.query(query, [grupoId]);
  return result.rows;
}

/**
 * Desactiva una habilitación específica
 * @param {number} habilitacionId - ID de la habilitación
 * @param {number} supervisorId - ID del supervisor que realiza la acción
 * @returns {Promise<Object>} - Habilitación actualizada
 */
async function desactivarHabilitacion(habilitacionId, supervisorDesactivacionId = null) {
  try {
    console.log(`[PRODUCCION] Ejecutando SQL para desactivar: ${habilitacionId}`);
    
    const query = `
      UPDATE habilitaciones_rubricas 
      SET 
        activa = false,
        fecha_desactivacion = NOW(),
        supervisor_desactivacion_id = $2
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [habilitacionId, supervisorDesactivacionId]);
    
    console.log(`[PRODUCCION] Filas afectadas: ${result.rowCount}`);
    
    return result.rows[0];
  } catch (error) {
    console.error(`[PRODUCCION] Error en SQL:`, {
      mensaje: error.message,
      codigo: error.code,
      habilitacionId
    });
    throw error;
  }
}

/**
 * Obtiene supervisores por carrera específica
 * @param {string} carrera - Carrera para filtrar
 * @returns {Promise<Array>} - Lista de supervisores de la carrera especificada
 */
async function obtenerSupervisoresPorCarrera(carrera) {
  try {
    const query = `
      SELECT s.* 
      FROM supervisores s
      JOIN supervisor_carrera sc ON s.id = sc.supervisor_id
      WHERE sc.carrera = $1
      ORDER BY s.nombre_completo
    `;
    
    const result = await pool.query(query, [carrera]);
    const supervisores = result.rows;
    
    // Para cada supervisor, obtenemos sus carreras completas
    for (const supervisor of supervisores) {
      const carreras = await supervisorCarreraModel.obtenerCarrerasDeSupervisor(supervisor.id);
      supervisor.carreras = carreras;
    }
    
    return supervisores;
  } catch (error) {
    console.error('Error al obtener supervisores por carrera:', error);
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