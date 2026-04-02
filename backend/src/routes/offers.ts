import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

const getStatusIdByName = async (client: any, name: string) => {
  const result = await client.query(
    `SELECT id
     FROM order_statuses
     WHERE lower(name) = lower($1)
     ORDER BY id ASC
     LIMIT 1`,
    [name]
  );
  return result.rows[0]?.id as number | undefined;
};

const setOrderStatusToOfferPhaseIfNeeded = async (client: any, orderId: number) => {
  const [newOrderStatusId, offerStatusId] = await Promise.all([
    getStatusIdByName(client, 'Nová zakázka'),
    getStatusIdByName(client, 'Nabídka'),
  ]);

  if (!offerStatusId) return;

  if (newOrderStatusId) {
    await client.query(
      `UPDATE orders
       SET status_id = $1
       WHERE id = $2 AND status_id = $3`,
      [offerStatusId, orderId, newOrderStatusId]
    );
    return;
  }

  await client.query(
    `UPDATE orders
     SET status_id = $1
     WHERE id = $2`,
    [offerStatusId, orderId]
  );
};

const setOrderStatusBackToNewIfNoOffers = async (client: any, orderId: number) => {
  const countResult = await client.query(
    'SELECT COUNT(*)::int AS count FROM offers WHERE order_id = $1',
    [orderId]
  );

  if ((countResult.rows[0]?.count || 0) > 0) return;

  const [newOrderStatusId, offerStatusId] = await Promise.all([
    getStatusIdByName(client, 'Nová zakázka'),
    getStatusIdByName(client, 'Nabídka'),
  ]);

  if (!newOrderStatusId || !offerStatusId) return;

  await client.query(
    `UPDATE orders
     SET status_id = $1
     WHERE id = $2 AND status_id = $3`,
    [newOrderStatusId, orderId, offerStatusId]
  );
};

// Helper pro mapování snake_case na camelCase
const mapOfferToResponse = (offer: any) => ({
  id: offer.id,
  orderId: offer.order_id,
  sequenceNumber: offer.sequence_number,
  name: offer.name,
  mainCategoryCode: offer.main_category_code,
  subcategoryCode: offer.subcategory_code,
  issueDate: offer.issue_date,
  validityDate: offer.validity_date,
  travelCostsEnabled: offer.travel_costs_enabled,
  travelCostsKmQuantity: offer.travel_costs_km_quantity,
  travelCostsKmPrice: offer.travel_costs_km_price,
  travelCostsHoursQuantity: offer.travel_costs_hours_quantity,
  travelCostsHoursPrice: offer.travel_costs_hours_price,
  assemblyEnabled: offer.assembly_enabled,
  assemblyQuantity: offer.assembly_quantity,
  assemblyPrice: offer.assembly_price,
  weakCurrentEnabled: offer.weak_current_enabled,
  selectedWeakCurrentItems: offer.selected_weak_current_items,
  note: offer.note,
  textTemplateId: offer.text_template_id,
  customTextContent: offer.custom_text_content,
  totalPrice: offer.total_price != null ? Number(offer.total_price) : undefined,
  createdByUserId: offer.created_by_user_id,
  createdAt: offer.created_at,
  updatedAt: offer.updated_at,
});

const mapOfferItemToResponse = (item: any) => ({
  id: item.id,
  offerId: item.offer_id,
  name: item.name,
  description: item.description,
  quantity: item.quantity,
  unitPrice: item.unit_price,
  totalPrice: item.total_price,
  orderIndex: item.order_index,
});

// Získat nabídky zakázky
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      `SELECT
         o.*,
         (
           COALESCE((SELECT SUM(oi.total_price) FROM offer_items oi WHERE oi.offer_id = o.id), 0)
           + CASE
               WHEN o.travel_costs_enabled THEN
                 COALESCE(o.travel_costs_km_quantity, 0) * COALESCE(o.travel_costs_km_price, 0)
                 + COALESCE(o.travel_costs_hours_quantity, 0) * COALESCE(o.travel_costs_hours_price, 0)
               ELSE 0
             END
           + CASE
               WHEN o.assembly_enabled THEN
                 COALESCE(o.assembly_quantity, 0) * COALESCE(o.assembly_price, 0)
               ELSE 0
             END
         ) AS total_price
       FROM offers o
       WHERE o.order_id = $1
       ORDER BY o.sequence_number`,
      [orderId]
    );
    
    const offers = result.rows.map(mapOfferToResponse);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Chyba při načítání nabídek' });
  }
});

// Získat nabídku podle ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM offers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nabídka nenalezena' });
    }
    
    res.json(mapOfferToResponse(result.rows[0]));
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Chyba při načítání nabídky' });
  }
});

