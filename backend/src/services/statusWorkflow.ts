export const DEFAULT_ORDER_STATUSES = [
  { name: 'Nová zakázka', orderIndex: 0 },
  { name: 'Nabídka', orderIndex: 1 },
  { name: 'Rozpracované', orderIndex: 2 },
  { name: 'Hotovo', orderIndex: 3 },
  { name: 'Čeká se/oprava/úprava', orderIndex: 4 },
  { name: 'Odevzdáno', orderIndex: 5 },
  { name: 'K fakturaci', orderIndex: 6 },
  { name: 'Nezaplaceno', orderIndex: 7 },
  { name: 'Přednostně', orderIndex: 8 },
  { name: 'Zrušeno', orderIndex: 9 },
  { name: 'Částečně vyfakturováno (DPZ/DPS)', orderIndex: 10 },
  { name: 'Vyfakturováno', orderIndex: 11 },
  { name: 'Dokončeno', orderIndex: 12 },
];

export const normalizeStatusName = (name: string | null | undefined) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const isNewOrderStatus = (name: string | null | undefined) =>
  normalizeStatusName(name) === 'nova zakazka';

export const isToInvoiceStatus = (name: string | null | undefined) =>
  normalizeStatusName(name) === 'k fakturaci';

export const isInvoicedStatus = (name: string | null | undefined) => {
  const normalized = normalizeStatusName(name);
  return normalized.includes('vyfakturov') && !normalized.includes('castecne');
};

export const isCanceledStatus = (name: string | null | undefined) =>
  normalizeStatusName(name).includes('zrus');
