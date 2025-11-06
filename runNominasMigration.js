const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Crear pool de conexión
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Edificio',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Ejecutando migración de tablas de nóminas...\n');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'create_nominas_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Migración completada con éxito!');
    console.log('📋 Tablas creadas:');
    console.log('   - nominas');
    console.log('   - nomina_detalles');
    console.log('\n🔍 Verificando tablas...\n');
    
    // Verificar que las tablas se crearon
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('nominas', 'nomina_detalles')
      ORDER BY table_name
    `);
    
    console.log('✅ Tablas encontradas en la base de datos:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Verificar estructura de nominas
    const nominasColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nominas'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estructura de tabla nominas:');
    nominasColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : ''}`);
    });
    
    console.log('\n🎉 Todo listo! Ahora puedes crear nóminas y se guardarán en la BD.');
    
  } catch (error) {
    console.error('❌ Error ejecutando la migración:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

runMigration();
