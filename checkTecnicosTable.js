const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Edificio',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function checkTable() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando estructura de tabla tecnicos_externos...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tecnicos_externos'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ La tabla tecnicos_externos NO existe');
    } else {
      console.log('✅ Columnas de tecnicos_externos:');
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : ''}`);
      });
    }
    
    // También verificar empleados
    console.log('\n🔍 Verificando estructura de tabla empleados...\n');
    
    const empResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'empleados'
      ORDER BY ordinal_position
    `);
    
    if (empResult.rows.length === 0) {
      console.log('❌ La tabla empleados NO existe');
    } else {
      console.log('✅ Columnas de empleados:');
      empResult.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
