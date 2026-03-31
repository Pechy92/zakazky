import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../services/order.service';
import { offerService } from '../services/offer.service';
import { Order, Offer, OfferPdf } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FiArrowLeft, FiPlus, FiDownload, FiExternalLink } from 'react-icons/fi';

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orderPdfs, setOrderPdfs] = useState<OfferPdf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOrderDetail();
      loadOffers();
      loadOrderPdfs();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    try {
      const data = await orderService.getById(parseInt(id!));
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const data = await offerService.getByOrderId(parseInt(id!));
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    }
  };

  const loadOrderPdfs = async () => {
    try {
      const data = await offerService.getOrderPdfs(parseInt(id!));
      setOrderPdfs(data);
    } catch (error) {
      console.error('Failed to load order PDFs:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatOfferCategory = (offer: Offer) => {
    const main = offer.mainCategoryCode || '—';
    const sub = offer.subcategoryCode || '—';
    return `${main} / ${sub}`;
  };

  if (loading) {
    return <div className="text-center py-12">Načítání...</div>;
  }

  if (!order) {
    return <div className="text-center py-12">Zakázka nenalezena</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Zpět na zakázky</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
            <p className="text-sm text-gray-500">Číslo zakázky: {order.number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detail zakázky */}
        <div className="lg:col-span-2 space-y-6">
          {/* Základní informace */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail zakázky</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Stav</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {order.statusName}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hodnota zakázky</p>
                <p className="text-lg font-bold text-primary-600 mt-1">
                  {formatCurrency(order.totalPrice || 0)} Kč
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Založil</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {order.createdByUserName || 'Neznámý'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zpracovává</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {order.assignedToName || 'Nepřiřazeno'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vytvořeno</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: cs })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Poslední změna</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {order.updatedAt ? format(new Date(order.updatedAt), 'dd.MM.yyyy HH:mm', { locale: cs }) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Nabídky */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Nabídky</h2>
                <button
                  onClick={() => navigate(`/offers?orderId=${order.id}`)}
                  className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Nová nabídka</span>
                </button>
              </div>
            </div>
            {offers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Zatím žádné nabídky
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Č.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nabídka a kategorie
                      </th>
                      <th className="w-44 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Termíny
                      </th>
                      <th className="w-36 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cena bez DPH
                      </th>
                      <th className="w-24 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akce
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {offers.map((offer) => (
                      <tr
                        key={offer.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/offers/${offer.id}`)}
                        title="Zobrazit detail nabídky"
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900 align-top">
                          {offer.sequenceNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 align-top">
                          <div className="whitespace-normal break-words leading-5 font-medium">
                            {offer.name || `Nabídka ${offer.sequenceNumber}`}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 whitespace-normal break-words">
                            {formatOfferCategory(offer)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 align-top">
                          <div>
                            <span className="text-xs text-gray-500">Vystavení:</span>{' '}
                            {format(new Date(offer.issueDate), 'dd.MM.yyyy', { locale: cs })}
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Platnost:</span>{' '}
                            {format(new Date(offer.validityDate), 'dd.MM.yyyy', { locale: cs })}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-right font-semibold align-top">
                          {offer.totalPrice != null ? `${formatCurrency(offer.totalPrice)} Kč` : '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-primary-600 text-right align-top">
                          Otevřít
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PDF nabídky */}
          {orderPdfs.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <FiDownload className="w-5 h-5 text-primary-600" />
                  <span>Vygenerované PDF nabídky</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nabídka č.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vygeneroval
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Velikost
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akce
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderPdfs.map((pdf) => (
                      <tr key={pdf.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Nabídka {pdf.sequenceNumber || pdf.offerId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pdf.createdByName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(pdf.createdAt), 'dd.MM.yyyy HH:mm', { locale: cs })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(pdf.fileSize / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                          <a
                            href={offerService.getPdfPublicUrl(pdf.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-900"
                            title="Otevřít PDF"
                          >
                            <FiExternalLink className="w-4 h-4" />
                            <span>Otevřít</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Informace o zákazníkovi */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zákazník</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Název</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{order.customerName}</p>
              </div>
              {/* Zde budou další informace o zákazníkovi */}
              <div className="pt-4 border-t">
                <button
                  onClick={() => navigate(`/customers/${order.customerId}`)}
                  className="text-sm text-primary-600 hover:text-primary-900"
                >
                  Zobrazit detail zákazníka →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
