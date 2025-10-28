const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');
const { requireAuth } = require('../middleware/auth');

// Obtener notificaciones del usuario autenticado
router.get('/', requireAuth, async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    if (!id_persona) {
      return res.status(400).json({ message: 'Usuario no tiene persona asociada' });
    }

    const soloNoLeidas = req.query.solo_no_leidas === 'true';
    const notificaciones = await Notificacion.getByPersona(id_persona, soloNoLeidas);
    
    res.json({
      success: true,
      data: notificaciones,
      count: notificaciones.length
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener notificaciones' 
    });
  }
});

// Marcar notificación como leída
router.patch('/:id/leer', requireAuth, async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const id_notificacion = req.params.id;
    
    const notificacion = await Notificacion.marcarLeida(id_notificacion, id_persona);
    
    if (!notificacion) {
      return res.status(404).json({ 
        success: false,
        message: 'Notificación no encontrada' 
      });
    }
    
    res.json({
      success: true,
      data: notificacion
    });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al marcar notificación como leída' 
    });
  }
});

// Marcar todas las notificaciones como leídas
router.patch('/leer-todas', requireAuth, async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const notificaciones = await Notificacion.marcarTodasLeidas(id_persona);
    
    res.json({
      success: true,
      data: notificaciones,
      count: notificaciones.length
    });
  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al marcar todas las notificaciones como leídas' 
    });
  }
});

// Eliminar notificación
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const id_notificacion = req.params.id;
    
    const notificacion = await Notificacion.delete(id_notificacion, id_persona);
    
    if (!notificacion) {
      return res.status(404).json({ 
        success: false,
        message: 'Notificación no encontrada' 
      });
    }
    
    res.json({
      success: true,
      message: 'Notificación eliminada correctamente'
    });
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al eliminar notificación' 
    });
  }
});

module.exports = router;
