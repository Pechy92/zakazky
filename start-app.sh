#!/bin/bash

# Tento skript připraví a spustí aplikaci Zakázky

echo "=== Zakázky - Setup & Start ==="
echo ""

# Kontrola PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL není nainstalován lokálně."
    echo ""
    echo "Máte tyto možnosti:"
    echo "  1. Použít Railway databázi (doporučeno)"
    echo "  2. Nainstalovat PostgreSQL lokálně:"
    echo "     brew install postgresql@15"
    echo "     brew services start postgresql@15"
    echo ""
    echo "Pro Railway databázi:"
    echo "  1. Přejděte na https://railway.app"
    echo "  2. Vytvořte nový projekt a přidejte PostgreSQL"
    echo "  3. Zkopírujte DATABASE_URL a vložte do backend/.env"
    echo ""
    read -p "Stiskněte Enter po nastavení DATABASE_URL v backend/.env..."
fi

# Backend setup
echo ""
echo "1️⃣  Spouštím backend (port 3001)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Čekání na backend startup
sleep 5

# Frontend setup  
echo ""
echo "2️⃣  Spouštím frontend (port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Aplikace běží!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Pro zastavení stiskněte Ctrl+C"
echo ""

# Wait for user interrupt
wait
