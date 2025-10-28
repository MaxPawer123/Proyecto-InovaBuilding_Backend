const db = require('../config/database_real');

const createVotacion = async (req, res) => {
  try {
    const { titulo, descripcion, inicio, fin, opciones } = req.body;

    if (!titulo || !inicio || !fin || !Array.isArray(opciones) || opciones.length < 2) {
      return res.status(400).json({ success: false, message: 'Título, inicio, fin y al menos 2 opciones son requeridos' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const votRes = await client.query(
        `INSERT INTO votaciones (titulo, descripcion, inicio, fin) VALUES ($1, $2, $3, $4) RETURNING *`,
        [titulo, descripcion || null, inicio, fin]
      );

      const votacion = votRes.rows[0];

      for (const opcion of opciones) {
        await client.query(
          `INSERT INTO opciones_votacion (texto, id_votacion) VALUES ($1, $2)`,
          [opcion, votacion.id_votacion]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: votacion });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('createVotacion error:', error);
    res.status(500).json({ success: false, message: 'Error creando votación' });
  }
};

const listVotaciones = async (req, res) => {
  try {
    try { console.log('listVotaciones called by user:', req.user && req.user.id); } catch(e){}
    const result = await db.query('SELECT * FROM votaciones ORDER BY inicio DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listVotaciones error:', error);
    res.status(500).json({ success: false, message: 'Error listando votaciones' });
  }
};

const getVotacion = async (req, res) => {
  try {
    try { console.log('getVotacion called by user:', req.user && req.user.id, 'id:', req.params.id); } catch(e){}
    const { id } = req.params;
    const vot = await db.query('SELECT * FROM votaciones WHERE id_votacion = $1', [id]);
    if (!vot.rows.length) return res.status(404).json({ success: false, message: 'Votación no encontrada' });
    const opciones = await db.query('SELECT o.*, COALESCE(v.count,0) as votos FROM opciones_votacion o LEFT JOIN (SELECT id_opcion, COUNT(*) as count FROM votos WHERE id_votacion = $1 GROUP BY id_opcion) v ON v.id_opcion = o.id_opcion WHERE o.id_votacion = $1', [id]);
    res.json({ success: true, data: { votacion: vot.rows[0], opciones: opciones.rows } });
  } catch (error) {
    console.error('getVotacion error:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo votación' });
  }
};

const votar = async (req, res) => {
  try {
    const { id_votacion, id_opcion } = req.body;
    const id_user = req.user.id;

    if (!id_votacion || !id_opcion) return res.status(400).json({ success: false, message: 'id_votacion e id_opcion son requeridos' });

    // Intentar insertar; la constraint UNIQUE previene votos duplicados
    try {
      const result = await db.query(
        `INSERT INTO votos (id_votacion, id_opcion, id_user) VALUES ($1, $2, $3) RETURNING *`,
        [id_votacion, id_opcion, id_user]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ success: false, message: 'Ya has votado en esta votación' });
      }
      throw err;
    }
  } catch (error) {
    console.error('votar error:', error);
    res.status(500).json({ success: false, message: 'Error registrando voto' });
  }
};

module.exports = { createVotacion, listVotaciones, getVotacion, votar };
