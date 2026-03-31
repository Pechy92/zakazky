import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Helper pro mapování snake_case na camelCase
const mapCustomerToResponse = (customer: any) => ({
  id: customer.id,
  name: customer.name,
  ic: customer.ic,
  dic: customer.dic,
  street: customer.street,
  houseNumber: customer.house_number,
  city: customer.city,
  postalCode: customer.postal_code,
  email: customer.email,
  contactPersonFirstName: customer.contact_person_first_name,
  contactPersonLastName: customer.contact_person_last_name,
  contactPersonPhone: customer.contact_person_phone,
  contactPersonEmail: customer.contact_person_email,
  createdByUserId: customer.created_by_user_id,
  createdAt: customer.created_at,
  updatedAt: customer.updated_at,
});

// Získat všechny zákazníky
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers ORDER BY created_at DESC'
    );
    
    const customers = result.rows.map(mapCustomerToResponse);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Chyba při načítání zákazníků' });
  }
});

// Získat zákazníka podle ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zákazník nenalezen' });
    }
    
    res.json(mapCustomerToResponse(result.rows[0]));
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Chyba při načítání zákazníka' });
  }
});

// Vytvořit zákazníka
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name, ic, dic, street, houseNumber, city, postalCode, email,
      contactPersonFirstName, contactPersonLastName, contactPersonPhone, contactPersonEmail
    } = req.body;

    const result = await pool.query(
      `INSERT INTO customers 
      (name, ic, dic, street, house_number, city, postal_code, email, 
       contact_person_first_name, contact_person_last_name, contact_person_phone, contact_person_email, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [name, ic, dic, street, houseNumber, city, postalCode, email,
       contactPersonFirstName, contactPersonLastName, contactPersonPhone, contactPersonEmail, (req as any).user.id]
    );

    res.status(201).json(mapCustomerToResponse(result.rows[0]));
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Chyba při vytváření zákazníka' });
  }
});

// Aktualizovat zákazníka
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, ic, dic, street, houseNumber, city, postalCode, email,
      contactPersonFirstName, contactPersonLastName, contactPersonPhone, contactPersonEmail
    } = req.body;

    const result = await pool.query(
      `UPDATE customers 
      SET name = $1, ic = $2, dic = $3, street = $4, house_number = $5, city = $6, 
          postal_code = $7, email = $8, contact_person_first_name = $9, 
          contact_person_last_name = $10, contact_person_phone = $11, contact_person_email = $12
      WHERE id = $13
      RETURNING *`,
      [name, ic, dic, street, houseNumber, city, postalCode, email,
       contactPersonFirstName, contactPersonLastName, contactPersonPhone, contactPersonEmail, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zákazník nenalezen' });
    }

    res.json(mapCustomerToResponse(result.rows[0]));
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Chyba při aktualizaci zákazníka' });
  }
});

// Smazat zákazníka
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zákazník nenalezen' });
    }
    
    res.json({ message: 'Zákazník smazán' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Chyba při mazání zákazníka' });
  }
});

export default router;
