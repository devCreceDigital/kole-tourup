'use strict';

/**
 * tests/rateLimit.test.js — Tests del middleware rateLimit.js.
 *
 * Estrategia: mock del cliente Redis para evitar dependencia de conexión real.
 * El módulo rateLimit.js exporta _setRedisClientForTest() y _resetForTest()
 * específicamente para esto.
 *
 * IMPORTANTE: el mock se inyecta al nivel top del archivo, ANTES de importar
 * server.js, para que cuando el servidor se importe por primera vez no intente
 * conectar al Redis real (que no existe en desarrollo local).
 *
 * Cubre:
 *   UNITARIOS — getClientIp() y buildKey():
 *     - IP extraída de X-Forwarded-For (primer valor)
 *     - IP extraída de req.socket.remoteAddress como fallback
 *     - X-Forwarded-For con múltiples proxies → primer valor
 *     - Sin IP → 'unknown'
 *     - buildKey genera prefijo rl: correcto
 *
 *   COMPORTAMIENTO — middleware rateLimit() con Redis mock:
 *     - Request dentro del límite → next() llamado, X-RateLimit-Remaining correcto
 *     - Request que excede el límite → 429 con Retry-After y X-RateLimit-*
 *     - Redis no disponible (redisReady=false) → fail-open, next() llamado
 *     - Primer request → INCR + EXPIRE (count === 1)
 *     - Requests subsiguientes → solo INCR (count > 1, no EXPIRE)
 *     - Error de Redis en mid-flight → fail-open
 *
 *   INTEGRACIÓN — servidor HTTP con Redis mock:
 *     - GET /health pasa con rate limit activo (dentro del límite)
 *     - GET /health devuelve X-RateLimit-Remaining
 *     - fail-open si Redis no disponible — /health sigue 200
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const config = require('../config');

// ─── Importar rateLimit PRIMERO — inyectar mock ANTES de importar server ──────

const {
  rateLimit,
  getClientIp,
  buildKey,
  _setRedisClientForTest,
  _resetForTest,
} = require('../middleware/rateLimit');

// ─── Factorías ────────────────────────────────────────────────────────────────

/**
 * Crea un cliente Redis mock configurable.
 * @param {number} incrReturn — valor que devuelve INCR (simula el contador)
 * @param {number} ttlReturn  — valor que devuelve TTL
 */
function createRedisMock(incrReturn = 1, ttlReturn = 60) {
  return {
    incr: async () => incrReturn,
    expire: async () => true,
    ttl: async () => ttlReturn,
  };
}

/**
 * Crea un mock de ServerResponse que captura writeHead, setHeader y end.
 * writeHead normaliza los headers a lowercase para consistencia con el test.
 */
function makeRes() {
  const res = {
    _statusCode: null,
    _headers: {},
    _body: null,
    _ended: false,
    writeHead(code, headers = {}) {
      this._statusCode = code;
      // Normalizar keys a lowercase
      for (const [k, v] of Object.entries(headers)) {
        this._headers[k.toLowerCase()] = v;
      }
    },
    setHeader(k, v) {
      this._headers[k.toLowerCase()] = v;
    },
    end(body = '') {
      this._body = body;
      this._ended = true;
    },
  };
  return res;
}

function makeReq(ip = '127.0.0.1') {
  return {
    headers: {},
    socket: { remoteAddress: ip },
  };
}

// Pre-inyectar mock ANTES de importar server.js
_setRedisClientForTest(createRedisMock(1), true);

// Ahora es seguro importar server.js — el singleton ya tiene un mock inyectado.
const server = require('../server');

// ─── Tests unitarios: getClientIp ─────────────────────────────────────────────

test('getClientIp: extrae IP de X-Forwarded-For (valor único)', () => {
  const req = { headers: { 'x-forwarded-for': '192.168.1.1' }, socket: {} };
  assert.strictEqual(getClientIp(req), '192.168.1.1');
});

test('getClientIp: extrae primer IP de X-Forwarded-For (múltiples proxies)', () => {
  const req = { headers: { 'x-forwarded-for': '10.0.0.1, 172.16.0.1, 192.168.0.1' }, socket: {} };
  assert.strictEqual(getClientIp(req), '10.0.0.1');
});

test('getClientIp: fallback a socket.remoteAddress si no hay X-Forwarded-For', () => {
  const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  assert.strictEqual(getClientIp(req), '127.0.0.1');
});

test('getClientIp: retorna "unknown" si no hay IP disponible', () => {
  const req = { headers: {}, socket: null };
  assert.strictEqual(getClientIp(req), 'unknown');
});

