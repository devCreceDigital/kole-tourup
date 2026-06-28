# DECISIONS.md — Registro de Decisiones Técnicas

Este archivo documenta decisiones donde la especificación era ambigua o contradictoria.
Cada entrada incluye el problema, los documentos involucrados, las alternativas evaluadas
y la decisión adoptada. Las entradas con estado "Pendiente de decisión" requieren
aprobación explícita del cliente antes de proceder.

---

## DEC-001 — Campo `relacion_alumno` en `PadreTutor`

**ID:** DEC-001  
**Estado:** Aprobado (implementado en TASK-007)  
**Fecha:** 2026-06-28  
**Afecta:** `backend/apps/autenticacion/models.py` — `PadreTutor.relacion_alumno`

### Problema

`DATABASE.md §PadreTutor` define `relacion_alumno` como `CharField(20)` con
`RelacionAlumno.choices` sin especificar `blank=True`, lo que en Django implica
que el campo es **requerido** (no puede guardarse vacío).

Sin embargo, **ninguno de los otros documentos** captura este campo en ningún flujo
de usuario:

| Documento | Flujo revisado | ¿Incluye `relacion_alumno`? |
|---|---|---|
| `API.md` | `POST /auth/registro/` payload: `email, password, nombre, apellidos, rol, telefono` | ❌ No |
| `USER_STORIES.md` | US-AUTH-01 (registro), US-INS-02 (wizard inscripción) | ❌ No |
| `UI_UX.md` | Wizard Paso 1 (datos alumno), Paso 2 (colegio), Paso 3 (salud y T&C) | ❌ No |
| `REQUIREMENTS.md` | RF-PT-01 (registro), RF-PT-04 (wizard) | ❌ No |
| `AI_CONTEXT.md` | 14 invariantes de negocio | ❌ No |

### Pregunta de diseño

¿Debe `relacion_alumno` ser requerido en el momento del registro, o puede dejarse
vacío hasta que el padre/tutor complete su perfil?

### Alternativas evaluadas

**Alternativa A — Requerido en el registro:**
- Requiere añadir `relacion_alumno` al payload de `POST /auth/registro/`.
- Implica modificar `API.md`, `USER_STORIES.md`, `UI_UX.md` y `REQUIREMENTS.md`.
- Rompe la especificación API actual.
- Impacto: 5 documentos + pantalla de registro en Next.js.

**Alternativa B — `blank=True` (opcional, captura diferida):**
- `POST /auth/registro/` no cambia — sigue con el payload actual.
- El campo se completa en la pantalla de perfil (RF-PT-16) o en el wizard de inscripción.
- Consistente con los 5 documentos de flujo que no lo mencionan.
- Reversible: si en el futuro se añade al registro, solo se cambia `blank=True` → `blank=False`
  y se actualiza la especificación API.

### Decisión adoptada

**Alternativa B — `blank=True`.**

`PadreTutor.relacion_alumno` se implementa con `blank=True`. El campo es opcional
en el registro y puede completarse posteriormente. No existe ningún flujo diseñado
actualmente que lo capture obligatoriamente.

### Referencia en código

```python
# apps/autenticacion/models.py — decisión I-04
relacion_alumno = models.CharField(
    max_length=20,
    choices=RelacionAlumno.choices,
    blank=True,  # D-09: API.md /auth/registro/ no incluye este campo
    verbose_name="Relación con el alumno",
)
```

### Acción pendiente

Si el cliente requiere capturar `relacion_alumno` de forma obligatoria, se debe:
1. Añadir el campo al payload de `POST /auth/registro/` en `API.md`.
2. Añadir un paso de "Datos del tutor" al wizard en `UI_UX.md`.
3. Actualizar `USER_STORIES.md` y `REQUIREMENTS.md`.
4. Cambiar `blank=True` → `blank=False` en el modelo y generar migración.

---

## DEC-002 — Login endpoint establece cookies httpOnly directamente (no el Gateway)

**ID:** DEC-002  
**Estado:** Aprobado (implementado en TASK-010)  
**Fecha:** 2026-06-28  
**Afecta:** `backend/apps/autenticacion/views.py` — `LoginAPIView`

### Problema

`ARCHITECTURE.md §DA-06` describe el flujo de login como:

> 2. Django responde con `{access_token, refresh_token, rol}`
> 3. Gateway escribe: `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict`

Es decir: Django devuelve los tokens en el body, y el Gateway los convierte en cookies httpOnly.

Sin embargo, TASK-010 requiere explícitamente que el backend establezca las cookies.

