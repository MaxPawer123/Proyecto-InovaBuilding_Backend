const { query } = require('./config/database_real');
const fs = require('fs');
const path = require('path');

async function createTicketsTables() {
  try {
    console.log('🚀 Creando tablas del sistema de tickets...');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'create_tickets_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Ejecutar el SQL
    await query(sql);
    
    console.log('✅ Tablas de tickets creadas exitosamente');
    
    // Verificar que se crearon las tablas
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tickets', 'ticket_categorias', 'ticket_adjuntos', 'tecnicos_externos')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tablas creadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verificar categorías insertadas
    const categoriasResult = await query('SELECT * FROM ticket_categorias ORDER BY id_categoria');
    console.log('\n🏷️  Categorías disponibles:');
    categoriasResult.rows.forEach(cat => {
      console.log(`  ${cat.id_categoria}. ${cat.nombre} - ${cat.descripcion}`);
    });
    
    console.log('\n✨ Sistema de tickets listo para usar!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    process.exit(1);
  }
}

createTicketsTables();
