import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { offerService } from '../services/offer.service';
import { orderService } from '../services/order.service';
import { customerService } from '../services/customer.service';
import { categoryService } from '../services/category.service';
import { Customer, MainCategory, Offer, OfferItem, OfferPdf, Order, Subcategory, TextTemplate, WeakCurrentItem } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FiArrowLeft, FiEdit, FiExternalLink, FiPrinter } from 'react-icons/fi';

const COMBINATION_START = '<!--CS_COMBINATION_START-->';
const COMBINATION_END = '<!--CS_COMBINATION_END-->';
const TEMPLATE_START = '<!--CS_TEMPLATE_START-->';
const TEMPLATE_END = '<!--CS_TEMPLATE_END-->';

const htmlToPlainText = (html: string) => {
  if (!html) return '';

  const withLineBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*p[^>]*>/gi, '');

  return withLineBreaks
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getReadableContents = (content?: string) => {
  const normalized = String(content || '');
  const combinationStart = normalized.indexOf(COMBINATION_START);
  const combinationEnd = normalized.indexOf(COMBINATION_END);
  const templateStart = normalized.indexOf(TEMPLATE_START);
  const templateEnd = normalized.indexOf(TEMPLATE_END);

  if (combinationStart !== -1 && combinationEnd !== -1 && templateStart !== -1 && templateEnd !== -1) {
    const combinationHtml = normalized.slice(combinationStart + COMBINATION_START.length, combinationEnd).trim();
    const templateHtml = normalized.slice(templateStart + TEMPLATE_START.length, templateEnd).trim();
    return {
      combinationContent: htmlToPlainText(combinationHtml),
      templateContent: htmlToPlainText(templateHtml),
    };
  }

  if (combinationStart !== -1 && combinationEnd !== -1) {
    const combinationHtml = normalized.slice(combinationStart + COMBINATION_START.length, combinationEnd).trim();
    const withoutCombination = normalized
      .slice(0, combinationStart)
      .concat(normalized.slice(combinationEnd + COMBINATION_END.length));
    return {
      combinationContent: htmlToPlainText(combinationHtml),
      templateContent: htmlToPlainText(withoutCombination),
    };
  }

  return {
    combinationContent: '',
    templateContent: htmlToPlainText(normalized),
  };
};

