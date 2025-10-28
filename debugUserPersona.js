require('dotenv').config();
const db = require('./config/database_real');

(async () => {
  try {
    const email = 'admin@edificio.com';
    console.log('Consultando tabla users (sin JOIN) para', email);
    const u = await db.query('SELECT id, name, email, id_persona, password, rol FROM users WHERE email=$1', [email]);
    console.log('users rows:', u.rows.length);
    console.log(u.rows);

    console.log('\nConsultando personas por correo:');
    const p = await db.query('SELECT * FROM personas WHERE correo=$1', [email]);
    console.log('personas rows:', p.rows.length);
    console.log(p.rows);

    if (u.rows.length > 0 && u.rows[0].id_persona) {
      console.log('\nConsultando persona por id_persona', u.rows[0].id_persona);
      const p2 = await db.query('SELECT * FROM personas WHERE id_persona=$1', [u.rows[0].id_persona]);
      console.log('personas by id rows:', p2.rows.length);
      console.log(p2.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})();