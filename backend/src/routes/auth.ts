import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { z } from 'zod';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  fullName: z.string().min(2).max(100),
  role: z.enum(['admin', 'manager', 'user']),
});

const ensureUserActivationColumn = async () => {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
};

// Přihlášení
router.post('/login', async (req, res) => {
  console.log('🔐 Login request obdržen');
  try {
    await ensureUserActivationColumn();

    console.log('📝 Validuji vstup...');
    const { email, password } = loginSchema.parse(req.body);
    console.log(`📧 Email: ${email}`);

    console.log('🔍 Hledám uživatele v databázi...');
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = $1',
      [email]
    );
    console.log(`✅ Dotaz dokončen, nalezeno ${result.rows.length} záznamů`);

    if (result.rows.length === 0) {
      console.log('❌ Uživatel nenalezen');
      return res.status(401).json({ error: 'Neplatné přihlašovací údaje' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      console.log('❌ Účet je deaktivovaný');
      return res.status(403).json({ error: 'Tento uživatelský účet je deaktivovaný' });
    }

    console.log('🔒 Ověřuji heslo...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log(`🔑 Heslo platné: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('❌ Neplatné heslo');
      return res.status(401).json({ error: 'Neplatné přihlašovací údaje' });
    }

    console.log('🎫 Generuji JWT token...');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    console.log('✅ Token vygenerován');

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
    console.log('✅ Login úspěšný');
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(400).json({ error: 'Chyba při přihlášení' });
  }
});

// Registrace (pouze pro adminy/manažery)
router.post('/register', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { email, password, fullName, role } = registerSchema.parse(req.body);

    // Hash hesla
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email, passwordHash, fullName, role]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Uživatel s tímto emailem již existuje' });
    }
    if (error?.issues) {
      return res.status(400).json({ error: 'Neplatná data pro registraci' });
    }
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Chyba při registraci' });
  }
});

export default router;
