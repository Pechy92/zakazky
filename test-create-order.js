const http = require('http');

// Přihlásit se
const loginData = JSON.stringify({
  email: 'admin@example.com',
  password: 'admin123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('🔐 Přihlašování...');

const loginReq = http.request(loginOptions, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    const data = JSON.parse(responseData);
    const token = data.token;
    console.log('✅ Přihlášení OK\n');
    
    // Vytvořit testovací zakázku
    console.log('📦 Vytvářím testovací zakázku...');
    const orderData = JSON.stringify({
      title: 'Test automaticke cislo',
      customerId: 1,
      statusId: 1,
      assignedToUserId: 1
    });
    
    const orderOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/orders',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': orderData.length
      }
    };
    
    const orderReq = http.request(orderOptions, (res) => {
      let orderResponseData = '';
      
      res.on('data', (chunk) => {
        orderResponseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201) {
          const order = JSON.parse(orderResponseData);
          console.log('✅ Zakázka vytvořena!');
          console.log('  ID:', order.id);
          console.log('  Číslo:', order.number);
          console.log('  Název:', order.title);
          console.log('\n🎉 Automatické generování čísla funguje!');
        } else {
          console.error('❌ Chyba při vytváření zakázky:', orderResponseData);
        }
        process.exit(0);
      });
    });
    
    orderReq.on('error', (error) => {
      console.error('❌ Chyba:', error.message);
      process.exit(1);
    });
    
    orderReq.write(orderData);
    orderReq.end();
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Chyba:', error.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
