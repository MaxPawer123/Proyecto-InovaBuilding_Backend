const express = require('express');
const router = express.Router();

// GET /api/empleados - listar empleados internos con datos de persona y empleado
router.get('/', async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database_real');
    const q = await dbQuery(`
      SELECT u.id as id_user, u.email, u.rol,
             p.id_persona, p.nombres, p.apellidos, p.telefono, p.correo,
             e.id_empleado, e.cargo, e.sueldo, e.turno, e.created_at as empleado_created
      FROM users u
      LEFT JOIN personas p ON u.id_persona = p.id_persona
      LEFT JOIN empleados e ON e.id_user = u.id
      WHERE (u.rol = 'Empleado' OR u.rol = 'empleado')
      ORDER BY p.nombres, p.apellidos
    `);

    const empleados = q.rows.map(r => ({
      id_user: r.id_user,
      email: r.email,
      id_persona: r.id_persona,
      nombres: r.nombres,
      apellidos: r.apellidos,
      telefono: r.telefono,
      correo: r.correo,
      id_empleado: r.id_empleado,
      cargo: r.cargo,
      sueldo: r.sueldo,
      turno: r.turno,
    }));

    res.json({ success: true, data: { empleados } });
  } catch (error) {
    console.error('Error listando empleados:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
