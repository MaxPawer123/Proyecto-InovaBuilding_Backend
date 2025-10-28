const express = require('express');
const router = express.Router();
const Alerta = require('../models/Alerta');

// GET /api/alertas - Listar alertas con filtros
router.get('/', async (req, res) => {
  try {
    const { id_departamento, tipo_servicio, periodo, estado } = req.query;
    
    const filters = {};
    if (id_departamento) filters.id_departamento = parseInt(id_departamento);
    if (tipo_servicio) filters.tipo_servicio = tipo_servicio;
    if (periodo) filters.periodo = periodo;
    if (estado) filters.estado = estado;

    const alertas = await Alerta.list(filters);

    res.json({
      success: true,
      data: alertas
    });
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/alertas - Crear nueva alerta
router.post('/', async (req, res) => {
  try {
    const { id_departamento, tipo_servicio, periodo, mensaje, estado } = req.body;

    // Validaciones
    if (!id_departamento || !tipo_servicio || !periodo || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: id_departamento, tipo_servicio, periodo, mensaje'
      });
    }

    // Validar formato de periodo (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({
        success: false,
        message: 'El periodo debe tener formato YYYY-MM'
      });
    }

    // Validar tipo_servicio
    if (!['agua', 'luz', 'gas'].includes(tipo_servicio)) {
      return res.status(400).json({
        success: false,
        message: 'tipo_servicio debe ser: agua, luz o gas'
      });
    }

    // Validar estado si se proporciona
    if (estado && !['abierta', 'en_progreso', 'resuelta'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'estado debe ser: abierta, en_progreso o resuelta'
      });
    }

    const payload = {
      id_departamento: parseInt(id_departamento),
      tipo_servicio,
      periodo,
      mensaje,
      estado: estado || 'abierta'
    };

    const alerta = await Alerta.create(payload);

    res.status(201).json({
      success: true,
      message: 'Alerta creada exitosamente',
      data: alerta
    });
  } catch (error) {
    console.error('Error creando alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// PATCH /api/alertas/:id - Actualizar estado de alerta
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El campo estado es requerido'
      });
    }

    if (!['abierta', 'en_progreso', 'resuelta'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'estado debe ser: abierta, en_progreso o resuelta'
      });
    }

    const alerta = await Alerta.updateEstado(parseInt(id), estado);

    if (!alerta) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Estado de alerta actualizado',
      data: alerta
    });
  } catch (error) {
    console.error('Error actualizando alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// DELETE /api/alertas/:id - Eliminar alerta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const alerta = await Alerta.delete(parseInt(id));

    if (!alerta) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Alerta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
