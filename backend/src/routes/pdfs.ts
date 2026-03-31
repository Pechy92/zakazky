import express from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();
const PDF_UPLOAD_DIR = path.join(
  path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')),
  'pdfs'
);

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
].filter(Boolean) as string[];

async function launchPdfBrowser() {
  const launchBase = {
    headless: true as const,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: 120000,
  };

  // 1) Zkusit explicitní cesty (nejdřív env, pak systémové Chrome)
  for (const executablePath of CHROME_CANDIDATES) {
    try {
      return await puppeteer.launch({ ...launchBase, executablePath });
    } catch (error) {
      console.warn(`Puppeteer launch failed for ${executablePath}:`, (error as Error).message);
    }
  }

  // 2) Fallback na default Puppeteer executable
  return puppeteer.launch(launchBase);
}

let cachedLogoDataUri: string | null = null;

async function resolvePdfLogoSource() {
  if (process.env.PDF_LOGO_URL) {
    return process.env.PDF_LOGO_URL;
  }

  if (cachedLogoDataUri) {
    return cachedLogoDataUri;
  }

  const logoPath = path.join(process.cwd(), '..', 'frontend', 'public', 'cernystrnadlogo.png');

  try {
    const logoBuffer = await fs.readFile(logoPath);
    cachedLogoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    return cachedLogoDataUri;
  } catch (error) {
    console.warn(`PDF logo not found at ${logoPath}:`, (error as Error).message);
    return '';
  }
}

function parseCombinedContent(raw: string | null | undefined) {
  const COMBINATION_START = '<!--CS_COMBINATION_START-->';
  const COMBINATION_END = '<!--CS_COMBINATION_END-->';
  const TEMPLATE_START = '<!--CS_TEMPLATE_START-->';
  const TEMPLATE_END = '<!--CS_TEMPLATE_END-->';

  const normalized = String(raw || '');
  const comboStart = normalized.indexOf(COMBINATION_START);
  const comboEnd = normalized.indexOf(COMBINATION_END);
  const templateStart = normalized.indexOf(TEMPLATE_START);
  const templateEnd = normalized.indexOf(TEMPLATE_END);

  if (comboStart === -1 || comboEnd === -1 || templateStart === -1 || templateEnd === -1) {
    return null;
  }

  return {
    combinationContent: normalized.slice(comboStart + COMBINATION_START.length, comboEnd).trim(),
    templateContent: normalized.slice(templateStart + TEMPLATE_START.length, templateEnd).trim(),
  };
}

// Generovat PDF pro nabídku
router.post('/generate/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = (req as any).user.id;

    // Načíst data nabídky
    const offerResult = await pool.query(`
      SELECT o.*, ord.number as order_number, ord.title as order_title,
             c.name as customer_name, c.ic, c.dic, c.street, c.house_number,
             c.city, c.postal_code, c.email,
             mc.description as main_category_description,
             sc.description as subcategory_description,
             comb.html_content as combination_html_content,
             tt.html_content as template_html_content
      FROM offers o
      JOIN orders ord ON o.order_id = ord.id
      JOIN customers c ON ord.customer_id = c.id
      LEFT JOIN main_categories mc ON mc.code = o.main_category_code
      LEFT JOIN subcategories sc ON sc.code = o.subcategory_code
      LEFT JOIN category_combinations comb
        ON comb.main_category_code = o.main_category_code
       AND comb.subcategory_code = o.subcategory_code
      LEFT JOIN text_templates tt ON tt.id = o.text_template_id
      WHERE o.id = $1
    `, [offerId]);

    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nabídka nenalezena' });
    }

    const offer = offerResult.rows[0];

    // Načíst položky
    const itemsResult = await pool.query(
      'SELECT * FROM offer_items WHERE offer_id = $1 ORDER BY order_index',
      [offerId]
    );

    // Načíst položky slaboproudu pro čitelné názvy
    const weakItemsMap = new Map<string, string>();
    const weakItemsResult = await pool.query('SELECT code, name, description FROM weak_current_items');
    weakItemsResult.rows.forEach((row) => {
      weakItemsMap.set(row.code, row.description || row.name || row.code);
    });

    const logoSource = await resolvePdfLogoSource();
    const html = generateOfferHTML(offer, itemsResult.rows, weakItemsMap, logoSource);

    // Generovat PDF pomocí Puppeteer
    const browser = await launchPdfBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120000 });
    
    const fileName = `nabidka_${offer.order_number}_${offer.sequence_number}_${Date.now()}.pdf`;
    const filePath = path.join(PDF_UPLOAD_DIR, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    await page.pdf({
      path: filePath,
      width: '8.2778in',
      height: '12.9861in',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    });
    
    await browser.close();

    // Uložit info o PDF do databáze
    const fileStats = await fs.stat(filePath);
    await pool.query(
      'INSERT INTO offer_pdfs (offer_id, file_path, file_size, created_by_user_id) VALUES ($1, $2, $3, $4)',
      [offerId, filePath, fileStats.size, userId]
    );

    res.json({ 
      message: 'PDF vygenerováno',
      fileUrl: `/uploads/pdfs/${fileName}`
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    const message = error instanceof Error ? error.message : 'Neznámá chyba';
    res.status(500).json({ error: `Chyba při generování PDF: ${message}` });
  }
});

