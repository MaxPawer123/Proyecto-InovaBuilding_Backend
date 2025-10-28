const { query } = require('./config/database_real');

async function insertEdificio() {
  try {
    const result = await query(
      `INSERT INTO edificios (nombre, ubicacion, nro_pisos, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING *`,
      ['Torre Aura', 'Centro de la ciudad', 10]
    );
    console.log('✅ Edificio creado exitosamente:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertEdificio();
