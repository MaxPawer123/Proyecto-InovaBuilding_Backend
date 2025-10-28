const { Server } = require('socket.io');
const db = require('../config/database_real');

let io;

const initializeChatSocket = (server) => {
	io = new Server(server, {
		cors: {
			origin: ['http://localhost:5173', 'http://localhost:3000'],
			methods: ['GET', 'POST']
		}
	});

	io.on('connection', (socket) => {
		console.log('Socket conectado:', socket.id);

		// Registro por usuario para notificaciones dirigidas
		socket.on('registerUser', ({ userId }) => {
			if (!userId) return;
			socket.data.userId = userId;
			socket.join(`user_${userId}`);
			console.log(`Socket ${socket.id} registrado para user_${userId}`);
		});

		socket.on('joinRoom', async ({ id_sala }) => {
			socket.join(`sala_${id_sala}`);
			console.log(`Socket ${socket.id} se unió a sala ${id_sala}`);
		});

		socket.on('leaveRoom', ({ id_sala }) => {
			socket.leave(`sala_${id_sala}`);
		});

		socket.on('sendMessage', async ({ id_sala, id_user, contenido }) => {
			try {
				const result = await db.query(
					'INSERT INTO mensajes_chat (contenido, id_sala, id_user) VALUES ($1, $2, $3) RETURNING *', 
					[contenido, id_sala, id_user]
				);
				const mensaje = result.rows[0];
                
				// Obtener información del usuario
				const userInfo = await db.query(
					`SELECT p.nombres, p.apellidos 
					 FROM users u 
					 LEFT JOIN personas p ON p.id_persona = u.id_persona 
					 WHERE u.id = $1`,
					[id_user]
				);
                
				if (userInfo.rows.length > 0) {
					mensaje.nombres = userInfo.rows[0].nombres;
					mensaje.apellidos = userInfo.rows[0].apellidos;
				}
                
				io.to(`sala_${id_sala}`).emit('newMessage', mensaje);
			} catch (error) {
				console.error('sendMessage error:', error);
				socket.emit('errorMessage', { message: 'Error enviando mensaje' });
			}
		});

		socket.on('disconnect', () => {
			console.log('Socket desconectado:', socket.id);
		});
	});

	return io;
};

// Helper para notificar asignación de ticket a un usuario específico
const notifyTicketAssigned = (userId, payload) => {
    try {
        if (!io) {
            console.warn('notifyTicketAssigned: io no inicializado');
            return;
        }
        console.log(`📨 Emitiendo ticketAssigned a user_${userId}:`, payload);
        io.to(`user_${userId}`).emit('ticketAssigned', payload);
        console.log(`✅ Evento ticketAssigned emitido correctamente a user_${userId}`);
    } catch (err) {
        console.error('Error notificando asignación:', err);
    }
};

const getIO = () => io;

module.exports = { initializeChatSocket, notifyTicketAssigned, getIO };
