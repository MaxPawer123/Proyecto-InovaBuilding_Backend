const express = require('express');
const router = express.Router();
const Consumo = require('../models/Consumo');

// GET /api/consumos
router.get('/', async (req, res) => {
  try {
    const filters = {
      id_departamento: req.query.id_departamento,
      periodo: req.query.periodo,
      tipo_servicio: req.query.tipo_servicio
    };
    const rows = await Consumo.list(filters);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error GET /api/consumos', error);
    res.status(500).json({ success: false, message: 'Error listando consumos' });
  }
});

// POST /api/consumos
router.post('/', async (req, res) => {
  try {
    const { id_departamento, tipo_servicio, periodo, consumo, costo_total, observaciones } = req.body;
    
    console.log('📥 POST /api/consumos - Datos recibidos:', { id_departamento, tipo_servicio, periodo, consumo, costo_total });
    
    if (!id_departamento || !tipo_servicio || !periodo) {
      return res.status(400).json({ success: false, message: 'Campos requeridos: id_departamento, tipo_servicio, periodo' });
    }
    
    // Validar formato de periodo (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ success: false, message: 'Formato de periodo inválido. Use YYYY-MM' });
    }
    
    const row = await Consumo.create({ 
      id_departamento: parseInt(id_departamento), 
      tipo_servicio, 
      periodo, 
      consumo: parseFloat(consumo) || 0, 
      costo_total: parseFloat(costo_total) || 0, 
      observaciones 
    });
    
    console.log('✅ Consumo creado exitosamente:', row);
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('❌ Error POST /api/consumos:', error);
    res.status(500).json({ success: false, message: 'Error creando consumo: ' + error.message });
  }
});

// PATCH /api/consumos/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { consumo, costo_total, observaciones } = req.body;
    
    const row = await Consumo.update(parseInt(id), { consumo, costo_total, observaciones });
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('Error PATCH /api/consumos/:id', error);
    res.status(500).json({ success: false, message: 'Error actualizando consumo' });
  }
});

// DELETE /api/consumos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Consumo.delete(parseInt(id));
    res.json({ success: true, message: 'Consumo eliminado' });
  } catch (error) {
    console.error('Error DELETE /api/consumos/:id', error);
    res.status(500).json({ success: false, message: 'Error eliminando consumo' });
  }
});

module.exports = router;
