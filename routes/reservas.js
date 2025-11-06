const express = require('express');
const router = express.Router();
const reservasCtrl = require('../controllers/reservasController');
const areasCtrl = require('../controllers/areasController');
const { requireAuth } = require('../middleware/auth');

// Obtener todas las reservas (admin)
router.get('/reservas', requireAuth, reservasCtrl.getAllReservas);

// Crear reserva para un área (residente)
router.post('/areas/:id/reservas', requireAuth, areasCtrl.createReservaArea);

// Actualizar estado de reserva
router.patch('/reservas/:id/estado', requireAuth, reservasCtrl.updateEstado);

// Obtener mis reservas
router.get('/mis-reservas', requireAuth, reservasCtrl.getMisReservas);

module.exports = router;
