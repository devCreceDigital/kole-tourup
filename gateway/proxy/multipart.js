'use strict';

/**
 * proxy/multipart.js — Validación de tamaño en requests multipart/form-data.
 *
 * Responsabilidad: ser la PRIMERA LÍNEA DE DEFENSA contra archivos demasiado grandes.
 * No parsea el multipart completamente (eso es responsabilidad del backend Django).
 * Solo acumula el cuerpo del request y rechaza si supera MAX_FILE_SIZE_BYTES.
 *
 * Flujo:
 *   1. Verificar si el request tiene Content-Type: multipart/form-data.
 *   2. Si NO es multipart → pasar directamente (next con body vacío — será streamed por django.js).
 *   3. Si ES multipart → acumular el body en memoria.
 *   4. Si body > MAX_FILE_SIZE_BYTES → 413 Payload Too Large (sin llegar al backend).
 *   5. Si body ≤ límite → adjuntar `req._body` y llamar next().
 *
 * Invariante #7: archivos máx. 10 MB — validado en gateway Y en backend.
 * La segunda línea de defensa (backend) usa DRF con DATA_UPLOAD_MAX_MEMORY_SIZE.
 *
 * DISEÑO INTENCIONAL:
 *   - Solo requests multipart se acumulan en memoria. GET, DELETE, y POST/PATCH
 *     sin archivo se streamed directamente al backend por django.js (más eficiente).
 *   - El Content-Length header se usa como validación rápida previa (fail-fast).
 *     Un cliente malicioso puede omitir o falsear Content-Length, por eso también
 *     contamos los bytes recibidos mientras los acumulamos.
 *   - En caso de superarse el límite DURANTE la acumulación, se destruye el stream
 *     y se responde 413 inmediatamente.
 */

const config = require('../config');

const MULTIPART_PREFIX = 'multipart/form-data';

/**
 * Comprueba si el request es multipart/form-data.
 * @param {import('node:http').IncomingMessage} req
 * @returns {boolean}
 */
function isMultipart(req) {
  const ct = req.headers['content-type'] || '';
  return ct.toLowerCase().startsWith(MULTIPART_PREFIX);
}

/**
 * Middleware de validación multipart.
 *
 * Para requests NO multipart: next() inmediato (sin tocar el stream).
 * Para requests multipart: acumula el body, valida el tamaño.
 *
 * req._body  → Buffer con el cuerpo (solo para multipart dentro del límite)
 * req._isMultipart → boolean, indica si el request fue multipart
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 * @param {Function}                            next
 */
function multipart(req, res, next) {
  // ─── Validación rápida por Content-Length (fail-fast) ─────────────────────
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > config.MAX_FILE_SIZE_BYTES) {
    respond413(res);
    return;
  }

  // ─── Requests no multipart: pasar directamente ────────────────────────────
  if (!isMultipart(req)) {
    req._isMultipart = false;
    req._body = null;
    next();
    return;
  }

  // ─── Requests multipart: acumular y validar ───────────────────────────────
  req._isMultipart = true;
  const chunks = [];
  let totalBytes = 0;
  let aborted = false;

  req.on('data', (chunk) => {
    if (aborted) return;

    totalBytes += chunk.length;

    if (totalBytes > config.MAX_FILE_SIZE_BYTES) {
      aborted = true;
      // Destruir el stream para liberar recursos (no seguir acumulando).
      req.destroy();
      respond413(res);
      return;
    }

    chunks.push(chunk);
  });

  req.on('end', () => {
    if (aborted) return;
    req._body = Buffer.concat(chunks);
    next();
  });

  req.on('error', (err) => {
    if (aborted) return; // Error esperado tras req.destroy()
    // Error inesperado del stream — log y responder 400
    console.error('[multipart] stream error:', err.message);
    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request' }));
    }
  });
}

/**
 * Responde con 413 Payload Too Large.
 * @param {import('node:http').ServerResponse} res
 */
function respond413(res) {
  if (res.headersSent) return;
  res.writeHead(413, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Payload Too Large',
    detail: `El archivo supera el límite de ${config.MAX_FILE_SIZE_BYTES / 1048576} MB.`,
  }));
}

module.exports = { multipart, isMultipart };
