const jwt = require('jsonwebtoken');
const User = require('../models/UserReal');

// Generar token JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_jwt_edificio';

const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      id: userId, 
      rol: role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { 
      expiresIn: '24h' // Token válido por 24 horas
    }
  );
};

// Verificar token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware para verificar autenticación
const requireAuth = async (req, res, next) => {
  try {
    // Obtener token: preferir header Authorization, si no existe, leer cookie
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
      console.log('🔑 Token from Authorization header:', token.substring(0, 20) + '...');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('🍪 Token from cookie:', token.substring(0, 20) + '...');
    }
    
    if (!token) {
      console.log('❌ No token found. Headers:', req.headers.authorization, 'Cookies:', req.cookies);
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar el token
    const decoded = verifyToken(token);    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Verificar que el usuario aún existe y está activo (chequeamos la columna 'estado')
    const user = await User.findById(decoded.id);

    if (!user || (user.estado && user.estado.toString().toLowerCase() !== 'activo')) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // Agregar información del usuario a la request (incluir id_persona)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido,
      id_persona: user.id_persona  // ← Agregar id_persona
    };

    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const userRole = (req.user.rol || '').toString().toLowerCase();
    
    // compare case-insensitive
    const allowed = allowedRoles.map(r => r.toString().toLowerCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Middleware específicos para cada rol
const requireAdmin = requireRole(['administrador']);
const requireAdminOrEmpleado = requireRole(['administrador', 'empleado']);
const requireAnyRole = requireRole(['administrador', 'empleado', 'residente']);

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  requireRole,
  requireAdmin,
  requireAdminOrEmpleado,
  requireAnyRole
};