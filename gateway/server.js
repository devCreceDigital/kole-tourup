'use strict';

/**
 * server.js — Servidor HTTP del Gateway (node:http puro, sin frameworks).
 *
 * Pipeline de middlewares aplicado en orden por cada request:
 *   1. cors (TASK-014)      — verifica Origin, preflight OPTIONS
 *   2. auth (TASK-015)      — cookie access_token → Authorization: Bearer
 *   3. security (TASK-016)  — headers de seguridad HTTP (HSTS, X-Frame-Options, etc.)
 *   4. rateLimit (TASK-016) — contador por IP en Redis, ventana fija
 *   5. [proxy — TASK-017]   — reenvío a Django
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

const router = new Router();

// ─── Rutas ────────────────────────────────────────────────────────────────────

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
          const handler = router.resolve(req.method, req.url);
          if (handler) {
            handler(req, res);
            return;
          }
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
