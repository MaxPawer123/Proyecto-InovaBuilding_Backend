const nodemailer = require('nodemailer');

/**
 * Servicio universal de email que funciona con cualquier proveedor
 * Soporta: Gmail, Outlook, Yahoo, y otros proveedores SMTP
 */
class UniversalEmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Detectar configuración SMTP según el proveedor de email
   */
  getSmtpConfig(email) {
    const domain = email.split('@')[1].toLowerCase();
    
    const configs = {
      'gmail.com': {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true
      },
      'outlook.com': {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        requireTLS: true
      },
      'hotmail.com': {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        requireTLS: true
      },
      'live.com': {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        requireTLS: true
      },
      'yahoo.com': {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        requireTLS: true
      },
      'fcpn.edu.bo': {
        // Para dominios educativos, usar Gmail por defecto o configuración manual
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        requireTLS: true
      }
    };

    return configs[domain] || {
      // Configuración por defecto para otros proveedores
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: true
    };
  }

  /**
   * Configurar transporter universal para cualquier proveedor de email
   */
  async initializeTransporter() {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
          process.env.EMAIL_PASSWORD === 'PENDIENTE_CONFIGURAR') {
        console.log('📧 Sistema email en modo simulado');
        console.log('💡 Emails se mostrarán en consola - el sistema funciona normalmente');
        this.simulatedMode = true;
        return;
      }

      const smtpConfig = this.getSmtpConfig(process.env.EMAIL_USER);
      
      this.transporter = nodemailer.createTransport({
        ...smtpConfig,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        logger: false,
        debug: false
      });

      // Verificar conexión
      await this.transporter.verify();
      console.log('✅ Servicio de email universal configurado');
      console.log(`📧 Proveedor: ${smtpConfig.host}`);
      console.log(`📬 Emails desde: ${process.env.EMAIL_USER}`);

    } catch (error) {
      console.error('❌ Error configurando email:', error.message);
      console.log('💡 Verifica EMAIL_USER y EMAIL_PASSWORD en .env');
      console.log('📝 Para Gmail: usa App Password, no tu contraseña normal');
    }
  }

  /**
   * Enviar email de verificación de cuenta
   */
  async sendVerificationEmail(toEmail, userName, verificationToken) {
    try {
      // Modo simulado - mostrar email en consola
      if (this.simulatedMode || !this.transporter) {
        console.log('\n' + '='.repeat(60));
        console.log('📧 EMAIL DE VERIFICACIÓN (MODO SIMULADO)');
        console.log('='.repeat(60));
        console.log(`📬 Para: ${toEmail}`);
        console.log(`👤 Usuario: ${userName}`);
        console.log(`🔗 Enlace: http://localhost:5174/verify-email/${verificationToken}`);
        console.log(`🎫 Token: ${verificationToken}`);
        console.log('='.repeat(60) + '\n');
        
        return {
          success: true,
          messageId: 'simulated-' + Date.now(),
          message: 'Email simulado - mostrado en consola'
        };
      }

      const verificationUrl = `${process.env.APP_URL || 'http://localhost:5174'}/verify-email/${verificationToken}`;
      
      const mailOptions = {
        from: {
          name: process.env.APP_NAME || 'Sistema de Gestión',
          address: process.env.EMAIL_USER
        },
        to: toEmail,
        subject: '🔐 Verifica tu cuenta - ' + (process.env.APP_NAME || 'Sistema'),
        html: this.generateVerificationHTML(userName, verificationUrl, verificationToken),
        text: `
Hola ${userName},

Bienvenido a ${process.env.APP_NAME || 'nuestro sistema'}!

Para completar tu registro, verifica tu cuenta haciendo clic en este enlace:
${verificationUrl}

Si no puedes hacer clic, copia y pega la URL en tu navegador.

Este enlace expirará en 24 horas por seguridad.

¡Gracias por registrarte!
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de verificación enviado:', {
        to: toEmail,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email de verificación enviado'
      };

    } catch (error) {
      console.error('❌ Error enviando email de verificación:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Error enviando email de verificación'
      };
    }
  }

  /**
   * Enviar email de verificación con PIN de 6 dígitos
   */
  async sendVerificationPINEmail(toEmail, userName, verificationPIN) {
    try {
      // Modo simulado - mostrar email en consola
      if (this.simulatedMode || !this.transporter) {
        console.log('\n' + '='.repeat(60));
        console.log('📧 EMAIL DE VERIFICACIÓN CON PIN (MODO SIMULADO)');
        console.log('='.repeat(60));
        console.log(`📬 Para: ${toEmail}`);
        console.log(`👤 Usuario: ${userName}`);
        console.log(`🔢 PIN: ${verificationPIN}`);
        console.log(`⏰ Expira en: 15 minutos`);
        console.log('='.repeat(60) + '\n');
        
        return {
          success: true,
          messageId: 'simulated-pin-' + Date.now(),
          message: 'Email con PIN simulado - mostrado en consola'
        };
      }
      
      const mailOptions = {
        from: {
          name: process.env.APP_NAME || 'Sistema de Gestión',
          address: process.env.EMAIL_USER
        },
        to: toEmail,
        subject: '🔐 Tu PIN de verificación - ' + (process.env.APP_NAME || 'Sistema'),
        html: this.generateVerificationPINHTML(userName, verificationPIN),
        text: `
Hola ${userName},

Bienvenido a ${process.env.APP_NAME || 'nuestro sistema'}!

Tu PIN de verificación es: ${verificationPIN}

Este PIN:
- Es válido por 15 minutos
- Solo puede usarse una vez
- Distingue entre mayúsculas y minúsculas

Ingresa este PIN en la página de verificación para activar tu cuenta.

¡Gracias por registrarte!
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de verificación con PIN enviado:', {
        to: toEmail,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email con PIN de verificación enviado'
      };

    } catch (error) {
      console.error('❌ Error enviando email con PIN:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Error enviando email con PIN'
      };
    }
  }

  /**
   * Enviar email de bienvenida (sin PIN) para usuarios creados por administrador
   */
  async sendWelcomeEmail(toEmail, userName, userRole, temporaryPassword, empleadoData = null) {
    try {
      const roleName = userRole === 'Administrador' 
        ? 'Administrador' 
        : userRole === 'Empleado' 
          ? 'Empleado' 
          : 'Residente';
      
      const welcomeMessage = userRole === 'Administrador' 
        ? '¡Bienvenido nuevo Administrador!' 
        : userRole === 'Empleado'
          ? '¡Bienvenido nuevo Empleado!'
          : '¡Bienvenida Residente!';

      // Modo simulado - mostrar email en consola
      if (this.simulatedMode || !this.transporter) {
        console.log('\n' + '='.repeat(60));
        console.log(`🎉 ${welcomeMessage.toUpperCase()} (MODO SIMULADO)`);
        console.log('='.repeat(60));
        console.log(`📬 Para: ${toEmail}`);
        console.log(`👤 Usuario: ${userName}`);
        console.log(`🏢 Rol: ${roleName}`);
        console.log(`🔑 Contraseña temporal: ${temporaryPassword}`);
        if (empleadoData) {
          console.log(`💼 Cargo: ${empleadoData.cargo}`);
          console.log(`💰 Sueldo: $${empleadoData.sueldo}`);
          console.log(`🕐 Turno: ${empleadoData.turno}`);
        }
        console.log(`✅ Cuenta activada automáticamente`);
        console.log('='.repeat(60) + '\n');
        
        return {
          success: true,
          messageId: 'simulated-welcome-' + Date.now(),
          message: `${welcomeMessage} - mostrado en consola`
        };
      }
      
      const mailOptions = {
        from: {
          name: process.env.APP_NAME || 'Sistema de Gestión',
          address: process.env.EMAIL_USER
        },
        to: toEmail,
        subject: `🎉 ${welcomeMessage} - ${process.env.APP_NAME || 'Sistema'}`,
        html: this.generateWelcomeHTML(userName, userRole, temporaryPassword, empleadoData),
        text: `
${welcomeMessage}

Hola ${userName},

Tu cuenta ha sido creada exitosamente como ${roleName}.

Datos de acceso:
📧 Email: ${toEmail}
🔑 Contraseña temporal: ${temporaryPassword}
${empleadoData ? `
Información del Empleado:
💼 Cargo: ${empleadoData.cargo}
💰 Sueldo: $${empleadoData.sueldo}
🕐 Turno: ${empleadoData.turno}
` : ''}
✅ Tu cuenta está ACTIVADA y puedes acceder inmediatamente.

Recomendaciones de seguridad:
• Cambia tu contraseña temporal lo antes posible
• Usa una contraseña segura y única
• No compartas tus credenciales

¡Bienvenido al sistema!

Atentamente,
El equipo de ${process.env.APP_NAME || 'Gestión'}
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email de bienvenida enviado a ${roleName}:`, {
        to: toEmail,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId,
        message: `${welcomeMessage} - Email enviado`
      };

    } catch (error) {
      console.error('❌ Error enviando email de bienvenida:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Error enviando email de bienvenida'
      };
    }
  }

  /**
   * Enviar email de recuperación de contraseña con PIN
   */
  async sendPasswordResetEmail(toEmail, userName, resetPin) {
    try {
      // Modo simulado - mostrar PIN en consola
      if (this.simulatedMode || !this.transporter) {
        console.log('\n' + '='.repeat(60));
        console.log('🔐 PIN DE RECUPERACIÓN (MODO SIMULADO)');
        console.log('='.repeat(60));
        console.log(`📬 Para: ${toEmail}`);
        console.log(`👤 Usuario: ${userName}`);
        console.log(`📱 PIN: ${resetPin}`);
        console.log(`⏰ Expira en: 15 minutos`);
        console.log('='.repeat(60) + '\n');
        
        return {
          success: true,
          messageId: 'simulated-' + Date.now(),
          message: 'PIN simulado - mostrado en consola'
        };
      }

      const mailOptions = {
        from: {
          name: process.env.APP_NAME || 'Sistema de Gestión',
          address: process.env.EMAIL_USER
        },
        to: toEmail,
        subject: '🔐 PIN de recuperación - ' + (process.env.APP_NAME || 'Sistema'),
        html: this.generatePasswordResetHTML(userName, resetPin),
        text: `
Hola ${userName},

Has solicitado recuperar tu contraseña.

Tu PIN de recuperación es: ${resetPin}

Ingresa este PIN junto con tu nueva contraseña en el formulario.

Este PIN expirará en 15 minutos por seguridad.

Si no solicitaste este cambio, puedes ignorar este email.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de recuperación enviado:', {
        to: toEmail,
        messageId: info.messageId
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
   * Generar HTML para email de verificación de cuenta
   */
  generateVerificationHTML(userName, verificationUrl, verificationToken) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verificación de Cuenta</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
        .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #0284c7; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        .warning { background: #fef3cd; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .code { background: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢 ${process.env.APP_NAME || 'Sistema de Gestión'}</div>
            <h2>¡Bienvenido ${userName}!</h2>
        </div>
        
        <p>Gracias por registrarte en nuestro sistema.</p>
        
        <p>Para completar tu registro y activar tu cuenta, haz clic en el siguiente botón:</p>
        
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">✅ Verificar mi cuenta</a>
        </div>
        
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <div class="code">${verificationUrl}</div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este enlace expirará en <strong>24 horas</strong></li>
                <li>Solo puedes usar este enlace una vez</li>
                <li>Si no te registraste, puedes ignorar este email</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Token: <code>${verificationToken.substring(0, 8)}...</code></p>
            <p>Enviado el ${new Date().toLocaleString('es-ES', { timeZone: 'America/La_Paz' })}</p>
            <hr>
            <p>Este es un email automático. Por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generar HTML para email de verificación con PIN
   */
  generateVerificationPINHTML(userName, verificationPIN) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verificación de Cuenta - PIN</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
        .pin-box { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
        .pin-number { font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: monospace; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        .warning { background: #fef3cd; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .instructions { background: #e0f2fe; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢 Sistema de Gestión</div>
            <h2>PIN de Verificación de Cuenta</h2>
        </div>
        
        <p>Hola <strong>${userName}</strong>,</p>
        
        <p>¡Bienvenido! Para completar el registro de tu cuenta, necesitamos verificar tu email.</p>
        
        <p>Tu PIN de verificación es:</p>
        
        <div class="pin-box">
            <div class="pin-number">${verificationPIN}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px;">PIN de 6 dígitos</p>
        </div>
        
        <div class="instructions">
            <strong>📝 Instrucciones:</strong>
            <ol>
                <li>Ve a la página de verificación en la aplicación</li>
                <li>Ingresa este PIN de 6 dígitos</li>
                <li>Confirma la verificación</li>
            </ol>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este PIN expirará en <strong>15 minutos</strong> por seguridad</li>
                <li>Solo puedes usar este PIN una vez</li>
                <li>No compartas este PIN con nadie</li>
                <li>Si no solicitaste esta verificación, puedes ignorar este email</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>PIN: <code>${verificationPIN}</code></p>
            <p>Enviado el ${new Date().toLocaleString('es-ES', { timeZone: 'America/La_Paz' })}</p>
            <hr>
            <p>Este es un email automático. Por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generar HTML para email de recuperación con PIN
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
            <div class="logo">🏢 ${process.env.APP_NAME || 'Sistema de Gestión'}</div>
            <h2>PIN de Recuperación</h2>
        </div>
        
        <p>Hola <strong>${userName}</strong>,</p>
        
        <p>Has solicitado recuperar tu contraseña.</p>
        
        <p>Tu PIN de recuperación es:</p>
        
        <div class="pin-box">
            <div class="pin-number">${resetPin}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px;">PIN de 6 dígitos</p>
        </div>
        
        <div class="instructions">
            <strong>📝 Instrucciones:</strong>
            <ol>
                <li>Ve al formulario de recuperación</li>
                <li>Ingresa este PIN junto con tu nueva contraseña</li>
                <li>Confirma el cambio</li>
            </ol>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este PIN expira en <strong>15 minutos</strong></li>
                <li>Solo puedes usarlo una vez</li>
                <li>No compartas este PIN con nadie</li>
                <li>Si no solicitaste este cambio, ignora este email</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>PIN generado el ${new Date().toLocaleString('es-ES', { timeZone: 'America/La_Paz' })}</p>
            <hr>
            <p>Este es un email automático. Por favor no respondas.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generar HTML para email de bienvenida (sin PIN)
   */
  generateWelcomeHTML(userName, userRole, temporaryPassword, empleadoData = null) {
    const roleName = userRole === 'Administrador' 
      ? 'Administrador' 
      : userRole === 'Empleado' 
        ? 'Empleado' 
        : 'Residente';
    
    const welcomeMessage = userRole === 'Administrador' 
      ? '¡Bienvenido nuevo Administrador!' 
      : userRole === 'Empleado'
        ? '¡Bienvenido nuevo Empleado!'
        : '¡Bienvenida Residente!';
    
    const roleColor = userRole === 'Administrador' 
      ? '#dc2626' 
      : userRole === 'Empleado'
        ? '#2563eb'
        : '#059669';
    
    const roleIcon = userRole === 'Administrador' 
      ? '👑' 
      : userRole === 'Empleado'
        ? '👔'
        : '🏠';

    const empleadoSection = empleadoData ? `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <h2 style="font-size: 22px; font-weight: bold; margin: 0 0 15px 0;">💼 Información del Empleado</h2>
            <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 15px; text-align: left;">
                <p style="margin: 10px 0; font-size: 16px;"><strong>Cargo:</strong> ${empleadoData.cargo}</p>
                <p style="margin: 10px 0; font-size: 16px;"><strong>Sueldo:</strong> $${empleadoData.sueldo}</p>
                <p style="margin: 10px 0; font-size: 16px;"><strong>Turno:</strong> ${empleadoData.turno}</p>
            </div>
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${welcomeMessage} - Sistema de Gestión</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
        .welcome-box { background: ${roleColor}; color: white; padding: 25px; text-align: center; border-radius: 10px; margin: 20px 0; }
        .role-title { font-size: 28px; font-weight: bold; margin: 10px 0; }
        .credentials-box { background: #e0f2fe; padding: 20px; border-left: 4px solid #0ea5e9; margin: 20px 0; border-radius: 5px; }
        .credential-item { margin: 10px 0; font-family: monospace; background: white; padding: 10px; border-radius: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        .security-tips { background: #fef3cd; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }
        .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢 ${process.env.APP_NAME || 'Sistema de Gestión'}</div>
            <h2>${welcomeMessage}</h2>
        </div>
        
        <div class="welcome-box">
            <div style="font-size: 48px; margin-bottom: 10px;">${roleIcon}</div>
            <div class="role-title">${roleName}</div>
            <div class="success-badge">✅ Cuenta Activada</div>
        </div>
        
        <p>Hola <strong>${userName}</strong>,</p>
        
        <p>¡Tu cuenta ha sido creada exitosamente! Un administrador ha configurado tu acceso como <strong>${roleName}</strong>.</p>
        
        <div class="credentials-box">
            <h3>🔑 Datos de Acceso</h3>
            <div class="credential-item">
                <strong>📧 Email:</strong> ${temporaryPassword ? 'Usa el email con el que recibiste este mensaje' : 'Proporcionado por el administrador'}
            </div>
            <div class="credential-item">
                <strong>🔐 Contraseña temporal:</strong> <code style="background: #fef3cd; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${temporaryPassword}</code>
            </div>
        </div>
        
        ${empleadoSection}
        
        <div class="security-tips">
            <h4>🛡️ Recomendaciones de Seguridad</h4>
            <ul>
                <li><strong>Cambia tu contraseña</strong> lo antes posible</li>
                <li>Usa una contraseña <strong>segura y única</strong></li>
                <li><strong>No compartas</strong> tus credenciales</li>
                <li>Cierra sesión cuando termines de usar el sistema</li>
            </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}" 
               style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
               🚀 Acceder al Sistema
            </a>
        </p>
        
        <div class="footer">
            <p>Cuenta creada el ${new Date().toLocaleString('es-ES', { timeZone: 'America/La_Paz' })}</p>
            <hr>
            <p>Si tienes problemas para acceder, contacta al administrador del sistema.</p>
            <p>Este es un email automático. Por favor no respondas.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

// Exportar una instancia única del servicio
const emailService = new UniversalEmailService();
module.exports = emailService;