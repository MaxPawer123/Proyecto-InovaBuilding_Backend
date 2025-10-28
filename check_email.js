const { query } = require('./config/database_real');

async function checkEmail() {
  try {
    const email = 'gmamaniv@fcpn.edu.bo';
    
    console.log('🔍 Buscando email:', email);
    
    // Buscar en tabla users
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('📊 Resultados en tabla USERS:', userResult.rows.length);
    if (userResult.rows.length > 0) {
      console.table(userResult.rows);
    }
    
    // Buscar en tabla personas
    const personaResult = await query('SELECT * FROM personas WHERE email = $1', [email]);
    console.log('📊 Resultados en tabla PERSONAS:', personaResult.rows.length);
    if (personaResult.rows.length > 0) {
      console.table(personaResult.rows);
    }
    
    if (userResult.rows.length === 0 && personaResult.rows.length === 0) {
      console.log('✅ EMAIL DISPONIBLE - No existe en ninguna tabla');
    } else {
      console.log('❌ EMAIL YA REGISTRADO');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkEmail();