const fs = require('fs');
const path = require('path');

const content = `const { query } = require('../config/database_real');

class Nomina {
  static async create({ id_empleado, id_tecnico = null, tipo_empleado = 'interno', periodo, fecha_pago, salario_base = 0, bono = 0, descuento = 0, total, detalles = [] }) {
    try {
      await query('BEGIN');
      let empleado_nombre, cargo;
      
      if (tipo_empleado === 'interno' && id_empleado) {
        const empResult = await query(
          \`SELECT p.nombres || ' ' || p.apellidos as nombre_completo, e.cargo 
           FROM empleados e 
           LEFT JOIN users u ON u.id = e.id_user 
           LEFT JOIN personas p ON p.id_persona = u.id_persona 
           WHERE e.id_empleado = $1\`,
          [id_empleado]
        );
        if (empResult.rows.length === 0) throw new Error('Empleado no encontrado');
        empleado_nombre = empResult.rows[0].nombre_completo;
        cargo = empResult.rows[0].cargo;
      } else if (tipo_empleado === 'externo' && id_tecnico) {
        const tecResult = await query(
          \`SELECT nombres || ' ' || apellidos as nombre_completo, cargo 
           FROM tecnicos_externos 
           WHERE id_tecnico = $1\`,
          [id_tecnico]
        );
        if (tecResult.rows.length === 0) throw new Error('Técnico externo no encontrado');
        empleado_nombre = tecResult.rows[0].nombre_completo;
        cargo = tecResult.rows[0].cargo;
      } else {
        throw new Error('Debe especificar id_empleado o id_tecnico');
      }

      const nominaResult = await query(
        \`INSERT INTO nominas 
          (id_empleado, id_tecnico, tipo_empleado, empleado_nombre, cargo, 
           periodo, fecha_pago, salario_base, bono, descuento, total, 
           estado, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'emitida', NOW(), NOW()) 
         RETURNING *\`,
        [id_empleado, id_tecnico, tipo_empleado, empleado_nombre, cargo, 
         periodo, fecha_pago, salario_base, bono, descuento, total]
      );

      const nomina = nominaResult.rows[0];

      if (detalles && detalles.length > 0) {
        for (const detalle of detalles) {
          await query(
            \`INSERT INTO nomina_detalles 
              (id_nomina, id_empleado, nombre_concepto, tipo, monto, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\`,
            [nomina.id_nomina, id_empleado || id_tecnico, detalle.concepto, detalle.tipo, detalle.monto]
          );
        }
      }

      await query('COMMIT');
      return { ...nomina, detalles: detalles.map(d => ({ nombre_concepto: d.concepto, tipo: d.tipo, monto: d.monto })) };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  static async list(filters = {}) {
    let sql = \`SELECT n.id_nomina, n.id_empleado, n.id_tecnico, n.tipo_empleado, n.empleado_nombre, n.cargo, n.periodo, n.fecha_pago, n.salario_base, n.bono, n.descuento, n.total, n.estado, n.created_at, n.updated_at FROM nominas n WHERE 1=1\`;
    const params = [];
    let paramIndex = 1;
    
    if (filters.periodo) { 
      sql += \` AND n.periodo = $\${paramIndex}\`; 
      params.push(filters.periodo); 
      paramIndex++; 
    }
    if (filters.estado) { 
      sql += \` AND n.estado = $\${paramIndex}\`; 
      params.push(filters.estado); 
      paramIndex++; 
    }
    if (filters.tipo_empleado) { 
      sql += \` AND n.tipo_empleado = $\${paramIndex}\`; 
      params.push(filters.tipo_empleado); 
      paramIndex++; 
    }
    
    sql += ' ORDER BY n.fecha_pago DESC, n.created_at DESC';
    
    const nominasResult = await query(sql, params);
    const nominas = [];
    
    for (const nomina of nominasResult.rows) {
      const detallesResult = await query(
        'SELECT id_detalle, nombre_concepto, tipo, monto FROM nomina_detalles WHERE id_nomina = $1 ORDER BY id_detalle',
        [nomina.id_nomina]
      );
      nominas.push({ ...nomina, detalles: detallesResult.rows });
    }
    
    return nominas;
  }

  static async findById(id_nomina) {
    const nominaResult = await query('SELECT * FROM nominas WHERE id_nomina = $1', [id_nomina]);
    if (nominaResult.rows.length === 0) return null;
    
    const nomina = nominaResult.rows[0];
    const detallesResult = await query('SELECT * FROM nomina_detalles WHERE id_nomina = $1 ORDER BY id_detalle', [id_nomina]);
    nomina.detalles = detallesResult.rows;
    
    return nomina;
  }

  static async updateEstado(id_nomina, estado) {
    const result = await query('UPDATE nominas SET estado = $1, updated_at = NOW() WHERE id_nomina = $2 RETURNING *', [estado, id_nomina]);
    return result.rows[0];
  }

  static async delete(id_nomina) {
    const result = await query('DELETE FROM nominas WHERE id_nomina = $1 RETURNING *', [id_nomina]);
    return result.rows[0];
  }
}

module.exports = Nomina;
`;

const targetPath = path.join(__dirname, 'models', 'Nomina.js');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('✅ Archivo Nomina.js creado exitosamente en:', targetPath);
