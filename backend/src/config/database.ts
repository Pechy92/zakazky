import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔌 Inicializuji databázový pool...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'nastaveno' : 'NENÍ NASTAVENO');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000, // 5 sekund timeout pro dotazy
});

pool.on('connect', () => {
  console.log('✅ Nové databázové připojení vytvořeno');
});

pool.on('error', (err) => {
  // Logovat chybu, ale NEKRASHOVAT process - pool se sam zotavi
  console.error('⚠️ Chyba v databazovem klientovi (pool zustava aktivni):', err.message);
});

console.log('✅ Pool inicializován');

export default pool;
