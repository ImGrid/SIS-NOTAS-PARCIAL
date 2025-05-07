// utils/helpers/formatHelpers.js

/**
 * Formatea una nota para presentación
 * @param {number|string} nota - Nota a formatear
 * @returns {string} - Nota formateada
 */
export const formatearNota = (nota) => {
    if (nota === null || nota === undefined) return '-';
    if (typeof nota === 'number') return nota.toFixed(2);
    if (typeof nota === 'string' && !isNaN(parseFloat(nota))) return parseFloat(nota).toFixed(2);
    return nota || '-';
  };
  
  /**
   * Formatea una fecha ISO a formato DD/MM/YYYY
   * @param {string} fechaISO - Fecha en formato ISO
   * @returns {string} - Fecha formateada como DD/MM/YYYY
   */
  export const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '-';
    try {
      const fecha = new Date(fechaISO);
      if (isNaN(fecha.getTime())) return '-';
      return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
    } catch (error) {
      return '-';
    }
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
   * Calcula el porcentaje de aprobación
   * @param {number} aprobados - Número de estudiantes aprobados
   * @param {number} total - Número total de estudiantes
   * @returns {string} - Porcentaje formateado con dos decimales
   */
  export const calcularPorcentajeAprobacion = (aprobados, total) => {
    if (total === 0) return "0.00";
    return ((aprobados / total) * 100).toFixed(2);
  };