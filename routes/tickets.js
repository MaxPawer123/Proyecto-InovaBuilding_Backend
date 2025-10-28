const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database_real');
const multer = require('multer');
const path = require('path');
const { getIO } = require('../sockets/chatSocket');
const Notificacion = require('../models/Notificacion');

// Configuración de multer para guardar archivos en /uploads/tickets
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'tickets'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });

// Obtener todas las categorías de tickets
router.get('/categorias', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id_categoria, nombre, descripcion, created_at 
       FROM ticket_categorias 
       ORDER BY nombre ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías de tickets' });
  }
});

// Listar tickets con filtros
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol;
    
    console.log('📋 Listando tickets - Usuario:', { 
      id: userId, 
      rol: userRole,
      rolType: typeof userRole 
    });
    
    const filters = {
      estado: req.query.estado,
      prioridad: req.query.prioridad,
      id_categoria: req.query.id_categoria
    };

    // Si NO es admin, filtrar solo tickets del residente
    if (userRole?.toLowerCase() !== 'administrador') {
      console.log('👤 Usuario no es admin, filtrando por residente...');
      
      // Obtener id_residente del usuario por correo
      const residenteResult = await query(
        `SELECT r.id_residente, r.id_departamento 
         FROM residentes r 
         INNER JOIN personas p ON r.id_persona = p.id_persona 
         INNER JOIN users u ON p.correo = u.email 
         WHERE u.id = $1`,
        [userId]
      );

      if (residenteResult.rows.length === 0) {
        console.log('❌ Usuario no es residente');
        return res.status(403).json({ message: 'Usuario no es residente' });
      }

      const residente = residenteResult.rows[0];
      filters.id_residente = residente.id_residente;
      console.log('✅ Filtrando tickets del residente:', residente.id_residente);
    } else {
      console.log('👑 Usuario es ADMIN - mostrando TODOS los tickets');
    }

    const tickets = await Ticket.list(filters);
    console.log('✅ Tickets encontrados:', tickets.length);
    res.json(tickets);
  } catch (error) {
    console.error('Error al listar tickets:', error);
    res.status(500).json({ message: 'Error al obtener tickets' });
  }
});

// Obtener estadísticas de tickets (solo admin)
router.get('/stats/general', requireAuth, async (req, res) => {
  try {
  const userRole = req.user.rol;

  if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden ver estadísticas' });
    }

    const stats = await Ticket.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

// Obtener tickets con asignaciones actuales (solo admin)
router.get('/asignados', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden ver tickets asignados' });
    }

    const ticketsAsignados = await Ticket.listWithAssignments();
    res.json(ticketsAsignados);
  } catch (error) {
    console.error('Error al obtener tickets asignados:', error);
    res.status(500).json({ message: 'Error al obtener tickets asignados' });
  }
});

// Obtener tickets asignados al empleado autenticado (internos)
router.get('/mis-asignados', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // obtener id_empleado desde users -> empleados
    const empleadoQ = await query(
      `SELECT e.id_empleado
       FROM empleados e
       WHERE e.id_user = $1`,
      [userId]
    );
    if (empleadoQ.rows.length === 0) {
      return res.json([]);
    }
    const id_empleado = empleadoQ.rows[0].id_empleado;
    const rows = await Ticket.listAssignedForEmpleado(id_empleado);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener mis tickets asignados:', error);
    res.status(500).json({ message: 'Error al obtener mis tickets asignados' });
  }
});

// Obtener tickets con asignación actual para el residente autenticado
router.get('/mis-asignados-residente', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener id_residente del usuario autenticado
    const residenteResult = await query(
      `SELECT r.id_residente
       FROM residentes r 
       INNER JOIN personas p ON r.id_persona = p.id_persona 
       INNER JOIN users u ON p.correo = u.email 
       WHERE u.id = $1`,
      [userId]
    );

    if (residenteResult.rows.length === 0) {
      return res.status(403).json({ message: 'Usuario no es residente' });
    }

    const id_residente = residenteResult.rows[0].id_residente;
    const rows = await Ticket.listAssignedForResidente(id_residente);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener tickets asignados del residente:', error);
    res.status(500).json({ message: 'Error al obtener tickets asignados del residente' });
  }
});

