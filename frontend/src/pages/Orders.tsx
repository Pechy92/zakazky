import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderService } from '../services/order.service';
import { customerService } from '../services/customer.service';
import { aresService } from '../services/ares.service';
import { statusService } from '../services/status.service';
import { userService } from '../services/user.service';
import { Order, Customer, OrderStatus, User } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FiPlus, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';
import Modal from '../components/Modal';
import { useUIStore } from '../store/uiStore';

interface OrderFormData {
  number: string;
  title: string;
  customerId: number | null;
  statusId: number | null;
  assignedToUserId: number | null;
  totalPrice: string;
}

function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<OrderFormData>({
    number: '',
    title: '',
    customerId: null,
    statusId: null,
    assignedToUserId: null,
    totalPrice: '0',
  });
  
  // Inline customer creation
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [searchingAres, setSearchingAres] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<Partial<Customer>>({
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
    loadOrders();
    loadCustomers();
    loadStatuses();
    loadUsers();
  }, []);

  useEffect(() => {
    const state = location.state as { openNewOrder?: boolean; prefillCustomerId?: number } | null;
    if (!state?.openNewOrder) {
      return;
    }

    setEditingOrderId(null);
    setIsViewMode(false);
    setShowNewCustomerForm(false);
    setFormData({
      number: '',
      title: '',
      customerId: state.prefillCustomerId ?? null,
      statusId: null,
      assignedToUserId: null,
      totalPrice: '0',
    });
    setIsModalOpen(true);

    navigate('/orders', { replace: true, state: null });
  }, [location.state, navigate]);

  const loadOrders = async () => {
    try {
      const data = await orderService.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadStatuses = async () => {
    try {
      const data = await statusService.getAll();
      setStatuses(data);
    } catch (error) {
      console.error('Failed to load statuses:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSearchAres = async () => {
    if (!newCustomerData.ic || newCustomerData.ic.length !== 8) {
      alert('IČ musí mít 8 číslic');
      return;
    }

    setSearchingAres(true);
    try {
      const data = await aresService.searchByIc(newCustomerData.ic);
      setNewCustomerData({
        ...newCustomerData,
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

  const handleCreateNewCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.ic) {
      alert('Vyplňte prosím alespoň název a IČ zákazníka');
      return;
    }

    setSaving(true);
    try {
      const newCustomer = await customerService.create(newCustomerData as Omit<Customer, 'id'>);
      await loadCustomers();
      setFormData({ ...formData, customerId: newCustomer.id });
      setShowNewCustomerForm(false);
      setNewCustomerData({
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
    } catch (error) {
      alert('Nepodařilo se vytvořit zákazníka');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.customerId) {
      alert('Vyplňte prosím všechna povinná pole');
      return;
    }

    setSaving(true);
    try {
      if (editingOrderId) {
        // Při editaci musí být stav vybrán
        if (!formData.statusId) {
          alert('Vyplňte prosím všechna povinná pole');
          return;
        }
        await orderService.update(editingOrderId, {
          title: formData.title,
          customerId: formData.customerId,
          statusId: formData.statusId,
          assignedToUserId: formData.assignedToUserId ?? undefined,
        });
      } else {
        await orderService.create({
          title: formData.title,
          customerId: formData.customerId,
          assignedToUserId: formData.assignedToUserId,
        } as any);
      }
      handleCloseModal();
      loadOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || (editingOrderId ? 'Chyba při aktualizaci zakázky' : 'Chyba při vytváření zakázky'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setFormData({
      number: order.number,
      title: order.title,
      customerId: order.customerId,
      statusId: order.statusId,
      assignedToUserId: order.assignedToUserId || null,
      totalPrice: order.totalPrice?.toString() || '0',
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) return;
    
    if (!confirm('Opravdu chcete smazat tuto zakázku?')) return;

    try {
      await orderService.delete(editingOrderId);
      handleCloseModal();
      loadOrders();
    } catch (error) {
      alert('Nepodařilo se smazat zakázku');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrderId(null);
    setIsViewMode(false);
    setShowNewCustomerForm(false);
    setFormData({
      number: '',
      title: '',
      customerId: null,
      statusId: null,
      assignedToUserId: null,
      totalPrice: '0',
    });
    setNewCustomerData({
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
  const filteredOrders = orders.filter((order) => {
    if (!normalizedSearch) return true;
    return [
      order.title,
      order.number,
      order.customerName,
      order.customerContactPhone,
      order.customerContactEmail,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  const formatCurrency = (value?: number) =>
    new Intl.NumberFormat('cs-CZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Zakázky</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
        >
          <FiPlus /> <span className="hidden sm:inline">Nová zakázka</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vyhledávání</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Hledat podle názvu, čísla zakázky, zákazníka, telefonu nebo e-mailu kontaktu"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isViewMode ? 'Detail zakázky' : editingOrderId ? 'Upravit zakázku' : 'Nová zakázka'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Číslo zakázky se zobrazí jen při editaci/zobrazení */}
            {editingOrderId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Číslo zakázky
                </label>
                <input
                  type="text"
                  value={formData.number}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
              </div>
            )}

            <div className={editingOrderId ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Název zakázky *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={!isViewMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zákazník *
              </label>
              <select
                value={showNewCustomerForm ? 'new' : (formData.customerId || '')}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setShowNewCustomerForm(true);
                    setFormData({ ...formData, customerId: null });
                  } else {
                    setShowNewCustomerForm(false);
                    setFormData({ ...formData, customerId: parseInt(e.target.value) });
                  }
                }}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={!isViewMode}
              >
                <option value="">Vyberte zákazníka</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
                {!isViewMode && (
                  <option value="new">➕ Vytvořit nového zákazníka</option>
                )}
              </select>
              
              {/* Inline formulář pro vytvoření nového zákazníka */}
              {showNewCustomerForm && !isViewMode && (
                <div className="mt-4 p-4 border border-primary-200 rounded-md bg-primary-50 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Nový zákazník</h3>
                  
                  <div className="space-y-3">
                    {/* IČ s ARES */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">IČ *</label>
                        <input
                          type="text"
                          value={newCustomerData.ic || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, ic: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          maxLength={8}
                          placeholder="12345678"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleSearchAres}
                          disabled={searchingAres}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                          <FiSearch className="w-3 h-3" />
                          {searchingAres ? 'Hledám...' : 'ARES'}
                        </button>
                      </div>
                    </div>

                    {/* Název */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Název *</label>
                      <input
                        type="text"
                        value={newCustomerData.name || ''}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    {/* DIČ a E-mail */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">DIČ</label>
                        <input
                          type="text"
                          value={newCustomerData.dic || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, dic: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                        <input
                          type="email"
                          value={newCustomerData.email || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* Adresa */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Ulice</label>
                        <input
                          type="text"
                          value={newCustomerData.street || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, street: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Číslo popisné</label>
                        <input
                          type="text"
                          value={newCustomerData.houseNumber || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, houseNumber: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Město</label>
                        <input
                          type="text"
                          value={newCustomerData.city || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">PSČ</label>
                        <input
                          type="text"
                          value={newCustomerData.postalCode || ''}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, postalCode: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="12345"
                        />
                      </div>
                    </div>

                    {/* Kontaktní osoba */}
                    <div className="border-t pt-3 mt-3">
                      <h4 className="text-xs font-medium text-gray-900 mb-2">Kontaktní osoba</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Jméno</label>
                          <input
                            type="text"
                            value={newCustomerData.contactPersonFirstName || ''}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, contactPersonFirstName: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Příjmení</label>
                          <input
                            type="text"
                            value={newCustomerData.contactPersonLastName || ''}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, contactPersonLastName: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                          <input
                            type="tel"
                            value={newCustomerData.contactPersonPhone || ''}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, contactPersonPhone: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                          <input
                            type="email"
                            value={newCustomerData.contactPersonEmail || ''}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, contactPersonEmail: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCreateNewCustomer}
                        disabled={saving}
                        className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                      >
                        {saving ? 'Vytvářím...' : 'Vytvořit zákazníka'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCustomerForm(false);
                          setNewCustomerData({
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
                        }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stav - zobrazit pouze při editaci nebo view mode */}
            {(editingOrderId || isViewMode) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stav *
                </label>
                <select
                  value={formData.statusId || ''}
                  onChange={(e) => setFormData({ ...formData, statusId: parseInt(e.target.value) })}
                  disabled={isViewMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required={!isViewMode}
                >
                  <option value="">Vyberte stav</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Přiřazený uživatel
              </label>
              <select
                value={formData.assignedToUserId || ''}
                onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value ? parseInt(e.target.value) : null })}
                disabled={isViewMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Nepřiřazeno</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Celková cena (Kč) <span className="text-gray-500 text-xs">(vypočítáno z nabídek)</span>
              </label>
              <input
                type="text"
                value={editingOrderId ? formData.totalPrice : '0'}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-600"
                readOnly
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div>
              {editingOrderId && !isViewMode && (
                <button
                  type="button"
                  onClick={handleDeleteOrder}
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
              {isViewMode && editingOrderId && (
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

      <OrdersList
        orders={filteredOrders}
        onEdit={handleEditOrder}
        onNavigate={(id) => navigate(`/orders/${id}`)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function OrdersList({ orders, onEdit, onNavigate, formatCurrency }: {
  orders: any[];
  onEdit: (order: any) => void;
  onNavigate: (id: number) => void;
  formatCurrency: (n: number) => string;
}) {
  const { viewMode } = useUIStore();

  const showCards = viewMode === 'cards';

  if (showCards) {
    return (
      <div className="space-y-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate(order.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-500">{order.number}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {order.statusName}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{order.title}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{order.customerName}</p>
              </div>
              <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.totalPrice)} Kč</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                  className="text-blue-600 hover:text-blue-900 p-1"
                  title="Upravit"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {format(new Date(order.createdAt), 'dd.MM.yyyy', { locale: cs })}
            </p>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Číslo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Název
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zákazník
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stav
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hodnota zakázky
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vytvořeno
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Naposledy změněno
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Akce
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onNavigate(order.id)}
                title="Otevřít detail zakázky"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.number}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 align-top">
                  <div className="whitespace-normal break-words leading-5" title={order.title}>
                    {order.title}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 align-top">
                  <div className="whitespace-normal break-words leading-5" title={order.customerName || ''}>
                    {order.customerName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {order.statusName}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(order.totalPrice)} Kč
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(order.createdAt), 'dd.MM.yyyy', { locale: cs })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.updatedAt ? format(new Date(order.updatedAt), 'dd.MM.yyyy HH:mm', { locale: cs }) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(order);
                      }}
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

export default Orders;
