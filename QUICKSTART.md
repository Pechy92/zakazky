# Zakázky - Aplikace pro správu zakázek

Tato složka obsahuje kompletní webovou aplikaci pro správu zákazníků, zakázek a generování nabídek.

## Rychlý start

1. **Backend setup**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Editujte .env a nastavte DATABASE_URL a JWT_SECRET
   ```

2. **Inicializace databáze**:
   ```bash
   psql $DATABASE_URL < database-schema.sql
   ```

3. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   ```

4. **Spuštění**:
   ```bash
   # V prvním terminálu:
   cd backend && npm run dev
   
   # V druhém terminálu:
   cd frontend && npm run dev
   ```

5. **Otevřete prohlížeč**: http://localhost:3000

6. **Přihlaste se**: admin@example.com / admin123

Více informací v [README.md](./README.md)
