const http = require('http');

// Nejdřív se přihlásím a získám token
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
    
    // Teď testuji zakázky
    console.log('📦 Testuji zakázky (orders)...');
    const ordersOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/orders',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const ordersReq = http.request(ordersOptions, (res) => {
      let ordersData = '';
      
      res.on('data', (chunk) => {
        ordersData += chunk;
      });
      
      res.on('end', () => {
        const orders = JSON.parse(ordersData);
        console.log(`\n✅ Načteno ${orders.length} zakázek`);
        
        if (orders.length > 0) {
          const order = orders[0];
          console.log('\n📋 První zakázka:');
          console.log('  ID:', order.id);
          console.log('  Název:', order.name);
          console.log('  Status:', order.status);
          console.log('  Založil:', order.createdByUserName || '❌ CHYBÍ');
          console.log('  Zpracovává:', order.assignedToName);
          console.log('  Vytvořeno:', order.createdAt || '❌ CHYBÍ');
          console.log('  Poslední změna:', order.updatedAt || '❌ CHYBÍ');
          
          // Test kategorií
          console.log('\n🏷️  Testuji kategorie...');
          const categoriesOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/categories/main',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          };
          
          const catReq = http.request(categoriesOptions, (res) => {
            let catData = '';
            
            res.on('data', (chunk) => {
              catData += chunk;
            });
            
            res.on('end', () => {
              const categories = JSON.parse(catData);
              console.log(`✅ Načteno ${categories.length} hlavních kategorií`);
              
              // Slaboproud
              console.log('\n⚡ Testuji slaboproud...');
              const weakOptions = {
                hostname: 'localhost',
                port: 3001,
                path: '/api/categories/weak-current',
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              };
              
              const weakReq = http.request(weakOptions, (res) => {
                let weakData = '';
                
                res.on('data', (chunk) => {
                  weakData += chunk;
                });
                
                res.on('end', () => {
                  const weak = JSON.parse(weakData);
                  console.log(`✅ Načteno ${weak.length} položek slaboproudu`);
                  if (weak.length > 0) {
                    console.log('  První položka:', weak[0].name);
                  }
                  
                  console.log('\n✅ Všechny testy backendu OK!');
                  process.exit(0);
                });
              });
              
              weakReq.on('error', (error) => {
                console.error('❌ Chyba slaboproudu:', error.message);
                process.exit(1);
              });
              
              weakReq.end();
            });
          });
          
          catReq.on('error', (error) => {
            console.error('❌ Chyba kategorií:', error.message);
            process.exit(1);
          });
          
          catReq.end();
        } else {
          console.log('\n⚠️  Žádné zakázky v databázi');
          process.exit(0);
        }
      });
    });
    
    ordersReq.on('error', (error) => {
      console.error('❌ Chyba zakázek:', error.message);
      process.exit(1);
    });
    
    ordersReq.end();
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Chyba:', error.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
