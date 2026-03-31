# 🚀 RYCHLÉ SPUŠTĚNÍ - Zakázky

## Problém: Databáze není připojená

Backend se pokouší připojit k PostgreSQL na `localhost:5432`, ale databáze není spuštěná.

## ✅ Řešení 1: Použít Railway (Doporučeno - 5 minut)

### Krok 1: Vytvořit databázi na Railway
1. Přejděte na https://railway.app
2. Přihlaste se (GitHub účet)
3. Klikněte na "New Project" → "Provision PostgreSQL"
4. Počkejte, než se databáze vytvoří (~30s)

### Krok 2: Získat connection string
1. V Railway klikněte na PostgreSQL službu
2. Přejděte na záložku "Variables"
3. Zkopírujte hodnotu `DATABASE_URL`

### Krok 3: Aktualizovat .env
```bash
# Otevřete backend/.env a změňte:
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway
```

### Krok 4: Inicializovat databázi
```bash
# Nainstalujte psql (pokud ještě nemáte)
brew install libpq
brew link --force libpq

# Spusťte init script
./init-database.sh
```

### Krok 5: Restartovat backend
Backend se automaticky restartuje a připojí k databázi.

---

## ✅ Řešení 2: PostgreSQL přes Docker (10 minut)

```bash
# Spustit PostgreSQL v Docker kontejneru
docker run --name zakazky-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=zakazky \
  -p 5432:5432 \
  -d postgres:15

# backend/.env už je nakonfigurovaný pro localhost
# Inicializovat databázi
./init-database.sh

# Backend se automaticky připojí
```

### Zastavení PostgreSQL
```bash
docker stop zakazky-postgres
```

### Spuštění znovu
```bash
docker start zakazky-postgres
```

---

## ✅ Řešení 3: Lokální PostgreSQL (15 minut)

```bash
# Instalace PostgreSQL na macOS
brew install postgresql@15
brew services start postgresql@15

# Vytvoření databáze
createdb zakazky

# backend/.env už je nakonfigurovaný
# Inicializovat databázi
./init-database.sh
```

---

## 🎯 Po nastavení databáze

Aplikace již běží:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### Výchozí přihlašovací údaje:
- **Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123
- **User**: user@example.com / user123

⚠️ **Změňte hesla po prvním přihlášení!**

---

## 📊 Aktuální stav

✅ Backend server běží (port 3001)  
✅ Frontend server běží (port 3000)  
❌ Databáze není připojená → **Postupujte podle jednoho z řešení výše**

---

## 🔧 Problémy?

### Backend neběží
```bash
cd backend
npm run dev
```

### Frontend neběží
```bash
cd frontend
npm run dev
```

### Kontrola portů
```bash
lsof -i :3001  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL
```
