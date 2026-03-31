# Zakázky - Systém pro správu zakázek a nabídek

Webová aplikace pro správu zákazníků, zakázek a generování nabídek v PDF formátu.

## Technologie

### Backend
- Node.js 20+
- TypeScript
- Express.js
- PostgreSQL (Railway)
- JWT autentizace
- Puppeteer (PDF generování)

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Router

## Instalace

### 1. Požadavky
- Node.js 20 nebo vyšší
- PostgreSQL databáze (Railway nebo lokální)
- npm

### 2. Backend setup

```bash
cd backend
npm install
```

Vytvořte `.env` soubor v `backend/` podle vzoru:

```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key-min-32-characters
PORT=3001
ARES_API_URL=https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty
```

Inicializace databáze:

```bash
# Připojte se k PostgreSQL a spusťte:
psql $DATABASE_URL < ../database-schema.sql
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Frontend používá proxy na port 3001, není potřeba další konfigurace.

## Spuštění

### Development

V samostatných terminálech:

```bash
# Backend (port 3001)
cd backend
npm run dev

# Frontend (port 3000)
cd frontend
npm run dev
```

Aplikace bude dostupná na `http://localhost:3000`

### Production build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Výstup je v dist/ složce
```

## Výchozí přihlášení

Po inicializaci databáze jsou dostupné tyto účty:

- **Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123
- **User**: user@example.com / user123

**Důležité**: Změňte hesla po prvním přihlášení!

## Struktura projektu

```
Zakázky/
├── database-schema.sql       # PostgreSQL schema
├── backend/
│   ├── src/
│   │   ├── server.ts         # Express aplikace
│   │   ├── config/           # Databázové připojení
│   │   ├── middleware/       # Auth middleware
│   │   ├── routes/           # API endpointy
│   │   └── ...
│   ├── uploads/pdfs/         # Generované PDF soubory
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx           # Hlavní aplikace
    │   ├── pages/            # Stránky (Dashboard, Orders, ...)
    │   ├── components/       # React komponenty
    │   ├── services/         # API služby
    │   ├── store/            # Zustand stores
    │   └── types/            # TypeScript typy
    └── package.json
```

## API Endpointy

### Autentizace
- `POST /api/auth/login` - Přihlášení
- `POST /api/auth/register` - Registrace (pouze admin/manager)

### Zákazníci
- `GET /api/customers` - Seznam zákazníků
- `POST /api/customers` - Nový zákazník
- `PUT /api/customers/:id` - Úprava zákazníka
- `DELETE /api/customers/:id` - Smazání (admin/manager)

### Zakázky
- `GET /api/orders` - Seznam zakázek
- `GET /api/orders/stats/dashboard` - Dashboard statistiky
- `POST /api/orders` - Nová zakázka
- `PUT /api/orders/:id` - Úprava zakázky

### Nabídky
- `GET /api/offers/order/:orderId` - Nabídky pro zakázku
- `POST /api/offers` - Nová nabídka s položkami
- `GET /api/offers/:id/items` - Položky nabídky

### PDF
- `POST /api/pdfs/generate/:offerId` - Generování PDF
- `GET /api/pdfs/offer/:offerId` - Seznam PDF pro nabídku

### ARES
- `GET /api/ares/search/:ic` - Vyhledání firmy podle IČ

## Funkce

### Dashboard
- Přehled zakázek podle stavů
- Celkové statistiky (počet, hodnota)
- Možnost skrýt/zobrazit částky

### Zákazníci
- Správa zákazníků
- Integrace s ARES (automatické doplnění údajů podle IČ)
- Kontaktní osoby

### Zakázky
- Vytváření a správa zakázek
- Přiřazení zákazníka
- Sledování stavu (Nabídka, Rozpracované, Hotovo, ...)
- Přiřazení uživatele

### Nabídky
- Generování nabídek pro zakázky
- Automatické číslování: 2025_{číslo_zakázky}_{pořadové_číslo}
- Položky nabídky
- Kategorie (DPS, DSP)
- HTML textace
- Cestovné a montáž

### PDF Generování
- Serverové generování pomocí Puppeteer
- Uložení PDF na server
- Historie všech PDF pro nabídku

## Role uživatelů

- **Admin**: Plný přístup
- **Manager**: Plný přístup
- **User**: Pouze Zakázky a Zákazníci

## Deployment na Railway

1. Vytvořte PostgreSQL databázi na Railway
2. Připojte GitHub repository
3. Nastavte environment variables (DATABASE_URL, JWT_SECRET)
4. Backend i frontend mohou běžet jako samostatné služby
5. Pro frontend potřebujete nastavit buildCommand: `npm run build`
6. Pro backend: `npm run build && npm start`
7. Pro trvalé ukládání PDF nastavte `UPLOAD_DIR` na Railway Volume (např. `/data/uploads`)

## Podpora

Pro problémy a dotazy kontaktujte vývojáře.
