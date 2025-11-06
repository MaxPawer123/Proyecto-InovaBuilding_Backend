const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createFactura,
  getAllFacturas,
  getFacturaById,
  updateFacturaEstado,
  deleteFactura
} = require('../controllers/facturasController');

// Crear factura (solo admin)
router.post('/', requireAuth, createFactura);

// Obtener todas las facturas con filtros opcionales
router.get('/', requireAuth, getAllFacturas);

// Obtener factura específica por ID
router.get('/:id', requireAuth, getFacturaById);

// Actualizar estado de factura (solo admin)
router.patch('/:id/estado', requireAuth, updateFacturaEstado);

// Eliminar factura (solo admin)
router.delete('/:id', requireAuth, deleteFactura);

module.exports = router;
