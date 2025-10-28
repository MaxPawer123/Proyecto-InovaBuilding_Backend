const { query } = require('../config/database_real');

class Ticket {
  // Generar código único para el ticket
  static async generarCodigo() {
    const year = new Date().getFullYear();
    const result = await query(
      `SELECT COUNT(*) as total FROM tickets WHERE codigo LIKE $1`,
      [`TCK-${year}-%`]
    );
    const numero = parseInt(result.rows[0].total) + 1;
    return `TCK-${year}-${String(numero).padStart(4, '0')}`;
  }

  // Crear nuevo ticket
  static async create({ 
    titulo, 
    descripcion, 
    prioridad = 'media', 
    id_categoria,
    id_residente, 
    id_departamento,
    visibilidad = 'normal'
  }) {
    const codigo = await this.generarCodigo();
    
    const result = await query(
      `INSERT INTO tickets 
        (codigo, titulo, descripcion, estado, prioridad, visibilidad, 
         id_categoria, id_residente, id_departamento, fecha_reporte, created_at) 
       VALUES ($1, $2, $3, 'abierto', $4, $5, $6, $7, $8, NOW(), NOW()) 
       RETURNING *`,
      [codigo, titulo, descripcion, prioridad, visibilidad, id_categoria, id_residente, id_departamento]
    );
    return result.rows[0];
  }

  // Crear adjunto de ticket
  static async createAdjunto({
    id_ticket,
    nombre_original,
    url,
    tipo_mime,
    peso_bytes,
    subido_por_persona
  }) {
    const result = await query(
      `INSERT INTO ticket_adjuntos 
        (id_ticket, nombre_original, url, tipo_mime, peso_bytes, subido_por_persona, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [id_ticket, nombre_original, url, tipo_mime, peso_bytes, subido_por_persona]
    );
    return result.rows[0];
  }

  // Crear seguimiento de ticket
  static async createSeguimiento({ id_ticket, estado_anterior, estado_nuevo, comentario, realizado_por_persona }) {
    const result = await query(
      `INSERT INTO ticket_seguimientos (id_ticket, estado_anterior, estado_nuevo, comentario, realizado_por_persona, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [id_ticket, estado_anterior, estado_nuevo, comentario, realizado_por_persona]
    );
    return result.rows[0];
  }

  // Listar seguimientos (opcional por ticket)
  static async listSeguimientos(id_ticket = null) {
    let sql = `
      SELECT 
        ts.id_seguimiento as id,
        ts.id_ticket,
        t.codigo as ticket_codigo,
        t.titulo as ticket_titulo,
        ts.estado_anterior,
        ts.estado_nuevo,
        ts.comentario,
        ts.realizado_por_persona,
        ts.created_at as fecha
      FROM ticket_seguimientos ts
      INNER JOIN tickets t ON ts.id_ticket = t.id_ticket
    `;
    const params = [];
    if (id_ticket) {
      sql += ` WHERE ts.id_ticket = $1`;
      params.push(id_ticket);
    }
    sql += ` ORDER BY ts.created_at DESC`;
    const result = await query(sql, params);
    return result.rows;
  }

  // Listar tickets con información completa
  static async list(filters = {}) {
    let sql = `
      SELECT 
        t.id_ticket,
        t.codigo,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.visibilidad,
        t.id_categoria,
        tc.nombre as categoria_nombre,
        t.id_residente,
        t.id_departamento,
        d.nro_depa,
        p.nombres || ' ' || p.apellidos as nombre_residente,
        t.fecha_reporte,
        t.fecha_compromiso,
        t.fecha_cierre,
        t.created_at,
        t.updated_at,
        (SELECT COUNT(*) FROM ticket_adjuntos WHERE id_ticket = t.id_ticket) as total_adjuntos
      FROM tickets t
      INNER JOIN ticket_categorias tc ON t.id_categoria = tc.id_categoria
      INNER JOIN residentes r ON t.id_residente = r.id_residente
      INNER JOIN departamentos d ON t.id_departamento = d.id_departamento
      INNER JOIN personas p ON r.id_persona = p.id_persona
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.id_residente) {
      sql += ` AND t.id_residente = $${paramIndex}`;
      params.push(filters.id_residente);
      paramIndex++;
    }

    if (filters.id_departamento) {
      sql += ` AND t.id_departamento = $${paramIndex}`;
      params.push(filters.id_departamento);
      paramIndex++;
    }

    if (filters.estado) {
      sql += ` AND t.estado = $${paramIndex}`;
      params.push(filters.estado);
      paramIndex++;
    }

    if (filters.prioridad) {
      sql += ` AND t.prioridad = $${paramIndex}`;
      params.push(filters.prioridad);
      paramIndex++;
    }

    if (filters.id_categoria) {
      sql += ` AND t.id_categoria = $${paramIndex}`;
      params.push(filters.id_categoria);
      paramIndex++;
    }

    sql += ` ORDER BY 
      CASE t.prioridad 
        WHEN 'critica' THEN 1
        WHEN 'alta' THEN 2
        WHEN 'media' THEN 3
        WHEN 'baja' THEN 4
      END,
      t.fecha_reporte DESC`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Obtener ticket por ID con adjuntos
  static async findById(id_ticket) {
    const ticketResult = await query(
      `SELECT 
        t.id_ticket,
        t.codigo,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.visibilidad,
        t.id_categoria,
        tc.nombre as categoria_nombre,
        t.id_residente,
        t.id_departamento,
        d.nro_depa,
        p.nombres || ' ' || p.apellidos as nombre_residente,
        t.fecha_reporte,
        t.fecha_compromiso,
        t.fecha_cierre,
        t.created_at,
        t.updated_at
      FROM tickets t
      INNER JOIN ticket_categorias tc ON t.id_categoria = tc.id_categoria
      INNER JOIN residentes r ON t.id_residente = r.id_residente
      INNER JOIN departamentos d ON t.id_departamento = d.id_departamento
      INNER JOIN personas p ON r.id_persona = p.id_persona
      WHERE t.id_ticket = $1`,
      [id_ticket]
    );

    if (ticketResult.rows.length === 0) return null;

    const ticket = ticketResult.rows[0];

    // Obtener adjuntos
    const adjuntosResult = await query(
      `SELECT 
        id_adjunto,
        nombre_original,
        url,
        tipo_mime,
        peso_bytes,
        created_at
      FROM ticket_adjuntos
      WHERE id_ticket = $1
      ORDER BY created_at ASC`,
      [id_ticket]
    );

    ticket.adjuntos = adjuntosResult.rows;
    return ticket;
  }

  // Actualizar estado del ticket
  static async updateEstado(id_ticket, estado) {
    const updates = { estado, updated_at: 'NOW()' };
    
    // Si se cierra o cancela, registrar fecha
    if (estado === 'cerrado' || estado === 'cancelado' || estado === 'resuelto') {
      updates.fecha_cierre = 'NOW()';
    }

    const result = await query(
      `UPDATE tickets 
       SET estado = $1::VARCHAR, 
           updated_at = NOW(),
           fecha_cierre = CASE WHEN $1::VARCHAR IN ('cerrado', 'cancelado', 'resuelto') THEN NOW() ELSE fecha_cierre END
       WHERE id_ticket = $2 
       RETURNING *`,
      [estado, id_ticket]
    );
    return result.rows[0];
  }

  // Actualizar ticket completo
  static async update(id_ticket, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.titulo !== undefined) {
      updates.push(`titulo = $${paramIndex}`);
      values.push(data.titulo);
      paramIndex++;
    }

    if (data.descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex}`);
      values.push(data.descripcion);
      paramIndex++;
    }

