import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

dotenv.config();

const app = express();
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

// Rate limiting pro všechny API endpointy
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // max 100 požadavků za 15 minut
  message: 'Příliš mnoho požadavků z této IP adresy, zkuste to prosím později.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting speciálně pro login (přísnější)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5, // max 5 pokusů o přihlášení
  message: 'Příliš mnoho pokusů o přihlášení, zkuste to prosím za 15 minut.',
  skipSuccessfulRequests: true,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging pro debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Statické soubory (veřejné assety - MIMO PDF)
// PDF soubory jsou dostupné pouze přes autentizovaný endpoint /api/pdfs/file/:filename

// Rate limiting pro všechna API volání
app.use('/api/', apiLimiter);

// Přísnější rate limiting pro login (musí být před obecnými auth routes)
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/ares', aresRoutes);

// Export login limiter pro použití v auth routes
export { loginLimiter };

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Něco se pokazilo!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server běží na portu ${PORT}`);
});

export default app;
