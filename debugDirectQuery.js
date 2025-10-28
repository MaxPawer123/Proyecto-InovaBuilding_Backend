require('dotenv').config();
const db = require('./config/database_real');

(async () => {
  try {
    console.log('DB pool config sample:', {
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT
    });

    const email = 'admin@edificio.com';
    const sql = `SELECT u.id, u.name, u.email, u.password, u.rol, u.email_verified_at FROM users u JOIN personas p ON u.id_persona = p.id_persona WHERE u.email = $1`;
    const res = await db.query(sql, [email]);
    console.log('Query rows length:', res.rows.length);
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Error en consulta directa:', err);
  } finally {
    process.exit(0);
  }
})();