'use strict';

/**
 * middleware/security.js — Headers de seguridad HTTP.
 *
 * Añade cabeceras de seguridad estándar a todas las respuestas.
 * No depende de Redis ni de ningún estado externo — es un middleware
 * puro sin efectos secundarios.
 *
 * Headers implementados:
 *   Strict-Transport-Security  — HSTS: fuerza HTTPS por 1 año (incluye subdominos)
 *   X-Frame-Options            — Previene clickjacking (no iframes de terceros)
 *   X-Content-Type-Options     — Previene MIME sniffing
 *   X-XSS-Protection           — Habilita filtro XSS en navegadores antiguos
 *   Referrer-Policy            — Limita info del referrer a same-origin
 *   X-DNS-Prefetch-Control     — Desactiva DNS prefetch (privacidad)
 *
 * Nota sobre HSTS en desarrollo local (HTTP):
 *   Strict-Transport-Security se envía siempre. Los navegadores la ignoran
 *   en conexiones HTTP sin TLS, por lo que no genera efectos en desarrollo.
 *   En producción (HTTPS) se aplica correctamente.
 *
 * Este middleware siempre llama next() — nunca termina el request.
 */

const SECURITY_HEADERS = [
  // HSTS: 1 año, incluir subdominios, permitir preload en registros públicos
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
  // Clickjacking: no permitir que este sitio sea embedido en iframes de terceros
  ['X-Frame-Options', 'DENY'],
  // MIME sniffing: el browser debe confiar en el Content-Type declarado
  ['X-Content-Type-Options', 'nosniff'],
  // XSS filter legado para IE/Chrome antiguos
  ['X-XSS-Protection', '1; mode=block'],
  // Solo enviar referrer a same-origin
  ['Referrer-Policy', 'same-origin'],
  // Desactivar DNS prefetch para evitar filtraciones de URL
  ['X-DNS-Prefetch-Control', 'off'],
];

/**
 * Middleware de seguridad: añade headers de seguridad HTTP a la respuesta.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 * @param {Function}                            next
 */
function security(req, res, next) {
  for (const [header, value] of SECURITY_HEADERS) {
    res.setHeader(header, value);
  }
  next();
}

module.exports = { security, SECURITY_HEADERS };
