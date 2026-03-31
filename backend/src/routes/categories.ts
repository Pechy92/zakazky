import express from 'express';
import pool from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Získat hlavní kategorie
router.get('/main', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM main_categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching main categories:', error);
    res.status(500).json({ error: 'Chyba při načítání hlavních kategorií' });
  }
});

// Přidat hlavní kategorii (admin)
router.post('/main', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code, name, description } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code je povinný' });
    }

    const result = await pool.query(
      'INSERT INTO main_categories (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code, name || code, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating main category:', error);
    res.status(500).json({ error: 'Chyba při vytváření hlavní kategorie' });
  }
});

// Upravit hlavní kategorii (admin)
router.put('/main/:code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE main_categories SET name = $1, description = $2 WHERE code = $3 RETURNING *',
      [name || code, description || null, code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hlavní kategorie nebyla nalezena' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating main category:', error);
    res.status(500).json({ error: 'Chyba při úpravě hlavní kategorie' });
  }
});

// Smazat hlavní kategorii (admin)
router.delete('/main/:code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query('DELETE FROM main_categories WHERE code = $1 RETURNING code', [code]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hlavní kategorie nebyla nalezena' });
    }

    res.json({ message: 'Hlavní kategorie smazána' });
  } catch (error) {
    console.error('Error deleting main category:', error);
    res.status(500).json({ error: 'Chyba při mazání hlavní kategorie' });
  }
});

// Získat podkategorie
router.get('/sub', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subcategories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Chyba při načítání podkategorií' });
  }
});

// Přidat podkategorii (admin)
router.post('/sub', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code, name, description } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code je povinný' });
    }

    const result = await pool.query(
      'INSERT INTO subcategories (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code, name || code, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Chyba při vytváření podkategorie' });
  }
});

// Upravit podkategorii (admin)
router.put('/sub/:code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE subcategories SET name = $1, description = $2 WHERE code = $3 RETURNING *',
      [name || code, description || null, code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Podkategorie nebyla nalezena' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Chyba při úpravě podkategorie' });
  }
});

// Smazat podkategorii (admin)
router.delete('/sub/:code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query('DELETE FROM subcategories WHERE code = $1 RETURNING code', [code]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Podkategorie nebyla nalezena' });
    }

    res.json({ message: 'Podkategorie smazána' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Chyba při mazání podkategorie' });
  }
});

// Získat kombinace
router.get('/combinations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM category_combinations ORDER BY id');
    const combinations = result.rows.map((row) => ({
      id: row.id,
      mainCategoryCode: row.main_category_code,
      subcategoryCode: row.subcategory_code,
      htmlContent: row.html_content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    res.json(combinations);
  } catch (error) {
    console.error('Error fetching combinations:', error);
    res.status(500).json({ error: 'Chyba při načítání kombinací' });
  }
});

// Přidat kombinaci (admin)
router.post('/combinations', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { mainCategoryCode, subcategoryCode, htmlContent } = req.body;
    if (!mainCategoryCode || !subcategoryCode) {
      return res.status(400).json({ error: 'mainCategoryCode a subcategoryCode jsou povinné' });
    }

    const result = await pool.query(
      `INSERT INTO category_combinations (main_category_code, subcategory_code, html_content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [mainCategoryCode, subcategoryCode, htmlContent || '']
    );

    res.status(201).json({
      id: result.rows[0].id,
      mainCategoryCode: result.rows[0].main_category_code,
      subcategoryCode: result.rows[0].subcategory_code,
      htmlContent: result.rows[0].html_content,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error creating combination:', error);
    res.status(500).json({ error: 'Chyba při vytváření kombinace' });
  }
});

// Upravit kombinaci (admin)
router.put('/combinations/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { mainCategoryCode, subcategoryCode, htmlContent } = req.body;

    const result = await pool.query(
      `UPDATE category_combinations
       SET main_category_code = $1,
           subcategory_code = $2,
           html_content = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [mainCategoryCode, subcategoryCode, htmlContent || '', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Kombinace nebyla nalezena' });
    }

    res.json({
      id: result.rows[0].id,
      mainCategoryCode: result.rows[0].main_category_code,
      subcategoryCode: result.rows[0].subcategory_code,
      htmlContent: result.rows[0].html_content,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error updating combination:', error);
    res.status(500).json({ error: 'Chyba při úpravě kombinace' });
  }
});

// Smazat kombinaci (admin)
router.delete('/combinations/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM category_combinations WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Kombinace nebyla nalezena' });
    }

    res.json({ message: 'Kombinace smazána' });
  } catch (error) {
    console.error('Error deleting combination:', error);
    res.status(500).json({ error: 'Chyba při mazání kombinace' });
  }
});

// Získat textace
router.get('/texts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM text_templates ORDER BY name');
    const templates = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      htmlContent: row.html_content,
      createdAt: row.created_at,
    }));
    res.json(templates);
  } catch (error) {
    console.error('Error fetching text templates:', error);
    res.status(500).json({ error: 'Chyba při načítání textací' });
  }
});

// Přidat textaci (admin)
router.post('/texts', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { name, htmlContent } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Název je povinný' });
    }

    const result = await pool.query(
      'INSERT INTO text_templates (name, html_content) VALUES ($1, $2) RETURNING *',
      [name, htmlContent || '']
    );
    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      htmlContent: result.rows[0].html_content,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error creating text template:', error);
    res.status(500).json({ error: 'Chyba při vytváření textace' });
  }
});

// Upravit textaci (admin)
router.put('/texts/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, htmlContent } = req.body;

    const result = await pool.query(
      'UPDATE text_templates SET name = $1, html_content = $2 WHERE id = $3 RETURNING *',
      [name, htmlContent || '', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Textace nebyla nalezena' });
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      htmlContent: result.rows[0].html_content,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error updating text template:', error);
    res.status(500).json({ error: 'Chyba při úpravě textace' });
  }
});

// Smazat textaci (admin)
router.delete('/texts/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM text_templates WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Textace nebyla nalezena' });
    }

    res.json({ message: 'Textace smazána' });
  } catch (error) {
    console.error('Error deleting text template:', error);
    res.status(500).json({ error: 'Chyba při mazání textace' });
  }
});

// Získat slaboproudové položky
router.get('/weak-current', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM weak_current_items ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching weak current items:', error);
    res.status(500).json({ error: 'Chyba při načítání slaboproudových položek' });
  }
});

// Přidat slaboproudovou položku (admin)
router.post('/weak-current', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code, name, description } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code je povinný' });
    }

    const result = await pool.query(
      'INSERT INTO weak_current_items (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code, name || code, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating weak current item:', error);
    res.status(500).json({ error: 'Chyba při vytváření slaboproudové položky' });
  }
});

// Upravit slaboproudovou položku (admin)
router.put('/weak-current/:code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE weak_current_items SET name = $1, description = $2 WHERE code = $3 RETURNING *',
      [name || code, description || null, code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Slaboproudová položka nebyla nalezena' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating weak current item:', error);
    res.status(500).json({ error: 'Chyba při úpravě slaboproudové položky' });
  }
});

// Smazat slaboproudovou položku (admin)
router.delete('/weak-current/:code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query('DELETE FROM weak_current_items WHERE code = $1 RETURNING code', [code]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Slaboproudová položka nebyla nalezena' });
    }

    res.json({ message: 'Slaboproudová položka smazána' });
  } catch (error) {
    console.error('Error deleting weak current item:', error);
    res.status(500).json({ error: 'Chyba při mazání slaboproudové položky' });
  }
});

export default router;