test('buildKey: genera clave con prefijo rl:', () => {
  assert.strictEqual(buildKey('192.168.1.1'), 'rl:192.168.1.1');
  assert.strictEqual(buildKey('::1'), 'rl:::1');
  assert.strictEqual(buildKey('unknown'), 'rl:unknown');
});

// ─── Tests de comportamiento: middleware con Redis mock ───────────────────────

beforeEach(() => {
  // Resetear el singleton entre tests de comportamiento.
  // Re-inyectar mock safe para evitar conexión real.
  _setRedisClientForTest(createRedisMock(1), true);
});

test('rateLimit: fail-open cuando Redis no está listo', async () => {
  _setRedisClientForTest(createRedisMock(), false);

  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;

  await rateLimit(req, res, () => { nextCalled = true; });

  assert.ok(nextCalled, 'next() debe ser llamado en fail-open');
  assert.strictEqual(res._statusCode, null, 'No debe haber respuesta HTTP');
});

test('rateLimit: request dentro del límite → next() y X-RateLimit-Remaining', async () => {
  _setRedisClientForTest(createRedisMock(1), true);

  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;

  await rateLimit(req, res, () => { nextCalled = true; });

  assert.ok(nextCalled, 'next() debe ser llamado');
  assert.strictEqual(res._statusCode, null, 'No debe responder 429');
  assert.ok(
    res._headers['x-ratelimit-remaining'] !== undefined,
    'X-RateLimit-Remaining debe estar presente'
  );
});

test('rateLimit: request que excede el límite → 429 con headers correctos', async () => {
  _setRedisClientForTest(createRedisMock(config.RATE_LIMIT_MAX + 1, 45), true);

  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;

  await rateLimit(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled, 'next() NO debe ser llamado en 429');
  assert.strictEqual(res._statusCode, 429);
  assert.ok(res._headers['retry-after'], 'Retry-After debe estar presente');
  assert.strictEqual(res._headers['x-ratelimit-limit'], String(config.RATE_LIMIT_MAX));
  assert.strictEqual(res._headers['x-ratelimit-remaining'], '0');
  const body = JSON.parse(res._body);
  assert.strictEqual(body.error, 'Too Many Requests');
});

test('rateLimit: primer request → llama a expire (establece TTL)', async () => {
  let expireCalled = false;
  const mockClient = {
    incr: async () => 1,
    expire: async () => { expireCalled = true; return true; },
    ttl: async () => 60,
  };
  _setRedisClientForTest(mockClient, true);

  await rateLimit(makeReq(), makeRes(), () => {});

  assert.ok(expireCalled, 'expire() debe ser llamado en el primer request');
});

test('rateLimit: requests subsiguientes → NO llama a expire', async () => {
  let expireCalled = false;
  const mockClient = {
    incr: async () => 5,
    expire: async () => { expireCalled = true; return true; },
    ttl: async () => 55,
  };
  _setRedisClientForTest(mockClient, true);

  await rateLimit(makeReq(), makeRes(), () => {});

  assert.ok(!expireCalled, 'expire() NO debe ser llamado en requests subsiguientes');
});

test('rateLimit: error de Redis en mid-flight → fail-open', async () => {
  const mockClient = {
    incr: async () => { throw new Error('Redis ECONNREFUSED'); },
    expire: async () => {},
    ttl: async () => {},
  };
  _setRedisClientForTest(mockClient, true);

  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;

  await rateLimit(req, res, () => { nextCalled = true; });

  assert.ok(nextCalled, 'next() debe ser llamado en fail-open por error');
  assert.strictEqual(res._statusCode, null, 'No debe responder HTTP en fail-open');
});

// ─── Tests de integración: servidor HTTP ──────────────────────────────────────

let port;

before(async () => {
  _setRedisClientForTest(createRedisMock(1), true);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function httpRequest(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path, method: 'GET' };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('integración: GET /health pasa con rate limit dentro del límite', async () => {
  _setRedisClientForTest(createRedisMock(1), true);
  const { status } = await httpRequest('/health');
  assert.strictEqual(status, 200);
});

test('integración: GET /health devuelve X-RateLimit-Remaining en header', async () => {
  _setRedisClientForTest(createRedisMock(1), true);
  const { headers } = await httpRequest('/health');
  assert.ok(headers['x-ratelimit-remaining'] !== undefined, 'X-RateLimit-Remaining debe estar');
});

test('integración: fail-open si Redis no disponible — /health sigue 200', async () => {
  _setRedisClientForTest(createRedisMock(), false);
  const { status } = await httpRequest('/health');
  assert.strictEqual(status, 200);
});
