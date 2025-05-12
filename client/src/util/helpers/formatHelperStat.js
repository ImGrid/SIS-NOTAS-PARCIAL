// utils/helpers/formatHelper.js

/**
 * Formatea una nota numérica con dos decimales
 * @param {number|string} nota - Nota a formatear
 * @returns {string} - Nota formateada con dos decimales
 */
export const formatearNota = (nota) => {
  if (nota === null || nota === undefined || isNaN(nota)) return '-';
  if (typeof nota === 'number') return nota.toFixed(2);
  if (typeof nota === 'string' && !isNaN(parseFloat(nota))) return parseFloat(nota).toFixed(2);
  return '-';
};

/**
 * Obtiene la fecha actual en formato DD/MM/YYYY
 * @returns {string} - Fecha actual formateada
 */
export const obtenerFechaActual = () => {
  const fecha = new Date();
  return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
};

/**
 * Formatea un número como porcentaje
 * @param {number} valor - Valor a formatear
 * @param {number} total - Valor total para calcular el porcentaje
 * @param {number} decimales - Cantidad de decimales a mostrar
 * @returns {string} - Porcentaje formateado
 */
export const formatearPorcentaje = (valor, total, decimales = 0) => {
  if (!valor || !total || isNaN(valor) || isNaN(total) || total === 0) return '0%';
  const porcentaje = (valor / total) * 100;
  return `${porcentaje.toFixed(decimales)}%`;
};

/**
 * Formatea una fecha ISO a formato legible DD/MM/YYYY
 * @param {string} fechaISO - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export const formatearFecha = (fechaISO) => {
  if (!fechaISO) return '-';
  try {
    const fecha = new Date(fechaISO);
    return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return '-';
  }
};

/**
 * Trunca un texto a una longitud máxima y añade puntos suspensivos si es necesario
 * @param {string} texto - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncarTexto = (texto, maxLength = 30) => {
  if (!texto) return '';
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength - 3) + '...';
};

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} - Texto capitalizado
 */
export const capitalizar = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

export default {
  formatearNota,
  obtenerFechaActual,
  formatearPorcentaje,
  formatearFecha,
  truncarTexto,
  capitalizar
};