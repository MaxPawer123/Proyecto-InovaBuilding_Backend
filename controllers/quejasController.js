const db = require('../config/database_real');

const createQueja = async (req, res) => {
  try {
    // Residente puede crear queja
    const { asunto, descripcion, prioridad = 'media' } = req.body;
    const id_user = req.user.id;

    if (!asunto || !descripcion) return res.status(400).json({ success: false, message: 'Asunto y descripción son requeridos' });

    const result = await db.query(
      `INSERT INTO quejas (asunto, descripcion, prioridad, id_user)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [asunto, descripcion, prioridad, id_user]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createQueja error:', error);
    res.status(500).json({ success: false, message: 'Error creando queja' });
  }
};

const listQuejas = async (req, res) => {
  try {
    const { estado, user_only, mine } = req.query;
    const params = [];
    const filters = [];
    let idx = 1;

    if (estado) {
      filters.push(`estado = $${idx++}`);
      params.push(estado);
    }

    const isUserOnly = (user_only === 'true') || (mine === '1');
    if (isUserOnly) {
      // Solo mostrar quejas del usuario autenticado
      filters.push(`id_user = $${idx++}`);
      params.push(req.user.id);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT * FROM quejas ${where} ORDER BY created_at DESC`;
    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listQuejas error:', error);
    res.status(500).json({ success: false, message: 'Error listando quejas' });
  }
};

const getQueja = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM quejas WHERE id_queja = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Queja no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getQueja error:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo queja' });
  }
};

const updateQueja = async (req, res) => {
  try {
    const { id } = req.params;
    const { asunto, descripcion, prioridad, estado } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    // Solo admin o empleado puede cambiar estado
    if (estado !== undefined) {
      const role = req.user && req.user.rol ? req.user.rol.toString().toLowerCase() : '';
      if (!['administrador','empleado'].some(r => role.includes(r))) {
        return res.status(403).json({ success: false, message: 'No tienes permisos para cambiar estado' });
      }
    }

    for (const [key, value] of Object.entries({ asunto, descripcion, prioridad, estado })) {
      if (value !== undefined) {
        updates.push(`${key} = $${idx}`);
        params.push(value);
        idx++;
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Nada para actualizar' });

    params.push(id);
    const sql = `UPDATE quejas SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id_queja = $${idx} RETURNING *`;
    const result = await db.query(sql, params);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Queja no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateQueja error:', error);
    res.status(500).json({ success: false, message: 'Error actualizando queja' });
  }
};

module.exports = { createQueja, listQuejas, getQueja, updateQueja };