// Obtener historial de seguimientos (todos) - DEBE IR ANTES DE /:id
router.get('/historial-seguimiento', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;
    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden ver el historial de seguimientos' });
    }

    const rows = await Ticket.listSeguimientos();
    // Mapear campos al formato que espera el frontend
    const mapped = rows.map(r => ({
      id: r.id,
      ticket_codigo: r.ticket_codigo,
      ticket_titulo: r.ticket_titulo,
      estado_anterior: r.estado_anterior,
      estado_nuevo: r.estado_nuevo,
      comentario: r.comentario,
      fecha: r.fecha
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error al obtener historial de seguimiento:', error);
    res.status(500).json({ message: 'Error al obtener historial de seguimiento' });
  }
});

// Obtener ticket por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    // Verificar permisos
  const userId = req.user.id;
  const userRole = req.user.rol;

  if (userRole?.toLowerCase() !== 'administrador') {
      // Si es empleado, verificar que el ticket está asignado a él
      if (userRole?.toLowerCase() === 'empleado') {
        const empleadoAsignadoResult = await query(
          `SELECT ta.id_asignacion 
           FROM ticket_asignaciones ta
           INNER JOIN empleados e ON ta.id_empleado = e.id_empleado
           WHERE ta.id_ticket = $1 AND e.id_user = $2 AND ta.es_actual = TRUE`,
          [req.params.id, userId]
        );

        if (empleadoAsignadoResult.rows.length > 0) {
          // El empleado tiene el ticket asignado, puede verlo
          return res.json(ticket);
        }
      }

      // Si no es empleado o no tiene el ticket asignado, verificar que el ticket pertenece al residente
      const residenteResult = await query(
        `SELECT r.id_residente 
         FROM residentes r 
         INNER JOIN personas p ON r.id_persona = p.id_persona 
         INNER JOIN users u ON p.correo = u.email 
         WHERE u.id = $1`,
        [userId]
      );

      if (residenteResult.rows.length === 0 || 
          residenteResult.rows[0].id_residente !== ticket.id_residente) {
        return res.status(403).json({ message: 'No tienes permiso para ver este ticket' });
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    res.status(500).json({ message: 'Error al obtener ticket' });
  }
});

// Crear nuevo ticket
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { titulo, descripcion, prioridad, id_categoria } = req.body;

    // Validar campos requeridos
    if (!titulo || !descripcion || !id_categoria) {
      return res.status(400).json({ 
        message: 'Título, descripción y categoría son requeridos' 
      });
    }

    // Obtener información del residente
    const residenteResult = await query(
      `SELECT r.id_residente, r.id_departamento 
       FROM residentes r 
       INNER JOIN personas p ON r.id_persona = p.id_persona 
       INNER JOIN users u ON p.correo = u.email 
       WHERE u.id = $1`,
      [userId]
    );

    if (residenteResult.rows.length === 0) {
      return res.status(403).json({ message: 'Usuario no es residente' });
    }

    const { id_residente, id_departamento } = residenteResult.rows[0];

    // Crear el ticket
    const nuevoTicket = await Ticket.create({
      titulo,
      descripcion,
      prioridad: prioridad || 'media',
      id_categoria,
      id_residente,
      id_departamento
    });

    res.status(201).json(nuevoTicket);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ message: 'Error al crear ticket' });
  }
});

// Subir adjunto a un ticket
// Nota: este endpoint ahora espera multipart/form-data con campo 'file'
router.post('/:id/adjuntos', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const id_ticket = req.params.id;
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Archivo (file) es requerido' });
    }

    // Verificar que el ticket existe
    const ticket = await Ticket.findById(id_ticket);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    // Obtener id_persona del usuario
    const personaResult = await query(
      `SELECT p.id_persona 
       FROM personas p 
       INNER JOIN users u ON p.correo = u.email 
       WHERE u.id = $1`,
      [userId]
    );

    if (personaResult.rows.length === 0) {
      return res.status(403).json({ message: 'Usuario no encontrado' });
    }

    const id_persona = personaResult.rows[0].id_persona;

    // Construir URL pública del archivo
    const publicPath = `/uploads/tickets/${file.filename}`;

    // Crear el adjunto
    const adjunto = await Ticket.createAdjunto({
      id_ticket,
      nombre_original: file.originalname,
      url: publicPath,
      tipo_mime: file.mimetype,
      peso_bytes: file.size,
      subido_por_persona: id_persona
    });

    res.status(201).json(adjunto);
  } catch (error) {
    console.error('Error al subir adjunto:', error);
    res.status(500).json({ message: 'Error al subir adjunto' });
  }
});

