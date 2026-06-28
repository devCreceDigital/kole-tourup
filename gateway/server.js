'use strict';

/**
 * server.js — Servidor HTTP del Gateway (node:http puro, sin frameworks).
 *
 * Pipeline de middlewares aplicado en orden por cada request:
 *   1. cors (TASK-014)      — verifica Origin, preflight OPTIONS
 *   2. auth (TASK-015)      — cookie access_token → Authorization: Bearer
 *   3. security (TASK-016)  — headers de seguridad HTTP (HSTS, X-Frame-Options, etc.)
 *   4. rateLimit (TASK-016) — contador por IP en Redis, ventana fija
 *   5. router               — despacha al handler correspondiente
 *      ├── GET /health      — health check
 *      └── /api/v1/*        — proxy Django (TASK-017):
 *                              multipart.js → validación 10 MB
 *                              django.js    → reenvío + pipe response
 *
 * El servidor no se inicia automáticamente al ser requerido (require.main guard).
 * Esto permite importarlo en tests sin abrir el puerto.
 */

const http = require('node:http');
const config = require('./config');
const Router = require('./router');
const cors = require('./middleware/cors');
const { auth } = require('./middleware/auth');
const { security } = require('./middleware/security');
const { rateLimit } = require('./middleware/rateLimit');
const { multipart } = require('./proxy/multipart');
const { proxyToDjango } = require('./proxy/django');

const router = new Router();

// ─── Rutas ────────────────────────────────────────────────────────────────────

// Health check — no requiere proxy al backend
router.get('/health', (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

// ─── Servidor ─────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  cors(req, res, () => {
    auth(req, res, () => {
      security(req, res, () => {
        // rateLimit es async: usar .catch captura errores no manejados (fail-safe).
        rateLimit(req, res, () => {
          // ── Routing ─────────────────────────────────────────────────────
          const handler = router.resolve(req.method, req.url);
          if (handler) {
            handler(req, res);
            return;
          }

          // ── Proxy hacia Django para rutas /api/* ──────────────────────
          // Solo se reenvían rutas destinadas al backend.
          if (req.url.startsWith('/api/')) {
            multipart(req, res, () => {
              proxyToDjango(req, res);
            });
            return;
          }

          // ── 404 para cualquier otra ruta ────────────────────────────────
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
        }).catch((err) => {
          console.error('[server] rateLimit error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        });
      });
    });
  });
});

// Arranque solo cuando se ejecuta directamente (node server.js).
// Los tests importan este módulo sin iniciar el servidor.
if (require.main === module) {
  server.listen(config.PORT, () => {
    console.log(`[gateway] listening on port ${config.PORT}`);
  });
}

module.exports = server;