// Získat PDF soubory pro nabídku
router.get('/offer/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.full_name as created_by_name
      FROM offer_pdfs p
      JOIN users u ON p.created_by_user_id = u.id
      WHERE p.offer_id = $1
      ORDER BY p.created_at DESC
    `, [offerId]);

    const pdfs = result.rows.map((row) => {
      const basename = path.basename(row.file_path || '');
      return {
        id: row.id,
        offerId: row.offer_id,
        filePath: row.file_path,
        fileSize: row.file_size,
        createdByUserId: row.created_by_user_id,
        createdByName: row.created_by_name,
        createdAt: row.created_at,
        fileUrl: basename ? `/uploads/pdfs/${basename}` : '',
      };
    });

    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ error: 'Chyba při načítání PDF' });
  }
});

// Získat všechna PDF pro objednávku (všechny nabídky)
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.full_name as created_by_name, o.sequence_number, o.id as offer_id
      FROM offer_pdfs p
      JOIN users u ON p.created_by_user_id = u.id
      JOIN offers o ON p.offer_id = o.id
      WHERE o.order_id = $1
      ORDER BY o.sequence_number ASC, p.created_at DESC
    `, [orderId]);

    const pdfs = result.rows.map((row) => {
      const basename = path.basename(row.file_path || '');
      return {
        id: row.id,
        offerId: row.offer_id,
        sequenceNumber: row.sequence_number,
        filePath: row.file_path,
        fileSize: row.file_size,
        createdByUserId: row.created_by_user_id,
        createdByName: row.created_by_name,
        createdAt: row.created_at,
        fileUrl: basename ? `/uploads/pdfs/${basename}` : '',
      };
    });

    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching order PDFs:', error);
    res.status(500).json({ error: 'Chyba při načítání PDF' });
  }
});

