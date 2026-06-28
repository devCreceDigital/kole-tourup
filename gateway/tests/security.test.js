'use strict';

/**
 * tests/security.test.js — Tests del middleware security.js.
 *
 * Verifica que todos los headers de seguridad HTTP requeridos estén presentes
 * en las respuestas del servidor, independientemente de la ruta.
 *
 * Cubre:
 *   UNITARIOS — middleware security():
 *     - Añade todos los headers requeridos por la especificación
 *     - Siempre llama next()
 *     - No termina el request
 *
 *   INTEGRACIÓN — servidor HTTP completo:
 *     - GET /health incluye todos los headers de seguridad
 *     - GET ruta desconocida (404) también incluye headers de seguridad
 *     - Los headers tienen los valores exactos especificados
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// ─── Tests unitarios: security middleware ─────────────────────────────────────

const { security, SECURITY_HEADERS } = require('../middleware/security');

test('security: añade Strict-Transport-Security', () => {
  const setHeaders = {};
  const res = { setHeader: (k, v) => { setHeaders[k] = v; } };
  let nextCalled = false;

  security({}, res, () => { nextCalled = true; });

  assert.ok(nextCalled, 'next() debe ser llamado');
  assert.ok(setHeaders['Strict-Transport-Security']);
  assert.ok(setHeaders['Strict-Transport-Security'].includes('max-age='));
});

test('security: añade X-Frame-Options: DENY', () => {
  const setHeaders = {};
  const res = { setHeader: (k, v) => { setHeaders[k] = v; } };

  security({}, res, () => {});

  assert.strictEqual(setHeaders['X-Frame-Options'], 'DENY');
});

test('security: añade X-Content-Type-Options: nosniff', () => {
  const setHeaders = {};
  const res = { setHeader: (k, v) => { setHeaders[k] = v; } };

  security({}, res, () => {});

  assert.strictEqual(setHeaders['X-Content-Type-Options'], 'nosniff');
});

test('security: añade X-XSS-Protection: 1; mode=block', () => {
  const setHeaders = {};
  const res = { setHeader: (k, v) => { setHeaders[k] = v; } };

  security({}, res, () => {});

  assert.strictEqual(setHeaders['X-XSS-Protection'], '1; mode=block');
});

test('security: siempre llama next() — nunca termina el request', () => {
  let nextCount = 0;
  const res = { setHeader: () => {} };

  security({}, res, () => { nextCount++; });
  security({}, res, () => { nextCount++; });

  assert.strictEqual(nextCount, 2);
});

test('security: SECURITY_HEADERS exportado contiene los 4 headers mínimos requeridos', () => {
  const keys = SECURITY_HEADERS.map(([k]) => k);
  assert.ok(keys.includes('Strict-Transport-Security'));
  assert.ok(keys.includes('X-Frame-Options'));
  assert.ok(keys.includes('X-Content-Type-Options'));
  assert.ok(keys.includes('X-XSS-Protection'));
});

// ─── Tests de integración: servidor HTTP ──────────────────────────────────────

// Los tests de integración del servidor se hacen a través de la suite completa
// en server.test.js. Aquí validamos solo los headers de seguridad en respuestas reales.

const server = require('../server');

let port;

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path, method };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('integración: GET /health incluye X-Frame-Options: DENY', async () => {
  const { headers } = await request('/health');
  assert.strictEqual(headers['x-frame-options'], 'DENY');
});

test('integración: GET /health incluye X-Content-Type-Options: nosniff', async () => {
  const { headers } = await request('/health');
  assert.strictEqual(headers['x-content-type-options'], 'nosniff');
});

test('integración: GET /health incluye X-XSS-Protection: 1; mode=block', async () => {
  const { headers } = await request('/health');
  assert.strictEqual(headers['x-xss-protection'], '1; mode=block');
});

test('integración: GET /health incluye Strict-Transport-Security', async () => {
  const { headers } = await request('/health');
  assert.ok(headers['strict-transport-security']);
  assert.ok(headers['strict-transport-security'].includes('max-age='));
});

test('integración: ruta 404 también incluye headers de seguridad', async () => {
  const { status, headers } = await request('/ruta-desconocida');
  assert.strictEqual(status, 404);
  assert.strictEqual(headers['x-frame-options'], 'DENY');
  assert.strictEqual(headers['x-content-type-options'], 'nosniff');
});
