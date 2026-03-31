// Script pro vytvoření výchozích uživatelů s bcrypt hashy
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createDefaultUsers() {
  try {
    // Hash pro všechna výchozí hesla: admin123, manager123, user123
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    // Vložit výchozí uživatele
    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role) 
      VALUES 
        ('admin@example.com', $1, 'Admin Uživatel', 'admin'),
        ('manager@example.com', $2, 'Manager Uživatel', 'manager'),
        ('user@example.com', $3, 'Běžný Uživatel', 'user')
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash, managerHash, userHash]);

    console.log('✅ Výchozí uživatelé byli úspěšně vytvořeni!');
    console.log('');
    console.log('📧 Přihlašovací údaje:');
    console.log('   Admin:    admin@example.com / admin123');
    console.log('   Manager:  manager@example.com / manager123');
    console.log('   User:     user@example.com / user123');
    console.log('');
    console.log('⚠️  DŮLEŽITÉ: Změňte hesla po prvním přihlášení!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Chyba při vytváření uživatelů:', error);
    await pool.end();
    process.exit(1);
  }
}

createDefaultUsers();
