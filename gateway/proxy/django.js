'use strict';

/**
 * proxy/django.js — Proxy HTTP hacia el backend Django.
 *
 * Responsabilidad: reenviar el request al backend Django y hacer pipe
 * de la respuesta al cliente, sin modificar el cuerpo ni los headers
 * de respuesta (salvo añadir X-Proxy-By para diagnóstico).
 *
 * Flujo para requests sin archivo (GET, DELETE, POST/PATCH JSON):
 *   1. Construir options de http.request apuntando a BACKEND_URL.
 *   2. Copiar headers del request original (incluyendo Authorization añadido por auth.js).
 *   3. Hacer pipe del request entrante → request al backend.
 *   4. Hacer pipe de la respuesta del backend → response al cliente.
 *
 * Flujo para requests multipart (POST/PATCH con archivo):
 *   1. El body ya fue acumulado en req._body por multipart.js.
 *   2. Escribir req._body directamente (no pipe, porque el stream ya fue consumido).
 *   3. El resto igual.
 *
 * Manejo de errores:
 *   - Timeout agotado → 504 Gateway Timeout
 *   - Backend ECONNREFUSED / ENOTFOUND → 502 Bad Gateway
 *   - Cualquier otro error → 502 Bad Gateway
 *
 * Configuración:
 *   BACKEND_URL — URL base del backend Django (ej: http://backend:8000)
 *   PROXY_TIMEOUT_MS — timeout en ms para la conexión al backend (default: 30000)
 *
 * Invariante de arquitectura: el proxy no modifica la lógica de negocio.
 * No reintenta requests fallidos (los reintentos generarían escrituras duplicadas).
 */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const config = require('../config');

// Timeout para requests al backend (30 segundos por defecto).
// Se puede configurar con PROXY_TIMEOUT_MS env var.
const PROXY_TIMEOUT_MS = parseInt(process.env.PROXY_TIMEOUT_MS || '30000', 10);

// ─── Construcción de la URL del backend ──────────────────────────────────────

/**
 * Construye la URL completa del backend concatenando BACKEND_URL + req.url.
 * req.url incluye el path y la query string (ej: /api/v1/auth/login/?next=/).
 *
 * @param {string} reqUrl — req.url del request entrante
 * @returns {URL}
 */
function buildBackendUrl(reqUrl) {
  const base = config.BACKEND_URL.replace(/\/$/, ''); // eliminar trailing slash
  return new URL(`${base}${reqUrl}`);
}

/**
 * Construye los headers a enviar al backend.
 * Copia todos los headers del request original, eliminando los que
 * no deben llegar al backend (host, connection).
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {number} contentLength — longitud real del body (para multipart)
 * @returns {Object}
 */
function buildBackendHeaders(req, contentLength) {
  const headers = {};

  for (const [key, value] of Object.entries(req.headers)) {
    const lkey = key.toLowerCase();
    // Omitir headers que no deben propagarse al backend
    if (lkey === 'host') continue;
    if (lkey === 'connection') continue;
    if (lkey === 'transfer-encoding') continue; // evitar chunked doble
    headers[key] = value;
  }

  // Para multipart: sobreescribir Content-Length con el tamaño real del body acumulado
  if (contentLength !== null) {
    headers['content-length'] = String(contentLength);
  }

  // Identificador del proxy (debug)
  headers['x-forwarded-by'] = 'tottem-hub-gateway';

  return headers;
}

// ─── Proxy principal ──────────────────────────────────────────────────────────

/**
 * Handler de proxy: reenvía el request al backend Django y hace pipe de la respuesta.
 * Se usa como handler de ruta en el router del servidor.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 */
function proxyToDjango(req, res) {
  let backendUrl;
  try {
    backendUrl = buildBackendUrl(req.url);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Request', detail: 'URL inválida' }));
    return;
  }

  // Determinar si el body fue acumulado por multipart.js
  const isMultipart = req._isMultipart === true && req._body instanceof Buffer;
  const bodyToSend = isMultipart ? req._body : null;
  const contentLength = isMultipart ? bodyToSend.length : null;

  const headers = buildBackendHeaders(req, contentLength);

  const transport = backendUrl.protocol === 'https:' ? https : http;

  const options = {
    hostname: backendUrl.hostname,
    port: backendUrl.port || (backendUrl.protocol === 'https:' ? 443 : 80),
    path: backendUrl.pathname + backendUrl.search,
    method: req.method,
    headers,
    timeout: PROXY_TIMEOUT_MS,
  };

  const backendReq = transport.request(options, (backendRes) => {
    // Copiar status code y headers de la respuesta del backend
    const responseHeaders = {};
    for (const [key, value] of Object.entries(backendRes.headers)) {
      // No propagar headers de control de conexión
      if (key.toLowerCase() === 'connection') continue;
      if (key.toLowerCase() === 'transfer-encoding') continue;
      responseHeaders[key] = value;
    }

    res.writeHead(backendRes.statusCode, responseHeaders);

    // Pipe de la respuesta del backend al cliente
    backendRes.pipe(res);

    backendRes.on('error', (err) => {
      console.error('[proxy] backend response error:', err.message);
      // El response ya inició — no podemos cambiar el status code
      res.end();
    });
  });

  // ─── Manejo de timeout ────────────────────────────────────────────────────
  backendReq.on('timeout', () => {
    backendReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway Timeout' }));
    }
  });

  // ─── Manejo de errores de conexión ───────────────────────────────────────
  backendReq.on('error', (err) => {
    console.error('[proxy] backend request error:', err.message);
    if (!res.headersSent) {
      const isTimeout = err.code === 'ECONNRESET' && backendReq.destroyed;
      if (isTimeout) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway Timeout' }));
      } else {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Gateway' }));
      }
    }
  });

  // ─── Envío del body ───────────────────────────────────────────────────────

  if (isMultipart) {
    // Body ya acumulado por multipart.js — escribir directamente
    backendReq.write(bodyToSend);
    backendReq.end();
  } else {
    // Body no acumulado — pipe del stream original al backend request
    // Manejar el caso de que el stream ya fue consumido (no debería ocurrir
    // salvo en requests multipart sin body, que ya manejaría el caso anterior)
    req.pipe(backendReq);

    req.on('error', (err) => {
      console.error('[proxy] client request error:', err.message);
      backendReq.destroy();
    });
  }
}

module.exports = { proxyToDjango, buildBackendUrl, buildBackendHeaders };
