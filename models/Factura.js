const { query } = require('../config/database_real');

class Factura {
  // Crear factura con sus items
  static async create(facturaData) {
    const client = await query('SELECT 1').then(() => require('pg')).catch(() => null);
    
    try {
      // Iniciar transacción
      await query('BEGIN');

      // Generar número de factura único
      const nroResult = await query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(nro FROM 6) AS INTEGER)), 0) + 1 as next_num
        FROM facturas2
        WHERE nro LIKE 'FAC-%'
      `);
      const nro = `FAC-${String(nroResult.rows[0].next_num).padStart(6, '0')}`;

      // Insertar factura principal
      const facturaResult = await query(`
        INSERT INTO facturas2 (
          nro, id_residente, id_departamento, residente_nombre, departamento,
          periodo, fecha_emision, fecha_vencimiento,
          subtotal, descuentos, impuestos, total, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        nro,
        facturaData.id_residente,
        facturaData.id_departamento,
        facturaData.residente_nombre,
        facturaData.departamento,
        facturaData.periodo,
        facturaData.fecha_emision,
        facturaData.fecha_vencimiento,
        facturaData.subtotal,
        facturaData.descuentos || 0,
        facturaData.impuestos || 0,
        facturaData.total,
        facturaData.estado || 'pendiente'
      ]);

      const factura = facturaResult.rows[0];

      // Insertar items de la factura
      if (facturaData.items && facturaData.items.length > 0) {
        for (const item of facturaData.items) {
          await query(`
            INSERT INTO factura_items (
              id_factura, id_concepto, descripcion, cantidad,
              precio_unitario, total_linea, id_consumo, id_reserva
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            factura.id_factura,
            item.id_concepto,
            item.descripcion,
            item.cantidad,
            item.precio_unitario,
            item.total_linea,
            item.id_consumo || null,
            item.id_reserva || null
          ]);
        }
      }

      // Confirmar transacción
      await query('COMMIT');

      // Obtener factura completa con items
      return await this.getById(factura.id_factura);

    } catch (error) {
      // Revertir transacción en caso de error
      await query('ROLLBACK');
      throw error;
    }
  }

  // Obtener factura por ID con sus items
  static async getById(id_factura) {
    const facturaResult = await query(`
      SELECT * FROM facturas2 WHERE id_factura = $1
    `, [id_factura]);

    if (facturaResult.rows.length === 0) {
      return null;
    }

    const factura = facturaResult.rows[0];

    // Obtener items
    const itemsResult = await query(`
      SELECT fi.*, cc.nombre as concepto_nombre
      FROM factura_items fi
      LEFT JOIN conceptos_cargo cc ON fi.id_concepto = cc.id_concepto
      WHERE fi.id_factura = $1
      ORDER BY fi.id_item
    `, [id_factura]);

    factura.items = itemsResult.rows;

    return factura;
  }

  // Listar facturas con filtros
  static async list(filters = {}) {
    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    if (filters.id_residente) {
      whereConditions.push(`f.id_residente = $${paramCount}`);
      params.push(filters.id_residente);
      paramCount++;
    }

    if (filters.periodo) {
      whereConditions.push(`f.periodo = $${paramCount}`);
      params.push(filters.periodo);
      paramCount++;
    }

    if (filters.estado) {
      whereConditions.push(`f.estado = $${paramCount}`);
      params.push(filters.estado);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT 
        f.*,
        COUNT(fi.id_item) as total_items
      FROM facturas2 f
      LEFT JOIN factura_items fi ON f.id_factura = fi.id_factura
      ${whereClause}
      GROUP BY f.id_factura
      ORDER BY f.fecha_emision DESC, f.nro DESC
    `, params);

    return result.rows;
  }

  // Actualizar estado de factura
  static async updateEstado(id_factura, estado) {
    const result = await query(`
      UPDATE facturas2
      SET estado = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_factura = $2
      RETURNING *
    `, [estado, id_factura]);

    return result.rows[0];
  }

  // Eliminar factura (y sus items por CASCADE)
  static async delete(id_factura) {
    const result = await query(`
      DELETE FROM facturas2 WHERE id_factura = $1 RETURNING *
    `, [id_factura]);

    return result.rows[0];
  }
}

module.exports = Factura;
