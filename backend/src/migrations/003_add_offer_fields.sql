-- Přidání sloupců do tabulky offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS main_category_code VARCHAR(100);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS subcategory_code VARCHAR(100);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS weak_current_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS text_template_id INTEGER REFERENCES text_templates(id);

-- Přidání foreign key pro kategorie
ALTER TABLE offers ADD CONSTRAINT offers_main_category_fkey 
  FOREIGN KEY (main_category_code) REFERENCES main_categories(code) ON DELETE SET NULL;

ALTER TABLE offers ADD CONSTRAINT offers_subcategory_fkey 
  FOREIGN KEY (subcategory_code) REFERENCES subcategories(code) ON DELETE SET NULL;
