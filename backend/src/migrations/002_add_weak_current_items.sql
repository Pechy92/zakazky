-- Tabulka pro slaboproudové položky
CREATE TABLE IF NOT EXISTS weak_current_items (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vložení základních dat pro slaboproud
INSERT INTO weak_current_items (code, name) VALUES
  ('alarm', 'Alarm'),
  ('camera', 'Kamerový systém'),
  ('access', 'Přístupový systém'),
  ('intercom', 'Interkom'),
  ('network', 'Strukturovaná kabeláž')
ON CONFLICT (code) DO NOTHING;
