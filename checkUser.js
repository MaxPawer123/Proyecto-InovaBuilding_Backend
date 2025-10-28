const { query } = require('./config/database_real');

async function checkUser() {
  try {
    const result = await query(
      'SELECT id, email, email_verified_at, email_verification_token FROM users WHERE email = $1', 
      ['maxpower444@gmail.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('📧 Usuario encontrado:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Verificado:', user.email_verified_at ? 'SÍ' : 'NO');
      console.log('  Token de verificación:', user.email_verification_token ? 'EXISTE' : 'NO EXISTE');
      
      if (user.email_verification_token) {
        console.log('  Token:', user.email_verification_token.substring(0, 16) + '...');
      }
    } else {
      console.log('❌ Usuario no encontrado con email: maxpower444@gmail.com');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser();