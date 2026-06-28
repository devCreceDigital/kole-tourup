'use strict';

/**
 * middleware/rateLimit.js — Rate limiting por IP usando Redis.
 *
 * Algoritmo: Fixed Window Counter.
 *   - Por cada IP se mantiene un contador en Redis con clave `rl:<ip>`.
 *   - Al primer request de la ventana: INCR crea la clave → EXPIRE la expira
 *     automáticamente al final de la ventana (RATE_LIMIT_WINDOW_MS / 1000 segundos).
 *   - Requests subsiguientes: solo INCR.
 *   - Si el contador supera RATE_LIMIT_MAX → 429 Too Many Requests.
 *   - Al expirar la clave Redis, la ventana se resetea naturalmente.
 *
 * Gestión del cliente Redis:
 *   - Conexión lazy: se conecta al primer uso, no al importar el módulo.
 *   - Si Redis no está disponible (error de conexión), el rate limiting se
 *     desactiva silenciosamente (fail-open). El request pasa normalmente.
 *     Esto es preferible a bloquear todo el tráfico por una caída de Redis.
 *   - La decisión fail-open está documentada en DECISIONS.md (DEC-005).
 *
 * Obtención de la IP del cliente:
 *   - Prioridad 1: X-Forwarded-For (reverse proxy / load balancer en producción).
 *   - Prioridad 2: req.socket.remoteAddress (conexión directa).
 *   - La IP se sanitiza: se toma solo el primer valor de X-Forwarded-For para
 *     evitar header spoofing (el proxy confiable siempre añade al final).
 *
 * Configuración (desde config.js → env vars):
 *   RATE_LIMIT_WINDOW_MS  — ventana en milisegundos (default: 60000 = 1 min)
 *   RATE_LIMIT_MAX        — requests máximos por ventana (default: 100)
 */

const { createClient } = require('redis');
const config = require('../config');

// ─── Cliente Redis (singleton lazy) ──────────────────────────────────────────

let redisClient = null;
let redisReady = false;

/**
 * Obtiene (o crea) el cliente Redis singleton.
 * La conexión es lazy: ocurre al primer uso, no al importar el módulo.
 * Esto permite que los tests unitarios del middleware no necesiten Redis.
 */
function getRedisClient() {
  if (redisClient) return redisClient;

  redisClient = createClient({ url: config.REDIS_URL });

  redisClient.on('ready', () => {
    redisReady = true;
  });

  redisClient.on('error', (err) => {
    // Loguear el error pero no lanzar — fail-open (DEC-005).
    console.error('[rateLimit] Redis error:', err.message);
    redisReady = false;
  });

  redisClient.on('reconnecting', () => {
    redisReady = false;
  });

  // Conectar asíncronamente — no bloqueamos el startup del servidor.
  redisClient.connect().catch((err) => {
    console.error('[rateLimit] Redis connect failed:', err.message);
  });

  return redisClient;
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Extrae la IP del cliente desde el request.
 * En producción detrás de un proxy, X-Forwarded-For contiene la IP real.
 * Se toma el PRIMER valor para resistir header injection del cliente
 * (el proxy confiable añade la IP del cliente al final del header).
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {string} IP del cliente
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // "client, proxy1, proxy2" → tomamos "client"
    return forwarded.split(',')[0].trim();
  }
  return req.socket && req.socket.remoteAddress
    ? req.socket.remoteAddress
    : 'unknown';
}

/**
 * Construye la clave Redis para el rate limit de una IP.
 * Prefijo `rl:` para namespace (no colisiona con claves de JWT de Django).
 *
 * @param {string} ip
 * @returns {string}
 */
function buildKey(ip) {
  return `rl:${ip}`;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

const WINDOW_SECONDS = Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000);

/**
 * Middleware de rate limiting por IP.
 * Fail-open: si Redis no está disponible, el request pasa sin limitación.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 * @param {Function}                            next
 */
async function rateLimit(req, res, next) {
  const client = getRedisClient();

  // Fail-open: si Redis no está listo, pasar sin limitar.
  if (!redisReady) {
    next();
    return;
  }

  const ip = getClientIp(req);
  const key = buildKey(ip);

  try {
    // INCR es atómico — crea la clave si no existe (valor inicial 0 → 1).
    const count = await client.incr(key);

    // Solo establecer TTL en el primer request de la ventana.
    // Si ya existe TTL, no lo resetear (evitar que un request extienda la ventana).
    if (count === 1) {
      await client.expire(key, WINDOW_SECONDS);
    }

    if (count > config.RATE_LIMIT_MAX) {
      // Obtener el TTL restante para incluirlo en el header Retry-After.
      const ttl = await client.ttl(key);
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': String(ttl > 0 ? ttl : WINDOW_SECONDS),
        'X-RateLimit-Limit': String(config.RATE_LIMIT_MAX),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : WINDOW_SECONDS)),
      });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
      return;
    }

    // Headers informativos para el cliente (no bloquean)
    const remaining = Math.max(0, config.RATE_LIMIT_MAX - count);
    res.setHeader('X-RateLimit-Limit', String(config.RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    next();
  } catch (err) {
    // Error inesperado de Redis en mid-flight → fail-open, loguear.
    console.error('[rateLimit] Unexpected Redis error:', err.message);
    next();
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  rateLimit,
  getClientIp,
  buildKey,
  // Expuesto para tests: permite inyectar un cliente Redis mock.
  _setRedisClientForTest(client, ready = true) {
    redisClient = client;
    redisReady = ready;
  },
  _resetForTest() {
    redisClient = null;
    redisReady = false;
  },
};
