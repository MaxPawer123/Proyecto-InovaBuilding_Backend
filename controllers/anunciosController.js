const db = require('../config/database_real');

const isAdmin = (req) => req.user && req.user.rol && req.user.rol.toString().toLowerCase().includes('admin');

const createAnuncio = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'No tienes permisos' });

    const { titulo, contenido, fijado = false, visible = true } = req.body;
    const id_user = req.user.id;

    if (!titulo || !contenido) {
      return res.status(400).json({ success: false, message: 'Título y contenido son requeridos' });
    }

    const result = await db.query(
      `INSERT INTO anuncios (titulo, contenido, fijado, visible, id_user)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, contenido, fijado, visible, id_user]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createAnuncio error:', error);
    res.status(500).json({ success: false, message: 'Error creando anuncio' });
  }
};

const listAnuncios = async (req, res) => {
  try {
    const { search, visible } = req.query;
    const filters = [];
    const params = [];

    let idx = 1;

    // If a specific visible query param was provided, respect it.
    // Otherwise, for unauthenticated or non-admin users, only show visible=true
    if (visible === 'true' || visible === 'false') {
      filters.push(`visible = $${idx++}`);
      params.push(visible === 'true');
    } else {
      // default behavior: restrict to visible for non-admins
      try {
        const isAdmin = req.user && req.user.rol && req.user.rol.toString().toLowerCase().includes('admin');
        if (!isAdmin) {
          filters.push(`visible = $${idx++}`);
          params.push(true);
        }
      } catch (e) {
        // no req.user -> public request, show only visible
        filters.push(`visible = $${idx++}`);
        params.push(true);
      }
    }

    if (search) {
      filters.push(`(titulo ILIKE $${idx} OR contenido ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const sql = `SELECT * FROM anuncios ${where} ORDER BY fijado DESC, fecha_publicacion DESC`;
    const result = await db.query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listAnuncios error:', error);
    res.status(500).json({ success: false, message: 'Error listando anuncios' });
  }
};

const getAnuncio = async (req, res) => {
  try {
    const { id } = req.params;
    // For public requests, only return the anuncio if visible=true
    let sql = 'SELECT * FROM anuncios WHERE id_anuncio = $1';
    const params = [id];
    try {
      const isAdmin = req.user && req.user.rol && req.user.rol.toString().toLowerCase().includes('admin');
      if (!isAdmin) {
        sql += ' AND visible = $2';
        params.push(true);
      }
    } catch (e) {
      // no req.user -> public request; enforce visible
      sql += ' AND visible = $2';
      params.push(true);
    }
    const result = await db.query(sql, params);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Anuncio no encontrado o no visible' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getAnuncio error:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo anuncio' });
  }
};

const updateAnuncio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'No tienes permisos' });
    const fields = ['titulo', 'contenido', 'fijado', 'visible'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx}`);
        params.push(req.body[f]);
        idx++;
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Nada para actualizar' });

    params.push(id);
    const sql = `UPDATE anuncios SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id_anuncio = $${idx} RETURNING *`;
    const result = await db.query(sql, params);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateAnuncio error:', error);
    res.status(500).json({ success: false, message: 'Error actualizando anuncio' });
  }
};

const deleteAnuncio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'No tienes permisos' });
    const result = await db.query('DELETE FROM anuncios WHERE id_anuncio = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
    res.json({ success: true, message: 'Anuncio eliminado' });
  } catch (error) {
    console.error('deleteAnuncio error:', error);
    res.status(500).json({ success: false, message: 'Error eliminando anuncio' });
  }
};

module.exports = {
  createAnuncio,
  listAnuncios,
  getAnuncio,
  updateAnuncio,
  deleteAnuncio
};
