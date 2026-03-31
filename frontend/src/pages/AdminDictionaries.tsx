import { useEffect, useState } from 'react';
import { categoryService } from '../services/category.service';
import { statusService } from '../services/status.service';
import { CategoryCombination, MainCategory, OrderStatus, Subcategory, TextTemplate, WeakCurrentItem } from '../types';
import { useAuthStore } from '../store/authStore';

type TabKey = 'main' | 'sub' | 'weak' | 'texts' | 'combinations' | 'statuses';

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

function AdminDictionaries() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [weakCurrentItems, setWeakCurrentItems] = useState<WeakCurrentItem[]>([]);
  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [combinations, setCombinations] = useState<CategoryCombination[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);

  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newCombinationMainCode, setNewCombinationMainCode] = useState('');
  const [newCombinationSubCode, setNewCombinationSubCode] = useState('');
  const [newCombinationContent, setNewCombinationContent] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusOrder, setNewStatusOrder] = useState('999');

  const [editingKey, setEditingKey] = useState<string | number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMainCode, setEditMainCode] = useState('');
  const [editSubCode, setEditSubCode] = useState('');
  const [editOrder, setEditOrder] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [main, sub, weak, texts, combos, allStatuses] = await Promise.all([
        categoryService.getMainCategories(),
        categoryService.getSubcategories(),
        categoryService.getWeakCurrentItems(),
        categoryService.getTextTemplates(),
        categoryService.getCombinations(),
        statusService.getAll(),
      ]);
      setMainCategories(main);
      setSubcategories(sub);
      setWeakCurrentItems(weak);
      setTextTemplates(texts);
      setCombinations(combos);
      setStatuses(allStatuses);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Nepodařilo se načíst číselníky');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEdit = (
    key: string | number,
    name: string,
    description = '',
    content = '',
    order = '',
    mainCode = '',
    subCode = ''
  ) => {
    setEditingKey(key);
    setEditName(name);
    setEditDescription(description || '');
    setEditContent(content || '');
    setEditOrder(order ? String(order) : '');
    setEditMainCode(mainCode || '');
    setEditSubCode(subCode || '');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditName('');
    setEditDescription('');
    setEditContent('');
    setEditMainCode('');
    setEditSubCode('');
    setEditOrder('');
  };

  const createCategoryItem = async (type: 'main' | 'sub' | 'weak') => {
    if (!newCode.trim()) return;
    const payload = {
      code: newCode.trim(),
      name: newCode.trim(),
      description: newDescription.trim(),
    };

    if (type === 'main') await categoryService.createMainCategory(payload);
    if (type === 'sub') await categoryService.createSubcategory(payload);
    if (type === 'weak') await categoryService.createWeakCurrentItem(payload);

    setNewCode('');
    setNewDescription('');
    await loadData();
  };

  const updateCategoryItem = async (type: 'main' | 'sub' | 'weak', code: string) => {
    const payload = { name: editName.trim() || code, description: editDescription.trim() };

    if (type === 'main') await categoryService.updateMainCategory(code, payload);
    if (type === 'sub') await categoryService.updateSubcategory(code, payload);
    if (type === 'weak') await categoryService.updateWeakCurrentItem(code, payload);

    cancelEdit();
    await loadData();
  };

  const deleteCategoryItem = async (type: 'main' | 'sub' | 'weak', code: string) => {
    if (!window.confirm(`Opravdu smazat položku ${code}?`)) return;

    if (type === 'main') await categoryService.deleteMainCategory(code);
    if (type === 'sub') await categoryService.deleteSubcategory(code);
    if (type === 'weak') await categoryService.deleteWeakCurrentItem(code);

    await loadData();
  };

  const createTextTemplate = async () => {
    if (!newTemplateName.trim()) return;
    await categoryService.createTextTemplate({
      name: newTemplateName.trim(),
      htmlContent: newTemplateContent,
    });
    setNewTemplateName('');
    setNewTemplateContent('');
    await loadData();
  };

  const updateTextTemplate = async (id: number) => {
    await categoryService.updateTextTemplate(id, {
      name: editName.trim(),
      htmlContent: editContent,
    });
    cancelEdit();
    await loadData();
  };

  const deleteTextTemplate = async (id: number) => {
    if (!window.confirm('Opravdu smazat textaci?')) return;
    await categoryService.deleteTextTemplate(id);
    await loadData();
  };

  const createCombination = async () => {
    if (!newCombinationMainCode || !newCombinationSubCode) return;
    await categoryService.createCombination({
      mainCategoryCode: newCombinationMainCode,
      subcategoryCode: newCombinationSubCode,
      htmlContent: plainTextToHtml(newCombinationContent),
    });
    setNewCombinationMainCode('');
    setNewCombinationSubCode('');
    setNewCombinationContent('');
    await loadData();
  };

  const updateCombination = async (id: number) => {
    if (!editMainCode || !editSubCode) return;
    await categoryService.updateCombination(id, {
      mainCategoryCode: editMainCode,
      subcategoryCode: editSubCode,
      htmlContent: plainTextToHtml(editContent),
    });
    cancelEdit();
    await loadData();
  };

  const deleteCombination = async (id: number) => {
    if (!window.confirm('Opravdu smazat kombinaci?')) return;
    await categoryService.deleteCombination(id);
    await loadData();
  };

  const createStatus = async () => {
    if (!newStatusName.trim()) return;
    await statusService.create({
      name: newStatusName.trim(),
      orderIndex: Number(newStatusOrder || '999'),
    });
    setNewStatusName('');
    setNewStatusOrder('999');
    await loadData();
  };

  const updateStatus = async (id: number) => {
    await statusService.update(id, {
      name: editName.trim(),
      orderIndex: Number(editOrder || '999'),
    });
    cancelEdit();
    await loadData();
  };

  const deleteStatus = async (id: number) => {
    if (!window.confirm('Opravdu smazat stav?')) return;
    await statusService.remove(id);
    await loadData();
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Správa číselníků</h1>
        <p className="text-sm text-red-600">Pouze administrátor nebo manažer může upravovat číselníky.</p>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'main', label: 'Hlavní kategorie' },
    { key: 'sub', label: 'Podkategorie' },
    { key: 'weak', label: 'Slaboproud' },
    { key: 'texts', label: 'Textace' },
    { key: 'combinations', label: 'Kombinace' },
    { key: 'statuses', label: 'Stavy' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-xl font-semibold text-gray-900">Správa číselníků</h1>
        <p className="text-sm text-gray-600">Hodnota1 = kód, Hodnota2 = vysvětlení/popis.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{error}</div>}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-4 py-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm ${
                activeTab === tab.key
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-x-auto">
          {loading && <p className="text-sm text-gray-500">Načítání...</p>}

          {!loading && (activeTab === 'main' || activeTab === 'sub' || activeTab === 'weak') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Hodnota1 (kód)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Hodnota2 (vysvětlení)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => createCategoryItem(activeTab as 'main' | 'sub' | 'weak')}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Přidat položku
                </button>
              </div>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Kód</th>
                    <th className="py-2 pr-2">Vysvětlení</th>
                    <th className="py-2">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'main' ? mainCategories : activeTab === 'sub' ? subcategories : weakCurrentItems).map((item) => (
                    <tr key={item.code} className="border-b">
                      <td className="py-2 pr-2 font-medium">{item.code}</td>
                      <td className="py-2 pr-2">
                        {editingKey === item.code ? (
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          item.description || ''
                        )}
                      </td>
                      <td className="py-2 space-x-2">
                        {editingKey === item.code ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateCategoryItem(activeTab as 'main' | 'sub' | 'weak', item.code)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                            >
                              Uložit
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
                            >
                              Zrušit
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item.code, item.name, item.description || '')}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                            >
                              Upravit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCategoryItem(activeTab as 'main' | 'sub' | 'weak', item.code)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                            >
                              Smazat
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'texts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  placeholder="Název textace"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="Obsah textace"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  rows={4}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={createTextTemplate}
                  className="w-fit px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Přidat textaci
                </button>
              </div>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Název</th>
                    <th className="py-2 pr-2">Obsah</th>
                    <th className="py-2">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {textTemplates.map((item) => (
                    <tr key={item.id} className="border-b align-top">
                      <td className="py-2 pr-2 w-56">
                        {editingKey === item.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {editingKey === item.id ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-xs text-gray-700">{item.htmlContent}</div>
                        )}
                      </td>
                      <td className="py-2 space-x-2 whitespace-nowrap">
                        {editingKey === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateTextTemplate(item.id)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                            >
                              Uložit
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
                            >
                              Zrušit
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item.id, item.name, '', item.htmlContent)}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                            >
                              Upravit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTextTemplate(item.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                            >
                              Smazat
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'combinations' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={newCombinationMainCode}
                  onChange={(e) => setNewCombinationMainCode(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">Vyberte hlavní kategorii</option>
                  {mainCategories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.code} - {category.description || category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newCombinationSubCode}
                  onChange={(e) => setNewCombinationSubCode(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">Vyberte podkategorii</option>
                  {subcategories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.code} - {category.description || category.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Text obsahu kombinace (bez HTML)"
                value={newCombinationContent}
                onChange={(e) => setNewCombinationContent(e.target.value)}
                rows={6}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md w-full"
              />
              <p className="text-xs text-gray-500">
                Pište běžný text. Nové řádky budou převedeny na HTML automaticky při uložení.
              </p>
              <button
                type="button"
                onClick={createCombination}
                className="w-fit px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Přidat kombinaci
              </button>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Hlavní kategorie</th>
                    <th className="py-2 pr-2">Podkategorie</th>
                    <th className="py-2 pr-2">Obsah</th>
                    <th className="py-2">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {combinations.map((item) => (
                    <tr key={item.id} className="border-b align-top">
                      <td className="py-2 pr-2 w-56">
                        {editingKey === item.id ? (
                          <select
                            value={editMainCode}
                            onChange={(e) => setEditMainCode(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          >
                            <option value="">Vyberte</option>
                            {mainCategories.map((category) => (
                              <option key={category.code} value={category.code}>
                                {category.code} - {category.description || category.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          item.mainCategoryCode
                        )}
                      </td>
                      <td className="py-2 pr-2 w-56">
                        {editingKey === item.id ? (
                          <select
                            value={editSubCode}
                            onChange={(e) => setEditSubCode(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          >
                            <option value="">Vyberte</option>
                            {subcategories.map((category) => (
                              <option key={category.code} value={category.code}>
                                {category.code} - {category.description || category.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          item.subcategoryCode
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {editingKey === item.id ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={6}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-xs text-gray-700">{htmlToPlainText(item.htmlContent)}</div>
                        )}
                      </td>
                      <td className="py-2 space-x-2 whitespace-nowrap">
                        {editingKey === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateCombination(item.id)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                            >
                              Uložit
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
                            >
                              Zrušit
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(item.id, '', '', htmlToPlainText(item.htmlContent), '', item.mainCategoryCode, item.subcategoryCode)
                              }
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                            >
                              Upravit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCombination(item.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                            >
                              Smazat
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'statuses' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Název stavu"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Pořadí"
                  value={newStatusOrder}
                  onChange={(e) => setNewStatusOrder(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={createStatus}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Přidat stav
                </button>
              </div>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Název</th>
                    <th className="py-2 pr-2">Pořadí</th>
                    <th className="py-2">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 pr-2">
                        {editingKey === item.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="py-2 pr-2 w-36">
                        {editingKey === item.id ? (
                          <input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md w-full"
                          />
                        ) : (
                          item.orderIndex
                        )}
                      </td>
                      <td className="py-2 space-x-2">
                        {editingKey === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(item.id)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                            >
                              Uložit
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
                            >
                              Zrušit
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item.id, item.name, '', '', String(item.orderIndex))}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                            >
                              Upravit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStatus(item.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                            >
                              Smazat
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDictionaries;
