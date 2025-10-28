const express = require('express');
const router = express.Router();
const areasCtrl = require('../controllers/areasController');
// Debug: mostrar ruta real del módulo requerido y las claves exportadas
try {
	console.log('areasController resolved path ->', require.resolve('../controllers/areasController'));
	console.log('Loaded areas controller exports ->', Object.keys(areasCtrl));
} catch (e) {
	console.error('Error mostrando info de areasController:', e);
}
const { requireAuth, requireAdmin, requireAdminOrEmpleado } = require('../middleware/auth');

/**
 * Rutas para gestión de Áreas Comunes
 * Todas las rutas de modificación requieren autenticación de admin/empleado
 */

// Listar todas las áreas (puede ser público para que residentes vean)
router.get('/', areasCtrl.listAreas);

// Obtener un área específica
router.get('/:id', areasCtrl.getArea);

// Crear nueva área (solo admin/empleado)
router.post('/', requireAuth, requireAdminOrEmpleado, areasCtrl.createArea);

// Actualizar área (solo admin/empleado)
router.patch('/:id', requireAuth, requireAdminOrEmpleado, areasCtrl.updateArea);

// Eliminar área (solo admin/empleado)
router.delete('/:id', requireAuth, requireAdminOrEmpleado, areasCtrl.deleteArea);

// Obtener reservas de un área específica
router.get('/:id/reservas', requireAuth, areasCtrl.getReservasArea);

module.exports = router;
