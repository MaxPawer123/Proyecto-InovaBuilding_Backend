const express = require('express');
const router = express.Router();
const TecnicoExterno = require('../models/TecnicoExterno');
const { requireAuth } = require('../middleware/auth');

// Listar todos los técnicos externos
router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = {};
    
    // Filtrar solo activos si se especifica
    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    const tecnicos = await TecnicoExterno.list(filters);
    res.json(tecnicos);
  } catch (error) {
    console.error('Error al listar técnicos externos:', error);
    res.status(500).json({ message: 'Error al obtener técnicos externos' });
  }
});

// Obtener técnico por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tecnico = await TecnicoExterno.findById(req.params.id);
    
    if (!tecnico) {
      return res.status(404).json({ message: 'Técnico externo no encontrado' });
    }

    res.json(tecnico);
  } catch (error) {
    console.error('Error al obtener técnico externo:', error);
    res.status(500).json({ message: 'Error al obtener técnico externo' });
  }
});

// Crear nuevo técnico externo (solo admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;
    console.log('👤 Usuario intentando crear técnico:', { 
      email: req.user.email, 
      rol: userRole, 
      rolType: typeof userRole,
      rolLower: userRole?.toLowerCase() 
    });

    // Verificar que sea administrador (case-insensitive)
    if (userRole?.toLowerCase() !== 'administrador') {
      console.log('❌ Acceso denegado. Rol requerido: "administrador", Rol actual:', userRole);
      return res.status(403).json({ message: 'Solo administradores pueden crear técnicos externos' });
    }

    const { nombres, apellidos, cargo, celular, email } = req.body;

    // Validar campos requeridos
    if (!nombres || !apellidos || !cargo || !celular) {
      return res.status(400).json({ 
        message: 'Nombres, apellidos, cargo y celular son requeridos' 
      });
    }

    const nuevoTecnico = await TecnicoExterno.create({
      nombres,
      apellidos,
      cargo,
      celular,
      email: email || null
    });

    res.status(201).json(nuevoTecnico);
  } catch (error) {
    console.error('Error al crear técnico externo:', error);
    res.status(500).json({ message: 'Error al crear técnico externo' });
  }
});

// Actualizar técnico externo (solo admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    // Verificar que sea administrador (case-insensitive)
    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden actualizar técnicos externos' });
    }

    const { nombres, apellidos, cargo, celular, email, activo } = req.body;

    const tecnicoActualizado = await TecnicoExterno.update(req.params.id, {
      nombres,
      apellidos,
      cargo,
      celular,
      email,
      activo
    });

    if (!tecnicoActualizado) {
      return res.status(404).json({ message: 'Técnico externo no encontrado' });
    }

    res.json(tecnicoActualizado);
  } catch (error) {
    console.error('Error al actualizar técnico externo:', error);
    res.status(500).json({ message: 'Error al actualizar técnico externo' });
  }
});

// Eliminar técnico externo (soft delete - solo admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    // Verificar que sea administrador (case-insensitive)
    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden eliminar técnicos externos' });
    }

    const tecnicoEliminado = await TecnicoExterno.delete(req.params.id);

    if (!tecnicoEliminado) {
      return res.status(404).json({ message: 'Técnico externo no encontrado' });
    }

    res.json({ message: 'Técnico externo desactivado exitosamente', tecnico: tecnicoEliminado });
  } catch (error) {
    console.error('Error al eliminar técnico externo:', error);
    res.status(500).json({ message: 'Error al eliminar técnico externo' });
  }
});

module.exports = router;
