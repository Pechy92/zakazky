import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'user']),
});

const activationSchema = z.object({
  isActive: z.boolean(),
});

const ensureUserActivationColumn = async () => {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
};

const mapUser = (user: any) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  isActive: user.is_active,
  createdAt: user.created_at,
});

// Získat všechny uživatele (pouze admin/manager)
router.get('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    await ensureUserActivationColumn();

    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    const users = result.rows.map(mapUser);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Chyba při načítání uživatelů' });
  }
});

// Vytvořit uživatele (pouze admin)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    await ensureUserActivationColumn();

    const payload = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [payload.email, passwordHash, payload.fullName, payload.role]
    );

    res.status(201).json(mapUser(result.rows[0]));
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(400).json({ error: 'Uživatel s tímto emailem již existuje' });
    }

    if (error?.issues) {
      return res.status(400).json({ error: 'Neplatná data pro vytvoření uživatele' });
    }

    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Chyba při vytváření uživatele' });
  }
});

// Aktivace/deaktivace uživatele (pouze admin)
router.patch('/:id/activation', authenticateToken, authorizeRoles('admin', 'manager'), async (req: AuthRequest, res) => {
  try {
    await ensureUserActivationColumn();

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Neplatné ID uživatele' });
    }

    const { isActive } = activationSchema.parse(req.body);

    if (req.user?.id === userId && !isActive) {
      return res.status(400).json({ error: 'Nemůžete deaktivovat svůj vlastní účet' });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, full_name, role, is_active, created_at`,
      [isActive, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Uživatel nebyl nalezen' });
    }

    res.json(mapUser(result.rows[0]));
  } catch (error: any) {
    if (error?.issues) {
      return res.status(400).json({ error: 'Neplatná data pro změnu aktivace' });
    }

    console.error('Error updating user activation:', error);
    res.status(500).json({ error: 'Chyba při změně aktivace uživatele' });
  }
});

export default router;
