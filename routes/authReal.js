const express = require('express');
const router = express.Router();
const User = require('../models/UserReal');
const jwt = require('jsonwebtoken');

// Generar token JWT simple
const generateToken = (userId, email) => {
  return jwt.sign(
    { 
      id: userId, 
      email: email,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET || 'mi_secreto_jwt_edificio',
    { 
      expiresIn: '24h' // Token válido por 24 horas
    }
  );
};

// Utilidades para validación
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Al menos 6 caracteres, una minúscula, una mayúscula, un número y un carácter especial
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&()_+\-=[\]{};':"\\|,.<>/?~`]).{6,20}$/;
  return passwordRegex.test(password);
};

// POST /api/auth/login - Iniciar sesión (sin rol)
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('Login attempt:', { email, rememberMe });

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // 🔒 VERIFICAR SI EL USUARIO ESTÁ BLOQUEADO
    const lockStatus = await User.isUserLocked(email);
    if (lockStatus.locked) {
      return res.status(423).json({
        success: false,
        message: lockStatus.reason,
        isLocked: true,
        attemptsCount: lockStatus.attemptsCount,
        unlockTime: lockStatus.unlockTime
      });
    }

    // Buscar usuario por email
    const user = await User.findByEmail(email);
    
    if (!user) {
      // Usuario no existe - registrar intento fallido para prevenir enumeración
      console.log(`🚨 Intento de login con email inexistente: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    // Verificar contraseña
    const isValidPassword = await User.validatePassword(password, user.password);
    
    if (!isValidPassword) {
      // 🚨 CONTRASEÑA INCORRECTA - REGISTRAR INTENTO FALLIDO
      const failedAttemptResult = await User.recordFailedLogin(email);
      
      let errorMessage = 'Email o contraseña incorrectos';
      
      if (failedAttemptResult.locked) {
        errorMessage = `Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en 15 minutos.`;
        console.log(`🔒 Usuario ${email} bloqueado después de ${failedAttemptResult.attempts} intentos fallidos`);
      } else if (failedAttemptResult.remainingAttempts <= 1) {
        errorMessage = `Email o contraseña incorrectos. Te queda ${failedAttemptResult.remainingAttempts} intento antes del bloqueo.`;
      } else {
        errorMessage = `Email o contraseña incorrectos. Te quedan ${failedAttemptResult.remainingAttempts} intentos.`;
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
        remainingAttempts: failedAttemptResult.remainingAttempts,
        attemptsUsed: failedAttemptResult.attempts,
        isLocked: failedAttemptResult.locked
      });
    }

    // ✅ LOGIN EXITOSO - RESETEAR INTENTOS FALLIDOS
    await User.resetFailedLogins(email);
    console.log(`✅ Login exitoso para ${email} - intentos fallidos reseteados`);

    // Sistema sin verificación de email (más universal)
    // Los usuarios pueden iniciar sesión sin verificar email
    const isEmailVerified = user.email_verified_at !== null;
    
    // Solo mostrar advertencia, pero permitir login
    if (!isEmailVerified) {
      console.log(`⚠️ Usuario ${user.email} iniciando sesión sin verificar email`);
    }

    // Actualizar último acceso
    await User.updateLastAccess(user.id);

    // Generar tokens
    const token = generateToken(user.id, user.email);
    let rememberToken = null;

    // Si el usuario marcó "Recordarme", generar remember token
    if (rememberMe) {
      rememberToken = await User.generateRememberToken(user.id);
    }

    // Respuesta exitosa (no incluir password ni token sensibles)
    const userForResponse = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_verified_at: user.email_verified_at,
      last_login: user.last_login,
      failed_login_attempts: user.failed_login_attempts
    };

    console.log('👤 Usuario logueado exitosamente:', {
      email: user.email,
      rol: user.rol,
      id: user.id
    });
    
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userForResponse,
        token,
        rememberToken: rememberToken,
        emailVerified: isEmailVerified
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/register - Registrar nuevo usuario (sin rol)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, nombres, apellidos, telefono, rol = 'Residente' } = req.body;

    console.log('Register attempt:', { name, email, nombres, apellidos });

    // Validaciones básicas
    if (!name || !email || !password || !confirmPassword || !nombres || !apellidos) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser completados'
      });
    }

    // Verificar que las contraseñas coincidan
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden'
      });
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar contraseña
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener entre 6 y 20 caracteres, al menos una minúscula, una mayúscula, un número y un carácter especial'
      });
    }

    // Verificar que el email no exista
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Crear el usuario (aceptamos rol opcional en el body)
    const newUser = await User.create({
      name,
      email,
      password,
      nombres,
      apellidos,
      telefono,
      rol
    });

    // Generar PIN de verificación de email
    const verificationPIN = await User.generateEmailVerificationPIN(newUser.id);
    
    // Sistema opcional de email - intenta enviar pero no falla si no funciona
    try {
      const emailService = require('../services/universalEmailService');
      const emailResult = await emailService.sendVerificationPINEmail(
        newUser.email,
        nombres || newUser.name,
        verificationPIN
      );

      if (emailResult.success) {
        console.log(`✅ PIN de verificación enviado a ${newUser.email}: ${verificationPIN}`);
      } else {
        console.log(`📧 Email no configurado - PIN generado: ${verificationPIN}`);
      }
    } catch (emailError) {
      console.log(`📧 Email no disponible - PIN generado: ${verificationPIN}`);
    }

    // Respuesta exitosa (no incluir IDs internos sensibles)
    const responseUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      nombres,
      apellidos,
      telefono,
      rol: newUser.rol || rol,
      created_at: newUser.created_at,
      email_verified: false
    };

    // Si el usuario es creado como empleado, generamos un token de sesión para permitir acceso inmediato
    let token = null;
    if ((responseUser.rol || '').toLowerCase() === 'empleado') {
      token = generateToken(newUser.id, newUser.email);
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Se ha enviado un PIN de verificación a tu correo.',
      data: {
        user: responseUser,
        requiresEmailVerification: true,
        token,
        // En desarrollo, devolver el PIN para testing
        ...(process.env.NODE_ENV === 'development' && { verificationPIN })
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    // Manejar errores específicos de base de datos
    if (error.code === '23505') { // Unique violation en PostgreSQL
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', async (req, res) => {
  try {
    // Verificar token (implementación básica)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt_edificio');
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword
        }
      });

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/verify-token - Verificar si un token es válido
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt_edificio');
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Token válido',
        data: {
          user: userWithoutPassword
        }
      });

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===============================
// RUTAS PARA EMAIL VERIFICATION
// ===============================

// POST /api/auth/send-verification - Enviar email de verificación
router.post('/send-verification', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si ya está verificado
    if (user.email_verified_at) {
      return res.json({
        success: true,
        message: 'El email ya está verificado'
      });
    }

    // Generar PIN de verificación
    const verificationPIN = await User.generateEmailVerificationPIN(userId);
    
    // Enviar PIN por email
    try {
      const emailService = require('../services/universalEmailService');
      const user = await User.findById(userId);
      const emailResult = await emailService.sendVerificationPINEmail(
        user.email,
        user.name,
        verificationPIN
      );

      if (emailResult.success) {
        console.log(`✅ PIN de verificación reenviado a ${user.email}: ${verificationPIN}`);
      } else {
        console.log(`📧 Email no configurado - PIN generado: ${verificationPIN}`);
      }
    } catch (emailError) {
      console.log(`📧 Email no disponible - PIN generado: ${verificationPIN}`);
    }
    
    res.json({
      success: true,
      message: 'PIN de verificación enviado. Revisa tu bandeja de entrada.',
      // En desarrollo, devolver el PIN para testing
      ...(process.env.NODE_ENV === 'development' && { verificationPIN })
    });

  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/verify-email-pin - Verificar email con PIN
router.post('/verify-email-pin', async (req, res) => {
  try {
    const { email, pin } = req.body;
    
    if (!email || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Email y PIN son requeridos'
      });
    }

    // Validar formato de PIN (6 dígitos)
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'El PIN debe ser de 6 dígitos'
      });
    }

    const result = await User.verifyEmailWithPIN(email, pin);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error verificando email con PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/resend-verification-pin - Reenviar PIN de verificación
router.post('/resend-verification-pin', async (req, res) => {
  try {
    const { email } = req.body;

    // Validaciones
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Buscar usuario
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si ya está verificado
    if (user.email_verified_at) {
      return res.status(400).json({
        success: false,
        message: 'Email ya está verificado'
      });
    }

    // Generar nuevo PIN y enviarlo
    const pinResult = await User.generateEmailVerificationPIN(user.id);
    
    if (pinResult.success) {
      res.json({
        success: true,
        message: 'PIN reenviado exitosamente. Revisa tu email.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al reenviar PIN'
      });
    }

  } catch (error) {
    console.error('Error reenviando PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para generar HTML de respuesta de verificación
function generateVerificationHTML(success, message) {
  const status = success ? 'éxito' : 'error';
  const icon = success ? '✅' : '❌';
  const bgColor = success ? '#10b981' : '#ef4444';
  const textColor = success ? '#065f46' : '#991b1b';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Email - Sistema Edificios</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .title {
            color: ${textColor};
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: capitalize;
        }
        .message {
            color: #4b5563;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: ${bgColor};
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 500;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${icon}</div>
        <h1 class="title">Verificación de Email - ${status}</h1>
        <p class="message">${message}</p>
        ${success ? 
          '<a href="http://localhost:5173" class="button">Ir a la aplicación</a>' : 
          '<a href="http://localhost:5173/login" class="button">Volver al login</a>'
        }
        <div class="footer">
            Sistema de Gestión de Edificios © 2025
        </div>
    </div>
</body>
</html>
  `;
}

// ===============================
// RUTAS PARA REMEMBER TOKEN
// ===============================

// POST /api/auth/login-remember - Login con remember token
router.post('/login-remember', async (req, res) => {
  try {
    const { rememberToken } = req.body;
    
    if (!rememberToken) {
      return res.status(400).json({
        success: false,
        message: 'Remember token requerido'
      });
    }

    const user = await User.findByRememberToken(rememberToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token de recordación inválido o expirado'
      });
    }

    // Generar nuevo JWT token
    const token = generateToken(user.id, user.email);
    
    // Actualizar último acceso
    await User.updateLastAccess(user.id);

    // Respuesta exitosa
    const { password: _, email_verification_token: __, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login automático exitoso',
      data: {
        user: userWithoutPassword,
        token,
        emailVerified: user.email_verified_at !== null
      }
    });

  } catch (error) {
    console.error('Error en login con remember token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/logout - Cerrar sesión y limpiar remember token
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (userId) {
      // Limpiar remember token
      await User.clearRememberToken(userId);
    }
    
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===============================
// RUTAS PARA RESET PASSWORD
// ===============================

// POST /api/auth/forgot-password - Solicitar reset de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Generar PIN de reset
    const resetResult = await User.generatePasswordResetPin(email);
    
    if (!resetResult.success) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás un PIN de recuperación en unos minutos.'
      });
    }

    // Enviar email de recuperación con PIN
    try {
      const emailService = require('../services/universalEmailService');
      const emailResult = await emailService.sendPasswordResetEmail(
        resetResult.user.email,
        `${resetResult.user.nombres || resetResult.user.name}`,
        resetResult.resetPin
      );

      if (emailResult.success) {
        console.log(`✅ Email de recuperación enviado a ${resetResult.user.email}`);
      } else {
        console.error('❌ Error enviando email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error con servicio de email:', emailError);
    }

    res.json({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un PIN de recuperación en unos minutos.',
      // En desarrollo, mostrar información adicional
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          pinGenerated: true,
          email: resetResult.user.email,
          pin: resetResult.resetPin,
          expiresAt: resetResult.expiresAt
        }
      })
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/verify-reset-token/:token - Verificar si token de reset es válido
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    const verificationResult = await User.verifyPasswordResetToken(token);
    
    if (verificationResult.success) {
      res.json({
        success: true,
        message: 'Token válido',
        user: {
          email: verificationResult.user.email,
          nombres: verificationResult.user.nombres,
          apellidos: verificationResult.user.apellidos
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

  } catch (error) {
    console.error('Error verificando token de reset:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/reset-password - Cambiar contraseña con PIN
router.post('/reset-password', async (req, res) => {
  try {
    const { email, pin, newPassword, confirmPassword } = req.body;
    
    // Validaciones básicas
    if (!email || !pin || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, PIN, nueva contraseña y confirmación son requeridos'
      });
    }

    // Verificar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden'
      });
    }

    // Validar contraseña
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener entre 6 y 20 caracteres, al menos una minúscula, una mayúscula, un número y un carácter especial'
      });
    }

    // Validar formato del PIN (6 dígitos)
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'El PIN debe ser de 6 dígitos'
      });
    }

    // Cambiar contraseña con PIN
    const resetResult = await User.resetPasswordWithPin(email, pin, newPassword);
    
    if (resetResult.success) {
      res.json({
        success: true,
        message: resetResult.message,
        user: {
          email: resetResult.user.email,
          nombres: resetResult.user.nombres,
          apellidos: resetResult.user.apellidos
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: resetResult.message
      });
    }

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/verify-email/:token - Verificar email con token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de verificación requerido'
      });
    }

    // Verificar el token
    const verificationResult = await User.verifyEmailToken(token);
    
    if (verificationResult.success) {
      res.json({
        success: true,
        message: '¡Email verificado exitosamente! Ya puedes iniciar sesión.',
        user: {
          email: verificationResult.user.email,
          name: verificationResult.user.name,
          verified: true
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

  } catch (error) {
    console.error('Error en verificación de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/admin/create-user - Crear usuario como administrador
router.post('/admin/create-user', async (req, res) => {
  try {
    const { 
      nombres, 
      apellidos, 
      email, 
      telefono, 
      password, 
      rol, 
      cargo, 
      sueldo, 
      turno,
      // Campos de residente
      relacion_titular,
      fecha_inicio_residencia,
      es_encargado,
      id_departamento
    } = req.body;

    console.log('Admin create user attempt:', { nombres, apellidos, email, rol });

    // Validaciones básicas
    if (!nombres || !apellidos || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser completados (nombres, apellidos, email, password, rol)'
      });
    }

    // Validar rol
    if (!['Administrador', 'Residente', 'Empleado'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser "Administrador", "Residente" o "Empleado"'
      });
    }

    // Validaciones adicionales para Empleado
    if (rol === 'Empleado') {
      if (!cargo || !sueldo || !turno) {
        return res.status(400).json({
          success: false,
          message: 'Para el rol Empleado se requieren los campos: cargo, sueldo y turno'
        });
      }
      
      if (isNaN(sueldo) || parseFloat(sueldo) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El sueldo debe ser un número mayor a 0'
        });
      }
    }

    // Validaciones adicionales para Residente
    if (rol === 'Residente') {
      if (!relacion_titular || !fecha_inicio_residencia || !id_departamento) {
        return res.status(400).json({
          success: false,
          message: 'Para el rol Residente se requieren los campos: relacion_titular, fecha_inicio_residencia e id_departamento'
        });
      }
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar contraseña
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener entre 6 y 20 caracteres, al menos una minúscula, una mayúscula, un número y un carácter especial'
      });
    }

    // Verificar que el email no exista
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Crear el usuario con rol específico
    const name = `${nombres} ${apellidos}`.trim();
    const newUser = await User.createWithRole({
      name,
      email,
      password,
      nombres,
      apellidos,
      telefono,
      rol
    });

    // Marcar email como verificado automáticamente (creado por admin)
    await User.markEmailAsVerified(newUser.id);

    // Si es empleado, crear el registro en la tabla empleados
    if (rol === 'Empleado') {
      const db = require('../config/database_real');
      await db.query(
        `INSERT INTO empleados (cargo, sueldo, turno, id_user, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [cargo, parseFloat(sueldo), turno, newUser.id]
      );
      console.log(`✅ Registro de empleado creado para user_id: ${newUser.id}`);
    }

    // Si es residente, crear el registro en la tabla residentes
    if (rol === 'Residente') {
      const db = require('../config/database_real');
      
      // Primero obtener el id_persona del usuario
      const personaResult = await db.query(
        `SELECT id_persona FROM users WHERE id = $1`,
        [newUser.id]
      );
      
      if (personaResult.rows.length > 0) {
        const id_persona = personaResult.rows[0].id_persona;
        
        await db.query(
          `INSERT INTO residentes (
            relacion_titular, 
            fecha_inicio_residencia, 
            es_encargado, 
            id_persona, 
            id_departamento,
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            relacion_titular, 
            fecha_inicio_residencia, 
            es_encargado || false, 
            id_persona, 
            id_departamento
          ]
        );
        console.log(`✅ Registro de residente creado para user_id: ${newUser.id}, id_persona: ${id_persona}`);
      }
    }

    // Envío de email de bienvenida (sin PIN)
    try {
      const emailService = require('../services/universalEmailService');
      
      // Preparar datos del empleado si es necesario
      const empleadoData = (rol === 'Empleado' && cargo && sueldo && turno) 
        ? { cargo, sueldo, turno }
        : null;
      
      const emailResult = await emailService.sendWelcomeEmail(
        newUser.email,
        nombres,
        rol,
        password, // Para mostrar la contraseña temporal en el email
        empleadoData // Datos adicionales del empleado
      );

      if (emailResult.success) {
        console.log(`✅ Email de bienvenida enviado a ${newUser.email} como ${rol}`);
      } else {
        console.log(`📧 Email no configurado - Usuario creado como ${rol}`);
      }
    } catch (emailError) {
      console.log(`📧 Email no disponible - Usuario creado como ${rol}`);
    }

    // Respuesta exitosa
    const responseUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      rol: rol,
      created_at: newUser.created_at,
      persona: {
        nombres,
        apellidos,
        telefono
      }
    };

    // Agregar datos de empleado si aplica
    if (rol === 'Empleado') {
      responseUser.empleado = {
        cargo,
        sueldo: parseFloat(sueldo),
        turno
      };
    }

    res.status(201).json({
      success: true,
      message: `Usuario ${rol} creado exitosamente y verificado automáticamente.`,
      data: responseUser,
      sentWelcome: true // Indicar que se envió email de bienvenida
    });

  } catch (error) {
    console.error('Error creando usuario como admin:', error);
    
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;