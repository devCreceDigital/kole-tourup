'use strict';

/**
 * middleware/auth.js — Extracción de cookie → header Authorization.
 *
 * Responsabilidad única: leer el access_token de la cookie httpOnly y
 * añadir `Authorization: Bearer <token>` al request antes de enviarlo
 * al backend Django.
 *
 * Reglas de diseño (invariantes de arquitectura):
 *   - SIN validación JWT en el Gateway. Toda la lógica de validación
 *     vive en Django (JWTAuthentication). El Gateway es un canal de
 *     transporte, no un autorizador.
 *   - Si no hay cookie access_token → el request pasa SIN header.
 *     Django devuelve 401 si el endpoint lo requiere.
 *   - Si ya existe un header Authorization en el request entrante, se
 *     sobreescribe con la cookie (la cookie es la fuente de verdad —
 *     evita header injection desde el cliente).
 *   - El middleware no termina el request (no llama res.end()). Solo
 *     muta req.headers y llama next().
 *
 * Flujo de cookies httpOnly (DEC-002):
 *   Browser → [Cookie: access_token=<jwt>] → Gateway
 *   Gateway → [Authorization: Bearer <jwt>] → Django
 *   Django  → JWTAuthentication verifica firma + exp + jti
 */

/**
 * Parsea el header Cookie y retorna el valor de una clave específica.
 * Ejemplo: parseCookie('access_token=abc; refresh_token=xyz', 'access_token')
 *          → 'abc'
 *
 * @param {string} cookieHeader  — valor del header Cookie
 * @param {string} name          — nombre de la cookie a extraer
 * @returns {string|null}        — valor de la cookie o null si no existe
 */
function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey.trim();
    if (key === name) {
      // Reunir en caso de que el valor contenga '=' (ej: tokens base64url)
      return rest.join('=').trim() || null;
    }
  }
  return null;
}

/**
 * Middleware auth: cookie access_token → Authorization: Bearer.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 * @param {Function}                            next
 */
function auth(req, res, next) {
  const cookieHeader = req.headers['cookie'] || '';
  const token = parseCookie(cookieHeader, 'access_token');

  if (token) {
    // Sobreescribir siempre (previene header injection desde el cliente).
    req.headers['authorization'] = `Bearer ${token}`;
  } else {
    // Sin token: eliminar cualquier Authorization que haya inyectado el cliente
    // para evitar que el cliente se autentique con un token arbitrario que no
    // pasó por la cookie httpOnly del backend.
    delete req.headers['authorization'];
  }

  next();
}

module.exports = { auth, parseCookie };
