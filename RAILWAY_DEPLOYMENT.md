# Railway nasazeni pro uplneho zacatecnika

Tento navod je napsany pro tvuj projekt Zakazky v monorepu:

- backend: Radek/webApp/Zakazky/backend
- frontend: Radek/webApp/Zakazky/frontend

Cil:

1. Nasadit backend na Railway.
2. Nasadit frontend na Railway.
3. Napojit PostgreSQL databazi.
4. Vyresit trvale ukladani PDF pres Railway Volume.

## Co uz je pripraveno v kodu

Toto uz je nastavene a nemusis to programovat:

1. Backend umi cist upload adresar z env promenne UPLOAD_DIR.
2. PDF se ukladaji do UPLOAD_DIR/pdfs.
3. Frontend umi cist API adresu z VITE_API_URL.

## Co nemohu udelat za tebe

Nemam pristup do tveho Railway ani GitHub uctu, takze klikani v Railway dashboardu musis udelat ty.

Ja uz jsem pripravil:

1. Kod pro produkcni API URL ve frontendu.
2. Kod pro persistentni PDF storage.
3. Env priklady.
4. Tento detailni deployment navod.

## Faze A: Priprava repozitare

### A1) Otestuj lokalne build

Spust:

- v backend: npm run build
- ve frontend: npm run build

Pokud build neprojde lokalne, nepokracuj do Railway.

### A2) Commit a push do GitHub

Tato cast je schvalne detailni. Pokud jsi uplny zacatecnik, jed presne podle kroku.

#### A2.1 Co je minimum, ktere potrebujes vedet

1. Git sleduje zmeny v souborech.
2. Commit je ulozeni zmen do historie.
3. Branch je "vetev" vyvoje, kterou posilas na GitHub.
4. Railway nasazuje kod z konkretni branche (nejcasteji main).

#### A2.2 Over, kde jsi

V terminalu spust:

```bash
cd "/Users/martin/Desktop/Práce/Radek/webApp/Zakázky"
pwd
```

Vysledek musi koncit na `.../Radek/webApp/Zakázky`.

#### A2.3 Pokud slozka jeste NENI Git repozitar (tohle je tvuj aktualni stav)

1. Inicializuj Git:

```bash
git init
```

2. Nastav jmeno a email (pokud jsi to nikdy nedelal):

```bash
git config --global user.name "Tvoje Jmeno"
git config --global user.email "tvuj@email.cz"
```

3. Vytvor branch `main`:

```bash
git checkout -b main
```

4. Zkontroluj stav:

```bash
git status
```

#### A2.4 Pokud uz Git repozitar mas

Pouzij:

```bash
git status
git branch
```

Pokud nejsi na `main`, prepni se:

```bash
git checkout main
```

#### A2.5 Vytvor repozitar na GitHub webu

1. Otevri https://github.com
2. Klikni New repository.
3. Nazev dej treba `zakazky`.
4. Nezaskrtavej README/.gitignore/license (mas je lokalne).
5. Klikni Create repository.
6. Zkopiruj URL repozitare:
	- HTTPS varianta: `https://github.com/TVUJ_UCET/zakazky.git`
	- nebo SSH varianta: `git@github.com:TVUJ_UCET/zakazky.git`

#### A2.6 Propoj lokalni projekt s GitHub repozitarem

```bash
git remote add origin https://github.com/TVUJ_UCET/zakazky.git
git remote -v
```

Pokud `origin` uz existuje a je spatne, oprav ho:

```bash
git remote set-url origin https://github.com/TVUJ_UCET/zakazky.git
```

#### A2.7 Uloz zmeny (commit)

1. Mrkni co se bude commitovat:

```bash
git status
```

2. Pridej vsechny soubory:

```bash
git add .
```

3. Vytvor commit:

```bash
git commit -m "Priprava produkcniho deploye na Railway"
```

#### A2.8 Posli branch na GitHub (push)

```bash
git push -u origin main
```

Po tomhle bude `main` na GitHubu a Railway ji uvidi.

#### A2.9 Jak overit, ze je push opravdu hotovy

1. Otevri repozitar na GitHubu v prohlizeci.
2. Zkontroluj, ze vidis posledni commit.
3. Zkontroluj, ze soubor `RAILWAY_DEPLOYMENT.md` ma nove zneni.

#### A2.10 Nejbeznejsi chyby u zacatecniku

1. Chyba `remote origin already exists`:
	- pouzij `git remote set-url origin ...`
2. Chyba `Authentication failed` pri HTTPS:
	- GitHub uz nepodporuje heslo, pouzij Personal Access Token (PAT).
3. Chyba `src refspec main does not match any`:
	- jeste nemas commit, udelej nejdriv `git add .` + `git commit`.
4. Push jde do jine branche:
	- over `git branch` a pushuj `git push -u origin main`.

#### A2.11 Co budes potrebovat v Railway

V Railway pri pridani GitHub repozitare vyber stejne repo a branch `main`, kterou jsi prave pushnul.

## Faze B: Zalozeni Railway projektu

### B1) Prihlaseni

1. Otevri https://railway.app
2. Login pres GitHub.

### B2) Novy projekt

1. Klikni New Project.
2. Vyber Empty Project.
3. Pojmenuj ho treba zakazky-prod.

## Faze C: Databaze (PostgreSQL)

### C1) Pridani databaze

1. V projektu klikni New.
2. Vyber Database.
3. Vyber PostgreSQL.

### C2) Connection string

