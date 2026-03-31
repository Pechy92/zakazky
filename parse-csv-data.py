import csv
import html
import re

def clean_html(text):
    """Odstraní HTML tagy a dekóduje HTML entity"""
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def escape_sql(text):
    """Escapuje SQL string"""
    if not text:
        return ""
    return text.replace("'", "''")

# Načteme CSV
csv_path = "/Users/martin/Desktop/Práce/Radek/webApp/puvodniPoweApp/r_ciselniky.csv"

main_categories = {}
subcategories = {}
weak_current = {}
text_templates = {}
order_statuses = {}
combinations = []

with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, quotechar='"')
    for row in reader:
        title = row.get('Title', '').strip('"').strip()
        hodnota1 = row.get('hodnota1', '').strip('"').strip()
        hodnota2 = row.get('hodnota2', '').strip('"').strip()
        richText = row.get('richTextHodnota', '').strip('"').strip()
        
        # Hlavní kategorie
        if title == 'hlavniKategorie' and hodnota1 and hodnota1 not in ['TEST_2', 'TEST 3']:
            main_categories[hodnota1] = hodnota2 if hodnota2 else hodnota1
        
        # Podkategorie
        elif title == 'podkategorie' and hodnota1 and hodnota1 not in ['TEST_1']:
            subcategories[hodnota1] = hodnota2 if hodnota2 else hodnota1
        
        # Slaboproud
        elif title == 'slaboproud' and hodnota1:
            weak_current[hodnota1] = hodnota2 if hodnota2 else hodnota1
        
        # Textace
        elif title == 'textace' and hodnota1:
            text_templates[hodnota1] = clean_html(richText) if richText else ''
        
        # Stavy
        elif title == 'stav' and hodnota1:
            order_statuses[hodnota1] = hodnota2 if hodnota2 else hodnota1
        
        # Kombinace (jen pokud má richText)
        elif title.startswith('kombinace') and richText and hodnota1 and hodnota2:
            combinations.append({
                'main': hodnota1,
                'sub': hodnota2,
                'content': richText
            })

# Generujeme SQL
sql_lines = []
sql_lines.append("-- Aktualizace číselníků z CSV\n")
sql_lines.append("-- Vygenerováno ze souboru: r_ciselniky.csv\n\n")

# Přidáme description sloupec pokud neexistuje
sql_lines.append("-- Přidání description sloupce (pokud neexistuje)")
sql_lines.append("ALTER TABLE main_categories ADD COLUMN IF NOT EXISTS description TEXT;")
sql_lines.append("ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS description TEXT;")
sql_lines.append("ALTER TABLE weak_current_items ADD COLUMN IF NOT EXISTS description TEXT;\n")

# Hlavní kategorie
sql_lines.append("-- Hlavní kategorie (code = hodnota1, name = hodnota1, description = hodnota2)")
sql_lines.append("DELETE FROM main_categories;")
for code, description in main_categories.items():
    name = code  # hodnota1 se používá jako code i name
    sql_lines.append(
        f"INSERT INTO main_categories (code, name, description) "
        f"VALUES ('{escape_sql(code)}', '{escape_sql(name)}', '{escape_sql(description)}');"
    )

# Podkategorie
sql_lines.append("\n-- Podkategorie (code = hodnota1, name = hodnota1, description = hodnota2)")
sql_lines.append("DELETE FROM subcategories;")
for code, description in subcategories.items():
    name = code
    sql_lines.append(
        f"INSERT INTO subcategories (code, name, description) "
        f"VALUES ('{escape_sql(code)}', '{escape_sql(name)}', '{escape_sql(description)}');"
    )

# Slaboproud
sql_lines.append("\n-- Slaboproud (code = hodnota1, name = hodnota1, description = hodnota2)")
sql_lines.append("DELETE FROM weak_current_items;")
for code, description in weak_current.items():
    name = code
    sql_lines.append(
        f"INSERT INTO weak_current_items (code, name, description) "
        f"VALUES ('{escape_sql(code)}', '{escape_sql(name)}', '{escape_sql(description)}');"
    )

# Textace
sql_lines.append("\n-- Textace")
sql_lines.append("DELETE FROM text_templates;")
for name, content in text_templates.items():
    sql_lines.append(
        f"INSERT INTO text_templates (name, html_content) "
        f"VALUES ('{escape_sql(name)}', '{escape_sql(content)}');"
    )

# Stavy
sql_lines.append("\n-- Stavy zakázek")
sql_lines.append("DELETE FROM order_statuses;")
idx = 10
for name, description in order_statuses.items():
    sql_lines.append(
        f"INSERT INTO order_statuses (name, order_index) "
        f"VALUES ('{escape_sql(name)}', {idx});"
    )
    idx += 1

# Kombinace
if combinations:
    sql_lines.append("\n-- Kombinace kategorie + podkategorie")
    sql_lines.append("DELETE FROM category_combinations;")
    for combo in combinations:
        sql_lines.append(
            f"INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) "
            f"VALUES ('{escape_sql(combo['main'])}', '{escape_sql(combo['sub'])}', '{escape_sql(combo['content'])}');"
        )

# Uložíme SQL
output_path = "/Users/martin/Desktop/Práce/Radek/webApp/Zakázky/csv-data.sql"
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"✅ SQL soubor vygenerován: {output_path}")
print(f"\nShrnutí:")
print(f"  - Hlavní kategorie: {len(main_categories)}")
print(f"  - Podkategorie: {len(subcategories)}")
print(f"  - Slaboproud: {len(weak_current)}")
print(f"  - Textace: {len(text_templates)}")
print(f"  - Stavy: {len(order_statuses)}")
print(f"  - Kombinace: {len(combinations)}")
