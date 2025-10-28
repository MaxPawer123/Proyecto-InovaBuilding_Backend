const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Edificio',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

(async function(){
  try{
    const email = 'admin@edificio.com';
    const res = await pool.query("SELECT id, name, email, password, rol, estado, email_verified_at FROM users WHERE email=$1", [email]);
    if (res.rows.length === 0) {
      console.log('No se encontró el usuario', email);
      return;
    }
    const user = res.rows[0];
    console.log('Usuario encontrado:', {
      id: user.id,
      name: user.name,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
      email_verified_at: user.email_verified_at
    });

    const plain = 'Admin123!';
    const match = await bcrypt.compare(plain, user.password);
    console.log('¿La contraseña coincide con Admin123!?', match);
    if (!match) {
      console.log('Hash almacenado:', user.password);
    }
  }catch(err){
    console.error('Error comprobando usuario:', err);
  }finally{
    await pool.end();
  }
})();