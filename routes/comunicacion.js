const express = require('express');
const router = express.Router();
const anunciosCtrl = require('../controllers/anunciosController');
const quejasCtrl = require('../controllers/quejasController');
const votCtrl = require('../controllers/votacionesController');
const chatCtrl = require('../controllers/chatHttpController');
const { requireAuth, requireAdmin, requireAnyRole, requireAdminOrEmpleado } = require('../middleware/auth');

// Anuncios
router.post('/anuncios', requireAuth, anunciosCtrl.createAnuncio);
// Listing and viewing anuncios should be public (only create/update/delete require auth)
router.get('/anuncios', anunciosCtrl.listAnuncios);
router.get('/anuncios/:id', anunciosCtrl.getAnuncio);
router.patch('/anuncios/:id', requireAuth, anunciosCtrl.updateAnuncio);
router.delete('/anuncios/:id', requireAuth, anunciosCtrl.deleteAnuncio);

// Quejas
router.post('/quejas', requireAuth, quejasCtrl.createQueja);
// Listar quejas (residente ve solo las suyas con ?mine=1, admin/empleado ve todas)
router.get('/quejas', requireAuth, quejasCtrl.listQuejas);
router.get('/quejas/:id', requireAuth, quejasCtrl.getQueja);
router.put('/quejas/:id', requireAuth, requireAdminOrEmpleado, quejasCtrl.updateQueja);

// Votaciones
// Create and voting require authentication, but listing and viewing a votación should be public
router.post('/votaciones', requireAuth, votCtrl.createVotacion);
router.get('/votaciones', votCtrl.listVotaciones);
router.get('/votaciones/:id', votCtrl.getVotacion);
router.post('/votos', requireAuth, votCtrl.votar);
router.get('/votaciones/:id/opciones', votCtrl.getVotacion);

// Chat (HTTP endpoints)
router.get('/salas', requireAuth, chatCtrl.listSalas);
router.post('/salas', requireAuth, chatCtrl.createSala);
router.patch('/salas/:id', requireAuth, requireAdmin, chatCtrl.updateSala);
router.delete('/salas/:id', requireAuth, requireAdmin, chatCtrl.deleteSala);
router.get('/salas/:id_sala/mensajes', requireAuth, chatCtrl.listMensajes);
router.post('/salas/:id_sala/mensajes', requireAuth, async (req, res) => {
	try {
		const { id_sala } = req.params;
		const { contenido } = req.body;
		const id_user = req.user.id;
		if (!contenido) return res.status(400).json({ success: false, message: 'Contenido requerido' });
		const result = await require('../config/database_real').query('INSERT INTO mensajes_chat (contenido, id_sala, id_user) VALUES ($1,$2,$3) RETURNING *', [contenido, id_sala, id_user]);
		res.status(201).json({ success: true, data: result.rows[0] });
	} catch (err) {
		console.error('post mensaje error:', err);
		res.status(500).json({ success: false, message: 'Error creando mensaje' });
	}
});

module.exports = router;
