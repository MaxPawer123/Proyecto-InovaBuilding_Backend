const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL usando tu estructura real
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Edificio',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

// Función para conectar y verificar la conexión
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL exitosamente');
    console.log('📊 Base de datos: edificio (estructura importada)');
    
    // Verificar que las tablas principales existan
    await checkTables(client);
    
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    console.log('📝 Verifica que PostgreSQL esté ejecutándose y las credenciales sean correctas');
    console.log('📝 Asegúrate de que la base de datos "edificio" exista y tenga las tablas del SQL importadas');
  }
};

// Verificar que las tablas principales existan
const checkTables = async (client) => {
  try {
    const requiredTables = ['users', 'personas'];
    
    for (const table of requiredTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ Tabla '${table}' encontrada`);
      } else {
        console.log(`❌ Tabla '${table}' no encontrada`);
        throw new Error(`Tabla requerida '${table}' no existe. Importa el archivo edificio.sql`);
      }
    }
    
    // Verificar si hay usuarios registrados
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Usuarios registrados: ${userCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error verificando tablas:', error.message);
    throw error;
  }
};

// Función para hacer queries con manejo de errores
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Función para inicializar datos básicos si es necesario
const initializeData = async () => {
  try {
    console.log('📋 Inicialización de datos completada');
    console.log('� Los usuarios administradores se crearán según sea necesario');
    
  } catch (error) {
    console.error('Error inicializando datos:', error);
  }
};

// Nota: Se eliminó la creación automática del usuario admin@edificio.com
// Los administradores se crearán manualmente a través del sistema

module.exports = {
  pool,
  connectDB,
  query,
  initializeData
};