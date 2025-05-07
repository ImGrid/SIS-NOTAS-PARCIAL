const cron = require('node-cron');
const codigoVerificacionModel = require('../models/codigo_verificacion_model');


function configurarTareasProgramadas() {
  // Tarea para limpiar códigos de verificación expirados cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Ejecutando limpieza de códigos de verificación expirados...');
      await codigoVerificacionModel.limpiarCodigosExpirados();
      console.log('Limpieza de códigos completada');
    } catch (error) {
      console.error('Error durante la limpieza de códigos:', error);
    }
  });
  
  console.log('✅ Tareas programadas configuradas');
}

module.exports = {
  configurarTareasProgramadas
};