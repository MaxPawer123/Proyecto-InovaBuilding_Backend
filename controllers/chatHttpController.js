const db = require('../config/database_real');

const listSalas = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM salas_chat ORDER BY created_at');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listSalas error:', error);
    res.status(500).json({ success: false, message: 'Error listando salas' });
  }
};

const createSala = async (req, res) => {
  try {
    console.log('createSala called by user:', req.user && req.user.id);
    // Debug: log incoming headers, raw body and parsed body to diagnose frontend errors
    try {
      console.log('createSala headers.authorization:', req.headers && req.headers.authorization);
      console.log('createSala headers.origin:', req.headers && req.headers.origin);
      console.log('createSala content-type:', req.headers['content-type']);
      console.log('createSala content-length:', req.headers['content-length']);
      console.log('createSala rawBody:', req.rawBody);
      console.log('createSala body:', req.body);
      console.log('createSala req.user:', req.user);
    } catch (logErr) {
      console.warn('Error logging createSala request details:', logErr);
    }
    // Some clients may send text/plain or the body may not be parsed; attempt to recover from rawBody
    let payload = req.body;
    if ((!payload || Object.keys(payload).length === 0) && req.rawBody) {
      try {
        payload = JSON.parse(req.rawBody);
      } catch (e) {
        // If rawBody is plain text like 'nombre=Sala&tipo=general', try urlencoded parse
        try {
          const params = new URLSearchParams(req.rawBody);
          payload = Object.fromEntries(params.entries());
        } catch (ee) {
          payload = {};
        }
      }
    }

    const { nombre, tipo = 'general' } = payload || {};
    if (!nombre) return res.status(400).json({ success: false, message: 'Nombre de sala requerido' });
    // Solo administradores pueden crear salas
    const role = req.user && req.user.rol ? req.user.rol.toString().toLowerCase() : '';
    if (!role.includes('administrador')) {
      console.warn('createSala forbidden for role:', req.user && req.user.rol);
      return res.status(403).json({ success: false, message: 'No tienes permisos para crear salas' });
    }

    const result = await db.query('INSERT INTO salas_chat (nombre, tipo) VALUES ($1, $2) RETURNING *', [nombre, tipo]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createSala error:', error && error.stack ? error.stack : error);
    res.status(500).json({ success: false, message: 'Error creando sala' });
  }
};

const listMensajes = async (req, res) => {
  try {
    const { id_sala } = req.params;
    const result = await db.query(
      `SELECT m.*, p.nombres, p.apellidos 
       FROM mensajes_chat m 
       LEFT JOIN users u ON u.id = m.id_user 
       LEFT JOIN personas p ON p.id_persona = u.id_persona 
       WHERE m.id_sala = $1 
       ORDER BY m.created_at ASC`,
      [id_sala]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listMensajes error:', error);
    res.status(500).json({ success: false, message: 'Error listando mensajes' });
  }
};

const updateSala = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo } = req.body;
    
    // Solo administradores pueden editar salas
    const role = req.user && req.user.rol ? req.user.rol.toString().toLowerCase() : '';
    if (!role.includes('administrador')) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para editar salas' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${idx++}`);
      params.push(nombre);
    }
    if (tipo !== undefined) {
      updates.push(`tipo = $${idx++}`);
      params.push(tipo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay nada para actualizar' });
    }

    params.push(id);
    const sql = `UPDATE salas_chat SET ${updates.join(', ')} WHERE id_sala = $${idx} RETURNING *`;
    const result = await db.query(sql, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sala no encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateSala error:', error);
    res.status(500).json({ success: false, message: 'Error actualizando sala' });
  }
};

const deleteSala = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Solo administradores pueden eliminar salas
    const role = req.user && req.user.rol ? req.user.rol.toString().toLowerCase() : '';
    if (!role.includes('administrador')) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar salas' });
    }

    // Primero eliminar los mensajes de la sala
    await db.query('DELETE FROM mensajes_chat WHERE id_sala = $1', [id]);
    
    // Luego eliminar la sala
    const result = await db.query('DELETE FROM salas_chat WHERE id_sala = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sala no encontrada' });
    }

    res.json({ success: true, message: 'Sala eliminada correctamente', data: result.rows[0] });
  } catch (error) {
    console.error('deleteSala error:', error);
    res.status(500).json({ success: false, message: 'Error eliminando sala' });
  }
};

module.exports = { listSalas, createSala, listMensajes, updateSala, deleteSala };