// Vytvořit nabídku
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { orderId, items, issueDate, validityDate, ...offerData } = req.body;
    const userId = (req as any).user.id;
    
    // Získat poslední sequence_number pro danou zakázku
    const seqResult = await client.query(
      'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM offers WHERE order_id = $1',
      [orderId]
    );
    const sequenceNumber = seqResult.rows[0].next_seq;
    
    // Vytvořit nabídku
    const offerResult = await client.query(
      `INSERT INTO offers (order_id, sequence_number, name, main_category_code, subcategory_code,
        issue_date, validity_date, created_by_user_id, 
        travel_costs_enabled, travel_costs_km_quantity, travel_costs_km_price, travel_costs_hours_quantity, 
        travel_costs_hours_price, assembly_enabled, assembly_quantity, assembly_price,
        weak_current_enabled, selected_weak_current_items, note, text_template_id, custom_text_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [orderId, sequenceNumber, offerData.name, offerData.mainCategoryCode, offerData.subcategoryCode,
       issueDate || new Date().toISOString().split('T')[0], validityDate, userId, 
       offerData.travelCostsEnabled || false, offerData.travelCostsKmQuantity || 0, offerData.travelCostsKmPrice || 0,
       offerData.travelCostsHoursQuantity || 0, offerData.travelCostsHoursPrice || 0,
       offerData.assemblyEnabled || false, offerData.assemblyQuantity || 0, offerData.assemblyPrice || 0,
       offerData.weakCurrentEnabled || false, offerData.selectedWeakCurrentItems || [],
       offerData.note, offerData.textTemplateId, offerData.customTextContent]
    );
    
    const offer = offerResult.rows[0];
    
    // Přidat položky
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `INSERT INTO offer_items (offer_id, name, description, quantity, unit_price, total_price, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [offer.id, item.name, item.description, item.quantity, item.unitPrice, item.totalPrice, item.orderIndex || i]
        );
      }
    }

    // Jakmile vznikne nabídka, zakázka přejde z "Nová zakázka" do "Nabídka"
    await setOrderStatusToOfferPhaseIfNeeded(client, Number(orderId));
    
    await client.query('COMMIT');
    res.status(201).json(mapOfferToResponse(offer));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Chyba při vytváření nabídky' });
  } finally {
    client.release();
  }
});

// Získat položky nabídky
router.get('/:id/items', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM offer_items WHERE offer_id = $1 ORDER BY order_index',
      [id]
    );
    
    const items = result.rows.map(mapOfferItemToResponse);
    res.json(items);
  } catch (error) {
    console.error('Error fetching offer items:', error);
    res.status(500).json({ error: 'Chyba při načítání položek nabídky' });
  }
});

// Aktualizovat nabídku
router.put('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { items, issueDate, validityDate, ...offerData } = req.body;
    
    // Aktualizovat nabídku
    const offerResult = await client.query(
      `UPDATE offers 
       SET name = $1, main_category_code = $2, subcategory_code = $3,
           issue_date = $4, validity_date = $5, travel_costs_enabled = $6, 
           travel_costs_km_quantity = $7, travel_costs_km_price = $8, 
           travel_costs_hours_quantity = $9, travel_costs_hours_price = $10,
           assembly_enabled = $11, assembly_quantity = $12, assembly_price = $13,
           weak_current_enabled = $14, selected_weak_current_items = $15,
           note = $16, text_template_id = $17, custom_text_content = $18,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [offerData.name, offerData.mainCategoryCode, offerData.subcategoryCode,
       issueDate, validityDate, offerData.travelCostsEnabled || false, 
       offerData.travelCostsKmQuantity || 0, offerData.travelCostsKmPrice || 0,
       offerData.travelCostsHoursQuantity || 0, offerData.travelCostsHoursPrice || 0,
       offerData.assemblyEnabled || false, offerData.assemblyQuantity || 0, 
       offerData.assemblyPrice || 0, offerData.weakCurrentEnabled || false,
       offerData.selectedWeakCurrentItems || [], offerData.note,
       offerData.textTemplateId, offerData.customTextContent, id]
    );
    
    if (offerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nabídka nenalezena' });
    }
    
    // Smazat staré položky a přidat nové
    await client.query('DELETE FROM offer_items WHERE offer_id = $1', [id]);
    
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `INSERT INTO offer_items (offer_id, name, description, quantity, unit_price, total_price, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, item.name, item.description, item.quantity, item.unitPrice, item.totalPrice, item.orderIndex || i]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json(mapOfferToResponse(offerResult.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Chyba při aktualizaci nabídky' });
  } finally {
    client.release();
  }
});

// Smazat nabídku
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Smazat položky
    await client.query('DELETE FROM offer_items WHERE offer_id = $1', [id]);
    
    // Smazat nabídku
    const result = await client.query('DELETE FROM offers WHERE id = $1 RETURNING id, order_id', [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nabídka nenalezena' });
    }

    // Pokud byla smazána poslední nabídka, vrátit status zpět na "Nová zakázka"
    const deletedOrderId = Number(result.rows[0].order_id);
    await setOrderStatusBackToNewIfNoOffers(client, deletedOrderId);
    
    await client.query('COMMIT');
    res.json({ message: 'Nabídka smazána' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting offer:', error);
    res.status(500).json({ error: 'Chyba při mazání nabídky' });
  } finally {
    client.release();
  }
});

export default router;
