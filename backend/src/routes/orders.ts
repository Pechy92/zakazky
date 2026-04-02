import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Helper function pro mapování snake_case na camelCase
const mapOrderToResponse = (order: any) => ({
  id: order.id,
  number: order.number,
  title: order.title,
  customerId: order.customer_id,
  customerName: order.customer_name,
  customerContactPhone: order.customer_contact_phone,
  customerContactEmail: order.customer_contact_email,
  statusId: order.status_id,
  statusName: order.status_name,
  assignedToUserId: order.assigned_to_user_id,
  assignedToName: order.assigned_to_name,
  createdByUserId: order.created_by_user_id,
  createdByUserName: order.created_by_user_name,
  totalPrice: order.total_price,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*, 
        c.name as customer_name, 
        c.contact_person_phone as customer_contact_phone,
        c.contact_person_email as customer_contact_email,
        s.name as status_name, 
        u.full_name as assigned_to_name,
        u2.full_name as created_by_user_name,
        COALESCE(
          (
            SELECT SUM(oi.total_price)
            FROM offers of
            LEFT JOIN offer_items oi ON of.id = oi.offer_id
            WHERE of.order_id = o.id
          ), 0
        ) + COALESCE(
          (
            SELECT SUM(
              COALESCE(of.travel_costs_km_quantity * of.travel_costs_km_price, 0) +
              COALESCE(of.travel_costs_hours_quantity * of.travel_costs_hours_price, 0) +
              COALESCE(of.assembly_quantity * of.assembly_price, 0)
            )
            FROM offers of
            WHERE of.order_id = o.id
          ), 0
        ) as total_price
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_statuses s ON o.status_id = s.id
      LEFT JOIN users u ON o.assigned_to_user_id = u.id
      LEFT JOIN users u2 ON o.created_by_user_id = u2.id
      ORDER BY o.created_at DESC
    `);
    
    const orders = result.rows.map(mapOrderToResponse);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Chyba při načítání zakázek' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        o.*, 
        c.name as customer_name, 
        c.contact_person_phone as customer_contact_phone,
        c.contact_person_email as customer_contact_email,
        s.name as status_name, 
        u.full_name as assigned_to_name,
        u2.full_name as created_by_user_name,
        COALESCE(
          (
            SELECT SUM(oi.total_price)
            FROM offers of
            LEFT JOIN offer_items oi ON of.id = oi.offer_id
            WHERE of.order_id = o.id
          ), 0
        ) + COALESCE(
          (
            SELECT SUM(
              COALESCE(of.travel_costs_km_quantity * of.travel_costs_km_price, 0) +
              COALESCE(of.travel_costs_hours_quantity * of.travel_costs_hours_price, 0) +
              COALESCE(of.assembly_quantity * of.assembly_price, 0)
            )
            FROM offers of
            WHERE of.order_id = o.id
          ), 0
        ) as total_price
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_statuses s ON o.status_id = s.id
      LEFT JOIN users u ON o.assigned_to_user_id = u.id
      LEFT JOIN users u2 ON o.created_by_user_id = u2.id
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zakázka nenalezena' });
    }
    
    res.json(mapOrderToResponse(result.rows[0]));
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Chyba při načítání zakázky' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, customerId, statusId, assignedToUserId } = req.body;
    const userId = (req as any).user.id;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Název zakázky je povinný' });
    }

    if (!customerId) {
      return res.status(400).json({ error: 'Zákazník je povinný' });
    }

    const customerExistsResult = await pool.query(
      'SELECT id FROM customers WHERE id = $1 LIMIT 1',
      [customerId]
    );

    if (customerExistsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Vybraný zákazník neexistuje. Obnovte stránku a vyberte zákazníka znovu.' });
    }

    // Výchozí stav zakázky: "Nová zakázka"
    // Pokud ve starších datech chybí, automaticky ji založíme.
    let resolvedStatusId = statusId;
    if (!resolvedStatusId) {
      const defaultStatusResult = await pool.query(
        `SELECT id FROM order_statuses
         WHERE lower(name) = lower($1)
         ORDER BY id ASC
         LIMIT 1`,
        ['Nová zakázka']
      );

      if (defaultStatusResult.rows.length > 0) {
        resolvedStatusId = defaultStatusResult.rows[0].id;
      } else {
        const createdStatusResult = await pool.query(
          `INSERT INTO order_statuses (name, order_index)
           VALUES ($1, $2)
           RETURNING id`,
          ['Nová zakázka', 0]
        );

        if (createdStatusResult.rows.length > 0) {
          resolvedStatusId = createdStatusResult.rows[0].id;
        } else {
          const retryStatusResult = await pool.query(
            `SELECT id FROM order_statuses
             WHERE lower(name) = lower($1)
             ORDER BY id ASC
             LIMIT 1`,
            ['Nová zakázka']
          );
          resolvedStatusId = retryStatusResult.rows[0]?.id;
        }

        if (!resolvedStatusId) {
          return res.status(500).json({ error: 'Nepodařilo se nastavit výchozí stav Nová zakázka' });
        }
      }
    }

    // Generování čísla zakázky podle vzorce rok_pořadové_číslo
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}_`;

    // Najít poslední zakázku v tomto roce
    const lastOrderResult = await pool.query(
      `SELECT number FROM orders 
       WHERE number LIKE $1 
       ORDER BY number DESC 
       LIMIT 1`,
      [`${yearPrefix}%`]
    );

    let sequenceNumber = 1;
    if (lastOrderResult.rows.length > 0) {
      const lastNumber = lastOrderResult.rows[0].number;
      const lastSequence = parseInt(lastNumber.split('_')[1], 10);
      sequenceNumber = lastSequence + 1;
    }

    // Formátovat číslo s nulami (např. 0001, 0002)
    const orderNumber = `${yearPrefix}${sequenceNumber.toString().padStart(4, '0')}`;

    const result = await pool.query(
      `INSERT INTO orders (number, title, customer_id, status_id, assigned_to_user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *, null as customer_name, null as status_name, null as assigned_to_name`,
      [orderNumber, title, customerId, resolvedStatusId, assignedToUserId, userId]
    );

    res.status(201).json(mapOrderToResponse(result.rows[0]));
  } catch (error: any) {
    console.error('Error creating order:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Zakázka s tímto číslem již existuje' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Neplatný odkaz na zákazníka/stav/uživatele. Obnovte stránku a zkuste to znovu.' });
    }
    res.status(500).json({ error: 'Chyba při vytváření zakázky' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, customerId, statusId, assignedToUserId } = req.body;

    const result = await pool.query(
      `UPDATE orders 
       SET title = $1, customer_id = $2, status_id = $3, assigned_to_user_id = $4
       WHERE id = $5 
       RETURNING *`,
      [title, customerId, statusId, assignedToUserId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zakázka nenalezena' });
    }

    // Načtení detailů s joiny a vypočítanou cenou
    const detailResult = await pool.query(
      `SELECT 
        o.*, 
        c.name as customer_name, 
        c.contact_person_phone as customer_contact_phone,
        c.contact_person_email as customer_contact_email,
        s.name as status_name, 
        u.full_name as assigned_to_name,
        COALESCE(
          (
            SELECT SUM(oi.total_price)
            FROM offers of
            LEFT JOIN offer_items oi ON of.id = oi.offer_id
            WHERE of.order_id = o.id
          ), 0
        ) + COALESCE(
          (
            SELECT SUM(
              COALESCE(of.travel_costs_km_quantity * of.travel_costs_km_price, 0) +
              COALESCE(of.travel_costs_hours_quantity * of.travel_costs_hours_price, 0) +
              COALESCE(of.assembly_quantity * of.assembly_price, 0)
            )
            FROM offers of
            WHERE of.order_id = o.id
          ), 0
        ) as total_price
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN order_statuses s ON o.status_id = s.id
       LEFT JOIN users u ON o.assigned_to_user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    res.json(mapOrderToResponse(detailResult.rows[0]));
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Chyba při aktualizaci zakázky' });
  }
});

router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ message: 'Zakázka smazána' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Chyba při mazání zakázky' });
  }
});

// Dashboard statistiky
router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    const yearParam = req.query.year as string | undefined;
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const result = await pool.query(`
      SELECT 
        os.name as status,
        COUNT(o.id) as count,
        COALESCE(
          SUM(
            COALESCE(
              (
                SELECT SUM(oi.total_price)
                FROM offers of
                LEFT JOIN offer_items oi ON oi.offer_id = of.id
                WHERE of.order_id = o.id
              ), 0
            )
            +
            COALESCE(
              (
                SELECT SUM(
                  COALESCE(of.travel_costs_km_quantity * of.travel_costs_km_price, 0) +
                  COALESCE(of.travel_costs_hours_quantity * of.travel_costs_hours_price, 0) +
                  COALESCE(of.assembly_quantity * of.assembly_price, 0)
                )
                FROM offers of
                WHERE of.order_id = o.id
              ), 0
            )
          ),
          0
        ) as total_value
      FROM order_statuses os
      LEFT JOIN orders o ON o.status_id = os.id
        AND ($1::int IS NULL OR EXTRACT(YEAR FROM o.created_at)::int = $1)
      GROUP BY os.id, os.name, os.order_index
      ORDER BY os.order_index
    `, [year]);
    
    // Mapovat na camelCase
    const stats = result.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      totalValue: parseFloat(row.total_value) || 0,
    }));
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Chyba při načítání statistik' });
  }
});

export default router;