function generateOfferHTML(
  offer: any,
  items: any[],
  weakItemsMap: Map<string, string>,
  logoSource: string
): string {
  const formatNumber = (value: number) =>
    new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatDate = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return '—';
    const d = new Date(dateValue);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  const travelCosts =
    (Number(offer.travel_costs_km_quantity) || 0) * (Number(offer.travel_costs_km_price) || 0) +
    (Number(offer.travel_costs_hours_quantity) || 0) * (Number(offer.travel_costs_hours_price) || 0);
  const assemblyCosts = (Number(offer.assembly_quantity) || 0) * (Number(offer.assembly_price) || 0);

  const itemsSubtotal = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalWithoutVat = itemsSubtotal + travelCosts + assemblyCosts;
  const vat = Math.round(totalWithoutVat * 0.21);
  const totalWithVat = totalWithoutVat + vat;

  const weakCurrentLines = Array.isArray(offer.selected_weak_current_items)
    ? offer.selected_weak_current_items.map((code: string) => `Slaboproud: ${weakItemsMap.get(code) || code}`)
    : [];

  const parsedCombinedContent = parseCombinedContent(offer.custom_text_content);
  const hasTemplate = Boolean(offer.text_template_id);
  
  // Pokud existují nové serializované data, brat jen z nich (bez fallback na starou kombinaci z DB)
  // Pokud neexistují, pak pro legacy data: kombinace z kategorie (pokud není textace) a textace z DB
  let combinationContent = '';
  let templateContent = '';
  
  if (parsedCombinedContent) {
    // Nová serializovaná data - bereme jen z nich
    combinationContent = parsedCombinedContent.combinationContent;
    templateContent = parsedCombinedContent.templateContent;
  } else {
    // Legacy data - staré chování
    if (!hasTemplate) {
      // Nemáme textaci, tak tiskneme kombinaci z kategorie
      combinationContent = offer.combination_html_content || '';
    }
    if (hasTemplate) {
      // Máme textaci, bereme ji z custom_text_content nebo templatu
      templateContent = offer.custom_text_content || offer.template_html_content || '';
    }
  }
  const logoUrl = logoSource || '';

  const itemsHtml = items.map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.name || '')}</strong>
          ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
        </td>
        <td>${formatNumber(Number(item.quantity) || 0)}</td>
        <td>${formatNumber(Number(item.unit_price) || 0)} Kč</td>
        <td>${formatNumber(Number(item.total_price) || 0)} Kč</td>
      </tr>
    `).join('');

  const extraCostsHtml = `
    ${travelCosts > 0 ? `
      <tr>
        <td><strong>Cestovní náklady</strong><div class="item-description">${formatNumber(Number(offer.travel_costs_km_quantity) || 0)} km x ${formatNumber(Number(offer.travel_costs_km_price) || 0)} Kč, ${formatNumber(Number(offer.travel_costs_hours_quantity) || 0)} h x ${formatNumber(Number(offer.travel_costs_hours_price) || 0)} Kč</div></td>
        <td>1</td>
        <td>${formatNumber(travelCosts)} Kč</td>
        <td>${formatNumber(travelCosts)} Kč</td>
      </tr>` : ''}
    ${assemblyCosts > 0 ? `
      <tr>
        <td><strong>Náklady na kompletaci</strong><div class="item-description">${formatNumber(Number(offer.assembly_quantity) || 0)} x ${formatNumber(Number(offer.assembly_price) || 0)} Kč</div></td>
        <td>1</td>
        <td>${formatNumber(assemblyCosts)} Kč</td>
        <td>${formatNumber(assemblyCosts)} Kč</td>
      </tr>` : ''}
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Nabídka ${offer.order_number}_${offer.sequence_number}</title>
      <style>
        @page { size: 596pt 935pt; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 9.2pt;
          line-height: 1.32;
          font-weight: 400;
          color: #000;
          background-color: #fff;
          width: 596pt;
          margin: 0 auto;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }
        .page {
          width: 596pt;
          min-height: 935pt;
          padding: 44pt 42pt 36pt;
          background-color: white;
          page-break-after: always;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 6px;
          page-break-inside: avoid;
        }
        .header-left h1 { font-size: 15.2pt; font-weight: 500; margin-bottom: 3px; letter-spacing: -0.1pt; }
        .header-left h2 { font-size: 10.4pt; font-weight: 400; margin-bottom: 8px; }
        .header-left .dates { font-size: 8.5pt; line-height: 1.38; }
        .header-right { text-align: right; }
        .logo-image { max-width: 175px; height: auto; margin-top: -2px; }
        .parties {
          background-color: #9DD9D9;
          padding: 14px 16px;
          margin-bottom: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          page-break-inside: avoid;
        }
        .party h3 { font-size: 10pt; font-weight: 600; margin-bottom: 7px; }
        .party p { margin: 1px 0; font-size: 8.35pt; line-height: 1.28; }
        .party p:first-of-type { font-weight: 500; }
        .section-title { font-size: 10.4pt; font-weight: 600; margin-bottom: 10px; margin-top: 11px; page-break-inside: avoid; }
        .offer-table { width: 100%; border-collapse: collapse; font-size: 8.35pt; table-layout: fixed; }
        .offer-table thead { background-color: #9DD9D9; page-break-inside: avoid; }
        .offer-table th { padding: 7px 9px; text-align: left; font-weight: 600; word-wrap: break-word; line-height: 1.15; }
        .offer-table th.text-right { text-align: right; }
        .offer-table tbody tr { page-break-inside: avoid; }
        .offer-table tbody td { padding: 7px 9px; vertical-align: top; border-bottom: 1px solid #cfcfcf; word-wrap: break-word; line-height: 1.22; }
        .offer-table tbody td:nth-child(2), .offer-table tbody td:nth-child(3), .offer-table tbody td:nth-child(4) { text-align: right; white-space: nowrap; }
        .offer-table tbody tr:last-child td { border-bottom: 1px solid #999; }
        .offer-table tbody td strong { font-weight: 500; }
        .item-description { font-size: 7.65pt; margin-top: 3px; line-height: 1.25; font-weight: 400; }
        .content { margin-bottom: 10px; }
        .summary-notes {
          font-size: 8.1pt;
          line-height: 1.42;
          min-width: 0;
          white-space: pre-line;
          margin-top: 10px;
        }
        .summary-notes p,
        .summary-notes li {
          margin: 2px 0;
        }
        .summary-notes ul,
        .summary-notes ol {
          padding-left: 16px;
          margin: 2px 0;
        }
        .summary-notes h1,
        .summary-notes h2,
        .summary-notes h3,
        .summary-notes h4 {
          font-size: 8.3pt;
          font-weight: 600;
          margin: 4px 0 2px;
        }
        .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 10px; page-break-inside: avoid; }
        .totals-table { width: 320px; border-collapse: collapse; font-size: 8.2pt; }
        .totals-table td { padding: 6px 9px; border-bottom: 1px solid #d0d0d0; }
        .totals-table td:first-child { text-align: left; width: 60%; }
        .totals-table td:last-child { text-align: right; width: 40%; font-weight: 500; }
        .totals-table tr.total-row { background-color: #9DD9D9; font-weight: 600; }
        .totals-table tr.total-row td { border-bottom: none; padding: 7px 9px; }
        .notes { margin-top: 13px; font-size: 8pt; line-height: 1.4; }
        .notes p { margin: 2px 0; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-left">
            <h1>Nabídka č. ${offer.order_number}_${offer.sequence_number}</h1>
            <h2>${escapeHtml(offer.order_title || offer.name || '')}</h2>
            <div class="dates">
              <div>Datum vystavení: ${formatDate(offer.issue_date)}</div>
              <div>Datum platnosti: ${formatDate(offer.validity_date)}</div>
            </div>
          </div>
          <div class="header-right">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Černý Strnad Elektroprojekce" class="logo-image">` : ''}
          </div>
        </div>

        <div class="parties">
          <div class="party">
            <h3>Dodavatel</h3>
            <p>Černý Strnad - elektroprojekce s.r.o.</p>
            <p>IČ: 19134894</p>
            <p>DIČ: CZ19134894</p>
            <p>Thákurova 550/1, 160 00 Praha 6</p>
            <p>info@cernystrnad-elektroprojekce.cz</p>
          </div>
          <div class="party">
            <h3>Příjemce</h3>
            <p>${escapeHtml(offer.customer_name || '')}</p>
            <p>IČ: ${escapeHtml(offer.ic || '')}</p>
            <p>DIČ: ${escapeHtml(offer.dic || '')}</p>
            <p>${escapeHtml([offer.street, offer.house_number, offer.postal_code, offer.city].filter(Boolean).join(', '))}</p>
            <p>${escapeHtml(offer.email || '')}</p>
          </div>
        </div>

        <div class="content">
          <h2 class="section-title">Nabídka zahrnuje</h2>
          <table class="offer-table">
            <thead>
              <tr>
                <th style="width: 50%;">Položka</th>
                <th style="width: 15%;">Množství</th>
                <th class="text-right" style="width: 17.5%;">Položková<br>cena</th>
                <th class="text-right" style="width: 17.5%;">Celková cena</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${extraCostsHtml}
            </tbody>
          </table>

          <div class="totals-wrapper">
            <table class="totals-table">
              <tr>
                <td>Celková částka bez DPH</td>
                <td>${formatNumber(totalWithoutVat)} Kč</td>
              </tr>
              <tr>
                <td>DPH 21%</td>
                <td>${formatNumber(vat)} Kč</td>
              </tr>
              <tr class="total-row">
                <td>Celková částka vč. DPH</td>
                <td>${formatNumber(totalWithVat)} Kč</td>
              </tr>
            </table>
          </div>

          <div class="summary-notes">
            ${combinationContent || ''}
            ${weakCurrentLines.map((line: string) => `<p>${escapeHtml(line)}</p>`).join('')}
            ${offer.note ? `<p>${escapeHtml(offer.note)}</p>` : ''}
            ${templateContent || ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default router;
