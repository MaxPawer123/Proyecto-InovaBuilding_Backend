const { query } = require('../config/database_real');

/**
 * Controlador de Áreas Comunes
 * Maneja CRUD de áreas comunes del edificio
 */

// Obtener todas las áreas comunes
exports.listAreas = async (req, res) => {
  try {
    const { id_edificio } = req.query;
    
    let sql = `
      SELECT 
        id_area_comun,
        nombre,
        ubicacion,
        descripcion,
        costo_hora,
        id_edificio,
        created_at,
        updated_at
      FROM areas_comunes
    `;
    
    const params = [];
    
    if (id_edificio) {
      sql += ' WHERE id_edificio = $1';
      params.push(id_edificio);
    }
    
    sql += ' ORDER BY nombre ASC';
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error listando áreas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las áreas comunes',
      error: error.message
    });
  }
};

// Obtener un área específica
exports.getArea = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        id_area_comun,
        nombre,
        ubicacion,
        descripcion,
        costo_hora,
        id_edificio,
        created_at,
        updated_at
      FROM areas_comunes
      WHERE id_area_comun = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Área no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo área:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el área',
      error: error.message
    });
  }
};

// Crear nueva área común
exports.createArea = async (req, res) => {
  try {
    const { nombre, ubicacion, descripcion, costo_hora, id_edificio } = req.body;
    
    // Validaciones
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido'
      });
    }
    
    // Insertar sin id_edificio (será NULL) si no se proporciona
    const insertFields = ['nombre', 'ubicacion', 'descripcion', 'costo_hora', 'created_at', 'updated_at'];
    const insertValues = [
      nombre,
      ubicacion || null,
      descripcion || null,
      costo_hora || 0
    ];
    let placeholders = ['$1', '$2', '$3', '$4', 'NOW()', 'NOW()'];
    
    // Solo agregar id_edificio si se proporciona Y existe en la tabla edificios
    if (id_edificio) {
      insertFields.splice(4, 0, 'id_edificio');
      insertValues.splice(4, 0, id_edificio);
      placeholders = ['$1', '$2', '$3', '$4', '$5', 'NOW()', 'NOW()'];
    }
    
    const result = await query(
      `INSERT INTO areas_comunes 
        (${insertFields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING 
        id_area_comun,
        nombre,
        ubicacion,
        descripcion,
        costo_hora,
        id_edificio,
        created_at,
        updated_at`,
      insertValues
    );
    
    res.status(201).json({
      success: true,
      message: 'Área creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando área:', error);
    console.error('Detalles del error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al crear el área',
      error: error.message
    });
  }
};

