const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Edificio',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log('🔄 Actualizando esquema de nóminas...\n');
    
    const sqlFile = path.join(__dirname, 'update_nominas_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Esquema actualizado exitosamente!\n');
    
    // Verificar columnas de nominas
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nominas'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de tabla nominas:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : ''}`);
    });
    
    console.log('\n✅ Todo listo para usar el sistema de nóminas!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
