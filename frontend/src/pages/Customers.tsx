import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customer.service';
import { aresService } from '../services/ares.service';
import { Customer } from '../types';
import Modal from '../components/Modal';
import { FiPlus, FiSearch, FiTrash2, FiEdit } from 'react-icons/fi';
import { useUIStore } from '../store/uiStore';

function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingAres, setSearchingAres] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    ic: '',
    dic: '',
    street: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    email: '',
    contactPersonFirstName: '',
    contactPersonLastName: '',
    contactPersonPhone: '',
    contactPersonEmail: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const state = location.state as { editCustomerId?: number } | null;
    if (!state?.editCustomerId) {
      return;
    }

    const openEditFromState = async () => {
      try {
        const customer = await customerService.getById(state.editCustomerId!);
        setEditingCustomerId(customer.id);
        setFormData(customer);
        setIsViewMode(false);
        setIsModalOpen(true);
      } catch (error) {
        console.error('Failed to open customer edit from state:', error);
      } finally {
        navigate('/customers', { replace: true, state: null });
      }
    };

    openEditFromState();
  }, [location.state, navigate]);

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAres = async () => {
    if (!formData.ic || formData.ic.length !== 8) {
      alert('IČ musí mít 8 číslic');
      return;
    }

    setSearchingAres(true);
    try {
      const data = await aresService.searchByIc(formData.ic);
      setFormData({
        ...formData,
        name: data.name,
        dic: data.dic || '',
        street: data.street || '',
        houseNumber: data.houseNumber || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
      });
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Nepodařilo se najít firmu v ARES';
      alert(message);
    } finally {
      setSearchingAres(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCustomerId) {
        // Update existujícího zákazníka
        await customerService.update(editingCustomerId, formData);
      } else {
        // Vytvoření nového zákazníka
        await customerService.create(formData as Omit<Customer, 'id'>);
      }
      await loadCustomers();
      handleCloseModal();
    } catch (error) {
      alert(editingCustomerId ? 'Nepodařilo se aktualizovat zákazníka' : 'Nepodařilo se vytvořit zákazníka');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setFormData(customer);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!editingCustomerId) return;
    
    if (!confirm('Opravdu chcete smazat tohoto zákazníka?')) return;

    try {
      await customerService.delete(editingCustomerId);
      await loadCustomers();
      handleCloseModal();
    } catch (error) {
      alert('Nepodařilo se smazat zákazníka');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomerId(null);
    setIsViewMode(false);
    setFormData({
      name: '',
      ic: '',
      dic: '',
      street: '',
      houseNumber: '',
      city: '',
      postalCode: '',
      email: '',
      contactPersonFirstName: '',
      contactPersonLastName: '',
      contactPersonPhone: '',
      contactPersonEmail: '',
    });
  };

  if (loading) {
    return <div className="text-center py-12">Načítání...</div>;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedSearch) return true;
    return [
      customer.name,
      customer.email,
      customer.contactPersonPhone,
      customer.contactPersonEmail,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Zákazníci</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Nový zákazník</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vyhledávání</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Hledat podle názvu zákazníka, e-mailu, telefonu nebo e-mailu kontaktní osoby"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <CustomersList
        customers={filteredCustomers}
        onEdit={handleEditCustomer}
        onNavigate={(id) => navigate(`/customers/${id}`)}
      />

      {/* Modal pro přidání/editaci/zobrazení zákazníka */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isViewMode ? 'Detail zákazníka' : editingCustomerId ? 'Upravit zákazníka' : 'Nový zákazník'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IČ s ARES vyhledáváním */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IČ
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.ic || ''}
                onChange={(e) => setFormData({ ...formData, ic: e.target.value })}
                disabled={isViewMode}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="12345678"
                maxLength={8}
              />
              {!isViewMode && (
                <button
                  type="button"
                  onClick={handleSearchAres}
                  disabled={searchingAres || !formData.ic}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <FiSearch className="w-4 h-4" />
                  <span>{searchingAres ? 'Hledám...' : 'ARES'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Název */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Název <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required={!isViewMode}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isViewMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* DIČ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DIČ
              </label>
              <input
                type="text"
                value={formData.dic || ''}
                onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Adresa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ulice
              </label>
              <input
                type="text"
                value={formData.street || ''}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Číslo popisné
              </label>
              <input
                type="text"
                value={formData.houseNumber || ''}
                onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Město
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PSČ
              </label>
              <input
                type="text"
                value={formData.postalCode || ''}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="12345"
              />
            </div>
          </div>

          {/* Kontaktní osoba */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Kontaktní osoba</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jméno
                </label>
                <input
                  type="text"
                  value={formData.contactPersonFirstName || ''}
                  onChange={(e) => setFormData({ ...formData, contactPersonFirstName: e.target.value })}
                  disabled={isViewMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Příjmení
                </label>
                <input
                  type="text"
                  value={formData.contactPersonLastName || ''}
                  onChange={(e) => setFormData({ ...formData, contactPersonLastName: e.target.value })}
                  disabled={isViewMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.contactPersonPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPersonPhone: e.target.value })}
                  disabled={isViewMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.contactPersonEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactPersonEmail: e.target.value })}
                  disabled={isViewMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {editingCustomerId && !isViewMode && (
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
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
              {isViewMode && editingCustomerId && (
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
        </form>
      </Modal>
    </div>
  );
}

function CustomersList({ customers, onEdit, onNavigate }: {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onNavigate: (id: number) => void;
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
      <div className="space-y-2">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate(customer.id!)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[customer.ic && `IČ: ${customer.ic}`, customer.city].filter(Boolean).join(' • ')}
                </p>
                {customer.email && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{customer.email}</p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                className="text-blue-600 hover:text-blue-900 p-1 ml-3 shrink-0"
                title="Upravit"
              >
                <FiEdit className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Název</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IČ</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DIČ</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Město</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onNavigate(customer.id!)}
              title="Otevřít detail zákazníka"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.ic || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.dic || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.city || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.email || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                    className="text-blue-600 hover:text-blue-900"
                    title="Upravit"
                  >
                    <FiEdit className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Customers;
