import express from 'express';
import axios from 'axios';

const router = express.Router();

const normalizeIc = (value: string) => String(value || '').replace(/\D/g, '');

const mapAresResponse = (ic: string, data: any) => ({
  ic,
  name: data?.obchodniJmeno || '',
  dic: data?.dic || '',
  street: data?.sidlo?.nazevUlice || '',
  houseNumber: data?.sidlo?.cisloDomovni
    ? `${data.sidlo.cisloDomovni}${data.sidlo.cisloOrientacni ? '/' + data.sidlo.cisloOrientacni : ''}`
    : '',
  city: data?.sidlo?.nazevObce || '',
  postalCode: data?.sidlo?.psc ? data.sidlo.psc.toString() : '',
});

const shouldRetry = (error: any) => {
  const code = error?.code;
  return code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNABORTED';
};

async function fetchAresByIc(ic: string) {
  const apiBase = process.env.ARES_API_URL || 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';
  const maxAttempts = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await axios.get(`${apiBase}/${ic}`, { timeout: 7000 });
      return response.data;
    } catch (error: any) {
      lastError = error;
      if (!shouldRetry(error) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw lastError;
}

// Vyhledat firmu podle IČ přes ARES
async function handleSearchByIc(req: express.Request, res: express.Response) {
  try {
    const ic = normalizeIc(req.params.ic);

    if (!/^\d{8}$/.test(ic)) {
      return res.status(400).json({ error: 'IČ musí obsahovat přesně 8 číslic' });
    }

    const data = await fetchAresByIc(ic);

    if (!data) {
      return res.status(404).json({ error: 'Firma nenalezena' });
    }

    res.json(mapAresResponse(ic, data));
  } catch (error: any) {
    console.error('ARES error:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Firma s tímto IČ nebyla nalezena' });
    }

    if (shouldRetry(error)) {
      return res.status(503).json({ error: 'ARES je dočasně nedostupný, zkuste to prosím za chvíli znovu.' });
    }

    res.status(500).json({ error: 'Chyba při vyhledávání v ARES' });
  }
}

router.get('/search/:ic', handleSearchByIc);
router.get('/ico/:ic', handleSearchByIc);

export default router;
