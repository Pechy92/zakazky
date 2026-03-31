const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://martin@localhost:5432/zakazky'
});

async function testDatabase() {
  try {
    console.log('📊 Testuji databázi...\n');
    
    // Test zakázek
    const ordersResult = await pool.query(`
      SELECT 
        o.id, o.name, o.status,
        u1.full_name as assigned_to_name,
        u2.full_name as created_by_name,
        o.created_at, o.updated_at
      FROM orders o
      LEFT JOIN users u1 ON o.assigned_to_user_id = u1.id
      LEFT JOIN users u2 ON o.created_by_user_id = u2.id
      LIMIT 3
    `);
    
    console.log(`✅ Zakázky: ${ordersResult.rows.length} záznamů`);
    if (ordersResult.rows.length > 0) {
      console.log('\n📋 První zakázka:');
      const order = ordersResult.rows[0];
      console.log('  ID:', order.id);
      console.log('  Název:', order.name);
      console.log('  Status:', order.status);
      console.log('  Založil:', order.created_by_name || '(nevyplněno)');
      console.log('  Zpracovává:', order.assigned_to_name || '(nevyplněno)');
      console.log('  Vytvořeno:', order.created_at);
      console.log('  Poslední změna:', order.updated_at || '(nevyplněno)');
    }
    
    // Test kategorií
    const categoriesResult = await pool.query('SELECT * FROM main_categories');
    console.log(`\n✅ Hlavní kategorie: ${categoriesResult.rows.length} záznamů`);
    
    // Test slaboproudu
    const weakResult = await pool.query('SELECT * FROM weak_current_items');
    console.log(`✅ Slaboproud: ${weakResult.rows.length} záznamů`);
    if (weakResult.rows.length > 0) {
      console.log('  Položky:', weakResult.rows.map(r => r.name).join(', '));
    }
    
    // Test nabídek
    const offersResult = await pool.query(`
      SELECT 
        id, name, main_category_code, subcategory_code, 
        weak_current_enabled, note, text_template_id
      FROM offers 
      LIMIT 1
    `);
    console.log(`\n✅ Nabídky: ${offersResult.rows.length} záznamů`);
    if (offersResult.rows.length > 0) {
      console.log('  První nabídka ID:', offersResult.rows[0].id);
      console.log('  Název:', offersResult.rows[0].name || '(starý formát)');
      console.log('  Hlavní kategorie:', offersResult.rows[0].main_category_code || '(nevyplněna)');
    }
    
    await pool.end();
    console.log('\n✅ Všechny databázové testy OK!');
    
  } catch (error) {
    console.error('❌ Chyba:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testDatabase();
