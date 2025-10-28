const { query } = require('../config/database_real');
const bcrypt = require('bcryptjs');

const User = {
  // Crear un nuevo usuario (registro)
  async create(userData) {
    const { name, email, password, nombres, apellidos, telefono, rol = 'Residente' } = userData;
    
    try {
      // Encriptar la contraseña
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Primero crear la persona
      const personaResult = await query(
        `INSERT INTO personas (nombres, apellidos, correo, telefono, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id_persona`,
        [nombres, apellidos, email, telefono]
      );
      
      const personaId = personaResult.rows[0].id_persona;
      
      // Luego crear el usuario (siempre con rol 'Residente' por defecto)
      const userResult = await query(
        `INSERT INTO users (name, email, password, id_persona, rol, estado, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, email, created_at, rol`,
        [name, email, passwordHash, personaId, rol, 'activo']
      );
      
      // Retornar los datos combinados
      const newUser = userResult.rows[0];
  newUser.persona = personaResult.rows[0];
      
      return newUser;
      
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  },

  // Buscar usuario por email para login
  async findByEmail(email) {
    try {
      const result = await query(
  `SELECT u.id, u.name, u.email, u.password, u.remember_token, u.email_verified_at, 
    u.email_verification_token, u.rol, u.created_at, u.updated_at,
    p.id_persona, p.nombres, p.apellidos, p.correo, p.telefono, p.foto_url
   FROM users u
   LEFT JOIN personas p ON u.id_persona = p.id_persona
   WHERE u.email = $1`,
        [email]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error buscando usuario por email:', error);
      throw error;
    }
  },

  // Buscar usuario por ID
  async findById(id) {
    try {
      const result = await query(
  `SELECT u.id, u.name, u.email, u.rol, u.created_at, u.updated_at,
    u.estado,
    p.id_persona, p.nombres, p.apellidos, p.correo, p.telefono, p.foto_url
   FROM users u
   LEFT JOIN personas p ON u.id_persona = p.id_persona
   WHERE u.id = $1`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error buscando usuario por ID:', error);
      throw error;
    }
  },

  // Verificar contraseña
  async validatePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error validando contraseña:', error);
      throw error;
    }
  },

  // Verificar si el email ya existe
  async emailExists(email, excludeId = null) {
    try {
      let queryText = 'SELECT id FROM users WHERE email = $1';
      let params = [email];
      
      if (excludeId) {
        queryText += ' AND id != $2';
        params.push(excludeId);
      }
      
      const result = await query(queryText, params);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error verificando email:', error);
      throw error;
    }
  },

  // Actualizar último acceso
  async updateLastAccess(userId) {
    try {
      await query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Error actualizando último acceso:', error);
      throw error;
    }
  },

  // Obtener todos los usuarios (para administración)
  async getAll() {
    try {
      const result = await query(
  `SELECT u.id, u.name, u.email, u.created_at,
    p.nombres, p.apellidos, p.telefono
   FROM users u
   LEFT JOIN personas p ON u.id_persona = p.id_persona
   ORDER BY u.created_at DESC`
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  },

  // Actualizar información de usuario
  async update(id, userData) {
    const { name, email, nombres, apellidos, telefono } = userData;
    
    try {
      // Actualizar tabla users
      const userResult = await query(
        `UPDATE users 
         SET name = $2, email = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, email, updated_at`,
        [id, name, email]
      );
      
      // Actualizar tabla personas
      await query(
        `UPDATE personas 
         SET nombres = $2, apellidos = $3, correo = $4, telefono = $5, updated_at = NOW()
         WHERE id_persona = (SELECT id_persona FROM users WHERE id = $1)`,
        [id, nombres, apellidos, email, telefono]
      );
      
      return userResult.rows[0];
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  },

  // Cambiar contraseña
  async updatePassword(id, newPassword) {
    try {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      await query(
        'UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1',
        [id, passwordHash]
      );
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      throw error;
    }
  },

  // Obtener estadísticas básicas
  async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_usuarios,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as usuarios_ultimo_mes
        FROM users
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // ===============================
  // MÉTODOS PARA REMEMBER TOKEN
  // ===============================
  
  // Generar y guardar remember token
  async generateRememberToken(userId) {
    try {
      // Generar token aleatorio de 60 caracteres
      const crypto = require('crypto');
      const rememberToken = crypto.randomBytes(30).toString('hex');
      
      await query(
        'UPDATE users SET remember_token = $2, updated_at = NOW() WHERE id = $1',
        [userId, rememberToken]
      );
      
      return rememberToken;
    } catch (error) {
      console.error('Error generando remember token:', error);
      throw error;
    }
  },

  // Buscar usuario por remember token
  async findByRememberToken(token) {
    try {
      const result = await query(
        `SELECT u.id, u.name, u.email, u.remember_token, u.created_at, u.updated_at,
                p.id_persona, p.nombres, p.apellidos, p.correo, p.telefono, p.foto_url
         FROM users u
         JOIN personas p ON u.id_persona = p.id_persona
         WHERE u.remember_token = $1`,
        [token]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error buscando usuario por remember token:', error);
      throw error;
    }
  },

  // Limpiar remember token (logout)
  async clearRememberToken(userId) {
    try {
      await query(
        'UPDATE users SET remember_token = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Error limpiando remember token:', error);
      throw error;
    }
  },

  // ===============================
  // MÉTODOS PARA EMAIL VERIFICATION
  // ===============================

  // Marcar email como verificado
  async markEmailAsVerified(userId) {
    try {
      await query(
        'UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
        [userId]
      );
      
      return true;
    } catch (error) {
      console.error('Error marcando email como verificado:', error);
      throw error;
    }
  },

  // Verificar si el email está verificado
  async isEmailVerified(userId) {
    try {
      const result = await query(
        'SELECT email_verified_at FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) return false;
      
      return result.rows[0].email_verified_at !== null;
    } catch (error) {
      console.error('Error verificando estado del email:', error);
      throw error;
    }
  },

  // Generar PIN de verificación de email (6 dígitos)
  async generateEmailVerificationPIN(userId) {
    try {
      // Generar PIN de 6 dígitos
      const verificationPIN = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Calcular expiración (15 minutos)
      const expirationTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
      
      // Guardar PIN y expiración
      await query(
        'UPDATE users SET email_verification_token = $2, reset_password_expires = $3, updated_at = NOW() WHERE id = $1',
        [userId, verificationPIN, expirationTime]
      );
      
      return verificationPIN;
    } catch (error) {
      console.error('Error generando PIN de verificación:', error);
      throw error;
    }
  },

  // Marcar email como verificado automáticamente (para usuarios creados por admin)
  async markEmailAsVerified(userId) {
    try {
      await query(
        'UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );
      
      console.log(`✅ Email marcado como verificado para usuario ID: ${userId}`);
    } catch (error) {
      console.error('Error marcando email como verificado:', error);
      throw error;
    }
  },

  // Verificar email con PIN
  async verifyEmailWithPIN(email, pin) {
    try {
      const result = await query(
        `SELECT id, email_verification_token, reset_password_expires 
         FROM users 
         WHERE email = $1 AND email_verification_token = $2`,
        [email, pin]
      );
      
      if (result.rows.length === 0) {
        return { success: false, message: 'PIN inválido' };
      }
      
      const user = result.rows[0];
      const now = new Date();
      const expirationTime = new Date(user.reset_password_expires);
      
      // Verificar si el PIN ha expirado
      if (now > expirationTime) {
        // Limpiar PIN expirado
        await query(
          'UPDATE users SET email_verification_token = NULL, reset_password_expires = NULL WHERE id = $1',
          [user.id]
        );
        return { success: false, message: 'PIN expirado. Solicita uno nuevo.' };
      }
      
      // Marcar como verificado y limpiar PIN
      await query(
        'UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, reset_password_expires = NULL, updated_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      return { success: true, message: 'Email verificado exitosamente' };
    } catch (error) {
      console.error('Error verificando email con PIN:', error);
      throw error;
    }
  },

  // ===============================
  // MÉTODOS PARA RESET PASSWORD
  // ===============================

  // Generar PIN de reset de contraseña (6 dígitos)
  async generatePasswordResetPin(email) {
    try {
      // Generar PIN aleatorio de 6 dígitos
      const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
      const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // Expira en 15 minutos

      // Verificar que el usuario existe
      const user = await this.findByEmail(email);
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      // Guardar PIN y fecha de expiración
      await query(
        'UPDATE users SET reset_password_token = $2, reset_password_expires = $3, updated_at = NOW() WHERE id = $1',
        [user.id, resetPin, resetExpires]
      );

      return {
        success: true,
        resetPin,
        user: {
          id: user.id,
          email: user.email,
          nombres: user.nombres,
          apellidos: user.apellidos
        },
        expiresAt: resetExpires
      };

    } catch (error) {
      console.error('Error generando PIN de reset:', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  },

  // Verificar PIN de reset de contraseña
  async verifyPasswordResetPin(email, pin) {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.reset_password_expires,
                p.nombres, p.apellidos
         FROM users u
         JOIN personas p ON u.id_persona = p.id_persona
         WHERE u.email = $1 AND u.reset_password_token = $2 AND u.reset_password_expires > NOW()`,
        [email, pin]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'PIN inválido o expirado' };
      }

      const user = result.rows[0];
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nombres: user.nombres,
          apellidos: user.apellidos,
          expiresAt: user.reset_password_expires
        }
      };

    } catch (error) {
      console.error('Error verificando PIN de reset:', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  },

  // Cambiar contraseña con PIN de reset
  async resetPasswordWithPin(email, pin, newPassword) {
    try {
      // Verificar PIN primero
      const pinVerification = await this.verifyPasswordResetPin(email, pin);
      if (!pinVerification.success) {
        return pinVerification;
      }

      const userId = pinVerification.user.id;

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña y limpiar PIN de reset
      await query(
        `UPDATE users 
         SET password = $2, 
             reset_password_token = NULL, 
             reset_password_expires = NULL, 
             updated_at = NOW() 
         WHERE id = $1`,
        [userId, passwordHash]
      );

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente',
        user: pinVerification.user
      };

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  },

  // Limpiar tokens de reset expirados (tarea de mantenimiento)
  async cleanupExpiredResetTokens() {
    try {
      const result = await query(
        `UPDATE users 
         SET reset_password_token = NULL, reset_password_expires = NULL 
         WHERE reset_password_expires < NOW() AND reset_password_token IS NOT NULL
         RETURNING id`
      );

      console.log(`🧹 Limpiados ${result.rows.length} tokens de reset expirados`);
      return result.rows.length;

    } catch (error) {
      console.error('Error limpiando tokens expirados:', error);
      return 0;
    }
  },

  // Crear usuario con rol específico (para administradores)
  async createWithRole(userData) {
    const { name, email, password, nombres, apellidos, telefono, rol } = userData;
    
    try {
      // Encriptar la contraseña
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Primero crear la persona
      const personaResult = await query(
        `INSERT INTO personas (nombres, apellidos, correo, telefono, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id_persona`,
        [nombres, apellidos, email, telefono]
      );
      
      const personaId = personaResult.rows[0].id_persona;
      
      // Crear el usuario con rol específico y estado activo
      const userResult = await query(
        `INSERT INTO users (name, email, password, id_persona, rol, estado, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, email, rol, created_at`,
        [name, email, passwordHash, personaId, rol, 'activo']
      );
      
      // Retornar los datos combinados
      const newUser = userResult.rows[0];
      newUser.persona = {
        id_persona: personaId,
        nombres,
        apellidos,
        telefono
      };
      
      return newUser;
      
    } catch (error) {
      console.error('Error creando usuario con rol:', error);
      throw error;
    }
  },

  // ===============================
  // SISTEMA DE BLOQUEO POR INTENTOS FALLIDOS
  // ===============================

  // Verificar si un usuario está bloqueado
  async isUserLocked(email) {
    try {
      const result = await query(
        `SELECT locked_until, failed_login_attempts 
         FROM users 
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return { locked: false, reason: 'Usuario no encontrado' };
      }

      const user = result.rows[0];
      const now = new Date();
      
      // Si hay una fecha de bloqueo y aún no ha expirado
      if (user.locked_until && new Date(user.locked_until) > now) {
        const lockExpiry = new Date(user.locked_until);
        const minutesLeft = Math.ceil((lockExpiry - now) / (1000 * 60));
        
        return { 
          locked: true, 
          reason: `Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en ${minutesLeft} minuto(s).`,
          attemptsCount: user.failed_login_attempts,
          unlockTime: lockExpiry
        };
      }

      return { 
        locked: false, 
        attemptsCount: user.failed_login_attempts || 0 
      };

    } catch (error) {
      console.error('Error verificando bloqueo de usuario:', error);
      throw error;
    }
  },

  // Registrar intento fallido de login
  async recordFailedLogin(email) {
    try {
      const MAX_ATTEMPTS = 3;
      const LOCK_DURATION_MINUTES = 15; // 15 minutos de bloqueo

      // Obtener intentos actuales
      const result = await query(
        `SELECT failed_login_attempts, locked_until FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return { success: false, reason: 'Usuario no encontrado' };
      }

      const currentAttempts = (result.rows[0].failed_login_attempts || 0) + 1;
      let lockUntil = null;

      // Si alcanza el máximo de intentos, bloquear la cuenta
      if (currentAttempts >= MAX_ATTEMPTS) {
        lockUntil = new Date(Date.now() + (LOCK_DURATION_MINUTES * 60 * 1000));
        
        console.log(`🔒 Usuario ${email} bloqueado por ${MAX_ATTEMPTS} intentos fallidos hasta ${lockUntil.toLocaleString('es-ES')}`);
      }

      // Actualizar intentos fallidos y posible bloqueo
      await query(
        `UPDATE users 
         SET failed_login_attempts = $2, 
             last_failed_login = NOW(), 
             locked_until = $3, 
             updated_at = NOW()
         WHERE email = $1`,
        [email, currentAttempts, lockUntil]
      );

      return {
        success: true,
        attempts: currentAttempts,
        maxAttempts: MAX_ATTEMPTS,
        locked: currentAttempts >= MAX_ATTEMPTS,
        lockUntil: lockUntil,
        remainingAttempts: MAX_ATTEMPTS - currentAttempts
      };

    } catch (error) {
      console.error('Error registrando intento fallido:', error);
      throw error;
    }
  },

  // Resetear intentos fallidos después de login exitoso
  async resetFailedLogins(email) {
    try {
      await query(
        `UPDATE users 
         SET failed_login_attempts = 0, 
             locked_until = NULL, 
             last_failed_login = NULL, 
             updated_at = NOW()
         WHERE email = $1`,
        [email]
      );

      console.log(`✅ Intentos fallidos reseteados para usuario ${email}`);
    } catch (error) {
      console.error('Error reseteando intentos fallidos:', error);
      throw error;
    }
  },

  // Desbloquear usuario manualmente (para administradores)
  async unlockUser(email) {
    try {
      const result = await query(
        `UPDATE users 
         SET failed_login_attempts = 0, 
             locked_until = NULL, 
             last_failed_login = NULL, 
             updated_at = NOW()
         WHERE email = $1
         RETURNING id, email`,
        [email]
      );

      if (result.rows.length > 0) {
        console.log(`🔓 Usuario ${email} desbloqueado manualmente`);
        return { success: true, message: 'Usuario desbloqueado exitosamente' };
      } else {
        return { success: false, message: 'Usuario no encontrado' };
      }

    } catch (error) {
      console.error('Error desbloqueando usuario:', error);
      throw error;
    }
  },

  // Limpiar bloqueos expirados (tarea de mantenimiento)
  async cleanupExpiredLocks() {
    try {
      const result = await query(
        `UPDATE users 
         SET failed_login_attempts = 0, 
             locked_until = NULL, 
             last_failed_login = NULL, 
             updated_at = NOW()
         WHERE locked_until < NOW() AND locked_until IS NOT NULL
         RETURNING id, email`
      );

      if (result.rows.length > 0) {
        console.log(`🧹 ${result.rows.length} bloqueos expirados limpiados`);
      }

      return result.rows.length;

    } catch (error) {
      console.error('Error limpiando bloqueos expirados:', error);
      return 0;
    }
  }
};

module.exports = User;