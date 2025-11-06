const { query } = require('../config/database_real');

// Obtener todas las reservas (admin)
exports.getAllReservas = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Autenticación requerida' });
    
    // Solo administradores pueden ver todas las reservas
    if (user.rol?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden ver todas las reservas' });
    }

    const q = `
      SELECT r.id_reserva, r.codigo, r.fecha_ini, r.fecha_fin, r.estado, r.costo_total, r.id_area_comun, r.id_residente,
             a.nombre as area_nombre, a.ubicacion, a.descripcion, a.costo_hora,
             p.nombres || ' ' || p.apellidos as residente_nombre
      FROM reserva_areas r
      LEFT JOIN areas_comunes a ON r.id_area_comun = a.id_area_comun
      LEFT JOIN residentes res ON r.id_residente = res.id_residente
      LEFT JOIN personas p ON res.id_persona = p.id_persona
      ORDER BY r.fecha_ini DESC
    `;
    
    console.log('🔍 Obteniendo todas las reservas (admin)...');
    const result = await query(q);
    console.log(`✅ Reservas encontradas: ${result.rows.length}`);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo todas las reservas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo reservas', error: error.message });
  }
};

// Actualizar estado de una reserva
exports.updateEstado = async (req, res) => {
  try {
    const { id } = req.params; // id_reserva
    const { estado } = req.body;

    if (!estado) return res.status(400).json({ success: false, message: 'Estado requerido' });

    const check = await query('SELECT id_reserva FROM reserva_areas WHERE id_reserva = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Reserva no encontrada' });

    await query('UPDATE reserva_areas SET estado = $1, updated_at = NOW() WHERE id_reserva = $2', [estado, id]);

    const resData = await query('SELECT id_reserva, codigo, fecha_ini, fecha_fin, estado, costo_total, id_area_comun, id_residente FROM reserva_areas WHERE id_reserva = $1', [id]);

    res.json({ success: true, data: resData.rows[0], message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error actualizando estado reserva:', error);
    res.status(500).json({ success: false, message: 'Error actualizando estado', error: error.message });
  }
};

// Obtener reservas por usuario (mis reservas)
exports.getMisReservas = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Autenticación requerida' });

    // Obtener id_residente del usuario autenticado
    const residenteRes = await query('SELECT id_residente FROM residentes WHERE id_persona = (SELECT id_persona FROM users WHERE id = $1)', [user.id]);
    if (residenteRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Usuario no es un residente registrado' });
    const id_residente = residenteRes.rows[0].id_residente;

    const q = `
      SELECT r.id_reserva, r.codigo, r.fecha_ini, r.fecha_fin, r.estado, r.costo_total, r.id_area_comun, r.id_residente,
             a.nombre as area_nombre, a.ubicacion, a.descripcion, a.costo_hora,
             p.nombres as residente_nombres, p.apellidos as residente_apellidos
      FROM reserva_areas r
      LEFT JOIN areas_comunes a ON r.id_area_comun = a.id_area_comun
      LEFT JOIN residentes res ON r.id_residente = res.id_residente
      LEFT JOIN personas p ON res.id_persona = p.id_persona
      WHERE r.id_residente = $1
      ORDER BY r.fecha_ini DESC
    `;
    const result = await query(q, [id_residente]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error obteniendo mis reservas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo mis reservas', error: error.message });
  }
};
