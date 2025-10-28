const nodemailer = require('nodemailer');

/**
 * Servicio para envío de emails con Gmail SMTP
 * Requiere configuración de App Password de Gmail
 */
class EmailService {
  constructor() {
    // Configuración del transporter de Gmail
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Tu email de Gmail
        pass: process.env.GMAIL_APP_PASSWORD, // App Password de Gmail (no la contraseña normal)
      },
    });

    // Verificar conexión al inicializar
    this.verifyConnection();
  }

  /**
   * Verificar que la configuración de email funciona
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
    } catch (error) {
      console.error('❌ Error configurando servicio de email:', error);
      console.log('💡 Asegúrate de configurar GMAIL_USER y GMAIL_APP_PASSWORD en .env');
    }
  }

  /**
   * Enviar email de recuperación de contraseña con PIN
   * @param {string} toEmail - Email del destinatario
   * @param {string} userName - Nombre del usuario
   * @param {string} resetPin - PIN de 6 dígitos para recuperación
   */
  async sendPasswordResetEmail(toEmail, userName, resetPin) {
    try {
      const mailOptions = {
        from: {
          name: 'Sistema de Gestión Edificios',
          address: process.env.GMAIL_USER
        },
        to: toEmail,
        subject: '🔐 PIN de recuperación de contraseña - Sistema Edificios',
        html: this.generatePasswordResetHTML(userName, resetPin),
        text: `
Hola ${userName},

Has solicitado recuperar tu contraseña del Sistema de Gestión de Edificios.

Tu PIN de recuperación es: ${resetPin}

Ingresa este PIN junto con tu nueva contraseña en el formulario de recuperación.

Este PIN expirará en 15 minutos por seguridad.

Si no solicitaste este cambio, puedes ignorar este email.

Saludos,
Equipo de Sistema de Gestión Edificios
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de recuperación enviado:', {
        to: toEmail,
        messageId: info.messageId,
        accepted: info.accepted
      });

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email enviado correctamente'
      };

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Error enviando email'
      };
    }
  }

  /**
   * Generar HTML para email de recuperación de contraseña con PIN
   */
  generatePasswordResetHTML(userName, resetPin) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Recuperación de Contraseña - PIN</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
        .pin-box { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
        .pin-number { font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        .warning { background: #fef3cd; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .instructions { background: #e0f2fe; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢 Sistema de Gestión Edificios</div>
            <h2>PIN de Recuperación de Contraseña</h2>
        </div>
        
        <p>Hola <strong>${userName}</strong>,</p>
        
        <p>Has solicitado recuperar tu contraseña del Sistema de Gestión de Edificios.</p>
        
        <p>Tu PIN de recuperación es:</p>
        
        <div class="pin-box">
            <div class="pin-number">${resetPin}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px;">PIN de 6 dígitos</p>
        </div>
        
        <div class="instructions">
            <strong>📝 Instrucciones:</strong>
            <ol>
                <li>Ve al formulario de recuperación de contraseña</li>
                <li>Ingresa este PIN junto con tu nueva contraseña</li>
                <li>Confirma el cambio</li>
            </ol>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este PIN expirará en <strong>15 minutos</strong> por seguridad</li>
                <li>Solo puedes usar este PIN una vez</li>
                <li>No compartas este PIN con nadie</li>
                <li>Si no solicitaste este cambio, puedes ignorar este email</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>PIN generado el ${new Date().toLocaleString('es-ES', { timeZone: 'America/La_Paz' })}</p>
            <hr>
            <p>Este es un email automático del Sistema de Gestión de Edificios. Por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Enviar email de verificación de cuenta
   * @param {string} toEmail - Email del destinatario
   * @param {string} userName - Nombre del usuario
   * @param {string} verificationToken - Token de verificación
   * @param {string} frontendUrl - URL base del frontend
   */
  async sendEmailVerification(toEmail, userName, verificationToken, frontendUrl = 'http://localhost:5173') {
    try {
      const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;
      
      const mailOptions = {
        from: {
          name: 'Sistema de Gestión Edificios',
          address: process.env.GMAIL_USER
        },
        to: toEmail,
        subject: '📧 Verifica tu cuenta - Sistema Edificios',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verificación de Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #f0f9ff; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢 Sistema de Gestión Edificios</div>
            <h2>¡Bienvenido al Sistema!</h2>
        </div>
        
        <p>Hola <strong>${userName}</strong>,</p>
        
        <p>¡Gracias por registrarte! Para completar tu registro, necesitas verificar tu dirección de email.</p>
        
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">📧 Verificar Email</a>
        </div>
        
        <p>Si el botón no funciona, copia y pega este enlace:</p>
        <p style="background: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
        
        <div class="footer">
            <p>Enviado el ${new Date().toLocaleString('es-ES', { timeZone: 'America/La_Paz' })}</p>
        </div>
    </div>
</body>
</html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('Error enviando email de verificación:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();