### Alternativas evaluadas

**Alternativa A — Gateway establece cookies (DA-06):** Django retorna tokens en body; Gateway parsea y convierte en cookies. Requiere Gateway con lógica de transformación. Gateway aún no implementado.

**Alternativa B — Backend establece cookies (implementada):** Django setea cookies httpOnly en DRF. Body mínimo: `{rol, agencia_id}`. Más simple y tokens nunca expuestos en body.

### Decisión adoptada

**Alternativa B.** Cookies configuradas en `LoginAPIView.post()`:

| Cookie | HttpOnly | Secure | SameSite | Path | Max-Age |
|---|---|---|---|---|---|
| `access_token` | True | `not DEBUG` | Strict | `/` | 900 |
| `refresh_token` | True | `not DEBUG` | Strict | `/api/v1/auth/` | 604800 |

### Impacto en API.md

Respuesta de `POST /auth/login/` corregida a `{rol, agencia_id}` (tokens en cookies, no en body).

### Acción pendiente para Gateway

Cuando se implemente el Gateway, su función de auth será: leer cookie `access_token` → añadir `Authorization: Bearer` en el reenvío al backend. No necesita transformar el body de respuesta de login.

---

## DEC-003 — Sin rotación de Refresh Token en cada /refresh/ (rotación diferida)

**ID:** DEC-003  
**Estado:** Aprobado (implementado en TASK-011)  
**Fecha:** 2026-06-28  
**Afecta:** `backend/apps/autenticacion/views.py` — `RefreshAPIView`

### Problema

`SIMPLE_JWT["ROTATE_REFRESH_TOKENS"] = False` está configurado en base.py. La pregunta
es si `POST /auth/refresh/` debe generar un nuevo refresh token (rotación) o reutilizar
el existente (sin rotación).

### Alternativas evaluadas

**Alternativa A — Rotar en cada refresh:**
- Se genera un nuevo refresh token con nuevo jti en cada llamada a /refresh/.
- El jti anterior se elimina de Redis.
- Ventaja: detección de token theft (si el mismo refresh se usa dos veces, una es maliciosa).
- Desventaja crítica: **race condition con múltiples pestañas**. Si dos tabs refrescan
  simultáneamente, la segunda petición llega con el jti que ya fue invalidado por la primera.
  El resultado: sesiones válidas cerradas inesperadamente.

**Alternativa B — Sin rotación (rotación diferida, implementada):**
- /refresh/ solo genera un nuevo access token. El refresh token se mantiene inalterado.
- El jti sigue siendo el mismo en Redis hasta logout explícito o TTL de 7 días.
- Ventaja: sin race conditions. Correcto con múltiples pestañas.
- Ventaja: simplidad — no hay que actualizar Redis en cada refresh.
- Limitación aceptable: no detecta token theft durante la ventana de 7 días.
  Sin embargo, el access de 15 min limita el daño en caso de robo.

### Decisión adoptada

**Alternativa B — Sin rotación.** `RefreshAPIView` genera solo un nuevo access_token,
no modifica el refresh_token ni su entrada en Redis.

### Cuándo rotar (tareas futuras)

La rotación SÍ tiene sentido en operaciones de alta sensibilidad:
- Cambio de contraseña → invalida todos los refresh tokens (revocación global)
- Cambio de email
- Detección de actividad sospechosa (múltiples IPs en corto tiempo)
- Elevación de privilegios (admin)

Estos casos pertenecen a TASK-012+ (recuperación de contraseña, seguridad avanzada).

---

## DEC-004 — Gateway auth middleware elimina Authorization del cliente si no hay cookie

**ID:** DEC-004  
**Estado:** Aprobado (implementado en TASK-015)  
**Fecha:** 2026-06-28  
**Afecta:** `gateway/middleware/auth.js`

### Problema

El middleware auth del Gateway puede recibir requests donde el cliente ya envía un header
`Authorization: Bearer <token>` directamente (sin pasar por la cookie httpOnly).

La especificación de TASK-015 solo define el caso "con cookie → añadir header" y "sin cookie → pasar sin header". No especifica qué hacer cuando el cliente envía Authorization directamente.

Existen dos comportamientos posibles:

### Alternativas evaluadas

**Alternativa A — Ignorar el Authorization del cliente si hay cookie; pasarlo si no hay:**
- Si hay cookie: sobreescribir Authorization con el token de la cookie.
- Si no hay cookie: dejar pasar el Authorization del cliente hacia Django.
- Riesgo: permite al cliente bypassear la cookie httpOnly enviando un token arbitrario.
  Un atacante podría obtener un token por otro medio e inyectarlo directamente en el header.

