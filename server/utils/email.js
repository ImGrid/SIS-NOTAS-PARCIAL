const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporte con Outlook
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Usa 'true' si usas puerto 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Permitir conexiones no autorizadas
    },
    requireTLS: true, // Forzar el uso de TLS
  });

/**
 * Función para enviar un código de verificación
 * @param {string} correo - Correo del docente
 * @param {string} codigo - Código de verificación
 */
async function enviarCodigoVerificacion(correo, codigo) {
  try {
    await transporter.sendMail({
      from: `"Sistema EMI" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: 'Código de Verificación',
      text: `Tu código de verificación es: ${codigo}`,
      html: `<p>Tu código de verificación es: <b>${codigo}</b></p>`,
    });
    console.log('✅ Correo enviado a:', correo);
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw new Error('Error al enviar el correo de verificación.');
  }
}

module.exports = { enviarCodigoVerificacion };