    if (data.prioridad !== undefined) {
      updates.push(`prioridad = $${paramIndex}`);
      values.push(data.prioridad);
      paramIndex++;
    }

    if (data.estado !== undefined) {
      updates.push(`estado = $${paramIndex}`);
      values.push(data.estado);
      paramIndex++;
      
      if (data.estado === 'cerrado' || data.estado === 'cancelado' || data.estado === 'resuelto') {
        updates.push(`fecha_cierre = NOW()`);
      }
    }

    if (data.visibilidad !== undefined) {
      updates.push(`visibilidad = $${paramIndex}`);
      values.push(data.visibilidad);
      paramIndex++;
    }

    if (data.fecha_compromiso !== undefined) {
      updates.push(`fecha_compromiso = $${paramIndex}`);
      values.push(data.fecha_compromiso);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id_ticket);

    const sql = `UPDATE tickets SET ${updates.join(', ')} WHERE id_ticket = $${paramIndex} RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Eliminar ticket
  static async delete(id_ticket) {
    const result = await query(
      `DELETE FROM tickets WHERE id_ticket = $1 RETURNING *`,
      [id_ticket]
    );
    return result.rows[0];
  }

  // Obtener estadísticas
  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'abierto' THEN 1 END) as abiertos,
        COUNT(CASE WHEN estado = 'en_progreso' THEN 1 END) as en_progreso,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
        COUNT(CASE WHEN estado = 'cerrado' THEN 1 END) as cerrados,
        COUNT(CASE WHEN prioridad = 'critica' THEN 1 END) as criticos,
        COUNT(CASE WHEN prioridad = 'alta' THEN 1 END) as alta_prioridad
      FROM tickets
    `);
    return result.rows[0];
  }

  // Listar tickets con asignaciones actuales
  static async listWithAssignments() {
    const sql = `
      SELECT 
        t.id_ticket,
        t.codigo,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.fecha_reporte,
        t.fecha_compromiso,
        tc.nombre as categoria_nombre,
        d.nro_depa,
        p.nombres || ' ' || p.apellidos as nombre_residente,
        ta.id_asignacion,
        ta.id_empleado,
        ta.id_tecnico_externo,
        ta.nota as nota_asignacion,
        ta.fecha_asignacion,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 'interno'
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 'externo'
          ELSE NULL
        END as tipo_tecnico,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 
            (SELECT pe.nombres || ' ' || pe.apellidos 
             FROM empleados e 
             LEFT JOIN users u ON u.id = e.id_user 
             LEFT JOIN personas pe ON pe.id_persona = u.id_persona 
             WHERE e.id_empleado = ta.id_empleado)
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 
            (SELECT te.nombres || ' ' || te.apellidos 
             FROM tecnicos_externos te 
             WHERE te.id_tecnico = ta.id_tecnico_externo)
          ELSE NULL
        END as tecnico_nombre,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 
            (SELECT e.cargo FROM empleados e WHERE e.id_empleado = ta.id_empleado)
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 
            (SELECT te.cargo FROM tecnicos_externos te WHERE te.id_tecnico = ta.id_tecnico_externo)
          ELSE NULL
        END as tecnico_cargo,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 
            (SELECT pe.telefono 
             FROM empleados e 
             LEFT JOIN users u ON u.id = e.id_user 
             LEFT JOIN personas pe ON pe.id_persona = u.id_persona 
             WHERE e.id_empleado = ta.id_empleado)
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 
            (SELECT te.celular FROM tecnicos_externos te WHERE te.id_tecnico = ta.id_tecnico_externo)
          ELSE NULL
        END as tecnico_celular
      FROM tickets t
      INNER JOIN ticket_categorias tc ON t.id_categoria = tc.id_categoria
      INNER JOIN residentes r ON t.id_residente = r.id_residente
      INNER JOIN departamentos d ON t.id_departamento = d.id_departamento
      INNER JOIN personas p ON r.id_persona = p.id_persona
      INNER JOIN ticket_asignaciones ta ON ta.id_ticket = t.id_ticket AND ta.es_actual = TRUE
      ORDER BY t.fecha_reporte DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  // Listar tickets asignados actualmente a un empleado interno específico
  static async listAssignedForEmpleado(id_empleado) {
    const sql = `
      SELECT 
        t.id_ticket,
        t.codigo,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.fecha_reporte,
        t.fecha_compromiso,
        tc.nombre as categoria_nombre,
        d.nro_depa,
        p.nombres || ' ' || p.apellidos as nombre_residente,
        ta.id_asignacion,
        ta.fecha_asignacion,
        (SELECT COUNT(*) FROM ticket_adjuntos WHERE id_ticket = t.id_ticket) as total_adjuntos
      FROM tickets t
      INNER JOIN ticket_categorias tc ON t.id_categoria = tc.id_categoria
      INNER JOIN residentes r ON t.id_residente = r.id_residente
      INNER JOIN departamentos d ON t.id_departamento = d.id_departamento
      INNER JOIN personas p ON r.id_persona = p.id_persona
      INNER JOIN ticket_asignaciones ta ON ta.id_ticket = t.id_ticket AND ta.es_actual = TRUE
      WHERE ta.id_empleado = $1
      ORDER BY t.fecha_reporte DESC`;
    const result = await query(sql, [id_empleado]);
    return result.rows;
  }

  // Listar tickets del residente que tienen una asignación actual (interno o externo)
  static async listAssignedForResidente(id_residente) {
    const sql = `
      SELECT 
        t.id_ticket,
        t.codigo,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.fecha_reporte,
        t.fecha_compromiso,
        tc.nombre as categoria_nombre,
        d.nro_depa,
        p.nombres || ' ' || p.apellidos as nombre_residente,
        ta.id_asignacion,
        ta.fecha_asignacion,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 'interno'
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 'externo'
          ELSE NULL
        END as tipo_tecnico,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 
            (SELECT pe.nombres || ' ' || pe.apellidos 
             FROM empleados e 
             LEFT JOIN users u ON u.id = e.id_user 
             LEFT JOIN personas pe ON pe.id_persona = u.id_persona 
             WHERE e.id_empleado = ta.id_empleado)
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 
            (SELECT te.nombres || ' ' || te.apellidos 
             FROM tecnicos_externos te 
             WHERE te.id_tecnico = ta.id_tecnico_externo)
          ELSE NULL
        END as tecnico_nombre,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 
            (SELECT e.cargo FROM empleados e WHERE e.id_empleado = ta.id_empleado)
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 
            (SELECT te.cargo FROM tecnicos_externos te WHERE te.id_tecnico = ta.id_tecnico_externo)
          ELSE NULL
        END as tecnico_cargo,
        CASE 
          WHEN ta.id_empleado IS NOT NULL THEN 
            (SELECT pe.telefono 
             FROM empleados e 
             LEFT JOIN users u ON u.id = e.id_user 
             LEFT JOIN personas pe ON pe.id_persona = u.id_persona 
             WHERE e.id_empleado = ta.id_empleado)
          WHEN ta.id_tecnico_externo IS NOT NULL THEN 
            (SELECT te.celular FROM tecnicos_externos te WHERE te.id_tecnico = ta.id_tecnico_externo)
          ELSE NULL
        END as tecnico_celular,
        (SELECT COUNT(*) FROM ticket_adjuntos WHERE id_ticket = t.id_ticket) as total_adjuntos
      FROM tickets t
      INNER JOIN ticket_categorias tc ON t.id_categoria = tc.id_categoria
      INNER JOIN residentes r ON t.id_residente = r.id_residente
      INNER JOIN departamentos d ON t.id_departamento = d.id_departamento
      INNER JOIN personas p ON r.id_persona = p.id_persona
      INNER JOIN ticket_asignaciones ta ON ta.id_ticket = t.id_ticket AND ta.es_actual = TRUE
      WHERE t.id_residente = $1
      ORDER BY t.fecha_reporte DESC`;
    const result = await query(sql, [id_residente]);
    return result.rows;
  }

  // Crear asignación de técnico (interno o externo)
  static async assignTicket({ id_ticket, tipo_tecnico, id_empleado = null, id_tecnico_externo = null, nota = null, asignado_por_persona }) {
    // Validaciones básicas
    if (!id_ticket) throw new Error('id_ticket es requerido');
    if (!asignado_por_persona) throw new Error('asignado_por_persona es requerido');
    const interno = (tipo_tecnico || '').toLowerCase() === 'interno';
    const externo = (tipo_tecnico || '').toLowerCase() === 'externo';
    if (!(interno || externo)) throw new Error('tipo_tecnico inválido');
    if (interno && !id_empleado) throw new Error('id_empleado requerido para asignación interna');
    if (externo && !id_tecnico_externo) throw new Error('id_tecnico_externo requerido para asignación externa');

    // Transacción manual
    try {
      await query('BEGIN');

      // Marcar asignaciones previas como no actuales
      await query(`UPDATE ticket_asignaciones SET es_actual = FALSE, updated_at = NOW(), fecha_fin = COALESCE(fecha_fin, NOW()) WHERE id_ticket = $1 AND es_actual = TRUE`, [id_ticket]);

      // Insertar nueva asignación
      const insertRes = await query(
        `INSERT INTO ticket_asignaciones (id_ticket, id_empleado, id_tecnico_externo, es_actual, asignado_por_persona, fecha_asignacion, nota, created_at)
         VALUES ($1, $2, $3, TRUE, $4, NOW(), $5, NOW())
         RETURNING *`,
        [id_ticket, interno ? id_empleado : null, externo ? id_tecnico_externo : null, asignado_por_persona, nota]
      );
      const asignacion = insertRes.rows[0];

      // Si el ticket está 'abierto', pasarlo a 'en_progreso'
      await query(`UPDATE tickets SET estado = CASE WHEN estado = 'abierto' THEN 'en_progreso' ELSE estado END, updated_at = NOW() WHERE id_ticket = $1`, [id_ticket]);

      // Obtener datos para mostrar en UI
      let display = null;
      if (interno) {
        const d = await query(`
          SELECT e.id_empleado, e.cargo, p.nombres, p.apellidos, p.telefono AS celular
          FROM empleados e
          LEFT JOIN users u ON u.id = e.id_user
          LEFT JOIN personas p ON p.id_persona = u.id_persona
          WHERE e.id_empleado = $1
        `, [id_empleado]);
        const r = d.rows[0] || {};
        display = { tipo: 'interno', id_empleado: r.id_empleado, nombres: r.nombres, apellidos: r.apellidos, cargo: r.cargo, celular: r.celular };
      } else {
        const d = await query(`
          SELECT id_tecnico, nombres, apellidos, cargo, celular
          FROM tecnicos_externos WHERE id_tecnico = $1
        `, [id_tecnico_externo]);
        const r = d.rows[0] || {};
        display = { tipo: 'externo', id_tecnico_externo: r.id_tecnico, nombres: r.nombres, apellidos: r.apellidos, cargo: r.cargo, celular: r.celular };
      }

      await query('COMMIT');

      return { asignacion, asignado_actual: display };
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  }
}

module.exports = Ticket;
