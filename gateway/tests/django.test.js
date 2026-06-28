'use strict';

/**
 * tests/django.test.js — Tests del proxy hacia Django.
 *
 * Cubre:
 *   UNITARIOS — buildBackendUrl() y buildBackendHeaders():
 *     - URL correcta concatenando config + req.url
 *     - Headers copiados correctamente
 *     - Headers prohibidos (host, connection) eliminados
 *     - Header x-forwarded-by inyectado
 *
 *   INTEGRACIÓN — proxyToDjango() con servidor mock:
 *     - Request GET sin body reenviado correctamente
 *     - Request POST multipart (con req._body) reenviado correctamente
 *     - Response del backend pipeado al cliente (incluyendo headers y status)
 *     - Timeout simulado → 504 Gateway Timeout
 *     - Backend caído → 502 Bad Gateway
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');

const config = require('../config');
const {
  buildBackendUrl,
  buildBackendHeaders,
  proxyToDjango,
} = require('../proxy/django');

// ─── Tests unitarios ──────────────────────────────────────────────────────────

test('buildBackendUrl: concatena base y req.url correctamente', () => {
  const originalUrl = config.BACKEND_URL;
  config.BACKEND_URL = 'http://backend:8000';
  
  const url = buildBackendUrl('/api/v1/test/?q=1');
  assert.strictEqual(url.href, 'http://backend:8000/api/v1/test/?q=1');
  
  config.BACKEND_URL = 'http://backend:8000/'; // trailing slash
  const url2 = buildBackendUrl('/api/v1/test/');
  assert.strictEqual(url2.href, 'http://backend:8000/api/v1/test/');
  
  config.BACKEND_URL = originalUrl;
});

test('buildBackendHeaders: copia headers, filtra prohibidos y añade proxy-by', () => {
  const req = {
    headers: {
      'host': 'localhost:3001',
      'connection': 'keep-alive',
      'transfer-encoding': 'chunked',
      'authorization': 'Bearer token123',
      'content-type': 'application/json',
    }
  };
  
  const headers = buildBackendHeaders(req, null);
  
  assert.strictEqual(headers['host'], undefined, 'No debe tener host');
  assert.strictEqual(headers['connection'], undefined, 'No debe tener connection');
  assert.strictEqual(headers['transfer-encoding'], undefined, 'No debe tener transfer-encoding');
  assert.strictEqual(headers['authorization'], 'Bearer token123');
  assert.strictEqual(headers['content-type'], 'application/json');
  assert.strictEqual(headers['x-forwarded-by'], 'tottem-hub-gateway');
});

test('buildBackendHeaders: sobreescribe content-length si se provee (multipart)', () => {
  const req = {
    headers: {
      'content-length': '100',
    }
  };
  
  const headers = buildBackendHeaders(req, 250);
  assert.strictEqual(headers['content-length'], '250');
});

// ─── Tests de integración con servidor mock ───────────────────────────────────

let mockBackendServer;
let mockBackendPort;
let originalBackendUrl;
let originalTimeout;
let proxyServer;
let proxyPort;

before(async () => {
  // 1. Crear un servidor mock para simular Django
  mockBackendServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (req.url === '/api/v1/timeout') {
        // No responder para forzar timeout
        return;
      }
      
      if (req.url === '/api/v1/echo') {
        res.writeHead(201, { 'x-custom-header': 'mocked', 'content-type': 'application/json' });
        res.end(JSON.stringify({ 
          method: req.method,
          bodyReceived: body,
          headersReceived: req.headers
        }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Mock Django OK');
    });
  });
  
  await new Promise(resolve => mockBackendServer.listen(0, resolve));
  mockBackendPort = mockBackendServer.address().port;
  
  originalBackendUrl = config.BACKEND_URL;
  config.BACKEND_URL = `http://localhost:${mockBackendPort}`;

  // 2. Crear un servidor proxy real para probar proxyToDjango
  proxyServer = http.createServer((req, res) => {
    // Si el test envía body.isMultipart, simulamos lo que hace multipart.js
    if (req.headers['x-test-multipart'] === 'true') {
      req._isMultipart = true;
      let body = Buffer.alloc(0);
      req.on('data', chunk => body = Buffer.concat([body, chunk]));
      req.on('end', () => {
        req._body = body;
        proxyToDjango(req, res);
      });
      return;
    }
    
    proxyToDjango(req, res);
  });
  
  await new Promise(resolve => proxyServer.listen(0, resolve));
  proxyPort = proxyServer.address().port;
});

after(async () => {
  config.BACKEND_URL = originalBackendUrl;
  await new Promise(resolve => mockBackendServer.close(resolve));
  await new Promise(resolve => proxyServer.close(resolve));
});

// Helper para requests al proxy
function httpRequest(path, method = 'GET', headers = {}, bodyStr = null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: proxyPort, path, method, headers };
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
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

test('django proxy: request GET reenviado correctamente', async () => {
  const { status, headers, body } = await httpRequest('/api/v1/echo', 'GET', { 'custom-client': '123' });
  
  assert.strictEqual(status, 201);
  assert.strictEqual(headers['x-custom-header'], 'mocked');
  assert.strictEqual(body.method, 'GET');
  assert.strictEqual(body.headersReceived['custom-client'], '123');
  assert.strictEqual(body.headersReceived['x-forwarded-by'], 'tottem-hub-gateway');
});

test('django proxy: multipart request (body en buffer) reenviado correctamente', async () => {
  const bodyContent = 'dummy-multipart-content';
  const { status, body } = await httpRequest('/api/v1/echo', 'POST', {
    'content-type': 'multipart/form-data',
    'x-test-multipart': 'true' // Señal para el mock proxy
  }, bodyContent);
  
  assert.strictEqual(status, 201);
  assert.strictEqual(body.method, 'POST');
  assert.strictEqual(body.bodyReceived, bodyContent);
  assert.strictEqual(body.headersReceived['content-length'], String(bodyContent.length));
});

test('django proxy: backend caído -> 502 Bad Gateway', async () => {
  const tempUrl = config.BACKEND_URL;
  config.BACKEND_URL = 'http://localhost:59999';
  
  const { status, body } = await httpRequest('/api/v1/test');
  
  config.BACKEND_URL = tempUrl;
  
  assert.strictEqual(status, 502);
  assert.strictEqual(body.error, 'Bad Gateway');
});

test('django proxy: timeout -> 504 Gateway Timeout', async () => {
  originalTimeout = process.env.PROXY_TIMEOUT_MS;
  process.env.PROXY_TIMEOUT_MS = '50';
  
  const proxyModulePath = require.resolve('../proxy/django');
  delete require.cache[proxyModulePath];
  const { proxyToDjango: proxyReLoaded } = require('../proxy/django');
  
  // Creamos un servidor proxy temporal para este test (con el timeout recargado)
  const tempProxy = http.createServer((req, res) => {
    proxyReLoaded(req, res);
  });
  await new Promise(resolve => tempProxy.listen(0, resolve));
  const tempPort = tempProxy.address().port;

  const result = await new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: tempPort, path: '/api/v1/timeout', method: 'GET' };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    req.on('error', reject);
    req.end();
  });
  
  process.env.PROXY_TIMEOUT_MS = originalTimeout;
  delete require.cache[proxyModulePath];
  require('../proxy/django');
  await new Promise(resolve => tempProxy.close(resolve));
  
  assert.strictEqual(result.status, 504);
  assert.strictEqual(result.body.error, 'Gateway Timeout');
});
