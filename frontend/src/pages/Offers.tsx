import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { offerService } from '../services/offer.service';
import { orderService } from '../services/order.service';
import { categoryService } from '../services/category.service';
import { Offer, Order, MainCategory, Subcategory, WeakCurrentItem, TextTemplate, CategoryCombination } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FiPlus, FiTrash2, FiEye, FiEdit, FiPrinter } from 'react-icons/fi';
import Modal from '../components/Modal';
import { useUIStore } from '../store/uiStore';

interface OfferFormData {
  orderId: number | null;
  name: string;
  mainCategoryCode: string;
  subcategoryCode: string;
  issueDate: string;
  validityDate: string;
  travelCostsEnabled: boolean;
  travelCostsKmQuantity: string;
  travelCostsKmPrice: string;
  travelCostsHoursQuantity: string;
  travelCostsHoursPrice: string;
  assemblyEnabled: boolean;
  assemblyQuantity: string;
  assemblyPrice: string;
  weakCurrentEnabled: boolean;
  selectedWeakCurrentItems: string[];
  note: string;
  textTemplateId: number | null;
  customTextContent: string;
  combinationTextContent: string;
}

interface OfferItemFormData {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

function Offers() {
  const COMBINATION_START = '<!--CS_COMBINATION_START-->';
  const COMBINATION_END = '<!--CS_COMBINATION_END-->';
  const TEMPLATE_START = '<!--CS_TEMPLATE_START-->';
  const TEMPLATE_END = '<!--CS_TEMPLATE_END-->';

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [combinations, setCombinations] = useState<CategoryCombination[]>([]);
  const [weakCurrentItems, setWeakCurrentItems] = useState<WeakCurrentItem[]>([]);
  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [printingOfferId, setPrintingOfferId] = useState<number | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [formData, setFormData] = useState<OfferFormData>({
    orderId: null,
    name: '',
    mainCategoryCode: '',
    subcategoryCode: '',
    issueDate: today,
    validityDate: twoWeeksLater,
    travelCostsEnabled: false,
    travelCostsKmQuantity: '0',
    travelCostsKmPrice: '0',
    travelCostsHoursQuantity: '0',
    travelCostsHoursPrice: '0',
    assemblyEnabled: false,
    assemblyQuantity: '0',
    assemblyPrice: '0',
    weakCurrentEnabled: false,
    selectedWeakCurrentItems: [],
    note: '',
    textTemplateId: null,
    customTextContent: '',
    combinationTextContent: '',
  });

  const [items, setItems] = useState<OfferItemFormData[]>([
    { name: '', description: '', quantity: '1', unitPrice: '0', totalPrice: '0' }
  ]);

  const formatCodeLabel = (code?: string, description?: string, name?: string) => {
    const secondValue = (description || name || '').trim();
    const firstValue = (code || '').trim();
    if (!firstValue) return secondValue;
    if (!secondValue) return firstValue;
    return firstValue.toLowerCase() === secondValue.toLowerCase()
      ? firstValue
      : `${firstValue} - ${secondValue}`;
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const plainTextToHtml = (text: string) => {
    const normalized = (text || '').trim();
    if (!normalized) return '';

    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  };

  const htmlToPlainText = (html: string) => {
    if (!html) return '';

    const withParagraphBreaks = html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n\n')
      .replace(/<\s*p[^>]*>/gi, '');

    const withoutTags = withParagraphBreaks
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return withoutTags.replace(/\n{3,}/g, '\n\n').trim();
  };

  const serializeCombinedContent = (combinationText: string, templateHtml: string) => {
    const combinationHtml = plainTextToHtml(combinationText);
    const normalizedTemplateHtml = (templateHtml || '').trim();

    if (!combinationHtml && !normalizedTemplateHtml) return '';

    return `${COMBINATION_START}${combinationHtml}${COMBINATION_END}${TEMPLATE_START}${normalizedTemplateHtml}${TEMPLATE_END}`;
  };

  const parseCombinedContent = (content: string) => {
    const normalized = content || '';
    const comboStart = normalized.indexOf(COMBINATION_START);
    const comboEnd = normalized.indexOf(COMBINATION_END);
    const templateStart = normalized.indexOf(TEMPLATE_START);
    const templateEnd = normalized.indexOf(TEMPLATE_END);

    if (comboStart === -1 || comboEnd === -1 || templateStart === -1 || templateEnd === -1) {
      return null;
    }

    const combinationHtml = normalized.slice(comboStart + COMBINATION_START.length, comboEnd).trim();
    const templateHtml = normalized.slice(templateStart + TEMPLATE_START.length, templateEnd).trim();

    return {
      combinationTextContent: htmlToPlainText(combinationHtml),
      customTextContent: templateHtml,
    };
  };

  const openEditOffer = async (offerId: number) => {
    try {
      const offer = await offerService.getById(offerId);
      setSelectedOrderId(offer.orderId);
      await handleEditOffer(offer);
    } catch (error) {
      alert('Nepodařilo se načíst nabídku pro editaci');
    }
  };

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    const editOfferIdParam = searchParams.get('editOfferId');

    // Varianta 3: stránka Offers je interní editor otevřený ze zakázky,
    // proto bez URL kontextu přesměrujeme na přehled zakázek.
    if (!orderIdParam && !editOfferIdParam) {
      navigate('/orders', { replace: true });
      return;
    }

    loadOrders();
    loadCategories();

    // Zkontrolovat URL parametr orderId
    if (orderIdParam) {
      const orderId = parseInt(orderIdParam);
      setSelectedOrderId(orderId);
      setFormData(prev => ({ ...prev, orderId }));
      // Otevřít modal pro novou nabídku
      setIsModalOpen(true);
    }

    if (editOfferIdParam) {
      const offerId = parseInt(editOfferIdParam, 10);
      if (!Number.isNaN(offerId)) {
        openEditOffer(offerId);
      }
    }
  }, [searchParams, navigate]);

