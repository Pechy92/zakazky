-- Aktualizace číselníků z CSV

-- Vygenerováno ze souboru: r_ciselniky.csv


-- Přidání description sloupce (pokud neexistuje)
ALTER TABLE main_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE weak_current_items ADD COLUMN IF NOT EXISTS description TEXT;

-- Hlavní kategorie (code = hodnota1, name = hodnota1, description = hodnota2)
DELETE FROM main_categories;
INSERT INTO main_categories (code, name, description) VALUES ('DPS', 'DPS', 'Dokumentace pro provedení stavby');
INSERT INTO main_categories (code, name, description) VALUES ('DSP (499/2006 Sb.)', 'DSP (499/2006 Sb.)', 'Dokumentace pro stavební povolení');
INSERT INTO main_categories (code, name, description) VALUES ('DSP (131/2024 Sb.)', 'DSP (131/2024 Sb.)', 'Dokumentace pro stavební povolení');
INSERT INTO main_categories (code, name, description) VALUES ('RD', 'RD', 'Realizační dokumentace společných prostor bytového domu');
INSERT INTO main_categories (code, name, description) VALUES ('MIKROZDROJ', 'MIKROZDROJ', 'Mikrozdroj FVE');

-- Podkategorie (code = hodnota1, name = hodnota1, description = hodnota2)
DELETE FROM subcategories;
INSERT INTO subcategories (code, name, description) VALUES ('FVE do 100 kWp', 'FVE do 100 kWp', 'FVE do 100 kWp');
INSERT INTO subcategories (code, name, description) VALUES ('FVE nad 100 kWp', 'FVE nad 100 kWp', 'FVE nad 100 kWp');
INSERT INTO subcategories (code, name, description) VALUES ('HROMOSVOD', 'HROMOSVOD', 'HROMOSVOD');
INSERT INTO subcategories (code, name, description) VALUES ('OBČANSKÁ VÝSTAVBA', 'OBČANSKÁ VÝSTAVBA', 'OBČANSKÁ VÝSTAVBA');
INSERT INTO subcategories (code, name, description) VALUES ('OBČANSKÁ VÝSTAVBA VČ. FVE', 'OBČANSKÁ VÝSTAVBA VČ. FVE', 'OBČANSKÁ VÝSTAVBA VČ. FVE');
INSERT INTO subcategories (code, name, description) VALUES ('RODINNÝ DŮM', 'RODINNÝ DŮM', 'RODINNÝ DŮM');
INSERT INTO subcategories (code, name, description) VALUES ('RODINNÝ DŮM VČ. FVE', 'RODINNÝ DŮM VČ. FVE', 'RODINNÝ DŮM VČ. FVE');
INSERT INTO subcategories (code, name, description) VALUES ('VEŘEJNÉ OSVĚTLENÍ', 'VEŘEJNÉ OSVĚTLENÍ', 'VEŘEJNÉ OSVĚTLENÍ');

-- Slaboproud (code = hodnota1, name = hodnota1, description = hodnota2)
DELETE FROM weak_current_items;
INSERT INTO weak_current_items (code, name, description) VALUES ('SKS', 'SKS', 'SKS');
INSERT INTO weak_current_items (code, name, description) VALUES ('EPS', 'EPS', 'EPS');
INSERT INTO weak_current_items (code, name, description) VALUES ('EVS', 'EVS', 'EVS');
INSERT INTO weak_current_items (code, name, description) VALUES ('CCTV', 'CCTV', 'CCTV');
INSERT INTO weak_current_items (code, name, description) VALUES ('SNV', 'SNV', 'SNV');
INSERT INTO weak_current_items (code, name, description) VALUES ('Inteligentní budova', 'Inteligentní budova', 'Inteligentní budova');
INSERT INTO weak_current_items (code, name, description) VALUES ('AV technika', 'AV technika', 'AV technika');

-- Textace
DELETE FROM text_templates;
INSERT INTO text_templates (name, html_content) VALUES ('textace_3', 'Cibule česnek prdel nabíječka');
INSERT INTO text_templates (name, html_content) VALUES ('Textace 2', 'Splatnost faktury je jeden měsíc od papírového odevzdání projektové dokumentace

Termín dodání projektové dokumentace je dle dohody
Cenová nabídka nezahrnuje dokumentaci skutečného provedení stavby');
INSERT INTO text_templates (name, html_content) VALUES ('Textace 1', 'ahoj,asdasd asd');

-- Stavy zakázek
DELETE FROM order_statuses;
INSERT INTO order_statuses (name, order_index) VALUES ('Nabídka', 10);
INSERT INTO order_statuses (name, order_index) VALUES ('Rozpracované', 11);
INSERT INTO order_statuses (name, order_index) VALUES ('Hotovo', 12);
INSERT INTO order_statuses (name, order_index) VALUES ('Čeká se/oprava/úprava', 13);
INSERT INTO order_statuses (name, order_index) VALUES ('Odevzdáno', 14);
INSERT INTO order_statuses (name, order_index) VALUES ('K fakturaci', 15);
INSERT INTO order_statuses (name, order_index) VALUES ('Nezaplaceno', 16);
INSERT INTO order_statuses (name, order_index) VALUES ('Přednostně', 17);
INSERT INTO order_statuses (name, order_index) VALUES ('Zrušeno', 18);

-- Kombinace kategorie + podkategorie
DELETE FROM category_combinations;
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('xxx', 'yyy', '<p>Chci prováděčku na rodináč podruhé.</p>');
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('AAA', 'YYY', '<p>asdadsasdasd</p>');
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('1', '11', '<p>Kombinace DPS a Občanský výstavba 2</p><p>xxxxxxxaxc</p><p>SDAASD</p>');
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('1', '11', 'Kombinace DPS a OBČANSKÁ VÝSTAVBA 1');