// Crear seguimiento de ticket (estado + comentario)
router.post('/:id/seguimiento', requireAuth, async (req, res) => {
  try {
    const id_ticket = parseInt(req.params.id);
    const userId = req.user.id;
    const { estado_anterior, estado_nuevo, comentario } = req.body;

    if (!estado_nuevo || !estado_anterior || comentario === undefined) {
      return res.status(400).json({ message: 'estado_anterior, estado_nuevo y comentario son requeridos' });
    }

    // Verificar que el ticket existe
    const ticket = await Ticket.findById(id_ticket);
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

    // Obtener id_persona del usuario que realiza el seguimiento
    const personaResult = await query(`SELECT p.id_persona FROM personas p INNER JOIN users u ON p.correo = u.email WHERE u.id = $1`, [userId]);
    if (personaResult.rows.length === 0) return res.status(403).json({ message: 'Usuario no encontrado' });
    const id_persona = personaResult.rows[0].id_persona;

    // Guardar seguimiento
    const nuevo = await Ticket.createSeguimiento({ id_ticket, estado_anterior, estado_nuevo, comentario, realizado_por_persona: id_persona });

    // Opcional: actualizar estado del ticket si se cambió
    if (estado_nuevo && estado_nuevo !== ticket.estado) {
      await Ticket.updateEstado(id_ticket, estado_nuevo);
    }

    res.status(201).json({ success: true, data: {
      id: nuevo.id_seguimiento,
      ticket_codigo: ticket.codigo,
      ticket_titulo: ticket.titulo,
      estado_anterior: nuevo.estado_anterior,
      estado_nuevo: nuevo.estado_nuevo,
      comentario: nuevo.comentario,
      fecha: nuevo.created_at
    } });
  } catch (error) {
    console.error('Error al crear seguimiento:', error);
    res.status(500).json({ message: 'Error al crear seguimiento' });
  }
});

