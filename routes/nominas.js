const express = require('express');
const router = express.Router();
const Nomina = require('../models/Nomina');
const { requireAuth } = require('../middleware/auth');
const { query: dbQuery } = require('../config/database_real');

// Obtener MIS nóminas (para empleados)
router.get('/mias', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // ID del usuario autenticado
    const userRole = req.user.rol;

    console.log('🔍 GET /nominas/mias - Usuario:', { userId, rol: userRole });

    // Buscar el id_empleado asociado al usuario (relación en empleados.id_user -> users.id)
    const empleadoResult = await dbQuery(
      'SELECT id_empleado FROM empleados WHERE id_user = $1',
      [userId]
    );

    if (empleadoResult.rows.length === 0) {
      console.log('❌ No se encontró empleado para usuario:', userId);
      return res.json([]); // Retornar array vacío si no es empleado
    }

    const idEmpleado = empleadoResult.rows[0].id_empleado;
    console.log('✅ ID Empleado encontrado:', idEmpleado);

    // Obtener solo las nóminas PAGADAS del empleado
    const nominas = await Nomina.list({ 
      id_empleado: idEmpleado, 
      estado: 'pagada' 
    });

    console.log('✅ Nóminas pagadas encontradas:', nominas.length);
    res.json({ success: true, data: nominas });
  } catch (error) {
    console.error('❌ Error al obtener mis nóminas:', error);
    res.status(500).json({ message: 'Error al obtener nóminas' });
  }
});

// Listar todas las nóminas
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    // Solo administradores pueden ver nóminas
    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden ver nóminas' });
    }

    const filters = {
      periodo: req.query.periodo,
      estado: req.query.estado
    };

    const nominas = await Nomina.list(filters);
    res.json({ success: true, data: nominas });
  } catch (error) {
    console.error('Error al listar nóminas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener nóminas' });
  }
});

// Obtener nómina por ID con detalles
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden ver nóminas' });
    }

    const nomina = await Nomina.findById(req.params.id);
    
    if (!nomina) {
      return res.status(404).json({ message: 'Nómina no encontrada' });
    }

    res.json({ success: true, data: nomina });
  } catch (error) {
    console.error('Error al obtener nómina:', error);
    res.status(500).json({ message: 'Error al obtener nómina' });
  }
});

// Crear nueva nómina (boleta)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden crear nóminas' });
    }

    const { 
      id_empleado, 
      id_tecnico, // soportar técnicos externos con este nombre de campo
      tipo_empleado,
      periodo, 
      fecha_pago, 
      salario_base,
      bono,
      descuento,
      total,
      detalles 
    } = req.body;

    // Validar campos requeridos
    if (!periodo || !fecha_pago || total === undefined) {
      return res.status(400).json({ 
        message: 'Periodo, fecha_pago y total son requeridos' 
      });
    }

    // Validar que tenga al menos un empleado (interno) o técnico (externo)
    if (!id_empleado && !id_tecnico) {
      return res.status(400).json({ 
        message: 'Debe especificar un empleado interno o técnico externo' 
      });
    }

    const nuevaNomina = await Nomina.create({
      id_empleado: (tipo_empleado || '').toLowerCase() === 'interno' ? id_empleado : null,
      id_tecnico: (tipo_empleado || '').toLowerCase() === 'externo' ? id_tecnico : null,
      tipo_empleado: (tipo_empleado || 'interno').toLowerCase(),
      periodo,
      fecha_pago,
      salario_base: salario_base || 0,
      bono: bono || 0,
      descuento: descuento || 0,
      total,
      detalles: detalles || []
    });

    // Obtener la nómina completa con los datos del empleado
    const nominaCompleta = await Nomina.findById(nuevaNomina.id_nomina);

    res.status(201).json({ success: true, data: nominaCompleta });
  } catch (error) {
    console.error('Error al crear nómina:', error);
    res.status(500).json({ success: false, message: 'Error al crear nómina' });
  }
});

// Actualizar estado de nómina
router.patch('/:id/estado', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden actualizar nóminas' });
    }

    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: 'Estado es requerido' });
    }

    const nominaActualizada = await Nomina.updateEstado(req.params.id, estado);

    if (!nominaActualizada) {
      return res.status(404).json({ message: 'Nómina no encontrada' });
    }

    res.json({ success: true, data: nominaActualizada });
  } catch (error) {
    console.error('Error al actualizar estado de nómina:', error);
    res.status(500).json({ message: 'Error al actualizar estado de nómina' });
  }
});

// Eliminar nómina
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden eliminar nóminas' });
    }

    const nominaEliminada = await Nomina.delete(req.params.id);

    if (!nominaEliminada) {
      return res.status(404).json({ message: 'Nómina no encontrada' });
    }

    res.json({ success: true, message: 'Nómina eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar nómina:', error);
    res.status(500).json({ message: 'Error al eliminar nómina' });
  }
});

module.exports = router;
