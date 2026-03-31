#!/bin/bash

# Skript pro inicializaci databáze
# Použití: ./init-database.sh [DATABASE_URL]

if [ -z "$1" ]; then
    # Pokusit se načíst z .env souboru
    if [ -f "backend/.env" ]; then
        export $(cat backend/.env | grep DATABASE_URL | xargs)
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Chyba: DATABASE_URL není nastaven"
        echo ""
        echo "Použití:"
        echo "  ./init-database.sh postgresql://user:pass@host:port/db"
        echo ""
        echo "Nebo nastavte DATABASE_URL v backend/.env"
        exit 1
    fi
else
    DATABASE_URL=$1
fi

echo "=== Inicializace databáze ==="
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo ""

# Kontrola psql
if ! command -v psql &> /dev/null; then
    echo "❌ psql není nainstalován"
    echo ""
    echo "Instalace:"
    echo "  macOS:  brew install postgresql@15"
    echo "  Linux:  sudo apt-get install postgresql-client"
    exit 1
fi

# Spuštění SQL skriptu
echo "📊 Vytvářím tabulky..."
psql "$DATABASE_URL" < database-schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Databáze úspěšně inicializována!"
    echo ""
    echo "Výchozí přihlašovací údaje:"
    echo "  Admin:    admin@example.com / admin123"
    echo "  Manager:  manager@example.com / manager123"
    echo "  User:     user@example.com / user123"
    echo ""
    echo "⚠️  Změňte hesla po prvním přihlášení!"
else
    echo ""
    echo "❌ Chyba při inicializaci databáze"
    exit 1
fi
