const { query } = require('../config/database_real');

class Alerta {
  // Crear nueva alerta
  static async create({ id_departamento, tipo_servicio, periodo, mensaje, estado = 'abierta' }) {
    const result = await query(
      `INSERT INTO alertas_consumo 
        (id_departamento, tipo_servicio, periodo, mensaje, estado, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [id_departamento, tipo_servicio, periodo, mensaje, estado]
    );
    return result.rows[0];
  }

  // Listar alertas con filtros
  static async list(filters = {}) {
    let sql = `
      SELECT 
        a.id_alerta,
        a.id_departamento,
        d.nro_depa,
        a.tipo_servicio,
        a.periodo,
        a.mensaje,
        a.estado,
        a.created_at,
        a.updated_at
      FROM alertas_consumo a
      LEFT JOIN departamentos d ON a.id_departamento = d.id_departamento
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.id_departamento) {
      sql += ` AND a.id_departamento = $${paramIndex}`;
      params.push(filters.id_departamento);
      paramIndex++;
    }

    if (filters.tipo_servicio) {
      sql += ` AND a.tipo_servicio = $${paramIndex}`;
      params.push(filters.tipo_servicio);
      paramIndex++;
    }

    if (filters.periodo) {
      sql += ` AND a.periodo = $${paramIndex}`;
      params.push(filters.periodo);
      paramIndex++;
    }

    if (filters.estado) {
      sql += ` AND a.estado = $${paramIndex}`;
      params.push(filters.estado);
      paramIndex++;
    }

    sql += ` ORDER BY a.created_at DESC`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Actualizar estado de alerta
  static async updateEstado(id_alerta, estado) {
    const result = await query(
      `UPDATE alertas_consumo 
       SET estado = $1, updated_at = NOW() 
       WHERE id_alerta = $2 
       RETURNING *`,
      [estado, id_alerta]
    );
    return result.rows[0];
  }

  // Eliminar alerta
  static async delete(id_alerta) {
    const result = await query(
      `DELETE FROM alertas_consumo WHERE id_alerta = $1 RETURNING *`,
      [id_alerta]
    );
    return result.rows[0];
  }
}

module.exports = Alerta;
