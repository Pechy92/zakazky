# 🔐 BEZPEČNOSTNÍ VYLEPŠENÍ - IMPLEMENTOVÁNO

Datum:21. března 2026

## ✅ Co bylo implementováno

### 1. Helmet - HTTP Security Headers
**Status**: ✅ IMPLEMENTOVÁNO  
**Soubor**: `backend/src/server.ts`

Přidány bezpečnostní HTTP headers:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy
- Referrer-Policy

### 2. Rate Limiting
**Status**: ✅ IMPLEMENTOVÁNO

**API Rate Limit**: 100 požadavků / 15 minut  
**Login Rate Limit**: 5 pokusů / 15 minut

Ochrana proti:
- DDoS útokům
- Brute force na login
- API abuse

### 3. CORS Omezení
**Status**: ✅ IMPLEMENTOVÁNO

CORS je nyní omezen na:
- Development: `http://localhost:3000`
- Production: Nastavit v `FRONTEND_URL` env variable

### 4. Silnější JWT Secret
**Status**: ✅ AKTUALIZOVÁNO

JWT_SECRET byl změněn na náhodně vygenerovaný 64-znakový hex string.

### 5. Input Validation
**Status**: ✅ POUŽÍVÁ SE

Všechny endpointy používají:
- Zod schema validation
- Parametrizované SQL dotazy (ochrana před SQL injection)

---

## 🔧 Instalace nových dependencies

```bash
cd backend
npm install
# Automaticky nainstaluje helmet a express-rate-limit
```

---

## ⚙️ Konfigurace pro produkci

### backend/.env v produkci (Railway):

```bash
# Silný náhodný JWT secret (NIKDY nesdílet!)
JWT_SECRET=<vygenerujte nový: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Production DATABASE_URL ze Railway
DATABASE_URL=postgresql://...railway.app:5432/railway

# Frontend URL (vaše doména)
FRONTEND_URL=https://vase-domena.com

# Environment
NODE_ENV=production
```

---

## 🛡️ Bezpečnostní checklist

### Před nasazením:
- [x] Helmet middleware aktivní
- [x] Rate limiting implementován
- [x] CORS omezený na specific origin
- [x] JWT secret silný a náhodný
- [x] Input validation (Zod)
- [x] SQL injection ochrana (parametrizované dotazy)
- [ ] ⚠️ Změnit všechna výchozí hesla v databázi
- [ ] ⚠️ Nastavit FRONTEND_URL v produkčním .env
- [ ] ⚠️ Nastavit silný DATABASE_URL v Railway

### Po nasazení:
- [ ] Test rate limiting
- [ ] Test CORS restrictions
- [ ] Test authentication flow
- [ ] Zkontrolovat logy pro podezřelou aktivitu

---

## 🚨 KRITICKÉ - Před produkcí

### 1. Změnit výchozí hesla
Po inicializaci databáze OKAMŽITĚ změnit hesla:

```sql
-- Připojit se k databázi a změnit hesla
UPDATE users SET password_hash = '<bcrypt-hash-nového-hesla>' WHERE email = 'admin@example.com';
UPDATE users SET password_hash = '<bcrypt-hash-nového-hesla>' WHERE email = 'manager@example.com';
UPDATE users SET password_hash = '<bcrypt-hash-nového-hesla>' WHERE email = 'user@example.com';
```

Nebo použít aplikaci k změně hesla po prvním přihlášení.

### 2. Railway Environment Variables

V Railway nastavit:
1. `DATABASE_URL` (automaticky nastaveno)
2. `JWT_SECRET` (vygenerovat nový!)
3. `FRONTEND_URL` (vaše doména)
4. `NODE_ENV=production`
5. `PORT=3001` (nebo podle Railway)

---

## 📊 Bezpečnostní metriky

### Rate Limiting Monitoring

Backend automaticky loguje:
- Počet zamítnutých požadavků (429 Too Many Requests)
- IP adresy s podezřelou aktivitou

Doporučení: Přidat monitoring tool (např. Sentry) pro sledování security events.

---

## 🔄 Aktualizace dependencies

```bash
cd backend
npm audit
npm audit fix

# Kontrola bezpečnostních aktualizací
npm outdated
```

---

## 📚 Další doporučení

### 1. Přidat Logging
```bash
npm install winston
```

### 2. Přidat Monitoring
- Sentry.io pro error tracking
- Railway má built-in monitoring

### 3. Database Backups
Railway automatic backups nebo:
```bash
# Manuální backup
pg_dump $DATABASE_URL > backup.sql
```

### 4. HTTPS Enforcement
Railway poskytuje HTTPS automaticky.

---

## ✅ Security Compliance

Aplikace nyní splňuje:
- ✅ OWASP Top 10 základní ochranu
- ✅ Node.js Security Best Practices
- ✅ Express.js Security Best Practices
- ✅ GDPR data protection (s výhradou další implementace)

---

**Status**: 🟢 BEZPEČNĚ PRO DEVELOPMENT  
**Pro produkci**: ⚠️ Dokončit checklist výše

**Připravil**: GitHub Copilot  
**Datum**: 21. března 2026
