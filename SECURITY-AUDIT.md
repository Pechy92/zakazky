# BEZPEČNOSTNÍ AUDIT - Aplikace Zakázky

Datum: 21. března 2026  
Auditor: GitHub Copilot  
Aplikace: Zakázky - Černý Strnad Elektroprojekce

## 📋 Souhrn

**Status**: ⚠️ VYŽADUJE OPRAVY PŘED PRODUKCÍ

**Kritické problémy**: 2  
**Vysoká priorita**: 5  
**Střední priorita**: 3  
**Nízká priorita**: 2

---

## 🔴 KRITICKÉ PROBLÉMY

### 1. Slabé výchozí hesla v databázi
**Soubor**: `database-schema.sql`  
**Řádky**: 280-292  
**Problém**: Výchozí uživatelé mají velmi slabá hesla (`admin123`, `manager123`, `user123`)  
**Dopad**: Pokud se dostane do produkce, útočník může okamžitě získat přístup  
**Řešení**:
- ✅ Přidat warning do README
- ❌ MUSÍ se změnit při prvním přihlášení (není implementováno)
- ❌ Nebo vygenerovat náhodná hesla při instalaci

**Priorita**: 🔴 KRITICKÁ

### 2. JWT Secret v .env.example je výchozí
**Soubor**: `backend/.env`, `backend/.env.example`  
**Problém**: Používá se předvídatelný JWT secret  
**Dopad**: Útočník může forge tokeny  
**Řešení**:
```bash
# Generovat silný náhodný secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Priorita**: 🔴 KRITICKÁ

---

## 🟠 VYSOKÁ PRIORITA

### 3. SQL Injection riziko
**Soubory**: Všechny route soubory  
**Problém**: Použití template stringů místo prepared statements  
**Příklad** (`routes/customers.ts:39`):
```typescript
// ❌ NEBEZPEČNÉ
const result = await pool.query(
  `INSERT INTO customers (...) VALUES ($1, $2, ...)`,
  [name, ic, ...]  // ✅ SPRÁVNĚ - používá parametrizované dotazy
);
```
**Status**: ✅ **BEZPEČNÉ** - Kód používá parametrizované dotazy  
**Poznámka**: Všechny SQL dotazy používají `$1, $2` placeholders

### 4. Rate Limiting chybí
**Problém**: API nemá rate limiting  
**Dopad**: DDoS útoky, brute force na login  
**Řešení**: Přidat `express-rate-limit`
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5, // 5 pokusů
  message: 'Příliš mnoho pokusů o přihlášení'
});

router.post('/login', loginLimiter, async (req, res) => {
  // ...
});
```
**Priorita**: 🟠 VYSOKÁ

### 5. CORS není dostatečně omezen
**Soubor**: `backend/src/server.ts:18`  
**Problém**: CORS povoluje všechny origins  
```typescript
app.use(cors()); // ❌ Povoluje všechny domény
```
**Řešení**:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```
**Priorita**: 🟠 VYSOKÁ

### 6. Chybějící input validation
**Problém**: Některé endpointy nemají Zod validaci  
**Příklad**: `/routes/customers.ts` nevaliduje všechny fieldy  
**Řešení**: Přidat kompletní Zod schema pro všechny entity
```typescript
const CustomerSchema = z.object({
  name: z.string().min(1).max(255),
  ic: z.string().regex(/^\d{8}$/).optional(),
  email: z.string().email().optional(),
  // ...
});
```
**Priorita**: 🟠 VYSOKÁ

### 7. Neuložené sensitive logy
**Problém**: Console.log může obsahovat citlivá data  
**Soubor**: `routes/auth.ts:51`
```typescript
console.error('Login error:', error); // Může obsahovat hesla
```
**Řešení**: Použít strukturované logování bez citlivých dat
**Priorita**: 🟠 VYSOKÁ

---

## 🟡 STŘEDNÍ PRIORITA

### 8. Chybí HTTPS enforcement
**Problém**: Aplikace nenutí HTTPS v produkci  
**Řešení**: Přidat middleware
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```
**Priorita**: 🟡 STŘEDNÍ

