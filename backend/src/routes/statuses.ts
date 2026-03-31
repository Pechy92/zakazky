import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Získat všechny stavy
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM order_statuses ORDER BY order_index');
    
    // Namapovat snake_case na camelCase
    const statuses = result.rows.map(status => ({
      id: status.id,
      name: status.name,
      orderIndex: status.order_index,
    }));
    
    res.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Chyba při načítání stavů' });
  }
});

// Přidat stav (admin)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { name, orderIndex } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Název je povinný' });
    }

    const result = await pool.query(
      'INSERT INTO order_statuses (name, order_index) VALUES ($1, $2) RETURNING *',
      [name, orderIndex ?? 999]
    );

    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      orderIndex: result.rows[0].order_index,
    });
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ error: 'Chyba při vytváření stavu' });
  }
});

// Upravit stav (admin)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, orderIndex } = req.body;

    const result = await pool.query(
      'UPDATE order_statuses SET name = $1, order_index = $2 WHERE id = $3 RETURNING *',
      [name, orderIndex ?? 999, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stav nebyl nalezen' });
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      orderIndex: result.rows[0].order_index,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Chyba při úpravě stavu' });
  }
});

// Smazat stav (admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM order_statuses WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stav nebyl nalezen' });
    }

    res.json({ message: 'Stav smazán' });
  } catch (error) {
    console.error('Error deleting status:', error);
    res.status(500).json({ error: 'Chyba při mazání stavu' });
  }
});

export default router;
