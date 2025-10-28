# Backend - Sistema de Gestión

Backend desarrollado en Node.js con Express para el sistema de gestión con autenticación por roles.

## 🚀 Características

- **Autenticación JWT**: Tokens seguros con expiración de 24 horas
- **Roles de Usuario**: Administrador, Empleado, Residente
- **Base de Datos**: PostgreSQL con esquemas optimizados
- **Seguridad**: Encriptación de contraseñas con bcrypt, middleware de seguridad
- **Validaciones**: Validación completa de datos de entrada

## 📋 Prerequisitos

1. **Node.js** (versión 14 o superior)
2. **PostgreSQL** (versión 12 o superior)
3. **NPM** o **Yarn**

## ⚙️ Instalación y Configuración

### 1. Instalar Dependencias

```bash
cd Backend
npm install
```

### 2. Configurar PostgreSQL

1. **Instalar PostgreSQL** si no lo tienes:
   - Windows: [Descargar PostgreSQL](https://www.postgresql.org/download/windows/)
   - Crear una base de datos llamada `sistema_gestion`

2. **Configurar credenciales** en el archivo `.env`:

```env
# Configuración de la base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_gestion
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# JWT Secret (cambiar por una clave más segura)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# Puerto del servidor
PORT=8000
```

### 3. Inicializar Base de Datos

El backend creará automáticamente las tablas necesarias al iniciar:

- `usuarios` - Información de usuarios con roles
- `sesiones` - Tracking de sesiones (opcional)
- `password_resets` - Tokens de recuperación de contraseña

### 4. Ejecutar el Servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## 👤 Usuario Administrador por Defecto

El sistema crea automáticamente un usuario administrador:

- **Username**: `admin`
- **Password**: `Admin123!`
- **Email**: `admin@sistema.com`
- **Rol**: `administrador`

## 📚 API Endpoints

### 🔐 Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/login` | Iniciar sesión |
| POST | `/register` | Registrar usuario |
| GET | `/profile` | Obtener perfil (requiere auth) |
| PUT | `/profile` | Actualizar perfil (requiere auth) |
| PUT | `/change-password` | Cambiar contraseña (requiere auth) |
| POST | `/verify-token` | Verificar token (requiere auth) |

### 👥 Usuarios (`/api/users`) - Solo Administradores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar usuarios |
| GET | `/stats` | Estadísticas de usuarios |
| GET | `/:id` | Obtener usuario específico |
| PUT | `/:id/deactivate` | Desactivar usuario |
| PUT | `/:id/activate` | Reactivar usuario |

## 📝 Ejemplo de Uso - Login

### Request:
```json
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!",
  "role": "administrador"
}
```

### Response:
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@sistema.com",
      "rol": "administrador",
      "nombre": "Administrador",
      "apellido": "Sistema"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 📝 Ejemplo de Uso - Registro

### Request:
```json
POST /api/auth/register
Content-Type: application/json

{
  "username": "juan_empleado",
  "email": "juan@empresa.com",
  "password": "MiPassword123!",
  "confirmPassword": "MiPassword123!",
  "rol": "empleado",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "123456789"
}
```

## 🔒 Autenticación con JWT

Para endpoints protegidos, incluir el token en el header:

```
Authorization: Bearer tu_jwt_token_aqui
```

## 🏗️ Estructura del Proyecto

```
Backend/
├── config/
│   └── database.js          # Configuración de PostgreSQL
├── middleware/
│   └── auth.js              # Middleware de autenticación JWT
├── models/
│   └── User.js              # Modelo de usuario
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   └── users.js             # Rutas de gestión de usuarios
├── .env                     # Variables de entorno
├── index.js                 # Archivo principal del servidor
└── README.md                # Este archivo
```

## 🎯 Roles y Permisos

### Administrador
- Acceso completo al sistema
- Gestión de usuarios (crear, editar, desactivar)
- Ver estadísticas del sistema

### Empleado
- Registro propio
- Gestión de su perfil
- Acceso a funcionalidades de empleado

### Residente
- Registro propio
- Gestión de su perfil
- Acceso a funcionalidades de residente

## 🔧 Conectar con el Frontend

El frontend React debe hacer peticiones a:
- **Desarrollo**: `http://localhost:8000/api`
- **Producción**: Configurar según tu dominio

### Ejemplo de configuración en React:

```javascript
const API_BASE_URL = 'http://localhost:8000/api';

// Función para login
const login = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  return await response.json();
};
```

## 🛠️ Solución de Problemas

### Error de Conexión a PostgreSQL
1. Verificar que PostgreSQL esté ejecutándose
2. Confirmar credenciales en `.env`
3. Verificar que la base de datos `sistema_gestion` exista

### Error de CORS
- El backend está configurado para permitir `localhost:3000` y `localhost:5173`
- Agregar tu dominio en `index.js` si es necesario

### Token Expirado
- Los tokens JWT expiran en 24 horas
- El frontend debe manejar la renovación automática

## 🌟 Próximas Mejoras

- [ ] Recuperación de contraseña por email
- [ ] Logs de auditoría
- [ ] Rate limiting
- [ ] Notificaciones en tiempo real
- [ ] API de archivos/documentos