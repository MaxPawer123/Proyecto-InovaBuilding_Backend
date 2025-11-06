const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL usando tu estructura real
// Pool configuration: añadimos opciones de SSL y timeouts recomendados para
// conexiones a servicios manejados como Supabase. Si usas variables de
// entorno (recomendado), defínelas en tu archivo .env (DB_HOST, DB_USER, etc.).
const pool = new Pool({
  user: process.env.DB_USER || 'postgres.ftsonvwshoqxgmacnnsn',
  host: process.env.DB_HOST || 'aws-1-us-east-1.pooler.supabase.com',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'dd8)JBY)/1234',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 6543,
  max: process.env.DB_MAX_CLIENTS ? Number(process.env.DB_MAX_CLIENTS) : 10,
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? Number(process.env.DB_IDLE_TIMEOUT) : 30000,
  connectionTimeoutMillis: process.env.DB_CONN_TIMEOUT ? Number(process.env.DB_CONN_TIMEOUT) : 20000,
  // Supabase / Heroku style services requieren SSL; rechazamos la verificación
  // si el certificado no es verificable en el entorno local. Para producción,
  // configura rejectUnauthorized=true y un CA válido.
  ssl: {
    rejectUnauthorized: false,
  },
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

    // Semilla mínima para conceptos de cargo si está vacío
    const conceptosExist = await client.query('SELECT COUNT(*) AS count FROM conceptos_cargo').catch(() => ({ rows:[{count:'-1'}] }));
    if (conceptosExist.rows && Number(conceptosExist.rows[0].count) === 0) {
      console.log('🌱 Sembrando conceptos_cargo por defecto...');
      await client.query(`
        INSERT INTO conceptos_cargo (id_concepto, codigo, nombre, es_recurrente)
        VALUES 
          (1, 'AGUA', 'Agua', TRUE),
          (2, 'LUZ', 'Luz', TRUE),
          (3, 'GAS', 'Gas', TRUE),
          (4, 'MANTTO', 'Mantenimiento', TRUE)
        ON CONFLICT (codigo) DO NOTHING;
      `);
      await client.query(`
        SELECT setval(pg_get_serial_sequence('conceptos_cargo','id_concepto'), 
                      (SELECT MAX(id_concepto) FROM conceptos_cargo))
      `);
      console.log('✅ Conceptos de cargo creados');
    }
    
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