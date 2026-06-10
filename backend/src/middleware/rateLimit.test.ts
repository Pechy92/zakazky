import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldSkipApiRateLimit } from './rateLimit';

test('global API limit ignores CORS preflight requests', () => {
  assert.equal(
    shouldSkipApiRateLimit({
      method: 'OPTIONS',
      originalUrl: '/api/categories/combinations',
    }),
    true
  );
});

test('global API limit leaves login protection to the login limiter', () => {
  assert.equal(
    shouldSkipApiRateLimit({
      method: 'POST',
      originalUrl: '/api/auth/login',
    }),
    true
  );
});

test('global API limit still covers regular API requests', () => {
  assert.equal(
    shouldSkipApiRateLimit({
      method: 'POST',
      originalUrl: '/api/categories/combinations',
    }),
    false
  );
});
