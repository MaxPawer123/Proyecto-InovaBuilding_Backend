const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Edificio',
  password: 'admin',
  port: 5432,
});

async function checkStructure() {
  const client = await pool.connect();
  try {
    // Verificar tecnicos_externos
    console.log('🔍 Verificando tabla tecnicos_externos:\n');
    const tecResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'tecnicos_externos'
      ORDER BY ordinal_position
    `);
    
    if (tecResult.rows.length > 0) {
      console.log('Columnas:');
      tecResult.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    } else {
      console.log('❌ La tabla no existe');
    }

    // Verificar empleados
    console.log('\n🔍 Verificando tabla empleados:\n');
    const empResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'empleados'
      ORDER BY ordinal_position
    `);
    
    if (empResult.rows.length > 0) {
      console.log('Columnas:');
      empResult.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    } else {
      console.log('❌ La tabla no existe');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStructure();