function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [weakItems, setWeakItems] = useState<WeakCurrentItem[]>([]);
  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [generatedPdfs, setGeneratedPdfs] = useState<OfferPdf[]>([]);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadDetail = async () => {
      try {
        const offerId = parseInt(id, 10);
        const [offerData, offerItems] = await Promise.all([
          offerService.getById(offerId),
          offerService.getItems(offerId),
        ]);

        setOffer(offerData);
        setItems(offerItems);
        await loadGeneratedPdfs(offerId);

        const [orderData, categoriesMain, categoriesSub, weak, templates] = await Promise.all([
          orderService.getById(offerData.orderId),
          categoryService.getMainCategories(),
          categoryService.getSubcategories(),
          categoryService.getWeakCurrentItems(),
          categoryService.getTextTemplates(),
        ]);

        setOrder(orderData);
        setMainCategories(categoriesMain);
        setSubcategories(categoriesSub);
        setWeakItems(weak);
        setTextTemplates(templates);

        if (orderData.customerId) {
          const customerData = await customerService.getById(orderData.customerId);
          setCustomer(customerData);
        }
      } catch (error) {
        console.error('Failed to load offer detail:', error);
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id, navigate]);

  const loadGeneratedPdfs = async (offerId: number) => {
    try {
      const pdfs = await offerService.getGeneratedPdfs(offerId);
      setGeneratedPdfs(pdfs);
    } catch (error) {
      console.error('Failed to load generated PDFs:', error);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('cs-CZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0),
    [items]
  );

  const getMainCategoryLabel = () => {
    if (!offer?.mainCategoryCode) return '—';
    const found = mainCategories.find((c) => c.code === offer.mainCategoryCode);
    if (!found) return offer.mainCategoryCode;
    return found.description ? `${found.code} - ${found.description}` : found.code;
  };

  const getSubcategoryLabel = () => {
    if (!offer?.subcategoryCode) return '—';
    const found = subcategories.find((c) => c.code === offer.subcategoryCode);
    if (!found) return offer.subcategoryCode;
    return found.description ? `${found.code} - ${found.description}` : found.code;
  };

  const weakItemLabels = useMemo(() => {
    if (!offer?.selectedWeakCurrentItems || offer.selectedWeakCurrentItems.length === 0) return [];
    return offer.selectedWeakCurrentItems.map((code) => {
      const found = weakItems.find((w) => w.code === code);
      if (!found) return code;
      return found.description ? `${found.code} - ${found.description}` : found.code;
    });
  }, [offer?.selectedWeakCurrentItems, weakItems]);

  const templateName = useMemo(() => {
    if (!offer?.textTemplateId) return '—';
    return textTemplates.find((t) => t.id === offer.textTemplateId)?.name || '—';
  }, [offer?.textTemplateId, textTemplates]);

  const { combinationContent, templateContent } = useMemo(
    () => getReadableContents(offer?.customTextContent),
    [offer?.customTextContent]
  );

  const handlePrintPdf = async () => {
    if (!offer) return;
    setPrinting(true);
    try {
      const result = await offerService.generatePdf(offer.id);
      const url = offerService.getPdfPublicUrl(result.fileUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
      await loadGeneratedPdfs(offer.id);
    } catch (error) {
      const message = (error as any)?.response?.data?.error || 'Nepodařilo se vygenerovat PDF nabídky';
      alert(message);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Načítání...</div>;
  }

  if (!offer) {
    return <div className="text-center py-12">Nabídka nenalezena</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(`/orders/${offer.orderId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span>Zpět na zakázku</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nabídka #{offer.sequenceNumber}</h1>
          <p className="text-sm text-gray-500">{offer.name || 'Bez názvu nabídky'}</p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPdf}
              disabled={printing}
              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <FiPrinter className="w-4 h-4" />
              {printing ? 'Generuji PDF...' : 'Tisk do PDF'}
            </button>
            <button
              onClick={() => navigate(`/offers?editOfferId=${offer.id}`)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <FiEdit className="w-4 h-4" />
              Upravit nabídku a položky
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Základní informace</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Typ dokumentace</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{getMainCategoryLabel()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Specifikace</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{getSubcategoryLabel()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Datum vystavení</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {format(new Date(offer.issueDate), 'dd.MM.yyyy', { locale: cs })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Platnost do</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {format(new Date(offer.validityDate), 'dd.MM.yyyy', { locale: cs })}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Poznámka</p>
                <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-wrap">{offer.note || '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Náklady a položky</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-md p-3">
                <p className="text-sm text-gray-500">Cestovní náklady</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {offer.travelCostsEnabled
                    ? `${offer.travelCostsKmQuantity || 0} km x ${offer.travelCostsKmPrice || 0} Kč, ${offer.travelCostsHoursQuantity || 0} h x ${offer.travelCostsHoursPrice || 0} Kč`
                    : 'Nezahrnuto'}
                </p>
              </div>
              <div className="border rounded-md p-3">
                <p className="text-sm text-gray-500">Náklady na kompletaci</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {offer.assemblyEnabled
                    ? `${offer.assemblyQuantity || 0} x ${offer.assemblyPrice || 0} Kč`
                    : 'Nezahrnuto'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Název</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popis</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Množství</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jedn. cena</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Celkem</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{item.description || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatCurrency(Number(item.unitPrice) || 0)} Kč</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">{formatCurrency(Number(item.totalPrice) || 0)} Kč</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Textace, kombinace a slaboproud</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Textace</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{templateName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Slaboproud</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {offer.weakCurrentEnabled ? weakItemLabels.join(', ') || 'Zapnuto bez položek' : 'Nezahrnuto'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <p className="text-sm text-gray-500">Kombinace</p>
                <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-wrap">
                  {combinationContent || '—'}
                </p>
              </div>

              <div className="border rounded-md p-4">
                <p className="text-sm text-gray-500">Obsah textace</p>
                <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-wrap">
                  {templateContent || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vygenerovaná PDF</h2>
            {generatedPdfs.length === 0 ? (
              <p className="text-sm text-gray-500">Zatím nebylo vygenerováno žádné PDF.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soubor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vygeneroval</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedPdfs.map((pdf) => (
                      <tr key={pdf.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">PDF #{pdf.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{pdf.createdByName || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {pdf.createdAt ? format(new Date(pdf.createdAt), 'dd.MM.yyyy HH:mm', { locale: cs }) : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => window.open(offerService.getPdfPublicUrl(pdf.fileUrl), '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-900"
                          >
                            <FiExternalLink className="w-4 h-4" />
                            Otevřít
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Souhrn nabídky</h2>
            <div>
              <p className="text-sm text-gray-500">Zakázka</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{order ? `${order.number} - ${order.title}` : '—'}</p>
              {order && (
                <button
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="text-xs text-primary-600 hover:text-primary-900 mt-1"
                >
                  Zobrazit detail zakázky
                </button>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Zákazník</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{customer?.name || order?.customerName || '—'}</p>
              {customer && (
                <button
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="text-xs text-primary-600 hover:text-primary-900 mt-1"
                >
                  Zobrazit detail zákazníka
                </button>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Počet položek</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">{items.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Celkem za položky</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">{formatCurrency(itemsTotal)} Kč</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfferDetail;
