'use strict';

/**
 * tests/multipart.test.js — Tests del middleware proxy/multipart.js.
 *
 * Cubre:
 *   UNITARIOS — isMultipart():
 *     - Detecta multipart/form-data correctamente
 *     - Ignora otros Content-Types
 *     - Insensible al case del Content-Type
 *
 *   COMPORTAMIENTO — middleware multipart():
 *     - Request no multipart → next() inmediato, req._body === null
 *     - Request multipart dentro del límite → body acumulado, next() llamado
 *     - Content-Length > 10 MB → 413 antes de acumular (fail-fast)
 *     - Body acumulado supera el límite → 413 durante la acumulación
 *     - req._isMultipart correctamente establecido
 *
 *   INTEGRACIÓN — servidor HTTP completo:
 *     - POST /api/v1/cualquier-ruta con Content-Length > 10 MB → 413
 *     - POST con body dentro del límite → proxy intenta conectar al backend
 *       (el backend no existe en tests → 502 Bad Gateway)
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');

// ─── Tests unitarios: isMultipart ─────────────────────────────────────────────

const { isMultipart } = require('../proxy/multipart');

test('isMultipart: detecta multipart/form-data', () => {
  const req = { headers: { 'content-type': 'multipart/form-data; boundary=abc' } };
  assert.ok(isMultipart(req));
});

test('isMultipart: insensible al case del Content-Type', () => {
  const req = { headers: { 'content-type': 'Multipart/Form-Data; boundary=xyz' } };
  assert.ok(isMultipart(req));
});

test('isMultipart: retorna false para application/json', () => {
  const req = { headers: { 'content-type': 'application/json' } };
  assert.ok(!isMultipart(req));
});

test('isMultipart: retorna false cuando no hay Content-Type', () => {
  const req = { headers: {} };
  assert.ok(!isMultipart(req));
});

// ─── Tests de comportamiento: middleware multipart() ─────────────────────────

const { multipart } = require('../proxy/multipart');
const config = require('../config');

/**
 * Crea un mock de req (IncomingMessage-like) como EventEmitter.
 * Permite simular eventos data/end/error y establecer headers.
 */
function makeMultipartReq(headers = {}, chunks = []) {
  const req = new EventEmitter();
  req.headers = headers;
  req._destroyed = false;
  req.destroy = function() { this._destroyed = true; };

  // Emitir chunks de forma asíncrona para simular el stream
  setImmediate(() => {
    for (const chunk of chunks) {
      if (!req._destroyed) req.emit('data', Buffer.from(chunk));
    }
    if (!req._destroyed) req.emit('end');
  });

  return req;
}

function makeRes() {
  return {
    _statusCode: null,
    _headers: {},
    _body: null,
    headersSent: false,
    writeHead(code, headers = {}) {
      this._statusCode = code;
      this.headersSent = true;
      for (const [k, v] of Object.entries(headers)) {
        this._headers[k.toLowerCase()] = v;
      }
    },
    end(body = '') { this._body = body; },
  };
}

test('multipart: request JSON → next() inmediato, req._body null', (_, done) => {
  const req = makeMultipartReq({ 'content-type': 'application/json' });
  const res = makeRes();

  multipart(req, res, () => {
    assert.strictEqual(req._body, null);
    assert.strictEqual(req._isMultipart, false);
    assert.strictEqual(res._statusCode, null, 'No debe haber respuesta HTTP');
    done();
  });
});

test('multipart: request GET sin content-type → next() inmediato', (_, done) => {
  const req = makeMultipartReq({});
  const res = makeRes();

  multipart(req, res, () => {
    assert.strictEqual(req._body, null);
    done();
  });
});

test('multipart: Content-Length > 10 MB → 413 antes de acumular', (_, done) => {
  const bigSize = config.MAX_FILE_SIZE_BYTES + 1;
  const req = makeMultipartReq({
    'content-type': 'multipart/form-data; boundary=abc',
    'content-length': String(bigSize),
  });
  const res = makeRes();

  multipart(req, res, () => {
    done(new Error('next() no debe ser llamado en 413'));
  });

  // Verificar después de que el setImmediate del req haya corrido
  setImmediate(() => setImmediate(() => {
    assert.strictEqual(res._statusCode, 413);
    done();
  }));
});

test('multipart: body multipart dentro del límite → acumulado en req._body', (_, done) => {
  const chunk1 = 'a'.repeat(100);
  const chunk2 = 'b'.repeat(200);
  const req = makeMultipartReq(
    { 'content-type': 'multipart/form-data; boundary=abc' },
    [chunk1, chunk2]
  );
  const res = makeRes();

  multipart(req, res, () => {
    assert.ok(req._body instanceof Buffer, 'req._body debe ser un Buffer');
    assert.strictEqual(req._body.length, 300);
    assert.strictEqual(req._isMultipart, true);
    done();
  });
});

test('multipart: body acumulado supera el límite → 413', (_, done) => {
  // Crear un chunk que, aunque el Content-Length no lo declare, supera el límite
  const oversizedChunk = Buffer.alloc(config.MAX_FILE_SIZE_BYTES + 1, 'x');
  const req = new EventEmitter();
  req.headers = { 'content-type': 'multipart/form-data; boundary=abc' };
  req._destroyed = false;
  req.destroy = function() { this._destroyed = true; };

  const res = makeRes();

  multipart(req, res, () => {
    done(new Error('next() no debe ser llamado cuando body supera el límite'));
  });

  setImmediate(() => {
    req.emit('data', oversizedChunk);
    setImmediate(() => {
      assert.strictEqual(res._statusCode, 413);
      done();
    });
  });
});

// ─── Tests de integración: servidor HTTP ──────────────────────────────────────

// Importar server con Redis mock pre-inyectado (requerido por rateLimit)
const { _setRedisClientForTest } = require('../middleware/rateLimit');

function createRedisMock(incrReturn = 1) {
  return {
    incr: async () => incrReturn,
    expire: async () => true,
    ttl: async () => 60,
  };
}

// Inyectar Redis mock ANTES de importar server
_setRedisClientForTest(createRedisMock(1), true);
const server = require('../server');

let port;

before(async () => {
  _setRedisClientForTest(createRedisMock(1), true);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function httpRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path, method, headers };
    const req = http.request(opts, (res) => {
      let rawBody = '';
      res.on('data', (c) => (rawBody += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(rawBody); } catch { parsed = rawBody; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('integración: POST con Content-Length > 10 MB → 413 sin llegar al backend', async () => {
  const oversizeBytes = config.MAX_FILE_SIZE_BYTES + 1;
  const { status, body } = await httpRequest(
    '/api/v1/documentos/',
    'POST',
    {
      'content-type': 'multipart/form-data; boundary=test',
      'content-length': String(oversizeBytes),
    }
  );
  assert.strictEqual(status, 413);
  assert.strictEqual(body.error, 'Payload Too Large');
});

test('integración: GET /health sigue respondiendo 200 con proxy integrado', async () => {
  const { status } = await httpRequest('/health');
  assert.strictEqual(status, 200);
});

test('integración: ruta /api/v1/* con backend caído → 502 Bad Gateway', async () => {
  // El BACKEND_URL apunta a un servidor que no existe en el entorno de test local.
  // El proxy intenta conectar y falla → 502.
  const { status } = await httpRequest('/api/v1/viajes/');
  assert.strictEqual(status, 502);
});
