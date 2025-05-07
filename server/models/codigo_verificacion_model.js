const pool = require('../database/db');
const crypto = require('crypto');

/**
 * Genera un código de verificación aleatorio de 6 dígitos
 * @returns {string} Código de 6 dígitos
 */
function generarCodigo() {
  // Genera un número aleatorio entre 100000 y 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calcula la fecha de expiración
 * @param {number} minutos - Minutos hasta la expiración (por defecto 60)
 * @returns {Date} Fecha de expiración
 */
function calcularExpiracion(minutos = 60) {
  const expiracion = new Date();
  expiracion.setMinutes(expiracion.getMinutes() + minutos); // Ahora expira en 60 minutos en lugar de 10
  return expiracion;
}

/**
 * Crea un nuevo código de verificación para un correo electrónico
 * @param {string} correo_electronico - Correo del docente
 * @returns {Object} Objeto con el código generado y su expiración
 */
async function crearCodigoVerificacion(correo_electronico) {
  try {
    // Primero eliminamos códigos anteriores para este correo
    await eliminarCodigosAnteriores(correo_electronico);
    
    // Generamos un nuevo código
    const codigo = generarCodigo();
    const expiracion = calcularExpiracion(); // Ahora 60 minutos por defecto
    
    // Insertamos en la base de datos
    const query = `
      INSERT INTO codigos_verificacion (correo_electronico, codigo, expiracion)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [correo_electronico, codigo, expiracion];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error al crear código de verificación:', error);
    throw new Error('Error al generar código de verificación');
  }
}

/**
 * Verifica si un código es válido para un correo
 * @param {string} correo_electronico - Correo del docente
 * @param {string} codigo - Código a verificar
 * @param {boolean} mantenerCodigo - Si es true, no elimina el código después de verificarlo
 * @returns {boolean} true si el código es válido, false en caso contrario
 */
async function verificarCodigo(correo_electronico, codigo, mantenerCodigo = true) {
  try {
    // Eliminamos códigos expirados primero
    await limpiarCodigosExpirados();
    
    // Buscamos el código para el correo proporcionado
    const query = `
      SELECT * FROM codigos_verificacion
      WHERE correo_electronico = $1 AND codigo = $2 AND expiracion > NOW()
    `;
    const values = [correo_electronico, codigo];
    
    const result = await pool.query(query, values);
    
    // Si encontramos un resultado, el código es válido
    if (result.rows.length > 0) {
      // Si mantenerCodigo es false, eliminamos el código después de usarlo
      if (!mantenerCodigo) {
        await eliminarCodigosAnteriores(correo_electronico);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar código:', error);
    throw new Error('Error al verificar el código');
  }
}

/**
 * Limpia los códigos de verificación expirados de la base de datos
 */
async function limpiarCodigosExpirados() {
  try {
    const query = `
      DELETE FROM codigos_verificacion
      WHERE expiracion <= NOW()
    `;
    
    await pool.query(query);
  } catch (error) {
    console.error('Error al limpiar códigos expirados:', error);
  }
}

/**
 * Elimina los códigos anteriores para un correo específico
 * @param {string} correo_electronico - Correo del docente
 */
async function eliminarCodigosAnteriores(correo_electronico) {
  try {
    const query = `
      DELETE FROM codigos_verificacion
      WHERE correo_electronico = $1
    `;
    
    await pool.query(query, [correo_electronico]);
  } catch (error) {
    console.error('Error al eliminar códigos anteriores:', error);
  }
}
async function verificarCodigoExistente(correo_electronico) {
  try {
    // Consultar si hay un código vigente para este correo
    const query = `
      SELECT * FROM codigos_verificacion 
      WHERE correo_electronico = $1 
      AND expiracion > NOW()
      ORDER BY codigo DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [correo_electronico]);
    return result.rows[0] || null; // Devuelve el código o null si no existe
  } catch (error) {
    console.error('Error al verificar código existente:', error);
    throw error;
  }
}
module.exports = {
  crearCodigoVerificacion,
  verificarCodigo,
  limpiarCodigosExpirados,
  eliminarCodigosAnteriores,
  verificarCodigoExistente
};