// Crear asignación de técnico (interno o externo)
router.post('/:id/asignaciones', requireAuth, async (req, res) => {
  try {
    const id_ticket = parseInt(req.params.id);
    const userId = req.user.id;
    console.log('POST /api/tickets/:id/asignaciones called', { id_ticket, userId, bodyPreview: req.body });
    const { tipo_tecnico, id_empleado, id_tecnico_externo, nota } = req.body;

    // Obtener id_persona del usuario que asigna
    const personaResult = await query(
      `SELECT p.id_persona 
       FROM personas p 
       INNER JOIN users u ON p.correo = u.email 
       WHERE u.id = $1`,
      [userId]
    );
    if (personaResult.rows.length === 0) {
      return res.status(403).json({ message: 'Usuario no encontrado' });
    }
    const id_persona = personaResult.rows[0].id_persona;

    // Verificar que el ticket existe
    const ticket = await Ticket.findById(id_ticket);
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

    // Crear asignación
    const result = await Ticket.assignTicket({
      id_ticket,
      tipo_tecnico,
      id_empleado,
      id_tecnico_externo,
      nota,
      asignado_por_persona: id_persona
    });

    // Notificar por socket al técnico interno asignado
    try {
      if ((tipo_tecnico || '').toLowerCase() === 'interno' && id_empleado) {
        // Obtener datos completos del ticket para la notificación
        const ticketData = await Ticket.findById(id_ticket);
        
        // obtener id_user del empleado para emitir a user_<id>
        const empleadoQ = await query(
          `SELECT e.id_user as id_user
           FROM empleados e
           WHERE e.id_empleado = $1`,
          [id_empleado]
        );
        if (empleadoQ.rows.length > 0 && ticketData) {
          const assignedUserId = empleadoQ.rows[0].id_user;
          const { notifyTicketAssigned } = require('../sockets/chatSocket');
          console.log('🔔 Enviando notificación de ticket asignado a user_' + assignedUserId, {
            id_ticket: ticketData.id_ticket,
            codigo: ticketData.codigo,
            titulo: ticketData.titulo
          });
          notifyTicketAssigned(assignedUserId, {
            id_ticket: ticketData.id_ticket,
            codigo: ticketData.codigo,
            titulo: ticketData.titulo,
            descripcion: ticketData.descripcion,
            prioridad: ticketData.prioridad,
            estado: ticketData.estado,
            categoria_nombre: ticketData.categoria_nombre,
            asignado_actual: result?.asignado_actual || null,
            fecha_asignacion: new Date().toISOString()
          });
        }
      }
    } catch (notifyErr) {
      console.warn('No se pudo notificar asignación por socket:', notifyErr.message || notifyErr);
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error al crear asignación:', error);
    res.status(500).json({ message: error.message || 'Error al crear asignación' });
  }
});

// Actualizar estado de ticket (admin o residente propietario)
router.patch('/:id/estado', requireAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    const userId = req.user.id;
    const userRole = req.user.rol;

    if (!estado) {
      return res.status(400).json({ message: 'Estado es requerido' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    // Verificar permisos
    if (userRole?.toLowerCase() !== 'administrador') {
      const residenteResult = await query(
        `SELECT r.id_residente 
         FROM residentes r 
         INNER JOIN personas p ON r.id_persona = p.id_persona 
         INNER JOIN users u ON p.correo = u.email 
         WHERE u.id = $1`,
        [userId]
      );

      if (residenteResult.rows.length === 0 || 
          residenteResult.rows[0].id_residente !== ticket.id_residente) {
        return res.status(403).json({ message: 'No tienes permiso para modificar este ticket' });
      }
    }

    const ticketActualizado = await Ticket.updateEstado(req.params.id, estado);
    res.json(ticketActualizado);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ message: 'Error al actualizar estado del ticket' });
  }
});

// Actualizar ticket completo (solo admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden editar tickets' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    const ticketActualizado = await Ticket.update(req.params.id, req.body);
    
    // Si se asignó un empleado, emitir evento de notificación y guardar en BD
    if (req.body.id_persona_asignada && req.body.id_persona_asignada !== ticket.id_persona_asignada) {
      // Guardar notificación en la base de datos
      try {
        await Notificacion.create({
          id_persona: req.body.id_persona_asignada,
          tipo: 'ticket-asignado',
          id_ticket: ticketActualizado.id_ticket,
          titulo: 'Nuevo ticket asignado',
          mensaje: `Se te ha asignado el ticket "${ticketActualizado.titulo}"`,
          leida: false
        });
        console.log('✅ Notificación guardada en BD para persona:', req.body.id_persona_asignada);
      } catch (notifError) {
        console.error('❌ Error guardando notificación en BD:', notifError);
      }
      
      // Emitir evento en tiempo real
      const io = getIO();
      if (io) {
        console.log(`📢 Emitiendo notificación de ticket asignado a empleado ${req.body.id_persona_asignada}`);
        io.emit('ticket-asignado', {
          id_ticket: ticketActualizado.id_ticket,
          id_persona_asignada: req.body.id_persona_asignada,
          titulo: ticketActualizado.titulo,
          estado: ticketActualizado.estado,
          prioridad: ticketActualizado.prioridad,
          fecha_asignacion: new Date().toISOString()
        });
        console.log(`✅ Evento ticket-asignado emitido correctamente`);
      } else {
        console.warn('⚠️ Socket.io no está inicializado');
      }
    }
    
    res.json(ticketActualizado);
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    res.status(500).json({ message: 'Error al actualizar ticket' });
  }
});

// Eliminar ticket (solo admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.rol;

    if (userRole?.toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'Solo administradores pueden eliminar tickets' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    await Ticket.delete(req.params.id);
    res.json({ message: 'Ticket eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    res.status(500).json({ message: 'Error al eliminar ticket' });
  }
});

module.exports = router;