// Actualizar área común
exports.updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, descripcion, costo_hora } = req.body;
    
    // Verificar que el área existe
    const checkResult = await query(
      'SELECT id_area_comun FROM areas_comunes WHERE id_area_comun = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Área no encontrada'
      });
    }
    
    // Construir query dinámico
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (nombre !== undefined) {
      updates.push(`nombre = $${paramCount}`);
      params.push(nombre);
      paramCount++;
    }
    
    if (ubicacion !== undefined) {
      updates.push(`ubicacion = $${paramCount}`);
      params.push(ubicacion);
      paramCount++;
    }
    
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramCount}`);
      params.push(descripcion);
      paramCount++;
    }
    
    if (costo_hora !== undefined) {
      updates.push(`costo_hora = $${paramCount}`);
      params.push(costo_hora);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos para actualizar'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(id);
    
    const sql = `
      UPDATE areas_comunes
      SET ${updates.join(', ')}
      WHERE id_area_comun = $${paramCount}
      RETURNING 
        id_area_comun,
        nombre,
        ubicacion,
        descripcion,
        costo_hora,
        id_edificio,
        created_at,
        updated_at
    `;
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      message: 'Área actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando área:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el área',
      error: error.message
    });
  }
};

// Eliminar área común
exports.deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el área existe
    const checkResult = await query(
      'SELECT id_area_comun FROM areas_comunes WHERE id_area_comun = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Área no encontrada'
      });
    }
    
    // Verificar si tiene reservas asociadas
    const reservasResult = await query(
      'SELECT COUNT(*) as count FROM reserva_areas WHERE id_area_comun = $1',
      [id]
    );
    
    if (parseInt(reservasResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el área porque tiene reservas asociadas'
      });
    }
    
    await query('DELETE FROM areas_comunes WHERE id_area_comun = $1', [id]);
    
    res.json({
      success: true,
      message: 'Área eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando área:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el área',
      error: error.message
    });
  }
};

// Crear una nueva reserva para un área (residente)
exports.createReservaArea = async (req, res) => {
  try {
    const { id } = req.params; // id_area_comun
    const { fecha_ini, fecha_fin } = req.body;

    // usuario autenticado
    const user = req.user; // requireAuth debe poblar esto
    if (!user) return res.status(401).json({ success: false, message: 'Autenticación requerida' });

    if (!fecha_ini || !fecha_fin) return res.status(400).json({ success: false, message: 'Fecha inicio y fin requeridos' });

    const fechaIni = new Date(fecha_ini);
    const fechaFin = new Date(fecha_fin);
    if (isNaN(fechaIni.getTime()) || isNaN(fechaFin.getTime())) return res.status(400).json({ success: false, message: 'Fechas inválidas' });
    if (fechaFin <= fechaIni) return res.status(400).json({ success: false, message: 'La fecha fin debe ser posterior a la fecha inicio' });

    // Obtener id_residente del usuario autenticado
    const residenteRes = await query('SELECT id_residente FROM residentes WHERE id_persona = (SELECT id_persona FROM users WHERE id = $1)', [user.id]);
    if (residenteRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Usuario no es un residente registrado' });
    const id_residente = residenteRes.rows[0].id_residente;

    // Verificar que el área existe y obtener costo_hora
    const areaRes = await query('SELECT id_area_comun, nombre, costo_hora FROM areas_comunes WHERE id_area_comun = $1', [id]);
    if (areaRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Área no encontrada' });
    const area = areaRes.rows[0];

    // Verificar conflictos de horario (estado distinto de 'cancelado')
    const conflictQ = `
      SELECT 1 FROM reserva_areas
      WHERE id_area_comun = $1
        AND estado != 'cancelado'
        AND fecha_ini < $3
        AND fecha_fin > $2
      LIMIT 1
    `;
    const conflict = await query(conflictQ, [id, fecha_ini, fecha_fin]);
    if (conflict.rows.length > 0) return res.status(400).json({ success: false, message: 'El horario seleccionado choca con otra reserva' });

    // Calcular costo total (horas completas como diferencia en horas)
    const hours = Math.max(0, (fechaFin - fechaIni) / 3600000);
    const costo_total = Number(area.costo_hora || 0) * hours;

    // Estado inicial: 'pendiente' (si no se confirma pago) o 'pagado' si el frontend envía pago_confirmado
    const estado = req.body.pago_confirmado ? 'pagado' : 'pendiente';

    // Crear reserva en transacción para obtener id_reserva y asignar código
    await query('BEGIN');
    try {
      const insertQ = `
        INSERT INTO reserva_areas (fecha_ini, fecha_fin, estado, costo_total, id_area_comun, id_residente, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
        RETURNING id_reserva
      `;
      const insertRes = await query(insertQ, [fecha_ini, fecha_fin, estado, costo_total, id, id_residente]);
      const id_reserva = insertRes.rows[0].id_reserva;

      const codigo = `RSV-${String(id_reserva).padStart(6,'0')}`;
      await query('UPDATE reserva_areas SET codigo = $1 WHERE id_reserva = $2', [codigo, id_reserva]);

      const reservaQ = await query('SELECT id_reserva, codigo, fecha_ini, fecha_fin, estado, costo_total, id_area_comun, id_residente, created_at FROM reserva_areas WHERE id_reserva = $1', [id_reserva]);

      await query('COMMIT');

      res.status(201).json({ success: true, data: reservaQ.rows[0], message: 'Reserva creada' });
    } catch (inner) {
      await query('ROLLBACK');
      throw inner;
    }
  } catch (error) {
    console.error('Error creando reserva:', error);
    res.status(500).json({ success: false, message: 'Error al crear la reserva', error: error.message });
  }
};

// Obtener reservas de un área
exports.getReservasArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { desde, hasta, estado } = req.query;
    
    let sql = `
      SELECT 
        r.id_reserva,
        r.fecha_ini,
        r.fecha_fin,
        r.estado,
        r.costo_total,
        r.codigo,
        r.id_area_comun,
        r.id_residente,
        r.created_at,
        p.nombres,
        p.apellidos,
        p.correo as email,
        p.telefono
      FROM reserva_areas r
      LEFT JOIN residentes res ON r.id_residente = res.id_residente
      LEFT JOIN personas p ON res.id_persona = p.id_persona
      WHERE r.id_area_comun = $1
    `;
    
    const params = [id];
    let paramCount = 2;
    
    if (desde) {
      sql += ` AND r.fecha_ini >= $${paramCount}`;
      params.push(desde);
      paramCount++;
    }
    
    if (hasta) {
      sql += ` AND r.fecha_fin <= $${paramCount}`;
      params.push(hasta);
      paramCount++;
    }
    
    if (estado) {
      sql += ` AND r.estado = $${paramCount}`;
      params.push(estado);
      paramCount++;
    }
    
    sql += ' ORDER BY r.fecha_ini DESC';
    
    const result = await query(sql, params);
    
    // Formatear los datos para incluir el objeto residente
    const reservas = result.rows.map(row => ({
      id_reserva: row.id_reserva,
      fecha_ini: row.fecha_ini,
      fecha_fin: row.fecha_fin,
      estado: row.estado,
      costo_total: row.costo_total,
      codigo: row.codigo,
      id_area_comun: row.id_area_comun,
      id_residente: row.id_residente,
      created_at: row.created_at,
      residente: {
        nombres: row.nombres,
        apellidos: row.apellidos,
        email: row.email,
        telefono: row.telefono
      }
    }));
    
    res.json({
      success: true,
      data: reservas
    });
  } catch (error) {
    console.error('Error obteniendo reservas del área:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las reservas',
      error: error.message
    });
  }
};
