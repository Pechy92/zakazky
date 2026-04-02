import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerService } from '../services/customer.service';
import { orderService } from '../services/order.service';
import { offerService } from '../services/offer.service';
import { Customer, Offer, Order } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FiArrowLeft, FiEdit2, FiFilePlus } from 'react-icons/fi';

function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offersByOrder, setOffersByOrder] = useState<Record<number, Offer[]>>({});

  useEffect(() => {
    if (!id) return;

    const loadDetail = async () => {
      try {
        const customerId = parseInt(id, 10);
        const [customerData, allOrders] = await Promise.all([
          customerService.getById(customerId),
          orderService.getAll(),
        ]);

        const customerOrders = allOrders.filter((order) => order.customerId === customerId);
        setCustomer(customerData);
        setOrders(customerOrders);

        const offersPairs = await Promise.all(
          customerOrders.map(async (order) => {
            const offers = await offerService.getByOrderId(order.id);
            return [order.id, offers] as const;
          })
        );

        const mapped: Record<number, Offer[]> = {};
        offersPairs.forEach(([orderId, offers]) => {
          mapped[orderId] = offers;
        });
        setOffersByOrder(mapped);
      } catch (error) {
        console.error('Failed to load customer detail:', error);
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id, navigate]);

  if (loading) {
    return <div className="text-center py-12">Načítání...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12">Zákazník nenalezen</div>;
  }

  const totalOffers = Object.values(offersByOrder).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Zpět na zákazníky</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">Detail zákazníka</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers', { state: { editCustomerId: customer.id } })}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <FiEdit2 className="w-4 h-4" />
            <span>Upravit zákazníka</span>
          </button>
          <button
            onClick={() => navigate('/orders', { state: { openNewOrder: true, prefillCustomerId: customer.id } })}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
          >
            <FiFilePlus className="w-4 h-4" />
            <span>Nová zakázka</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Firemní údaje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Název</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{customer.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IČ</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{customer.ic || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">DIČ</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{customer.dic || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{customer.email || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Adresa</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {[customer.street, customer.houseNumber, customer.city, customer.postalCode]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kontaktní osoba</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Jméno a příjmení</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {[customer.contactPersonFirstName, customer.contactPersonLastName].filter(Boolean).join(' ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{customer.contactPersonPhone || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{customer.contactPersonEmail || '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Zakázky zákazníka</h2>
            </div>
            {orders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Zákazník zatím nemá žádné zakázky.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Číslo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Název</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stav</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vytvořeno</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.statusName || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: cs })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Souhrn</h2>
            <div>
              <p className="text-sm text-gray-500">Počet zakázek</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">{orders.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Počet nabídek</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">{totalOffers}</p>
            </div>
            <div className="pt-4 border-t">
              <button
                onClick={() => navigate('/customers')}
                className="text-sm text-primary-600 hover:text-primary-900"
              >
                Zpět na seznam zákazníků
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetail;
