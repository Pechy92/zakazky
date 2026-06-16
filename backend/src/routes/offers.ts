import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  isCanceledStatus,
  isInvoicedStatus,
  isNewOrderStatus,
  isToInvoiceStatus,
  normalizeStatusName,
} from '../services/statusWorkflow';

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

const getDefaultOfferStatusId = async (client: any) => {
  return (await getStatusIdByName(client, 'Nabídka')) || getStatusIdByName(client, 'Nová zakázka');
};

const getPreferredStatusIdByNames = async (client: any, names: string[]) => {
  for (const name of names) {
    const statusId = await getStatusIdByName(client, name);
    if (statusId) return statusId;
  }
  return undefined;
};

const syncOrderStatusFromOffers = async (client: any, orderId: number) => {
  const offersResult = await client.query(
    `SELECT o.status_id, os.name AS status_name
     FROM offers o
     LEFT JOIN order_statuses os ON os.id = o.status_id
     WHERE o.order_id = $1`,
    [orderId]
  );

  const offerStatuses: string[] = offersResult.rows.map((row: any) => row.status_name).filter(Boolean);

  if (offerStatuses.length === 0) {
    const newStatusId = await getStatusIdByName(client, 'Nová zakázka');
    if (newStatusId) {
      await client.query('UPDATE orders SET status_id = $1 WHERE id = $2', [newStatusId, orderId]);
    }
    return;
  }

  let nextStatusId: number | undefined;
  const allSameStatus = offerStatuses.every(
    (statusName) => normalizeStatusName(statusName) === normalizeStatusName(offerStatuses[0])
  );

  if (offerStatuses.every(isInvoicedStatus)) {
    nextStatusId = await getPreferredStatusIdByNames(client, ['Dokončeno', 'Hotovo']);
  } else if (offerStatuses.some(isInvoicedStatus)) {
    nextStatusId = await getPreferredStatusIdByNames(client, [
      'Částečně vyfakturováno (DPZ/DPS)',
      'Částečně vyfakturováno',
    ]);
  } else if (offerStatuses.some(isToInvoiceStatus)) {
    nextStatusId = await getStatusIdByName(client, 'K fakturaci');
  } else if (offerStatuses.every(isNewOrderStatus)) {
    nextStatusId = await getStatusIdByName(client, 'Nová zakázka');
  } else if (offerStatuses.every(isCanceledStatus)) {
    nextStatusId = await getPreferredStatusIdByNames(client, ['Zrušeno', 'Zrušená']);
  } else if (allSameStatus) {
    nextStatusId = offersResult.rows[0]?.status_id;
  } else {
    nextStatusId = await getStatusIdByName(client, 'Nabídka');
  }

  if (!nextStatusId) return;

  await client.query(
    `UPDATE orders
     SET status_id = $1
     WHERE id = $2`,
    [nextStatusId, orderId]
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
  statusId: offer.status_id,
  statusName: offer.status_name,
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
         os.name AS status_name,
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
       LEFT JOIN order_statuses os ON os.id = o.status_id
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
    const result = await pool.query(
      `SELECT o.*, os.name AS status_name
       FROM offers o
       LEFT JOIN order_statuses os ON os.id = o.status_id
       WHERE o.id = $1`,
      [id]
    );
    
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
    const statusId = offerData.statusId || await getDefaultOfferStatusId(client);
    
    // Získat poslední sequence_number pro danou zakázku
    const seqResult = await client.query(
      'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM offers WHERE order_id = $1',
      [orderId]
    );
    const sequenceNumber = seqResult.rows[0].next_seq;
    
    // Vytvořit nabídku
    const offerResult = await client.query(
      `INSERT INTO offers (order_id, sequence_number, name, main_category_code, subcategory_code, status_id,
        issue_date, validity_date, created_by_user_id, 
        travel_costs_enabled, travel_costs_km_quantity, travel_costs_km_price, travel_costs_hours_quantity, 
        travel_costs_hours_price, assembly_enabled, assembly_quantity, assembly_price,
        weak_current_enabled, selected_weak_current_items, note, text_template_id, custom_text_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [orderId, sequenceNumber, offerData.name, offerData.mainCategoryCode, offerData.subcategoryCode,
       statusId, issueDate || new Date().toISOString().split('T')[0], validityDate, userId,
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

    await syncOrderStatusFromOffers(client, Number(orderId));
    
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
           status_id = $4, issue_date = $5, validity_date = $6, travel_costs_enabled = $7,
           travel_costs_km_quantity = $8, travel_costs_km_price = $9,
           travel_costs_hours_quantity = $10, travel_costs_hours_price = $11,
           assembly_enabled = $12, assembly_quantity = $13, assembly_price = $14,
           weak_current_enabled = $15, selected_weak_current_items = $16,
           note = $17, text_template_id = $18, custom_text_content = $19,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $20
       RETURNING *`,
      [offerData.name, offerData.mainCategoryCode, offerData.subcategoryCode,
       offerData.statusId || await getDefaultOfferStatusId(client), issueDate, validityDate, offerData.travelCostsEnabled || false,
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

    await syncOrderStatusFromOffers(client, Number(offerResult.rows[0].order_id));
    
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

    const deletedOrderId = Number(result.rows[0].order_id);
    await syncOrderStatusFromOffers(client, deletedOrderId);
    
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
