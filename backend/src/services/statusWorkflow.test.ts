import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCanceledStatus,
  isInvoicedStatus,
  isNewOrderStatus,
  isToInvoiceStatus,
  normalizeStatusName,
} from './statusWorkflow';

test('status workflow normalizes Czech labels for matching', () => {
  assert.equal(normalizeStatusName('Částečně vyfakturováno (DPZ/DPS)'), 'castecne vyfakturovano (dpz/dps)');
  assert.equal(isNewOrderStatus('Nová zakázka'), true);
  assert.equal(isToInvoiceStatus('K fakturaci'), true);
  assert.equal(isCanceledStatus('Zrušeno'), true);
});

test('partial invoicing is not treated as fully invoiced', () => {
  assert.equal(isInvoicedStatus('Vyfakturováno'), true);
  assert.equal(isInvoicedStatus('Částečně vyfakturováno (DPZ/DPS)'), false);
});