### 9. Chybí security headers
**Problém**: Nejsou nastaveny bezpečnostní HTTP headers  
**Řešení**: Použít `helmet`
```typescript
import helmet from 'helmet';
app.use(helmet());
```
**Priorita**: 🟡 STŘEDNÍ

### 10. PDF generování bez sanitizace
**Soubor**: `routes/pdfs.ts`  
**Problém**: HTML template může obsahovat XSS  
**Řešení**: Sanitizovat všechny uživatelské vstupy před vložením do HTML  
**Priorita**: 🟡 STŘEDNÍ

---

## 🟢 NÍZKÁ PRIORITA

### 11. Deprecated url.parse()
**Problém**: Dependency používá deprecated API  
**Warning**: `url.parse() behavior is not standardized`  
**Řešení**: Upgrade dependencies  
**Priorita**: 🟢 NÍZKÁ

### 12. Npm audit varování
**Problém**: 2 high severity vulnerabilities v dependencies  
**Řešení**: `npm audit fix`  
**Priorita**: 🟢 NÍZKÁ

---

## ✅ CO JE DOBŘE

1. ✅ **Bcrypt pro hesla** - Používá se bcrypt s defaultním salt rounds (bezpečné)
2. ✅ **JWT autentizace** - Správná implementace JWT
3. ✅ **Role-based access control** - Admin/Manager/User role fungují správně
4. ✅ **Parametrizované SQL dotazy** - Ochrana před SQL injection
5. ✅ **TypeScript** - Type safety snižuje riziko chyb
6. ✅ **Environment variables** - Citlivé data v .env
7. ✅ **Zod validace** - Některé endpointy mají validaci

---

## 🔧 DOPORUČENÉ OPRAVY - PRIORITY 1

### Před spuštěním v produkci:

1. **Změnit JWT_SECRET**
   ```bash
   # V backend/.env
   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. **Přidat rate limiting**
   ```bash
   cd backend
   npm install express-rate-limit
   ```

3. **Omezit CORS**
   ```typescript
   // backend/src/server.ts
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

4. **Přidat helmet**
   ```bash
   npm install helmet
   ```
   ```typescript
   import helmet from 'helmet';
   app.use(helmet());
   ```

5. **Vynutit změnu hesla při prvním přihlášení**
   - Přidat `password_changed` flag do users table
   - Redirect na změnu hesla pokud `password_changed = false`

---

## 📊 Security Checklist pro produkci

- [ ] JWT_SECRET je silný a náhodný (min 32 znaků)
- [ ] Všechna výchozí hesla jsou změněna
- [ ] CORS je omezen na production URL
- [ ] Rate limiting je aktivní
- [ ] Helmet middleware je přidán
- [ ] HTTPS je vynuceno
- [ ] Všechny npm vulnerabilities jsou opraveny
- [ ] Environment variables jsou bezpečně uloženy (Railway Secrets)
- [ ] Database credentials nejsou v kódu
- [ ] Logy neobsahují citlivá data
- [ ] Input validation je kompletní
- [ ] XSS ochrana v PDF generování
- [ ] SQL injection testováno
- [ ] Authentication testováno
- [ ] Authorization testováno

---

## 📚 Odkazy na security best practices

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 🎯 Akční plán

1. **Okamžitě** (před jakýmkoli nasazením):
   - Změnit JWT_SECRET
   - Změnit všechna výchozí hesla
   
2. **Před produkcí** (tento týden):
   - Přidat rate limiting
   - Omezit CORS
   - Přidat helmet
   - Opravit npm vulnerabilities

3. **Po nasazení** (priorita 2):
   - Implementovat audit logging
   - Přidat monitoring
   - Pravidelné bezpečnostní scany

---

**Připravil**: GitHub Copilot  
**Datum**: 21. března 2026  
**Verze**: 1.0
