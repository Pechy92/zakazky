#!/usr/bin/env python3
import re
import sys
from html import unescape

# Path to the SharePoint XML file
xml_file = "/Users/martin/Desktop/Práce/Radek/webApp/puvodniPoweApp/sharepointListy/r_ciselniky_data.md"

# Read the XML file
with open(xml_file, 'r', encoding='utf-8') as f:
    xml_content = f.read()

# Parse entries
entries = re.findall(r'<entry[^>]*>(.*?)</entry>', xml_content, re.DOTALL)

# Categorize by Title
categories = {
    'hlavniKategorie': [],
    'podkategorie': [],
    'slaboproud': [],
    'textace': [],
    'stav': [],
    'kombinace': [],
    'defaultniPolozka': []
}

for entry in entries:
    # Extract Title
    title_match = re.search(r'<d:Title>([^<]*)</d:Title>', entry)
    if not title_match:
        continue
    title = title_match.group(1)
    
    # Extract values
    hodnota1_match = re.search(r'<d:hodnota1>([^<]*)</d:hodnota1>', entry)
    hodnota2_match = re.search(r'<d:hodnota2>([^<]*)</d:hodnota2>', entry)
    richText_match = re.search(r'<d:richTextHodnota>([^<]*(?:<[^/][^>]*>[^<]*</[^>]+>[^<]*)*)</d:richTextHodnota>', entry)
    hodnota3_match = re.search(r'<d:hodnota3>([^<]*)</d:hodnota3>', entry)
    hodnota4_match = re.search(r'<d:hodnota4>([^<]*)</d:hodnota4>', entry)
    
    hodnota1 = unescape(hodnota1_match.group(1)) if hodnota1_match else ''
    hodnota2 = unescape(hodnota2_match.group(1)) if hodnota2_match else ''
    richText = unescape(richText_match.group(1)) if richText_match else ''
    hodnota3 = unescape(hodnota3_match.group(1)) if hodnota3_match else ''
    hodnota4 = unescape(hodnota4_match.group(1)) if hodnota4_match else ''
    
    # Clean HTML tags from richText
    richText = re.sub(r'<[^>]+>', '', richText)
    richText = richText.strip()
    
    if title in categories:
        categories[title].append({
            'hodnota1': hodnota1,
            'hodnota2': hodnota2,
            'richText': richText,
            'hodnota3': hodnota3,
            'hodnota4': hodnota4
        })

# Generate SQL
sql_statements = []
sql_statements.append("-- Data z SharePoint r_ciselniky\n")
sql_statements.append("-- Vygenerováno automaticky\n\n")

# Main Categories (hlavní kategorie)
if categories['hlavniKategorie']:
    sql_statements.append("-- Hlavní kategorie (main_categories)\n")
    for item in categories['hlavniKategorie']:
        if item['hodnota1']:  # code
            code = item['hodnota1'].replace("'", "''")
            name = item['hodnota2'].replace("'", "''") if item['hodnota2'] else code
            sql_statements.append(
                f"INSERT INTO main_categories (code, name) VALUES ('{code}', '{name}') ON CONFLICT (code) DO NOTHING;\n"
            )
    sql_statements.append("\n")

# Subcategories (podkategorie)
if categories['podkategorie']:
    sql_statements.append("-- Podkategorie (subcategories)\n")
    for item in categories['podkategorie']:
        if item['hodnota1']:  # code
            code = item['hodnota1'].replace("'", "''")
            name = item['hodnota2'].replace("'", "''") if item['hodnota2'] else code
            sql_statements.append(
                f"INSERT INTO subcategories (code, name) VALUES ('{code}', '{name}') ON CONFLICT (code) DO NOTHING;\n"
            )
    sql_statements.append("\n")

# Weak current items (slaboproud)
if categories['slaboproud']:
    sql_statements.append("-- Slaboproud (weak_current_items)\n")
    for item in categories['slaboproud']:
        if item['hodnota1']:  # name
            name = item['hodnota1'].replace("'", "''")
            code = item['hodnota1'].replace("'", "''")
            sql_statements.append(
                f"INSERT INTO weak_current_items (code, name) VALUES ('{code}', '{name}') ON CONFLICT (code) DO NOTHING;\n"
            )
    sql_statements.append("\n")

# Text templates (textace)
if categories['textace']:
    sql_statements.append("-- Textace (text_templates)\n")
    for item in categories['textace']:
        if item['hodnota1']:  # name
            name = item['hodnota1'].replace("'", "''")
            html_content = item['richText'].replace("'", "''") if item['richText'] else ''
            if html_content:
                # Check if already exists
                sql_statements.append(
                    f"DELETE FROM text_templates WHERE name = '{name}';\n"
                )
                sql_statements.append(
                    f"INSERT INTO text_templates (name, html_content) VALUES ('{name}', '{html_content}');\n"
                )
    sql_statements.append("\n")

# Order statuses (stav)
if categories['stav']:
    sql_statements.append("-- Stavy zakázek (order_statuses)\n")
    for idx, item in enumerate(categories['stav'], start=10):
        if item['hodnota1']:  # name
            name = item['hodnota1'].replace("'", "''")
            # Check if status already exists by name
            sql_statements.append(
                f"INSERT INTO order_statuses (name, order_index) VALUES ('{name}', {idx}) ON CONFLICT (name) DO NOTHING;\n"
            )
    sql_statements.append("\n")

# Combinations (kombinace)
if categories['kombinace']:
    sql_statements.append("-- Kombinace kategorií (category_combinations)\n")
    for item in categories['kombinace']:
        if item['hodnota1'] and item['hodnota2']:  # main_category_code, subcategory_code
            main_code = item['hodnota1'].replace("'", "''")
            sub_code = item['hodnota2'].replace("'", "''")
            html_content = item['richText'].replace("'", "''") if item['richText'] else ''
            sql_statements.append(
                f"INSERT INTO category_combinations (main_category_code, subcategory_code, html_content) "
                f"VALUES ('{main_code}', '{sub_code}', '{html_content}') ON CONFLICT DO NOTHING;\n"
            )
    sql_statements.append("\n")

# Output SQL file
output_file = "/Users/martin/Desktop/Práce/Radek/webApp/Zakázky/sharepoint-data.sql"
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(sql_statements)

print(f"✅ SQL soubor vygenerován: {output_file}")
print(f"\nShrnutí:")
print(f"  - Hlavní kategorie: {len(categories['hlavniKategorie'])}")
print(f"  - Podkategorie: {len(categories['podkategorie'])}")
print(f"  - Slaboproud: {len(categories['slaboproud'])}")
print(f"  - Textace: {len(categories['textace'])}")
print(f"  - Stavy: {len(categories['stav'])}")
print(f"  - Kombinace: {len(categories['kombinace'])}")
