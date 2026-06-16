import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import orderRoutes from './routes/orders';
import offerRoutes from './routes/offers';
import categoryRoutes from './routes/categories';
import statusRoutes from './routes/statuses';
import pdfRoutes from './routes/pdfs';
import aresRoutes from './routes/ares';
import pool from './config/database';
import { apiLimiter, loginLimiter } from './middleware/rateLimit';
import { DEFAULT_ORDER_STATUSES } from './services/statusWorkflow';

dotenv.config();

const app = express();
// Railway (a jine reverse proxy) posilaji X-Forwarded-For - nutne pro spravne fungovani rate limiteru
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3001;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Security Middleware - pouze základní helmet bez CSP
app.use(helmet({
  contentSecurityPolicy: false, // Vypnout CSP pro API server
}));

// CORS - omezit v produkci na konkrétní origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging pro debugging
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`
    );
  });
  next();
});

// Statické soubory (veřejné assety - MIMO PDF)
// PDF soubory jsou dostupné pouze přes autentizovaný endpoint /api/pdfs/file/:filename

// Login má vlastní ochranu. Obecný limiter login ani CORS preflight nezapočítává.
app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/ares', aresRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Něco se pokazilo!' });
});

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server běží na portu ${PORT}`);
  // Startup migrace — spustit jednou při startu, ne na každý request
  try {
    const statusValues = DEFAULT_ORDER_STATUSES.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
    const statusParams = DEFAULT_ORDER_STATUSES.flatMap((status) => [status.name, status.orderIndex]);
    await pool.query(
      `INSERT INTO order_statuses (name, order_index)
       SELECT v.name, v.order_index
       FROM (VALUES ${statusValues}) AS v(name, order_index)
       WHERE NOT EXISTS (
         SELECT 1
         FROM order_statuses os
         WHERE LOWER(os.name) = LOWER(v.name)
       )`,
      statusParams
    );
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
    await pool.query('ALTER TABLE offers ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES order_statuses(id)');
    await pool.query(
      `UPDATE offers
       SET status_id = (
         SELECT id
         FROM order_statuses
         WHERE lower(name) = lower($1)
         ORDER BY id ASC
         LIMIT 1
       )
       WHERE status_id IS NULL`,
      ['Nabídka']
    );
    await pool.query(
      `CREATE TABLE IF NOT EXISTS weak_current_items (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_included BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await pool.query('ALTER TABLE weak_current_items ADD COLUMN IF NOT EXISTS description TEXT');
    await pool.query('ALTER TABLE weak_current_items ADD COLUMN IF NOT EXISTS is_included BOOLEAN NOT NULL DEFAULT TRUE');
    await pool.query('UPDATE weak_current_items SET is_included = TRUE WHERE is_included IS NULL');
    console.log('✅ DB migrace OK');
  } catch (err) {
    console.error('⚠️ DB migrace selhala:', err);
  }
});

let isShuttingDown = false;

const gracefulShutdown = (signal: 'SIGTERM' | 'SIGINT') => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`⚠️ Přijat ${signal}, ukončuji server...`);

  const forceExitTimeout = setTimeout(() => {
    console.error('⛔ Graceful shutdown timeout, ukončuji proces natvrdo');
    process.exit(1);
  }, 10000);

  forceExitTimeout.unref();

  server.close(async (closeError) => {
    if (closeError) {
      console.error('⛔ Chyba při zavírání HTTP serveru:', closeError);
      process.exit(1);
      return;
    }

    try {
      await pool.end();
      console.log('✅ HTTP server i DB pool korektně ukončeny');
      process.exit(0);
    } catch (dbError) {
      console.error('⛔ Chyba při zavírání DB poolu:', dbError);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
