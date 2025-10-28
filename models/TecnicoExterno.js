const { query } = require('../config/database_real');

class TecnicoExterno {
  // Crear nuevo técnico externo
  static async create({ nombres, apellidos, cargo, celular, email }) {
    const result = await query(
      `INSERT INTO tecnicos_externos 
        (nombres, apellidos, cargo, celular, email, activo, created_at) 
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW()) 
       RETURNING *`,
      [nombres, apellidos, cargo, celular, email]
    );
    return result.rows[0];
  }

  // Listar todos los técnicos externos (con filtro opcional de activo)
  static async list(filters = {}) {
    let sql = `
      SELECT 
        id_tecnico,
        nombres,
        apellidos,
        cargo,
        celular,
        email,
        activo,
        created_at,
        updated_at
      FROM tecnicos_externos
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filtrar solo activos si se especifica
    if (filters.activo !== undefined) {
      sql += ` AND activo = $${paramIndex}`;
      params.push(filters.activo);
      paramIndex++;
    }

    sql += ` ORDER BY apellidos ASC, nombres ASC`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Obtener técnico por ID
  static async findById(id_tecnico) {
    const result = await query(
      `SELECT 
        id_tecnico,
        nombres,
        apellidos,
        cargo,
        celular,
        email,
        activo,
        created_at,
        updated_at
      FROM tecnicos_externos
      WHERE id_tecnico = $1`,
      [id_tecnico]
    );
    return result.rows[0] || null;
  }

  // Actualizar técnico externo
  static async update(id_tecnico, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.nombres !== undefined) {
      updates.push(`nombres = $${paramIndex}`);
      values.push(data.nombres);
      paramIndex++;
    }

    if (data.apellidos !== undefined) {
      updates.push(`apellidos = $${paramIndex}`);
      values.push(data.apellidos);
      paramIndex++;
    }

    if (data.cargo !== undefined) {
      updates.push(`cargo = $${paramIndex}`);
      values.push(data.cargo);
      paramIndex++;
    }

    if (data.celular !== undefined) {
      updates.push(`celular = $${paramIndex}`);
      values.push(data.celular);
      paramIndex++;
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;
    }

    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex}`);
      values.push(data.activo);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id_tecnico);

    const result = await query(
      `UPDATE tecnicos_externos 
       SET ${updates.join(', ')} 
       WHERE id_tecnico = $${paramIndex} 
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Eliminar (soft delete - marcar como inactivo)
  static async delete(id_tecnico) {
    const result = await query(
      `UPDATE tecnicos_externos 
       SET activo = FALSE, updated_at = NOW() 
       WHERE id_tecnico = $1 
       RETURNING *`,
      [id_tecnico]
    );
    return result.rows[0];
  }

  // Eliminar permanentemente (hard delete)
  static async hardDelete(id_tecnico) {
    const result = await query(
      `DELETE FROM tecnicos_externos 
       WHERE id_tecnico = $1 
       RETURNING *`,
      [id_tecnico]
    );
    return result.rows[0];
  }
}

module.exports = TecnicoExterno;
