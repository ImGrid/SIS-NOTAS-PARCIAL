const pool = require('../database/db');

async function crearSupervisor(supervisor) {
  const { nombre_completo, correo_electronico, cargo } = supervisor;
  const query = 'INSERT INTO supervisores (nombre_completo, correo_electronico, cargo) VALUES ($1, $2, $3) RETURNING *';
  const values = [nombre_completo, correo_electronico, cargo];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function obtenerSupervisores() {
  const result = await pool.query('SELECT * FROM supervisores');
  return result.rows;
}

async function obtenerSupervisorPorId(id) {
  const result = await pool.query('SELECT * FROM supervisores WHERE id = $1', [id]);
  return result.rows[0];
}

async function obtenerSupervisorPorCorreo(correo) {
  const result = await pool.query('SELECT * FROM supervisores WHERE correo_electronico = $1', [correo]);
  return result.rows[0];
}

async function actualizarSupervisor(id, supervisor) {
    const { nombre_completo, correo_electronico, cargo } = supervisor;
    const query = 'UPDATE supervisores SET nombre_completo = $1, correo_electronico = $2, cargo = $3 WHERE id = $4 RETURNING *';
    const values = [nombre_completo, correo_electronico, cargo, id];
    const result = await pool.query(query, values);
    return result.rows[0];
}

async function eliminarSupervisor(id) {
  const result = await pool.query('DELETE FROM supervisores WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
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
        cargo: supervisor.cargo
      }
    };
  } catch (error) {
    console.error('Error al autenticar supervisor:', error);
    throw error;
  }
}

/**
 * NUEVAS FUNCIONES PARA GESTIÓN DE RÚBRICAS
 */

/**
 * Obtiene todas las rúbricas del sistema con información relacionada
 * @returns {Promise<Array>} - Lista de rúbricas con información de docentes y grupos
 */
async function obtenerTodasRubricas() {
  const query = `
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
    ORDER BY g.id, r.id
  `;
  
  const result = await pool.query(query);
  return result.rows;
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
async function desactivarHabilitacion(habilitacionId) {
  try {
    const query = `
      UPDATE habilitaciones_rubricas 
      SET 
        activa = false,
        fecha_desactivacion = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [habilitacionId]);
    return result.rows[0];
  } catch (error) {
    console.error("Error en desactivarHabilitacion:", error);
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
  
  // Nuevas funciones para gestión de rúbricas
  obtenerTodasRubricas,
  obtenerRubricasPorGrupo,
  contarEstudiantesEInformes,
  habilitarRubricaGrupo,
  verificarHabilitacionActiva,
  obtenerHistorialHabilitaciones,
  desactivarHabilitacion
};