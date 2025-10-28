// 📂 Backend/createSuperAdmin.js
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

// Configuración de conexión a la base de datos
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Edificio',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function createSuperAdmin() {
  const client = await pool.connect();

  try {
    console.log('🔧 Verificando o creando Super Administrador...');

    // Datos del super administrador
    const adminData = {
      email: 'admin@edificio.com',
      password: 'Admin123!',
      rol: 'Administrador',
      nombre: 'Admin',
      apellido: 'Edificio',
      telefono: '70000000',
      ci: '12345678',
    };

    // Verificar si ya existe un usuario con ese email
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminData.email]
    );

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Si ya existe, solo actualizamos su contraseña y estado
    if (existingAdmin.rows.length > 0) {
      const existingId = existingAdmin.rows[0].id;
      await client.query(
        `
        UPDATE users 
        SET password = $2, email_verified_at = NOW(), estado = $3, updated_at = NOW()
        WHERE id = $1
        `,
        [existingId, hashedPassword, 'activo']
      );

      console.log(`🔁 Super Administrador actualizado: ${adminData.email}`);
      return;
    }

    // 🧱 Crear persona primero
    const personaResult = await client.query(
      `
      INSERT INTO personas (nombres, apellidos, correo, telefono, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id_persona
      `,
      [adminData.nombre, adminData.apellido, adminData.email, adminData.telefono]
    );

    // Capturar el ID de la persona recién creada
    const personaId =
      personaResult.rows[0].id_persona || personaResult.rows[0].id;

    // 👤 Insertar usuario vinculado
    const userResult = await client.query(
      `
      INSERT INTO users (
        name, email, password, rol, id_persona, estado, 
        email_verified_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING id
      `,
      [
        `${adminData.nombre} ${adminData.apellido}`,
        adminData.email,
        hashedPassword,
        adminData.rol,
        personaId,
        'activo',
      ]
    );

    console.log('🎉 Super Administrador creado exitosamente!');
    console.log('📧 Email:', adminData.email);
    console.log('🔐 Contraseña:', adminData.password);
    console.log('👑 Rol:', adminData.rol);
    console.log('🆔 ID:', userResult.rows[0].id);
  } catch (error) {
    console.error('❌ Error creando Super Administrador:', error.message);
  } finally {
    client.release(); // liberamos la conexión pero NO cerramos el pool
  }
}

// Ejecutar directamente
if (require.main === module) {
  createSuperAdmin()
    .then(() => {
      console.log('✨ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { createSuperAdmin };