**Alternativa B — El Gateway es el único origen válido de Authorization (implementada):**
- Si hay cookie: establecer `Authorization: Bearer <token-de-cookie>`.
- Si no hay cookie: **eliminar** el header Authorization (incluso si el cliente lo envió).
- La cookie httpOnly es la única fuente de verdad. Si no hay cookie, no hay autenticación.
- Django decide el 401 si el endpoint lo requiere.

### Decisión adoptada

**Alternativa B.** El Gateway elimina cualquier `Authorization` del cliente cuando no hay
cookie `access_token`. Esto impone que la cookie httpOnly sea el único mecanismo de
autenticación aceptado en el sistema (invariante #12: JWT en cookies httpOnly, nunca en localStorage).

### Referencia en código

```javascript
// gateway/middleware/auth.js
if (token) {
  req.headers['authorization'] = `Bearer ${token}`;  // cookie tiene prioridad
} else {
  delete req.headers['authorization'];  // eliminar injection del cliente
}
```

### Consecuencia

Los tests E2E futuros que simulen requests autenticados al Gateway deben enviar la cookie
`access_token`, no el header `Authorization` directamente.

---

## DEC-005 — Rate limiting fail-open cuando Redis no está disponible

**ID:** DEC-005  
**Estado:** Aprobado (implementado en TASK-016)  
**Fecha:** 2026-06-28  
**Afecta:** `gateway/middleware/rateLimit.js`

### Problema

¿Qué debe hacer el Gateway cuando Redis no responde o está caído, y se aplica rate limiting?

### Alternativas evaluadas

**Alternativa A — Fail-closed (denegar todo el tráfico):**
- Sin Redis, todo request recibe 429 o 503.
- Previene abuso durante la caída de Redis.
- Riesgo crítico: **una caída de Redis hace caer todo el sistema**, incluyendo usuarios legítimos.
- Inaceptable para una plataforma donde padres/agentes necesitan acceso continuo.

**Alternativa B — Fail-open (permitir todo el tráfico, implementada):**
- Sin Redis, los requests pasan sin limitación.
- El sistema permanece disponible para usuarios legítimos durante la caída de Redis.
- Riesgo aceptable: durante la caída, un atacante podría enviar más requests de los permitidos.
  La duración típica de una caída de Redis es corta, y el daño está acotado.
- Django sigue siendo la última línea de defensa (autenticación JWT, lógica de negocio).

### Decisión adoptada

**Alternativa B — Fail-open.** El middleware verifica `redisReady` antes de ejecutar.
Si Redis no está disponible, llama `next()` directamente sin consultar Redis.

### Referencia en código

```javascript
// gateway/middleware/rateLimit.js
if (!redisReady) {
  next();  // fail-open: sin Redis, pasar sin limitar
  return;
}
```

También se aplica en el `catch()` del bloque try: si Redis falla en mid-flight, se llama `next()`.

---

## DEC-006 — Restricción de proxy inverso solo a rutas `/api/`

**ID:** DEC-006  
**Estado:** Aprobado (implementado en TASK-017)  
**Fecha:** 2026-06-28  
**Afecta:** `gateway/server.js`

### Problema

Al implementar el proxy inverso hacia Django, si configuramos el gateway como un "catch-all" (enviar cualquier ruta no reconocida al backend), perdemos el control sobre qué tráfico llega al servidor de aplicaciones y modificamos el comportamiento esperado de `404 Not Found` en el Gateway para rutas inexistentes, generando respuestas `502 Bad Gateway` cuando el backend no está disponible.

### Alternativas evaluadas

**Alternativa A — Catch-all proxy:**
- Todo lo que no sea `/health` o rutas locales va al backend.
- Simple, pero inseguro. Atacantes escaneando vulnerabilidades de WordPress/PHP (ej. `/wp-admin`) generarían carga innecesaria en Django.

**Alternativa B — Restricción explícita por prefijo (implementada):**
- Solo las rutas que comiencen con `/api/` se reenvían al backend.
- Rutas no reconocidas que no sean `/api/` reciben un `404 Not Found` inmediato desde el Gateway, sin siquiera intentar contactar a Redis o al backend.
- Menor superficie de ataque.

### Decisión adoptada

**Alternativa B.** Se añadió validación en `server.js` (`req.url.startsWith('/api/')`) antes de llamar al proxy.

---
