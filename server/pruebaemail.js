// Script para probar el envío de correos
// Ejecutar con: node test-email.js

require('dotenv').config();
const { enviarCodigoVerificacion } = require('./utils/email');

// Correo al que se enviará la prueba - CAMBIAR POR TU CORREO
const CORREO_DESTINO = 'hponcep_cb@est.emi.edu.bo';
const CODIGO_PRUEBA = '123456';

async function probarEnvioCorreo() {
  console.log('Iniciando prueba de envío de correo...');
  console.log(`Configuración actual:
  - HOST: ${process.env.EMAIL_HOST}
  - PUERTO: ${process.env.EMAIL_PORT}
  - USUARIO: ${process.env.EMAIL_USER}
  - DESTINO: ${CORREO_DESTINO}
  `);
  
  try {
    await enviarCodigoVerificacion(CORREO_DESTINO, CODIGO_PRUEBA);
    console.log('✅ Correo enviado correctamente');
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n⚠️ Posibles problemas:');
      console.log('- Verifica que el email y contraseña sean correctos');
      console.log('- Si usas Gmail, asegúrate de estar usando una contraseña de aplicación');
      console.log('- Verifica que hayas habilitado el acceso a aplicaciones menos seguras si usas otra cuenta');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ No se pudo conectar al servidor SMTP:');
      console.log('- Verifica que el host y puerto sean correctos');
      console.log('- Verifica que no haya firewall bloqueando la conexión');
    }
  }
}

probarEnvioCorreo();