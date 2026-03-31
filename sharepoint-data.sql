-- Data z SharePoint r_ciselniky
-- Vygenerováno automaticky

-- Hlavní kategorie (main_categories)
INSERT INTO main_categories (code, name) VALUES ('DPS', 'Dokumentace pro provedení stavby') ON CONFLICT (code) DO NOTHING;
INSERT INTO main_categories (code, name) VALUES ('DSP (499/2006 Sb.)', 'Dokumentace pro stavební povolení') ON CONFLICT (code) DO NOTHING;
INSERT INTO main_categories (code, name) VALUES ('DSP (131/2024 Sb.)', 'Dokumentace pro stavební povolení') ON CONFLICT (code) DO NOTHING;
INSERT INTO main_categories (code, name) VALUES ('RD', 'Realizační dokumentace společných prostor bytového domu') ON CONFLICT (code) DO NOTHING;
INSERT INTO main_categories (code, name) VALUES ('MIKROZDROJ', 'Mikrozdroj FVE') ON CONFLICT (code) DO NOTHING;
INSERT INTO main_categories (code, name) VALUES ('TEST_2', 'TEST_2') ON CONFLICT (code) DO NOTHING;
INSERT INTO main_categories (code, name) VALUES ('TEST 3', 'test tři') ON CONFLICT (code) DO NOTHING;

-- Podkategorie (subcategories)
INSERT INTO subcategories (code, name) VALUES ('FVE do 100 kWp', 'FVE do 100 kWp') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('FVE nad 100 kWp', 'FVE nad 100 kWp') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('HROMOSVOD', 'HROMOSVOD') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('OBČANSKÁ VÝSTAVBA', 'OBČANSKÁ VÝSTAVBA') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('OBČANSKÁ VÝSTAVBA VČ. FVE', 'OBČANSKÁ VÝSTAVBA VČ. FVE') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('RODINNÝ DŮM', 'RODINNÝ DŮM') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('RODINNÝ DŮM VČ. FVE', 'RODINNÝ DŮM VČ. FVE') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('VEŘEJNÉ OSVĚTLENÍ', 'VEŘEJNÉ OSVĚTLENÍ') ON CONFLICT (code) DO NOTHING;
INSERT INTO subcategories (code, name) VALUES ('TEST_1', 'TEST_2') ON CONFLICT (code) DO NOTHING;

-- Slaboproud (weak_current_items)
INSERT INTO weak_current_items (code, name) VALUES ('SKS', 'SKS') ON CONFLICT (code) DO NOTHING;
INSERT INTO weak_current_items (code, name) VALUES ('EPS', 'EPS') ON CONFLICT (code) DO NOTHING;
INSERT INTO weak_current_items (code, name) VALUES ('EVS', 'EVS') ON CONFLICT (code) DO NOTHING;
INSERT INTO weak_current_items (code, name) VALUES ('CCTV', 'CCTV') ON CONFLICT (code) DO NOTHING;
INSERT INTO weak_current_items (code, name) VALUES ('SNV', 'SNV') ON CONFLICT (code) DO NOTHING;
INSERT INTO weak_current_items (code, name) VALUES ('Inteligentní budova', 'Inteligentní budova') ON CONFLICT (code) DO NOTHING;
INSERT INTO weak_current_items (code, name) VALUES ('AV technika', 'AV technika') ON CONFLICT (code) DO NOTHING;

-- Textace (text_templates)
DELETE FROM text_templates WHERE name = 'textace_3';
INSERT INTO text_templates (name, html_content) VALUES ('textace_3', 'Cibule česnek prdel nabíječka');
DELETE FROM text_templates WHERE name = 'Textace 2';
INSERT INTO text_templates (name, html_content) VALUES ('Textace 2', 'Splatnost faktury je jeden měsíc od papírového odevzdání projektové dokumentace

Termín dodání projektové dokumentace je dle dohody
Cenová nabídka nezahrnuje dokumentaci skutečného provedení stavby');
DELETE FROM text_templates WHERE name = 'Textace 1';
INSERT INTO text_templates (name, html_content) VALUES ('Textace 1', 'ahoj,asdasd asd');

-- Stavy zakázek (order_statuses)
INSERT INTO order_statuses (name, order_index) VALUES ('Nabídka', 10) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Rozpracované', 11) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Hotovo', 12) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Čeká se/oprava/úprava', 13) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Odevzdáno', 14) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('K fakturaci', 15) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Nezaplaceno', 16) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Přednostně', 17) ON CONFLICT (name) DO NOTHING;
INSERT INTO order_statuses (name, order_index) VALUES ('Zrušeno', 18) ON CONFLICT (name) DO NOTHING;

-- Kombinace kategorií (category_combinations)
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('xxx', 'yyy', 'Chci prováděčku na rodináč podruhé.') ON CONFLICT DO NOTHING;
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('stavebko po novu', 'RD', '') ON CONFLICT DO NOTHING;
INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) VALUES ('AAA', 'YYY', 'asdadsasdasd') ON CONFLICT DO NOTHING;

