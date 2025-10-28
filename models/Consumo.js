const { query } = require('../config/database_real');

const Consumo = {
  async create(payload) {
    const { id_departamento, tipo_servicio, periodo, consumo, costo_total, observaciones } = payload;
    try {
      const result = await query(
        `INSERT INTO consumos_registrados (id_departamento, tipo_servicio, periodo, consumo, costo_total, observaciones, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id_consumo, id_departamento, tipo_servicio, periodo, consumo, costo_total, observaciones`,
        [id_departamento, tipo_servicio, periodo, consumo || 0, costo_total || 0, observaciones]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creando consumo:', error);
      throw error;
    }
  },

  async list(filters = {}) {
    try {
      let sql = `
        SELECT cr.*, d.nro_depa
        FROM consumos_registrados cr
        LEFT JOIN departamentos d ON cr.id_departamento = d.id_departamento
      `;
      const clauses = [];
      const params = [];
      let idx = 1;
      
      if (filters.id_departamento) { 
        clauses.push(`cr.id_departamento = $${idx++}`); 
        params.push(filters.id_departamento); 
      }
      if (filters.periodo) { 
        clauses.push(`cr.periodo = $${idx++}`); 
        params.push(filters.periodo); 
      }
      if (filters.tipo_servicio) { 
        clauses.push(`cr.tipo_servicio = $${idx++}`); 
        params.push(filters.tipo_servicio); 
      }
      
      if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
      sql += ' ORDER BY cr.created_at DESC';
      
      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Error listando consumos:', error);
      throw error;
    }
  },

  async update(id_consumo, payload) {
    const { consumo, costo_total, observaciones } = payload;
    try {
      const result = await query(
        `UPDATE consumos_registrados 
         SET consumo = $2, costo_total = $3, observaciones = $4, updated_at = NOW()
         WHERE id_consumo = $1
         RETURNING id_consumo, id_departamento, tipo_servicio, periodo, consumo, costo_total, observaciones`,
        [id_consumo, consumo, costo_total, observaciones]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error actualizando consumo:', error);
      throw error;
    }
  },

  async delete(id_consumo) {
    try {
      await query('DELETE FROM consumos_registrados WHERE id_consumo = $1', [id_consumo]);
      return true;
    } catch (error) {
      console.error('Error eliminando consumo:', error);
      throw error;
    }
  }
};

module.exports = Consumo;
