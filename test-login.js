const http = require('http');

const data = JSON.stringify({
  email: 'admin@example.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 5000
};

console.log('🔄 Testuji přihlášení...');

const req = http.request(options, (res) => {
  console.log(`✅ Odpověď: ${res.statusCode}`);
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📦 Data:', responseData);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('❌ Chyba:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('⏱️  Timeout!');
  req.destroy();
  process.exit(1);
});

req.write(data);
req.end();