1. Otevri PostgreSQL service.
2. V Variables najdi DATABASE_URL.
3. Tuto hodnotu budes kopirovat do backend service.

## Faze D: Backend service

### D1) Pridani backendu z GitHub

1. V projektu klikni New.
2. Vyber GitHub Repo.
3. Vyber svuj repozitar.
4. Service pojmenuj napriklad zakazky-backend.

### D2) Nastaveni Build a Start

V backend service nastav:

1. Root Directory: Radek/webApp/Zakazky/backend
2. Build Command: npm run build
3. Start Command: npm start

### D3) Nastaveni backend env promennych

Do Variables v backend service vloz:

1. NODE_ENV=production
2. PORT=3001
3. DATABASE_URL=(hodnota z Railway PostgreSQL)
4. JWT_SECRET=(silny tajny retezec)
5. FRONTEND_URL=(doplnis po nasazeni frontendu)
6. UPLOAD_DIR=/data/uploads

Doporuceni:

1. JWT_SECRET vygeneruj alespon 64 hex znaku.
2. FRONTEND_URL nastav bez koncoveho lomitka.

### D4) Pridani Railway Volume pro PDF

Toto je klicovy krok kvuli PDF.

1. Otevri backend service.
2. Najdi zalozku Volumes.
3. Klikni Add Volume.
4. Mount path nastav na /data.
5. Ujisti se, ze mas env UPLOAD_DIR=/data/uploads.

Vysledek:

1. PDF se budou fyzicky ukladat do /data/uploads/pdfs.
2. Po redeployi zustanou zachovana.

### D5) Prvni deploy backendu

1. Klikni Deploy nebo Redeploy.
2. Pockej, az status bude Healthy.
3. Otevri backend URL a vyzkousej /health.

Ocekavany vysledek:

1. HTTP 200
2. JSON se status: OK

## Faze E: Frontend service

### E1) Pridani frontendu z GitHub

1. V projektu klikni New.
2. Vyber GitHub Repo.
3. Vyber stejny repozitar.
4. Service pojmenuj napriklad zakazky-frontend.

### E2) Nastaveni Build a Start

V frontend service nastav:

1. Root Directory: Radek/webApp/Zakazky/frontend
2. Build Command: npm run build
3. Start Command: npm run preview -- --host 0.0.0.0 --port $PORT

### E3) Nastaveni frontend env promennych

Do frontend Variables vloz:

1. VITE_API_URL=https://<tvoje-backend-railway-domena>

Poznamka:

1. Tohle je dulezite, bez toho by frontend volal relativni /api na svoji domenu.

### E4) Deploy frontendu

1. Klikni Deploy.
2. Pockej na Healthy stav.
3. Otevri frontend URL v prohlizeci.

## Faze F: Finalni propojeni CORS

Po nasazeni frontendu zkopiruj jeho verejnou URL a vloz ji do backend env:

1. FRONTEND_URL=https://<tvoje-frontend-railway-domena>

Pak udelej Redeploy backendu.

Bez tohoto kroku muze login nebo API volani padat na CORS.

## Faze G: Kontrolni testy po nasazeni

Udelej presne tyto testy:

1. Otevri frontend URL.
2. Prihlas se admin uctem.
3. Otevri Zakazky a vytvor test nabidku.
4. Vygeneruj PDF.
5. Otevri generated PDF URL.
6. U backendu udelej manualni Redeploy.
7. Znovu otevri stejnou PDF URL.

Pokud PDF po redeployi stale existuje, Volume je spravne nastavene.

## Faze H: Nejbeznejsi chyby a reseni

### Chyba 1: Backend startuje, ale API vraci 500

Zkontroluj:

1. DATABASE_URL je vyplnena.
2. Databaze bezi.
3. Backend logy nehlasi connection refused.

### Chyba 2: Frontend se nacte, ale nefunguje login

Zkontroluj:

1. VITE_API_URL smeruje na backend URL.
2. FRONTEND_URL v backendu presne odpovida frontend URL.
3. V prohlizeci neni mixed content (http vs https).

### Chyba 3: PDF se po case ztraceji

Zkontroluj:

1. Backend ma pripojeny Volume.
2. Mount path je /data.
3. UPLOAD_DIR je /data/uploads.

### Chyba 4: PDF endpoint vraci chybu pri renderu

Zkontroluj backend logy kvuli Puppeteer/Chrome.

Mozne fixy:

1. Nastavit CHROME_PATH.
2. Nastavit PUPPETEER_EXECUTABLE_PATH.

Ve vetsine Railway setupu to nebude treba, ale je to pripraveno v kodu.

## Faze I: Minimalni bezpecnostni checklist

Pred ostrym provozem:

1. Zmenit default admin hesla.
2. Mit silny JWT_SECRET.
3. Nedavat .env do GitHub.
4. Zapnout Railway alerts (pokud plan umoznuje).
5. Udelat test obnovitelnosti PDF po redeploy.

## Faze J: Rychly copy-paste seznam promennych

Backend:

1. NODE_ENV=production
2. PORT=3001
3. DATABASE_URL=...
4. JWT_SECRET=...
5. FRONTEND_URL=https://...frontend...
6. UPLOAD_DIR=/data/uploads
7. ARES_API_URL=https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty

Frontend:

1. VITE_API_URL=https://...backend...

## Kdy zvolit misto Volume objektove uloziste (S3/R2)

Pokud planujes vice backend instanci nebo CDN distribuci souboru, je lepsi prejit na S3 kompatibilni storage.

Pro jednu instanci je Railway Volume jednodussi a naprosto v poradku.
