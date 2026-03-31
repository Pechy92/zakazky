-- Databázové schéma pro aplikaci Zakázky

-- Uživatelé a autentizace
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zákazníci
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ic VARCHAR(20),
  dic VARCHAR(20),
  street VARCHAR(255),
  house_number VARCHAR(50),
  city VARCHAR(255),
  postal_code VARCHAR(20),
  email VARCHAR(255),
  contact_person_first_name VARCHAR(255),
  contact_person_last_name VARCHAR(255),
  contact_person_phone VARCHAR(50),
  contact_person_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER REFERENCES users(id)
);

-- Stavy zakázek
CREATE TABLE order_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zakázky
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  status_id INTEGER REFERENCES order_statuses(id),
  assigned_to_user_id INTEGER REFERENCES users(id),
  total_price DECIMAL(12, 2),
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hlavní kategorie
CREATE TABLE main_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Podkategorie  
CREATE TABLE subcategories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kombinace kategorií (automaticky přidávané texty do "Nabídka zahrnuje")
CREATE TABLE category_combinations (
  id SERIAL PRIMARY KEY,
  main_category_code VARCHAR(100) NOT NULL,
  subcategory_code VARCHAR(100) NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Textace (přednastavené texty)
CREATE TABLE text_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nabídky
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL, -- Pořadové číslo nabídky v rámci zakázky
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE NOT NULL, -- Datum platnosti (issue_date + 14 dní)
  travel_costs_enabled BOOLEAN DEFAULT FALSE,
  travel_costs_km_quantity DECIMAL(10, 2),
  travel_costs_km_price DECIMAL(10, 2),
  travel_costs_hours_quantity DECIMAL(10, 2),
  travel_costs_hours_price DECIMAL(10, 2),
  assembly_enabled BOOLEAN DEFAULT FALSE,
  assembly_quantity DECIMAL(10, 2),
  assembly_price DECIMAL(10, 2),
  selected_weak_current_items TEXT[], -- Array kategorie ID pro slaboproud
  custom_text_content TEXT, -- Vlastní upravený text pro tuto nabídku (může editovat textace)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER REFERENCES users(id),
  UNIQUE(order_id, sequence_number)
);

-- Položky nabídky
CREATE TABLE offer_items (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  order_index INTEGER NOT NULL, -- Pořadí položek v nabídce
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vybrané kombinace kategorií pro nabídku
CREATE TABLE offer_category_selections (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  main_category_code VARCHAR(100) NOT NULL,
  subcategory_code VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vybrané textace pro nabídku
CREATE TABLE offer_text_selections (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  text_template_id INTEGER REFERENCES text_templates(id),
  custom_html_content TEXT, -- Může být upraveno uživatelem
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDF soubory nabídek
CREATE TABLE offer_pdfs (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexy pro lepší výkon  
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status_id);
CREATE INDEX idx_orders_assigned_user ON orders(assigned_to_user_id);
CREATE INDEX idx_offers_order ON offers(order_id);
CREATE INDEX idx_offer_items_offer ON offer_items(offer_id);
CREATE INDEX idx_offer_pdfs_offer ON offer_pdfs(offer_id);
CREATE INDEX idx_customers_ic ON customers(ic);

-- Triggery pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_combinations_updated_at BEFORE UPDATE ON category_combinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_templates_updated_at BEFORE UPDATE ON text_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Počáteční data - Stavy zakázek
INSERT INTO order_statuses (name, order_index) VALUES
  ('Nabídka', 1),
  ('Rozpracované', 2),
  ('Hotovo', 3),
  ('Čeká se/oprava/úprava', 4),
  ('Odevzdáno', 5),
  ('K fakturaci', 6),
  ('Nezaplaceno', 7),
  ('Přednostně', 8),
  ('Zrušeno', 9);

-- Počáteční data - Hlavní kategorie
INSERT INTO main_categories (code, name) VALUES
  ('DPS', 'Dokumentace pro provedení stavby'),
  ('DSP (499/2006 Sb.)', 'Dokumentace pro stavební povolení'),
  ('DSP (131/2024 Sb.)', 'Dokumentace pro stavební povolení');

-- Počáteční data - Podkategorie
INSERT INTO subcategories (code, name) VALUES
  ('RD', 'Rodinný dům'),
  ('MIKROZDROJ', 'Mikrozdroj'),
  ('FVE do 100 kWp', 'FVE do 100 kWp'),
  ('FVE nad 100 kWp', 'FVE nad 100 kWp'),
  ('HROMOSVOD', 'Hromosvod'),
  ('OBČANSKÁ VÝSTAVBA', 'Občanská výstavba'),
  ('OBČANSKÁ VÝSTAVBA VČ. FVE', 'Občanská výstavba vč. FVE'),
  ('RODINNÝ DŮM', 'Rodinný dům'),
  ('RODINNÝ DŮM VČ. FVE', 'Rodinný dům vč. FVE'),
  ('VEŘEJNÉ OSVĚTLENÍ', 'Veřejné osvětlení'),
  ('SKS', 'SKS'),
  ('EPS', 'EPS'),
  ('EVS', 'EVS'),
  ('CCTV', 'CCTV'),
  ('SNV', 'SNV'),
  ('Inteligentní budova', 'Inteligentní budova'),
  ('AV technika', 'AV technika');

-- Příklad kombinace kategorií
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES
  ('DPS', 'RD', '<p>Projekt elektroinstalace rodinného domu včetně výpočtů a projektové dokumentace pro provedení stavby.</p>'),
  ('DPS', 'FVE do 100 kWp', '<p>Projekt fotovoltaické elektrárny do 100 kWp včetně posouzení připojení a výpočtů.</p>'),
  ('DPS', 'OBČANSKÁ VÝSTAVBA', '<p>Projekt silnoproudých rozvodů pro občanskou výstavbu - DPS.</p>');

-- Příklad textace
INSERT INTO text_templates (name, html_content) VALUES
  ('Standardní platební podmínky', '<p>Cena platí při objednání do 14 dnů od data vystavení nabídky.</p><p>Platební podmínky: 50% záloha při objednání, 50% po dokončení prací.</p>'),
  ('Dodací lhůta', '<p>Dodací lhůta: 6 týdnů od objednání a předání kompletních podkladů.</p>'),
  ('Nezahrnuje DSS', '<p>Cenová nabídka nezahrnuje dokumentaci skutečného provedení stavby (DSS).</p>');
