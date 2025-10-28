const db = require('../config/database_real');

class Notificacion {
  // Crear una notificación
  static async create(data) {
    const { id_persona, tipo, id_ticket, titulo, mensaje, leida = false } = data;
    const result = await db.query(
      `INSERT INTO notificaciones 
       (id_persona_destino, tipo_notificacion, id_ticket, titulo, mensaje, leida, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [id_persona, tipo, id_ticket, titulo, mensaje, leida]
    );
    return result.rows[0];
  }

  // Obtener notificaciones de un usuario
  static async getByPersona(id_persona, soloNoLeidas = false) {
    let query = `
      SELECT 
        n.*,
        t.codigo as ticket_codigo,
        t.titulo as ticket_titulo,
        t.estado as ticket_estado,
        t.prioridad as ticket_prioridad
      FROM notificaciones n
      LEFT JOIN tickets t ON t.id_ticket = n.id_ticket
      WHERE n.id_persona_destino = $1
    `;
    
    if (soloNoLeidas) {
      query += ' AND n.leida = false';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT 50';
    
    const result = await db.query(query, [id_persona]);
    return result.rows;
  }

  // Marcar como leída
  static async marcarLeida(id_notificacion, id_persona) {
    const result = await db.query(
      `UPDATE notificaciones 
       SET leida = true, fecha_lectura = NOW(), updated_at = NOW() 
       WHERE id_notificacion = $1 AND id_persona_destino = $2 
       RETURNING *`,
      [id_notificacion, id_persona]
    );
    return result.rows[0];
  }

  // Marcar todas como leídas
  static async marcarTodasLeidas(id_persona) {
    const result = await db.query(
      `UPDATE notificaciones 
       SET leida = true, fecha_lectura = NOW(), updated_at = NOW() 
       WHERE id_persona_destino = $1 AND leida = false 
       RETURNING *`,
      [id_persona]
    );
    return result.rows;
  }

  // Eliminar notificación
  static async delete(id_notificacion, id_persona) {
    const result = await db.query(
      `DELETE FROM notificaciones 
       WHERE id_notificacion = $1 AND id_persona_destino = $2 
       RETURNING *`,
      [id_notificacion, id_persona]
    );
    return result.rows[0];
  }
}

module.exports = Notificacion;
