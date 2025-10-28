const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function main(){
  try {
    const loginRes = await fetch('http://localhost:8000/api/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email: 'admin@edificio.com', password: 'Admin123!' }) });
    const login = await loginRes.json();
    if (!loginRes.ok) return console.error('Login failed', login);
    const token = login.data.token;
    console.log('Token:', token.slice(0,20)+'...');

    const createRes = await fetch('http://localhost:8000/api/comunicacion/anuncios', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ titulo: 'Prueba desde script', contenido: 'Creado por script de test', fijado: false }) });
    const create = await createRes.json();
    console.log('Create anuncio:', createRes.status, create);

    const listRes = await fetch('http://localhost:8000/api/comunicacion/anuncios', { headers: { Authorization: `Bearer ${token}` } });
    const list = await listRes.json();
    console.log('List anuncios count:', Array.isArray(list.data)?list.data.length:list);
  } catch (err) {
    console.error('Error testing API', err);
  }
}

main();
