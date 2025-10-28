const express = require('express');
const router = express.Router();
const User = require('../models/UserReal');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/users - Obtener todos los usuarios (acceso público para el dashboard)
router.get('/', async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database_real');
    
    // Obtener todos los usuarios con información de personas
    const result = await dbQuery(`
      SELECT u.id, u.name, u.email, u.rol, u.estado, u.created_at, u.updated_at,
             p.id_persona, p.nombres, p.apellidos, p.telefono, p.correo
      FROM users u
      LEFT JOIN personas p ON u.id_persona = p.id_persona
      ORDER BY u.rol, u.name
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
      created_at: user.created_at,
      persona: {
        id_persona: user.id_persona,
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
        correo: user.correo
      }
    }));

    res.json({
      success: true,
      data: {
        users,
        total: users.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/stats - Obtener estadísticas de usuarios (solo administradores)
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await User.getStats();

    res.json({
      success: true,
      data: {
        stats
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:id/profile - Obtener perfil completo de usuario (sin autenticación para s)
router.get('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { query: dbQuery } = require('../config/database_real');
    
    // Obtener usuario con información completa de persona
    const result = await dbQuery(`
      SELECT u.id, u.name, u.email, u.rol, u.estado, u.created_at, u.updated_at,
             p.id_persona, p.nombres, p.apellidos, p.telefono, p.correo
      FROM users u
      LEFT JOIN personas p ON u.id_persona = p.id_persona
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          rol: user.rol,
          estado: user.estado,
          persona: {
            id_persona: user.id_persona,
            nombres: user.nombres,
            apellidos: user.apellidos,
            telefono: user.telefono,
            correo: user.correo
          }
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/departamentos - Obtener lista de departamentos (DEBE IR ANTES DE /:id)
router.get('/departamentos', async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database_real');
    
    const result = await dbQuery(`
      SELECT 
        d.id_departamento,
        d.nro_depa,
        d.habitaciones,
        d.estado,
        d.id_contrato,
        d.created_at,
        d.updated_at
      FROM departamentos d
      ORDER BY d.nro_depa
    `);

    res.json({
      success: true,
      data: {
        departamentos: result.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/mi-departamento/:userId - Obtener departamento del residente
router.get('/mi-departamento/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { query: dbQuery } = require('../config/database_real');
    
    // Consultar departamento del residente a través de las relaciones
    const result = await dbQuery(`
      SELECT 
        d.id_departamento,
        d.nro_depa,
        d.habitaciones,
        d.estado,
        d.id_contrato
      FROM departamentos d
      INNER JOIN residentes r ON r.id_departamento = d.id_departamento
      INNER JOIN users u ON u.id_persona = r.id_persona
      WHERE u.id = $1 AND u.rol = 'Residente'
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró departamento asociado a este usuario o el usuario no es residente'
      });
    }

    res.json({
      success: true,
      data: {
        departamento: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo departamento del residente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:id - Obtener usuario específico (solo administradores)
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id/deactivate - Desactivar usuario (solo administradores)
router.put('/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // No permitir que el admin se desactive a sí mismo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await User.deactivate(id);

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error desactivando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id/activate - Reactivar usuario (solo administradores)
router.put('/:id/activate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await User.activate(id);

    res.json({
      success: true,
      message: 'Usuario reactivado exitosamente'
    });

  } catch (error) {
    console.error('Error reactivando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id - Actualizar perfil de usuario (temporal sin autenticación para pruebas)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, telefono, name } = req.body;
    
    console.log(`Actualizando usuario ${id}:`, { nombres, apellidos, telefono, name });

    const { query: dbQuery } = require('../config/database_real');
    
    // Iniciar transacción
    await dbQuery('BEGIN');
    
    try {
      // Actualizar tabla users si se proporciona name
      if (name) {
        await dbQuery(
          `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`,
          [name, id]
        );
      }
      
      // Actualizar tabla personas si se proporcionan datos
      if (nombres || apellidos || telefono) {
        const user = await dbQuery('SELECT id_persona FROM users WHERE id = $1', [id]);
        
        if (user.rows.length === 0) {
          await dbQuery('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
          });
        }
        
        const idPersona = user.rows[0].id_persona;
        
        // Construir query dinámicamente
        const updates = [];
        const values = [];
        let valueIndex = 1;
        
        if (nombres) {
          updates.push(`nombres = $${valueIndex}`);
          values.push(nombres);
          valueIndex++;
        }
        
        if (apellidos) {
          updates.push(`apellidos = $${valueIndex}`);
          values.push(apellidos);
          valueIndex++;
        }
        
        if (telefono) {
          updates.push(`telefono = $${valueIndex}`);
          values.push(telefono);
          valueIndex++;
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(idPersona);
        
        const updateQuery = `UPDATE personas SET ${updates.join(', ')} WHERE id_persona = $${valueIndex}`;
        await dbQuery(updateQuery, values);
      }
      
      // Obtener usuario actualizado
      const updatedUserResult = await dbQuery(`
        SELECT u.id, u.name, u.email, u.rol, u.estado, u.created_at, u.updated_at,
               p.id_persona, p.nombres, p.apellidos, p.telefono, p.correo
        FROM users u
        LEFT JOIN personas p ON u.id_persona = p.id_persona
        WHERE u.id = $1
      `, [id]);
      
      await dbQuery('COMMIT');
      
      const updatedUser = updatedUserResult.rows[0];
      
      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            rol: updatedUser.rol,
            estado: updatedUser.estado,
            persona: {
              id_persona: updatedUser.id_persona,
              nombres: updatedUser.nombres,
              apellidos: updatedUser.apellidos,
              telefono: updatedUser.telefono,
              correo: updatedUser.correo
            }
          }
        }
      });
      
    } catch (innerError) {
      await dbQuery('ROLLBACK');
      throw innerError;
    }

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;