  const loadCategories = async () => {
    try {
      const [mainCats, subCats, comboData, weakItems, textTemps] = await Promise.all([
        categoryService.getMainCategories(),
        categoryService.getSubcategories(),
        categoryService.getCombinations(),
        categoryService.getWeakCurrentItems(),
        categoryService.getTextTemplates(),
      ]);
      console.log('Loaded categories:', { mainCats, subCats, comboData, weakItems, textTemps });
      setMainCategories(mainCats);
      setSubcategories(subCats);
      setCombinations(comboData);
      setWeakCurrentItems(weakItems);
      setTextTemplates(textTemps);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      loadOffers(selectedOrderId);
    } else {
      setOffers([]);
    }
  }, [selectedOrderId]);

  const loadOrders = async () => {
    try {
      const data = await orderService.getAll();
      // Nabídku je možné založit i pro "Nová zakázka".
      const openOrders = data.filter((order) => {
        const statusName = (order.statusName || '').toLowerCase();
        return statusName === 'nová zakázka' || statusName === 'nabídka';
      });
      setOrders(openOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async (orderId: number) => {
    try {
      const data = await offerService.getByOrderId(orderId);
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', description: '', quantity: '1', unitPrice: '0', totalPrice: '0' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OfferItemFormData, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0;
      const unitPrice = parseFloat(field === 'unitPrice' ? value : newItems[index].unitPrice) || 0;
      newItems[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }
    
    setItems(newItems);
  };

  const getCombinationPlainText = (mainCategoryCode: string, subcategoryCode: string) => {
    if (!mainCategoryCode || !subcategoryCode) return null;

    const combination = combinations.find(
      (c) => c.mainCategoryCode === mainCategoryCode && c.subcategoryCode === subcategoryCode
    );

    if (!combination?.htmlContent) return null;
    return htmlToPlainText(combination.htmlContent);
  };

  const handleTextTemplateChange = (templateId: number | null) => {
    setFormData((prev) => ({ ...prev, textTemplateId: templateId }));
    
    // Najít template a propsat jeho obsah do customTextContent
    if (!templateId) return;

    const template = textTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({ ...prev, customTextContent: template.htmlContent }));
    }
  };

  const handleMainCategoryChange = (mainCategoryCode: string) => {
    setFormData((prev) => {
      const next = { ...prev, mainCategoryCode };
      const combinationTextContent = getCombinationPlainText(mainCategoryCode, prev.subcategoryCode);

      return {
        ...next,
        combinationTextContent: combinationTextContent || '',
      };
    });
  };

  const handleSubcategoryChange = (subcategoryCode: string) => {
    setFormData((prev) => {
      const next = { ...prev, subcategoryCode };
      const combinationTextContent = getCombinationPlainText(prev.mainCategoryCode, subcategoryCode);

      return {
        ...next,
        combinationTextContent: combinationTextContent || '',
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId) {
      alert('Vyberte prosím zakázku');
      return;
    }

    const validItems = items.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      alert('Přidejte alespoň jednu položku');
      return;
    }

    setSaving(true);
    try {
      const resolvedCustomTextContent = serializeCombinedContent(
        formData.combinationTextContent,
        formData.customTextContent
      );

      const offerData = {
        orderId: formData.orderId,
        name: formData.name,
        mainCategoryCode: formData.mainCategoryCode || undefined,
        subcategoryCode: formData.subcategoryCode || undefined,
        issueDate: formData.issueDate,
        validityDate: formData.validityDate,
        travelCostsEnabled: formData.travelCostsEnabled,
        travelCostsKmQuantity: parseFloat(formData.travelCostsKmQuantity) || 0,
        travelCostsKmPrice: parseFloat(formData.travelCostsKmPrice) || 0,
        travelCostsHoursQuantity: parseFloat(formData.travelCostsHoursQuantity) || 0,
        travelCostsHoursPrice: parseFloat(formData.travelCostsHoursPrice) || 0,
        assemblyEnabled: formData.assemblyEnabled,
        assemblyQuantity: parseFloat(formData.assemblyQuantity) || 0,
        assemblyPrice: parseFloat(formData.assemblyPrice) || 0,
        weakCurrentEnabled: formData.weakCurrentEnabled,
        selectedWeakCurrentItems: formData.selectedWeakCurrentItems,
        note: formData.note,
        textTemplateId: formData.textTemplateId ?? undefined,
        customTextContent: resolvedCustomTextContent,
        items: validItems.map((item, index) => ({
          name: item.name,
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || 0,
          orderIndex: index,
        })),
      };

      if (editingOfferId) {
        await offerService.update(editingOfferId, offerData);
      } else {
        await offerService.create(offerData);
      }
      
      handleCloseModal();
      if (selectedOrderId) {
        loadOffers(selectedOrderId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || (editingOfferId ? 'Chyba při aktualizaci nabídky' : 'Chyba při vytváření nabídky'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditOffer = async (offer: Offer) => {
    try {
      // Načíst položky nabídky
      const offerItems = await offerService.getItems(offer.id);
      const parsedContent = parseCombinedContent(offer.customTextContent || '');
      const fallbackCombinationText = offer.textTemplateId ? '' : htmlToPlainText(offer.customTextContent || '');
      const fallbackTemplateContent = offer.textTemplateId ? (offer.customTextContent || '') : '';
      
      setEditingOfferId(offer.id);
      setFormData({
        orderId: offer.orderId,
        name: offer.name || '',
        mainCategoryCode: offer.mainCategoryCode || '',
        subcategoryCode: offer.subcategoryCode || '',
        issueDate: offer.issueDate,
        validityDate: offer.validityDate,
        travelCostsEnabled: offer.travelCostsEnabled,
        travelCostsKmQuantity: (offer.travelCostsKmQuantity || 0).toString(),
        travelCostsKmPrice: (offer.travelCostsKmPrice || 0).toString(),
        travelCostsHoursQuantity: (offer.travelCostsHoursQuantity || 0).toString(),
        travelCostsHoursPrice: (offer.travelCostsHoursPrice || 0).toString(),
        assemblyEnabled: offer.assemblyEnabled,
        assemblyQuantity: (offer.assemblyQuantity || 0).toString(),
        assemblyPrice: (offer.assemblyPrice || 0).toString(),
        weakCurrentEnabled: offer.weakCurrentEnabled || false,
        selectedWeakCurrentItems: offer.selectedWeakCurrentItems || [],
        note: offer.note || '',
        textTemplateId: offer.textTemplateId || null,
        customTextContent: parsedContent?.customTextContent ?? fallbackTemplateContent,
        combinationTextContent: parsedContent?.combinationTextContent ?? fallbackCombinationText,
      });
      
      setItems(offerItems.length > 0 ? offerItems.map(item => ({
        name: item.name,
        description: item.description || '',
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })) : [{ name: '', description: '', quantity: '1', unitPrice: '0', totalPrice: '0' }]);
      
      setIsViewMode(false);
      setIsModalOpen(true);
    } catch (error) {
      alert('Nepodařilo se načíst data nabídky');
    }
  };

  const handleDeleteOffer = async () => {
    if (!editingOfferId) return;
    
    if (!confirm('Opravdu chcete smazat tuto nabídku?')) return;

    try {
      await offerService.delete(editingOfferId);
      handleCloseModal();
      if (selectedOrderId) {
        loadOffers(selectedOrderId);
      }
    } catch (error) {
      alert('Nepodařilo se smazat nabídku');
    }
  };

  const handlePrintOffer = async (offerId: number) => {
    setPrintingOfferId(offerId);
    try {
      const result = await offerService.generatePdf(offerId);
      const url = offerService.getPdfPublicUrl(result.fileUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const message = (error as any)?.response?.data?.error || 'Nepodařilo se vygenerovat PDF nabídky';
      alert(message);
    } finally {
      setPrintingOfferId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOfferId(null);
    setIsViewMode(false);
    setFormData({
      orderId: selectedOrderId,
      name: '',
      mainCategoryCode: '',
      subcategoryCode: '',
      issueDate: today,
      validityDate: twoWeeksLater,
      travelCostsEnabled: false,
      travelCostsKmQuantity: '0',
      travelCostsKmPrice: '0',
      travelCostsHoursQuantity: '0',
      travelCostsHoursPrice: '0',
      assemblyEnabled: false,
      assemblyQuantity: '0',
      assemblyPrice: '0',
      weakCurrentEnabled: false,
      selectedWeakCurrentItems: [],
      note: '',
      textTemplateId: null,
      customTextContent: '',
      combinationTextContent: '',
    });
    setItems([{ name: '', description: '', quantity: '1', unitPrice: '0', totalPrice: '0' }]);
  };

  const selectedMainCategory = mainCategories.find((cat) => cat.code === formData.mainCategoryCode);
  const selectedSubcategory = subcategories.find((cat) => cat.code === formData.subcategoryCode);
  const combinationPairLabel =
    formData.mainCategoryCode && formData.subcategoryCode
      ? `${formatCodeLabel(selectedMainCategory?.code, selectedMainCategory?.description, selectedMainCategory?.name)} + ${formatCodeLabel(selectedSubcategory?.code, selectedSubcategory?.description, selectedSubcategory?.name)}`
      : 'Nejprve vyberte typ dokumentace a specifikaci';

  if (loading) {
    return <div className="text-center py-12">Načítání...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Nabídky</h1>
        <button 
          onClick={() => {
            setFormData({ ...formData, orderId: selectedOrderId });
            setIsModalOpen(true);
          }}
          disabled={!selectedOrderId}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPlus /> Nová nabídka
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vyberte zakázku
        </label>
        <select
          value={selectedOrderId || ''}
          onChange={(e) => setSelectedOrderId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- Vyberte zakázku --</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.number} - {order.title} ({order.customerName})
            </option>
          ))}
        </select>
      </div>

      {selectedOrderId && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {offers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Pro tuto zakázku zatím neexistují žádné nabídky
            </div>
          ) : (
            <OffersList
              offers={offers}
              printingOfferId={printingOfferId}
              onView={(id) => navigate(`/offers/${id}`)}
              onEdit={handleEditOffer}
              onPrint={handlePrintOffer}
            />
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isViewMode ? 'Detail nabídky' : editingOfferId ? 'Upravit nabídku' : 'Nová nabídka'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-4 p-1">
          {/* Základní informace */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Základní informace</h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Název nabídky
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isViewMode}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Např. Nabídka na elektroinstalace"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Typ dokumentace
                </label>
                <select
                  value={formData.mainCategoryCode}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  disabled={isViewMode}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Vyberte typ --</option>
                  {mainCategories.map((cat) => (
                    <option key={cat.code} value={cat.code} title={cat.description}>
                      {cat.code} {cat.description ? `- ${cat.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Specifikace
                </label>
                <select
                  value={formData.subcategoryCode}
                  onChange={(e) => handleSubcategoryChange(e.target.value)}
                  disabled={isViewMode}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Vyberte specifikaci --</option>
                  {subcategories.map((cat) => (
                    <option key={cat.code} value={cat.code} title={cat.description}>
                      {formatCodeLabel(cat.code, cat.description, cat.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Slaboproud */}
          <div className="border-t pt-3">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="weakCurrentEnabled"
                checked={formData.weakCurrentEnabled}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  weakCurrentEnabled: e.target.checked,
                  selectedWeakCurrentItems: e.target.checked ? formData.selectedWeakCurrentItems : []
                })}
                disabled={isViewMode}
                className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:cursor-not-allowed"
              />
              <label htmlFor="weakCurrentEnabled" className="text-xs font-medium text-gray-700">
                Slaboproud
              </label>
            </div>
            
            {formData.weakCurrentEnabled && (
              <div>
                <select
                  multiple
                  value={formData.selectedWeakCurrentItems}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData({ ...formData, selectedWeakCurrentItems: selected });
                  }}
                  disabled={isViewMode}
                  size={4}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {weakCurrentItems.map((item) => (
                    <option key={item.code} value={item.code} title={item.description}>
                      {formatCodeLabel(item.code, item.description, item.name)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Podržte Ctrl/Cmd pro výběr více položek</p>
              </div>
            )}
          </div>

          {/* Poznámka */}
          <div className="border-t pt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Poznámka
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              disabled={isViewMode}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Volitelná poznámka k nabídce..."
            />
          </div>

          {/* Textace */}
          <div className="border-t pt-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-900">Textace</h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vyberte předlohu textace
              </label>
              <select
                value={formData.textTemplateId || ''}
                onChange={(e) => handleTextTemplateChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={isViewMode}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Bez textace --</option>
                {textTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {(formData.textTemplateId || formData.customTextContent) && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Obsah textace (můžete upravit)
                </label>
                <textarea
                  value={formData.customTextContent}
                  onChange={(e) => setFormData({ ...formData, customTextContent: e.target.value })}
                  disabled={isViewMode}
                  rows={3}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                />
              </div>
            )}
          </div>

          {/* Kombinace */}
          <div className="border-t pt-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-900">Kombinace</h3>
            <p className="text-xs text-gray-600">
              Kombinace je oddělená od textace a upravuje se jako čistý text (bez HTML).
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1">
              Kombinace pro: {combinationPairLabel}
            </label>

            <textarea
              value={formData.combinationTextContent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  combinationTextContent: e.target.value,
                }))
              }
              disabled={isViewMode}
              rows={4}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed whitespace-pre-wrap"
              placeholder={formData.mainCategoryCode && formData.subcategoryCode ? 'Text kombinace...' : 'Nejprve vyberte typ dokumentace a specifikaci'}
            />
          </div>

          {/* Datum vystavení */}
          <div className="border-t pt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Datum vystavení *
            </label>
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              disabled={isViewMode}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required={!isViewMode}
            />
          </div>

          {/* Cestovné */}
          <div className="border-t pt-3">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={formData.travelCostsEnabled}
                onChange={(e) => setFormData({ ...formData, travelCostsEnabled: e.target.checked })}
                disabled={isViewMode}
                className="h-4 w-4 text-primary-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label className="ml-2 text-xs font-medium text-gray-700">
                Zahrnout cestovní náklady
              </label>
            </div>
            
            {formData.travelCostsEnabled && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-6">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Km</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.travelCostsKmQuantity}
                    onChange={(e) => setFormData({ ...formData, travelCostsKmQuantity: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cena/km (Kč)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.travelCostsKmPrice}
                    onChange={(e) => setFormData({ ...formData, travelCostsKmPrice: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hodiny</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.travelCostsHoursQuantity}
                    onChange={(e) => setFormData({ ...formData, travelCostsHoursQuantity: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cena/h (Kč)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.travelCostsHoursPrice}
                    onChange={(e) => setFormData({ ...formData, travelCostsHoursPrice: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Montáž */}
          <div className="border-t pt-3">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={formData.assemblyEnabled}
                onChange={(e) => setFormData({ ...formData, assemblyEnabled: e.target.checked })}
                disabled={isViewMode}
                className="h-4 w-4 text-primary-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label className="ml-2 text-xs font-medium text-gray-700">
                Zahrnout náklady na kompletaci
              </label>
            </div>
            
            {formData.assemblyEnabled && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Množství</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.assemblyQuantity}
                    onChange={(e) => setFormData({ ...formData, assemblyQuantity: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cena (Kč)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.assemblyPrice}
                    onChange={(e) => setFormData({ ...formData, assemblyPrice: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Položky nabídky */}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-medium text-gray-700">Položky nabídky</h3>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                >
                  + Přidat položku
                </button>
              )}
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start border p-2 rounded-md">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Název *"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        disabled={isViewMode}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Popis"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        disabled={isViewMode}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Množství"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        disabled={isViewMode}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Jedn. cena"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        disabled={isViewMode}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Celkem"
                        value={item.totalPrice}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                  {items.length > 1 && !isViewMode && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div>
              {editingOfferId && !isViewMode && (
                <button
                  type="button"
                  onClick={handleDeleteOffer}
                  className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span>Smazat</span>
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {isViewMode ? 'Zavřít' : 'Zrušit'}
              </button>
              {isViewMode && editingOfferId && (
                <button
                  type="button"
                  onClick={() => setIsViewMode(false)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Upravit
                </button>
              )}
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Ukládám...' : 'Uložit'}
                </button>
              )}
            </div>
          </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}

function OffersList({ offers, printingOfferId, onView, onEdit, onPrint }: {
  offers: Offer[];
  printingOfferId: number | null;
  onView: (id: number) => void;
  onEdit: (offer: Offer) => void;
  onPrint: (id: number) => void;
}) {
  const { mobileView } = useUIStore();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const showCards = mobileView || isMobile;

  if (showCards) {
    return (
      <div className="space-y-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white rounded-lg shadow p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Verze #{offer.sequenceNumber}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vystavení: {format(new Date(offer.issueDate), 'dd.MM.yyyy', { locale: cs })}
                </p>
                <p className="text-xs text-gray-500">
                  Platnost do: {format(new Date(offer.validityDate), 'dd.MM.yyyy', { locale: cs })}
                </p>
                <div className="flex gap-2 mt-1">
                  {offer.travelCostsEnabled && <span className="text-xs text-green-600">✓ Cestovné</span>}
                  {offer.assemblyEnabled && <span className="text-xs text-green-600">✓ Montáž</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                <button
                  onClick={() => onView(offer.id!)}
                  className="text-primary-600 hover:text-primary-900 p-1"
                  title="Zobrazit detail"
                >
                  <FiEye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(offer)}
                  className="text-blue-600 hover:text-blue-900 p-1"
                  title="Upravit"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPrint(offer.id!)}
                  disabled={printingOfferId === offer.id}
                  className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50 p-1"
                  title="Tisk do PDF"
                >
                  <FiPrinter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Číslo verze</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum vystavení</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platnost do</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cestovné</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montáž</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {offers.map((offer) => (
          <tr key={offer.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{offer.sequenceNumber}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {format(new Date(offer.issueDate), 'dd.MM.yyyy', { locale: cs })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {format(new Date(offer.validityDate), 'dd.MM.yyyy', { locale: cs })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {offer.travelCostsEnabled ? <span className="text-green-600">✓ Ano</span> : <span className="text-gray-400">Ne</span>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {offer.assemblyEnabled ? <span className="text-green-600">✓ Ano</span> : <span className="text-gray-400">Ne</span>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div className="flex space-x-2">
                <button onClick={() => onView(offer.id!)} className="text-primary-600 hover:text-primary-900" title="Zobrazit detail">
                  <FiEye className="w-5 h-5" />
                </button>
                <button onClick={() => onEdit(offer)} className="text-blue-600 hover:text-blue-900" title="Upravit">
                  <FiEdit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onPrint(offer.id!)}
                  disabled={printingOfferId === offer.id}
                  className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50"
                  title="Tisk do PDF"
                >
                  <FiPrinter className="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Offers;
