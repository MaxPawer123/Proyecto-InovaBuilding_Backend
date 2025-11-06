const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB, initializeData } = require('./config/database_real');
let updateDatabase = async () => {};
try {
  ({ updateDatabase } = require('./updateDatabase'));
} catch (e) {
  console.warn('updateDatabase no encontrado, se omite actualización automática');
}
require('dotenv').config();

const app = express();
const path = require('path');
const fs = require('fs');

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://127.0.0.1:5173', 
    'http://127.0.0.1:5174',
    'http://localhost:8081', // Metro bundler
    'http://localhost:8082', // Metro bundler alternativo
    'http://10.0.2.2:8081',  // Android emulator
    'http://192.168.0.7:8081', // Tu IP local - CAMBIA ESTO
    'http://192.168.0.7:8082', // Tu IP local - CAMBIA ESTO
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Permitir leer cookies
app.use(cookieParser());

// Support parsing text/plain bodies (some fetch requests may send text/content-type mismatch)
app.use(express.text({ type: 'text/*', verify: (req, res, buf) => { try { req.rawBody = buf && buf.length ? buf.toString() : undefined; } catch(e){ req.rawBody = undefined; } } }));

// Capture raw body for debugging requests that arrive without parsed body
app.use(express.json({
  verify: (req, res, buf) => {
    try { req.rawBody = buf && buf.length ? buf.toString() : req.rawBody; } catch (e) { req.rawBody = req.rawBody; }
  }
}));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { try { req.rawBody = buf && buf.length ? buf.toString() : req.rawBody; } catch(e){ req.rawBody = req.rawBody; } } }));

// Archivos estáticos: servir /uploads para adjuntos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
// Subcarpeta para tickets
const uploadsTickets = path.join(uploadsDir, 'tickets');
if (!fs.existsSync(uploadsTickets)) {
  fs.mkdirSync(uploadsTickets, { recursive: true });
}

// Rutas
const authRoutes = require('./routes/authReal');
const userRoutes = require('./routes/users');
const comunicacionRoutes = require('./routes/comunicacion');
const consumosRoutes = require('./routes/consumos');
const alertasRoutes = require('./routes/alertas');
const ticketsRoutes = require('./routes/tickets');
const tecnicosRoutes = require('./routes/tecnicos');
const empleadosRoutes = require('./routes/empleados');
const nominasRoutes = require('./routes/nominas');
const notificacionesRoutes = require('./routes/notificaciones');
const areasRoutes = require('./routes/areas');
const reservasRoutes = require('./routes/reservas');
const facturasRoutes = require('./routes/facturas');
// Log simple para diagnosticar solicitudes al login desde la app móvil
app.use((req, _res, next) => {
  if (req.method === 'POST' && req.path === '/api/auth/login') {
    console.log(`📥 /api/auth/login desde ${req.ip} · origin=${req.headers.origin || '-'} · ua=${req.headers['user-agent'] || '-'}`);
  }
  next();
});

// Endpoint de salud para pruebas rápidas de conectividad
app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comunicacion', comunicacionRoutes);
app.use('/api/consumos', consumosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/tecnicos', tecnicosRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/nominas', nominasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api', reservasRoutes);
app.use('/api/facturas', facturasRoutes);



const PORT = process.env.PORT || 8000;
const http = require('http');
const server = http.createServer(app);
const { initializeChatSocket } = require('./sockets/chatSocket');

server.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📱 Frontend puede conectarse desde http://localhost:5173`);
  console.log(`🔗 API disponible en http://localhost:${PORT}/api`);
  
  // Conectar a la base de datos PostgreSQL
  await connectDB();
  
  // Actualizar estructura de base de datos
  await updateDatabase();
  
  // Inicializar datos básicos
  await initializeData();
  // Asegurar que el super administrador exista y esté verificado
  try {
    const { createSuperAdmin } = require('./createSuperAdmin');
    await createSuperAdmin();
  } catch (err) {
    console.error('Error asegurando super administrador:', err);
  }
  
  console.log('✨ Sistema listo para usar');
  // Inicializar sockets de chat
  try {
    initializeChatSocket(server);
    console.log('💬 Socket de chat inicializado');
  } catch (err) {
    console.error('Error inicializando socket:', err);
  }
});