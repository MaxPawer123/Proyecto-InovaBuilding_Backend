const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'edificio',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function checkTables() {
    try {
        console.log('📋 Revisando estructura de tablas...\n');

        // Revisar tabla users
        const usersColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);

        console.log('🔧 Tabla USERS:');
        usersColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });

        // Revisar tabla personas
        const personasColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'personas' 
            ORDER BY ordinal_position
        `);

        console.log('\n👥 Tabla PERSONAS:');
        personasColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });

        // Mostrar datos existentes
        const existingUsers = await pool.query('SELECT id, name, email, rol FROM users');
        console.log('\n📊 Usuarios existentes:');
        console.table(existingUsers.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();