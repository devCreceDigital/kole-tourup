# TASKS.md — Lista de Tareas: Tottem Hub (Fase 1)

> Cada tarea es ejecutable en una sola sesión de desarrollo.
> Solo se trabaja en una tarea a la vez. Al terminar, actualizar el estado y esperar aprobación.

**Estados:** `Pending` | `In Progress` | `Done` | `Blocked`

---

## FASE A — Cimientos

---

### TASK-001
**Nombre:** Setup del monorepo  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** Ninguna

**Descripción:**  
Crear la estructura de carpetas del monorepo con `frontend/`, `gateway/` y `backend/`. Inicializar los gestores de paquetes correspondientes.

**Archivos afectados:**
- `minka-group/` (carpeta raíz)
- `frontend/package.json`
- `gateway/package.json`
- `backend/requirements.txt`
- `.gitignore` (raíz)
- `README.md` (raíz)

**Criterios de aceptación:**
- [x] Estructura de carpetas creada según `ARCHITECTURE.md §Estructura del Repositorio`
- [x] `package.json` en `frontend/` y `gateway/` inicializados
- [x] `requirements.txt` en `backend/` creado (vacío por ahora)
- [x] `.gitignore` excluye `node_modules/`, `__pycache__/`, `.env`, `*.pyc`, `.next/`

---

### TASK-002
**Nombre:** Docker Compose — infraestructura local  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-001

**Descripción:**  
Crear `docker-compose.yml` con los servicios: PostgreSQL, Redis, Django (backend), Celery Worker, Celery Beat, Gateway (Node.js), Frontend (Next.js). Todos los servicios deben poder levantarse con `docker compose up`.

**Archivos afectados:**
- `docker-compose.yml`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `gateway/Dockerfile`
- `gateway/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`

**Criterios de aceptación:**
- [x] `docker compose up` levanta todos los servicios sin errores
- [x] PostgreSQL accesible en el puerto configurado (5432)
- [x] Redis accesible en el puerto configurado (6379)
- [x] Los servicios se comunican entre sí por nombre de servicio Docker
- [x] Servicios de app usan `tail -f /dev/null` como placeholder hasta su respectiva TASK de setup

---

### TASK-002.1
**Nombre:** Validación del entorno Docker  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 30min  
**Dependencias:** TASK-002

**Descripción:**  
Verificar que la infraestructura Docker puede iniciarse correctamente y que todos los servicios se comunican entre sí.

**Criterios de aceptación:**
- [x] `docker compose config` sin errores de sintaxis
- [x] `next@16.2.6` confirmado en npm registry
- [x] `docker compose up --build -d` exitoso — 7/7 contenedores `Up`
- [x] `db` en estado `healthy` (PostgreSQL 16.14)
- [x] `redis` en estado `healthy` (Redis 7.4.9)
- [x] `backend → db:5432` alcanzable vía socket Python
- [x] `backend → redis:6379` alcanzable vía socket Python
- [x] `gateway → backend` alcanzable vía ping (172.19.0.6)
- [x] Volumen `tottemhub_postgres_data` creado correctamente
- [x] Red `tottemhub_default` con 7 contenedores en subnet 172.19.0.0/16

---

### TASK-003
**Nombre:** Variables de entorno — archivos `.env.example`  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 30min  
**Dependencias:** TASK-001

**Descripción:**  
Crear archivos `.env.example` documentados para cada capa según `ARCHITECTURE.md §Variables de Entorno`. No incluir valores reales.

**Archivos afectados:**
- `frontend/.env.example`
- `gateway/.env.example`
- `backend/.env.example`

**Criterios de aceptación:**
- [x] Todas las variables documentadas en `ARCHITECTURE.md` están en los `.env.example`
- [x] Los archivos `.env` reales están en `.gitignore`
- [x] Cada variable tiene un comentario explicativo

---

### TASK-004
**Nombre:** Django project setup + settings  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-002

**Descripción:**  
Crear el proyecto Django con la estructura de settings por entorno (`base.py`, `local.py`, `production.py`). Configurar Django REST Framework, CORS, JWT (djangorestframework-simplejwt), Celery, Redis y S3.

**Archivos afectados:**
- `backend/manage.py`
- `backend/config/__init__.py`
- `backend/config/celery.py`
- `backend/config/wsgi.py`
- `backend/config/asgi.py`
- `backend/config/urls.py`
- `backend/config/settings/__init__.py`
- `backend/config/settings/base.py`
- `backend/config/settings/local.py`
- `backend/config/settings/production.py`
- `backend/apps/__init__.py`
- `backend/requirements.txt` (dependencias actualizadas)
- `docker-compose.yml` (commands backend/celery_worker/celery_beat activados)

**Criterios de aceptación:**
- [x] `python manage.py check` sin errores en entorno local
- [x] DRF configurado con autenticación JWT por defecto
- [x] Celery configurado con Redis como broker
- [x] `INSTALLED_APPS` preparado para las 12 apps del proyecto

---

### TASK-005
**Nombre:** Modelo Agencia + seed Totem Travel  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-004

**Descripción:**  
Crear la app `agencias` con el modelo `Agencia` exactamente como está en `DATABASE.md`. Crear un fixture o migration data para el seed de Totem Travel (`slug='totem'`).

**Archivos afectados:**
- `backend/apps/agencias/__init__.py`
- `backend/apps/agencias/apps.py`
- `backend/apps/agencias/models.py`
- `backend/apps/agencias/admin.py`
- `backend/apps/agencias/migrations/0001_initial.py`
- `backend/fixtures/agencia_totem.json`
- `backend/requirements.txt` (Pillow añadido para ImageField)
- `backend/config/settings/base.py` (apps.agencias en LOCAL_APPS)

**Criterios de aceptación:**
- [x] Modelo `Agencia` con todos los campos de `DATABASE.md`
- [x] UUID como PK
- [x] `slug` único
- [x] `python manage.py migrate` sin errores
- [x] Fixture crea Totem Travel con `slug='totem'`

---

### TASK-006
**Nombre:** Modelo Usuario (AbstractBaseUser)  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-005

**Descripción:**  
Crear la app `autenticacion` con el modelo `Usuario` como `AbstractBaseUser`. `USERNAME_FIELD = 'email'`. Incluir todos los campos de `DATABASE.md`, índices y el `CustomUserManager`.

**Archivos afectados:**
- `backend/apps/autenticacion/__init__.py`
- `backend/apps/autenticacion/apps.py`
- `backend/apps/autenticacion/models.py`
- `backend/apps/autenticacion/managers.py`
- `backend/apps/autenticacion/admin.py`
- `backend/apps/autenticacion/migrations/0001_initial.py`
- `backend/config/settings/base.py` (AUTH_USER_MODEL)

**Criterios de aceptación:**
- [x] `AUTH_USER_MODEL = 'autenticacion.Usuario'` en settings
- [x] `email` como USERNAME_FIELD, único
- [x] Índices `(agencia, rol)` y `email` declarados
- [x] `email_verificado = False` y `activo = True` por defecto
- [x] `nombre_completo` como propiedad Python
- [x] `python manage.py migrate` sin errores

---

### TASK-007
**Nombre:** Modelo PadreTutor  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-006

**Descripción:**  
Crear el modelo `PadreTutor` como perfil extendido de `Usuario` (OneToOneField). Incluir `RelacionAlumno` TextChoices.

**Archivos afectados:**
- `backend/apps/autenticacion/models.py` (RelacionAlumno + PadreTutor añadidos)
- `backend/apps/autenticacion/admin.py` (PadreTutorAdmin añadido)
- `backend/apps/autenticacion/migrations/0002_padretutor.py`

**Criterios de aceptación:**
- [x] `PadreTutor` con OneToOne a `Usuario`, CASCADE
- [x] `relacion_alumno` con TextChoices (padre, madre, tutor_legal)
- [x] `related_name='perfil_tutor'`
- [x] UUID como PK
- [x] CASCADE delete verificado en shell (borrar Usuario elimina PadreTutor)
- [x] OneToOne constraint verificado (duplicado lanza IntegrityError)
- [x] `blank=True` en `relacion_alumno` (D-09: API.md /auth/registro/ no incluye el campo)
- [x] `python manage.py check` — 0 issues
- [x] `migrate` — OK

**Decisión D-09 registrada:**  
`relacion_alumno` es `blank=True` porque `POST /auth/registro/` no lo incluye en el payload (API.md). Se completa en el wizard de inscripción. Reversible si el registro se extiende.

---

### TASK-008
**Nombre:** Auth — POST /auth/registro/ + email de verificación  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-006, TASK-007

**Descripción:**  
Implementar el endpoint de registro. Crea `Usuario` con `activo=True, email_verificado=False`. Genera token de verificación y envía email con enlace de activación. Token expira en 24h.

**Archivos creados:**
- `backend/apps/autenticacion/tokens.py` — token HMAC stateless via django.core.signing (24h)
- `backend/apps/autenticacion/serializers.py` — RegistroSerializer (valida rol, crea PadreTutor para rol='padre')
- `backend/apps/autenticacion/views.py` — RegistroAPIView
- `backend/apps/autenticacion/urls.py` — /registro/ activo
- `backend/templates/emails/verificacion_email.html` — email HTML responsive

**Archivos modificados:**
- `backend/config/urls.py` — include("apps.autenticacion.urls") activado
- `backend/config/settings/base.py` — FRONTEND_URL añadido
- `backend/config/settings/.env.example` — FRONTEND_URL documentado
- `docs/DECISIONS.md` — DEC-001 creado (D-09 resuelto: relacion_alumno blank=True)

**Criterios de aceptación:**
- [x] `POST /api/v1/auth/registro/` responde `201 Created`
- [x] Email no duplicado → error `400` con mensaje claro
- [x] `email_verificado=False` al crear
- [x] Email de verificación enviado con link al token
- [x] Token expira en 24h
- [x] Payload y respuesta coinciden con `API.md`

**Notas:**
- PadreTutor se crea automáticamente en `serializer.create()` si `rol='padre'` (necesario para TASK-032 Inscripcion.padre_tutor FK).
- Email se envía síncronamente. Candidato a Celery en TASK-048+.
- `python manage.py check` — 0 issues. flake8 — 0 errores. 7 tests — todos pasan.

---

### TASK-009
**Nombre:** Auth — GET /auth/verificar/  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-008

**Descripción:**  
Implementar el endpoint de activación de cuenta. Valida el token, actualiza `email_verificado=True`. Redirige a `/login` con mensaje de éxito.

**Archivos modificados:**
- `backend/apps/autenticacion/views.py` — VerificarEmailAPIView añadida
- `backend/apps/autenticacion/urls.py` — /verificar/ activado

**Criterios de aceptación:**
- [x] Token válido → `email_verificado=True`, 200 (redirect a /login es responsabilidad del frontend)
- [x] Token inválido o expirado → `400 Bad Request` con mensajes diferenciados
- [x] El token solo puede usarse una vez (idempotente: 2do uso → 200 "ya verificada", sin efecto)

**Notas:**
- Operación idempotente: usuario ya verificado → 200 (no 4xx). Seguro re-clicar el enlace.
- Mensajes diferenciados: "expirado" vs "no es válido" vs "ya verificada".
- Usuario inexistente devuelve el mismo mensaje que token inválido (no revelar existencia de IDs).
- 7 tests — todos pasan: token válido, expirado, modificado, usuario inexistente,
  ya verificado, token ausente, flujo completo registro→verificación.

---

### TASK-010
**Nombre:** Auth — POST /auth/login/ + JWT + Redis allowlist  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-009

**Descripción:**  
Implementar login. Verifica credenciales. Genera `access_token` (15 min) y `refresh_token` (7 días). Almacena refresh_token en Redis allowlist. Actualiza `ultimo_login`. Establece cookies httpOnly.

**Archivos modificados:**
- `backend/apps/autenticacion/tokens.py` — añadido `REFRESH_REDIS_KEY` template
- `backend/apps/autenticacion/serializers.py` — añadido `LoginSerializer`
- `backend/apps/autenticacion/views.py` — añadido `LoginAPIView`
- `backend/apps/autenticacion/urls.py` — `/login/` activado
- `docs/DECISIONS.md` — DEC-002 añadido (backend establece cookies, no Gateway)
- `docs/API.md` — respuesta de `/auth/login/` actualizada (tokens en cookies, no en body)

**Criterios de aceptación:**
- [x] Credenciales inválidas → `401` (mismo mensaje para email inexistente y pass. incorrecta)
- [x] Cuenta no verificada → `403` (invariante #8)
- [x] Cuenta inactiva → `403`
- [x] Login exitoso → `200` con cookies `access_token` y `refresh_token` httpOnly; body `{rol, agencia_id}`
- [x] `access_token` Max-Age=900 (15 min), SameSite=Strict, Path=/
- [x] `refresh_token` Max-Age=604800 (7 días), SameSite=Strict, Path=/api/v1/auth/
- [x] `refresh_token.jti` almacenado en Redis con TTL 7 días
- [x] `ultimo_login` actualizado en BD
- [x] Respuesta coincide con `API.md` actualizada (DEC-002)

**Notas:**
- simplejwt `utctimetuple()` pierde subsegundos → exp-iat puede ser 899/604799. Normal.
- `Secure=not DEBUG`: False en local (HTTP), True en prod (HTTPS).
- 9 tests — todos pasan (credenciales, cookies, Redis, expiración, errores, último login).

---

### TASK-011
**Nombre:** Auth — POST /auth/refresh/ y POST /auth/logout/  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-010

**Descripción:**  
Implementar renovación de access token y logout. Logout invalida el refresh token en Redis.

**Archivos modificados:**
- `backend/apps/autenticacion/views.py` — `RefreshAPIView`, `LogoutAPIView`, helper `_jwt_decode_sin_expiracion`
- `backend/apps/autenticacion/urls.py` — `/refresh/` y `/logout/` activados
- `docs/DECISIONS.md` — DEC-003 añadido (sin rotación de refresh token en /refresh/)

**Criterios de aceptación:**
- [x] `POST /auth/refresh/` con refresh válido → nuevo `access_token` cookie (refresh_token intacto — DEC-003)
- [x] `POST /auth/refresh/` con cookie ausente → `401`
- [x] `POST /auth/refresh/` con token expirado → `401` con mensaje "ha expirado" (distinto a "inválido")
- [x] `POST /auth/refresh/` con firma alterada → `401` con mensaje "inválido"
- [x] `POST /auth/refresh/` con jti no en Redis → `401`
- [x] `POST /auth/refresh/` con usuario inactivo → `403`
- [x] `POST /auth/logout/` elimina el refresh_token de la allowlist Redis
- [x] `POST /auth/logout/` es idempotente (200 si ya estaba desconectado)
- [x] Logout elimina solo la sesión actual (no otras sesiones simultáneas)
- [x] Cookies eliminadas con `max_age=0` tras logout
- [x] Redis limpio tras logout

**Notas:**
- `pyjwt.decode(..., options={"verify_exp": False})` distingue firma inválida de token expirado antes de llamar a simplejwt.
- `LogoutAPIView` usa best-effort: ignora excepciones de token inválido (idempotencia).
- `_jwt_decode_sin_expiracion()` documentado en DECISIONS.md DEC-003.
- `python manage.py check` — 0 issues. flake8 — 0 errores. 11 tests — todos pasan.

---

### TASK-012
**Nombre:** Auth — GET/PATCH /agencias/perfil/  
**Estado:** `Done`  
**Prioridad:** Media  
**Estimación:** 1h  
**Dependencias:** TASK-010

**Descripción:**  
Endpoints para consultar y actualizar el perfil de la agencia del agente autenticado.

**Archivos creados:**
- `backend/apps/agencias/permissions.py` — `EsAgente` (verifica `rol == 'agente'`)
- `backend/apps/agencias/serializers.py` — `AgenciaPerfilSerializer` (read-only: id, slug, licencia_agencia, activa, created_at)
- `backend/apps/agencias/views.py` — `AgenciaPerfilAPIView` (GET + PATCH)
- `backend/apps/agencias/urls.py` — `/perfil/`
- `backend/apps/agencias/tests.py` — 13 tests

**Archivos modificados:**
- `backend/config/urls.py` — `/api/v1/agencias/` registrado
- `docs/API.md` — schema de respuesta GET y PATCH añadido
- `docs/TECH_DEBT.md` — creado con TD-001 a TD-004

**Criterios de aceptación:**
- [x] Solo accesible por rol `agente`
- [x] `GET` devuelve perfil de la agencia del agente autenticado
- [x] `PATCH` permite actualizar nombre, logo, teléfono, email_contacto
- [x] Filtrado por `agencia_id` del usuario autenticado (nunca por parámetro del request)

**Notas:**
- Invariante #13: `agencia_id` siempre se extrae de `request.user.agencia` (no del payload).
- Aislamiento multi-tenant verificado: cada agente solo ve y edita su propia agencia.
- Campos read-only en PATCH: `id`, `slug`, `licencia_agencia`, `activa`, `created_at`.
- `email_contacto` con `unique=True` — duplicados retornan 400 via `UniqueValidator`.
- `python manage.py check` — 0 issues. flake8 (archivos TASK-012) — 0 errores. 13 tests — todos pasan. Tiempo: 2.200s.

---

### TASK-013
**Nombre:** Gateway — server.js + router.js + health check  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-002

**Descripción:**  
Crear el servidor HTTP Gateway usando solo `node:http`. Implementar `router.js` como mapa de rutas. Endpoint `GET /health` que responde `200 OK`.

**Archivos creados:**
- `gateway/config.js` — configuración desde env vars (PORT, BACKEND_URL, REDIS_URL, etc.)
- `gateway/router.js` — clase `Router` con `add()`, `get()`, `resolve()` (matching exacto, ignora query string)
- `gateway/server.js` — servidor `node:http`, exporta `server` (no auto-inicia al ser requerido en tests)
- `gateway/tests/router.test.js` — 5 tests unitarios del Router
- `gateway/tests/server.test.js` — 4 tests de integración HTTP (puerto aleatorio)

**Archivos modificados:**
- `gateway/package.json` — script `"test"` añadido
- `docker-compose.yml` — comando gateway activado: `node server.js` (antes `tail -f /dev/null`)

**Criterios de aceptación:**
- [x] Sin Express, Fastify ni ningún framework (`node:http` puro)
- [x] `GET /health` responde `200 {"status": "ok"}` — verificado en `localhost:3001`
- [x] El servidor escucha en el puerto configurado por `PORT` env var (`PORT=3001` en docker-compose)
- [x] `router.js` implementa matching de `{method, path}` → handler

**Notas:**
- `require.main === module` guard: el servidor no arranca al ser importado en tests.
- La query string se descarta antes del matching (`url.split('?')[0]`).
- Tests: `node --test` (Node 20 built-in, sin dependencias externas).
- 9 tests — todos pasan (5 router + 4 HTTP). Tiempo: 258ms.
- `GET /health` verificado en vivo vía `Invoke-WebRequest http://localhost:3001/health` → 200 `{"status":"ok"}`.
- Rutas desconocidas → 404 `{"error":"Not Found"}`.

---

### TASK-014
**Nombre:** Gateway — middleware CORS  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-013

**Descripción:**  
Implementar CORS manualmente (sin librería). Headers configurables por `CORS_ORIGINS` env var. Manejo correcto de preflight OPTIONS.

**Archivos creados/modificados:**
- `gateway/middleware/cors.js` — CORS middleware completo (sin librería)
- `gateway/server.js` — middleware integrado en el pipeline
- `gateway/tests/cors.test.js` — 10 tests de integración CORS
- `gateway/.env` — archivo local de desarrollo (en .gitignore) con `CORS_ORIGINS`

**Criterios de aceptación:**
- [x] Orígenes permitidos leídos de `CORS_ORIGINS` (comma-separated)
- [x] Headers correctos: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`
- [x] Preflight `OPTIONS` responde `204 No Content`
- [x] Orígenes no autorizados reciben `403`

**Notas:**
- Implementación sin librerías: solo `node:http` + módulo propio `config.js`.
- `Access-Control-Allow-Credentials: true` incluido (necesario para cookies httpOnly en TASK-015).
- `Vary: Origin` incluido para compatibilidad con caches de CDN/proxy.
- `Access-Control-Max-Age: 86400` en preflight: el browser cachea el resultado 24h.
- Sin header Origin → petición directa/same-origin → pasa sin CORS headers (correcto por spec).
- Origen no autorizado → 403 sin ningún CORS header (sin leak de información).
- `gateway/.env` necesario para tests locales (en Docker las vars vienen de `docker-compose.yml`).
- 19 tests — todos pasan (10 CORS + 5 router + 4 server). Tiempo: 388ms.

---

### TASK-015
**Nombre:** Gateway — middleware auth (cookie → Bearer)  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-013

**Descripción:**  
Leer el `access_token` de la cookie `httpOnly` y añadir `Authorization: Bearer <token>` al forward hacia Django.

**Archivos creados/modificados:**
- `gateway/middleware/auth.js` — middleware auth + función `parseCookie` exportada
- `gateway/server.js` — middleware auth integrado en el pipeline (posición 2, después de CORS)
- `gateway/tests/auth.test.js` — 14 tests (6 unitarios parseCookie + 6 middleware + 2 integración)

**Criterios de aceptación:**
- [x] Cookie `access_token` extraída del header `Cookie`
- [x] Header `Authorization: Bearer <token>` añadido al request hacia backend
- [x] Si no hay cookie, el request pasa sin header (Django maneja el 401)
- [x] No hay lógica de validación JWT en el gateway (solo forwarding)

**Notas:**
- `parseCookie()` exportada por separado para permitir tests unitarios directos.
- Maneja JWTs con `=` en el valor (base64url padding) correctamente.
- Seguridad extra: si NO hay cookie, se **elimina** cualquier header `Authorization`
  que el cliente pudiera haber inyectado. Previene bypass de la cookie httpOnly.
- Si HAY cookie, sobreescribe cualquier `Authorization` preexistente del cliente.
- El middleware nunca termina el request — siempre llama `next()`.
- Sin dependencias externas. Solo Node.js built-ins.
- Resuelve parcialmente TD-002 (la ruta cookie→header ahora es funcional en el Gateway).
- 33 tests totales — todos pasan (14 auth + 10 CORS + 5 router + 4 server). Tiempo: 458ms.

---

### TASK-016
**Nombre:** Gateway — middleware de seguridad + rate limiting  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-013

**Descripción:**  
Headers de seguridad HTTP y rate limiting por IP usando Redis.

**Archivos creados/modificados:**
- `gateway/middleware/security.js` — 6 headers de seguridad HTTP (HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, X-DNS-Prefetch-Control)
- `gateway/middleware/rateLimit.js` — rate limiting por IP con Redis (fixed window, fail-open, Retry-After)
- `gateway/server.js` — middlewares integrados en el pipeline (posición 3 y 4)
- `gateway/tests/security.test.js` — 11 tests (6 unitarios + 5 integración)
- `gateway/tests/rateLimit.test.js` — 14 tests (5 unitarios + 6 comportamiento + 3 integración)
- `gateway/package.json` — script `test` actualizado con todos los archivos

**Criterios de aceptación:**
- [x] `security.js`: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`
- [x] `rateLimit.js`: contador en Redis por IP, ventana configurable por `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX`
- [x] Al exceder el límite → `429 Too Many Requests`
- [x] Contador se resetea tras la ventana de tiempo (EXPIRE de Redis al primer request)

**Notas:**
- Algoritmo: Fixed Window Counter (INCR + EXPIRE en el primer request de la ventana).
- `EXPIRE` solo se llama en el primer request (count === 1) — requests subsiguientes no resetean la ventana.
- Fail-open (DEC-005): si Redis no está disponible, el rate limit se desactiva silenciosamente. El tráfico pasa.
- Headers informativos en cada respuesta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
- Header `Retry-After` en respuestas 429 con el TTL restante de Redis.
- IP extraída de `X-Forwarded-For` (primer valor) o `socket.remoteAddress`.
- Cliente Redis singleton lazy: se conecta al primer uso, no al arrancar el servidor.
- Tests de rateLimit usan mock de Redis (inyección vía `_setRedisClientForTest`) — sin conexión real.
- 57 tests — todos pasan (14 auth + 10 CORS + 5 router + 4 server + 11 security + 14 rateLimit). Tiempo: 617ms.

---

### TASK-017
**Nombre:** Gateway — proxy Django + multipart + validación 10 MB  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-013, TASK-014, TASK-015, TASK-016

**Descripción:**  
Proxy que reenvía requests al backend Django. Parseo de multipart/form-data para uploads. Validación de tamaño de archivo (10 MB) como primera línea de defensa.

**Archivos creados/modificados:**
- `gateway/proxy/django.js` — proxy reenvía requests y response streams, filtra headers (`host`, `connection`).
- `gateway/proxy/multipart.js` — detecta multipart, acumula cuerpo en memoria (max 10MB), rechaza con 413 si excede.
- `gateway/tests/django.test.js` — tests unitarios y de integración de `proxyToDjango`.
- `gateway/tests/multipart.test.js` — tests de middleware de validación multipart y 10MB limit.
- `gateway/server.js` — Integración al final del pipeline solo para rutas `/api/*` (DEC-006).
- `gateway/package.json` — actualizados los tests.

**Criterios de aceptación:**
- [x] Requests GET/POST/PATCH/DELETE se reenvían al backend correctamente
- [x] Response del backend se hace pipe al cliente
- [x] Multipart/form-data se parsea antes de reenviar (se acumula el buffer)
- [x] Archivo > 10 MB → `413 Payload Too Large` (sin llegar al backend, fail-fast por Content-Length y buffer validation)
- [x] Timeout configurado para requests al backend (`PROXY_TIMEOUT_MS`)
- [x] Backend caído → `502 Bad Gateway` (o timeout → `504 Gateway Timeout`)

**Notas:**
- `multipart.js` utiliza fail-fast verificando `Content-Length`. Si está ausente o es falso, también cuenta bytes durante la subida y aborta el stream apenas supera 10MB.
- `django.js` inyecta header `x-forwarded-by: tottem-hub-gateway` para observabilidad.
- DEC-006 implementada: El gateway NO es un proxy catch-all total; solo enruta peticiones cuyo path empiece por `/api/`. Las demás reciben un limpio `404 Not Found` desde Node.js sin cargar a Redis ni al Backend.
- Test suite: 76 tests (pasan 76/76).

---

### TASK-018
**Nombre:** Next.js project setup + TailwindCSS 4 + route groups  
**Estado:** `Done`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-001

**Descripción:**  
Inicializar Next.js 16.2.6 con App Router. Configurar TailwindCSS 4 con `@theme {}` en `globals.css`. Crear la estructura de route groups: `(public)`, `(padre)`, `(alumno)`, `(agente)`.

**Archivos creados/modificados:**
- `frontend/app/layout.tsx` y `page.tsx`
- `frontend/app/globals.css` (con TailwindCSS `@theme`)
- `frontend/app/(public)/layout.tsx` y `viajes/page.tsx`
- `frontend/app/(padre)/layout.tsx` y `app/page.tsx`
- `frontend/app/(alumno)/layout.tsx` y `app/alumno/page.tsx`
- `frontend/app/(agente)/layout.tsx` y `backoffice/page.tsx`
- `frontend/next.config.js`, `postcss.config.mjs`, `tsconfig.json`, `.eslintrc.json`

**Criterios de aceptación:**
- [x] Next.js 16.2.6 instalado
- [x] App Router (no Pages Router)
- [x] TailwindCSS 4 con `@theme {}` en `globals.css` (sin `tailwind.config.js` para tokens)
- [x] Design tokens base: `--color-primary`, `--color-warning`, `--radius-card`
- [x] Los 4 route groups creados con sus layouts vacíos
- [x] `npm run build` (`next build` / TypeScript) sin errores

---

### TASK-019
**Nombre:** Frontend — middleware.ts (auth guard + redirect por rol)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-018

**Descripción:**  
`middleware.ts` en la raíz de `frontend/app/`. Lee cookie JWT, verifica rol y redirige: `padre/mecenas` → `/app/`, `agente` → `/backoffice/`, `alumno` → `/app/alumno/`. Rutas públicas no requieren auth.

**Archivos creados/modificados:**
- `frontend/proxy.ts` (Renombrado desde middleware.ts según deprecación de Next 16.2.6)
- `frontend/lib/auth.ts`

**Criterios de aceptación:**
- [x] Rutas `(padre)` sin JWT válido → redirect a `/login`
- [x] Rutas `(agente)` sin JWT válido o rol incorrecto → redirect a `/login`
- [x] Rutas `(public)` accesibles sin auth
- [x] Redirect post-login al portal correcto según rol (loops de login prevenidos)
- [x] JWT leído de cookie (nunca de localStorage)


---

### TASK-020
**Nombre:** Frontend — páginas de autenticación (login, registro, verificación)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-019, TASK-010, TASK-008, TASK-009

**Descripción:**  
Implementar las 3 pantallas de auth: login, registro y verificación de email. Formularios con validación client-side. Manejo de errores (401, 403, 400).

**Archivos afectados:**
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/registro/page.tsx`
- `frontend/app/(auth)/verificar/page.tsx`
- `frontend/lib/api.ts`

**Criterios de aceptación:**
- [x] Login: credenciales inválidas → "Email o contraseña incorrectos"
- [x] Login: cuenta no verificada → "Verifica tu email primero"
- [x] Login exitoso → redirect al portal según rol
- [x] Registro: email duplicado → error claro
- [x] Registro exitoso → "Revisa tu email para activar tu cuenta"
- [x] Verificación: link expirado → error claro
- [x] Sin errores TypeScript ni lint

---

## FASE B — Dominio Core (Backend)

---

### TASK-021
**Nombre:** Modelos de viajes — Viaje, PlanPago, Cuota  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-006

**Descripción:**  
Crear la app `viajes` con los modelos `Viaje`, `PlanPago` y `Cuota` según `DATABASE.md`. Incluir constraints de BD y enumeraciones.

**Archivos afectados:**
- `backend/apps/viajes/models.py`
- `backend/apps/viajes/migrations/0001_initial.py`

**Criterios de aceptación:**
- [x] Constraint BD: `fecha_regreso > fecha_salida`
- [x] Constraint BD: `Cuota.importe > 0`
- [x] `PlanPago` es OneToOne con `Viaje`
- [x] `Cuota` unique_together `(plan_pago, numero_cuota)`
- [x] `EstadoViaje` TextChoices: borrador, activo, cerrado, archivado
- [x] UUID como PK en todos los modelos
- [x] Índices declarados según `DATABASE.md`

---

### TASK-022
**Nombre:** Modelos de viajes — Itinerario, EtapaItinerario, Actividad  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-021

**Descripción:**  
Crear los modelos `Itinerario`, `EtapaItinerario` y `Actividad`. `Itinerario` es OneToOne con `Viaje`.

**Archivos afectados:**
- `backend/apps/viajes/models.py`
- `backend/apps/viajes/migrations/`

**Criterios de aceptación:**
- [x] `Itinerario` OneToOne con `Viaje`
- [x] `EtapaItinerario` unique_together `(itinerario, dia_numero)`
- [x] `Actividad` ordering `['orden', 'hora']`
- [x] `TipoActividad` TextChoices

---

### TASK-023
**Nombre:** Modelos de viajes — Grupo, Hotel, DocumentoRequerido  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-021

**Descripción:**  
Crear los modelos `Grupo`, `Hotel` y `DocumentoRequerido` vinculados a `Viaje`.

**Archivos afectados:**
- `backend/apps/viajes/models.py`
- `backend/apps/viajes/migrations/`

**Criterios de aceptación:**
- [x] `Grupo` unique_together `(viaje, nombre)`
- [x] `DocumentoRequerido` con `formatos_permitidos` y propiedad `formatos_lista`
- [x] Todos con UUID como PK

---

### TASK-024
**Nombre:** Signal Viaje.CREATE → crea Itinerario vacío  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 30min  
**Dependencias:** TASK-022

**Descripción:**  
Signal `post_save` en `Viaje` que crea automáticamente un `Itinerario` vacío al crear un viaje nuevo (invariante #11).

**Archivos afectados:**
- `backend/apps/viajes/signals.py`
- `backend/apps/viajes/apps.py`

**Criterios de aceptación:**
- [ ] Al crear `Viaje`, se crea `Itinerario` asociado automáticamente
- [ ] No se crea segundo `Itinerario` si el viaje ya tiene uno
- [ ] Signal registrado en `AppConfig.ready()`

---

### TASK-025
**Nombre:** API viajes — CRUD + transiciones de estado  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-024

**Descripción:**  
Implementar endpoints CRUD de viajes con permisos por rol. Transiciones de estado validadas (solo borrador → activo → cerrado → archivado, sin retroceso).

**Archivos afectados:**
- `backend/apps/viajes/views.py`
- `backend/apps/viajes/serializers.py`
- `backend/apps/viajes/permissions.py`
- `backend/apps/viajes/urls.py`

**Criterios de aceptación:**
- [ ] `GET /viajes/` filtra por `agencia_id` del agente
- [ ] `POST /viajes/` crea en estado `borrador`, solo agente
- [ ] `PATCH /viajes/{id}/` valida transiciones de estado
- [ ] `DELETE /viajes/{id}/` solo en estado `borrador` y sin inscripciones
- [ ] Padre/alumno solo ven viajes `activos` con inscripción propia
- [ ] Respuesta coincide con contratos de `API.md`

---

### TASK-026
**Nombre:** API viajes — métricas del viaje  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-025

**Descripción:**  
Endpoint `GET /viajes/{id}/metricas/` con % de inscritos, % pagado y % documentado. Solo accesible por agente.

**Archivos afectados:**
- `backend/apps/viajes/views.py`
- `backend/apps/viajes/serializers.py`

**Criterios de aceptación:**
- [ ] Respuesta incluye `total_inscritos`, `cupo_maximo`, `porcentaje_inscripcion`
- [ ] Respuesta incluye `total_pagado`, `total_esperado`, `porcentaje_pagado`
- [ ] Respuesta incluye `documentos_completos`, `documentos_pendientes`, `porcentaje_documentado`
- [ ] Cálculos correctos (solo pagos verificados cuentan)
- [ ] Solo accesible por rol agente

---

### TASK-027
**Nombre:** API plan de pagos y cuotas  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-025

**Descripción:**  
CRUD del plan de pagos. `PATCH` solo si no hay pagos verificados.

**Archivos afectados:**
- `backend/apps/viajes/views.py`
- `backend/apps/viajes/serializers.py`

**Criterios de aceptación:**
- [ ] `POST /viajes/{id}/plan-pago/` crea `PlanPago` + cuotas en una sola request
- [ ] `PATCH` bloqueado si hay pagos verificados asociados
- [ ] Cada cuota tiene `importe > 0` (validación + constraint)

---

### TASK-028
**Nombre:** API itinerario — etapas, actividades y reordenamiento bulk  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-024

**Descripción:**  
CRUD de etapas y actividades. Endpoint bulk de reordenamiento que actualiza múltiples actividades en una sola request.

**Archivos afectados:**
- `backend/apps/viajes/views.py`
- `backend/apps/viajes/serializers.py`

**Criterios de aceptación:**
- [ ] `POST /itinerarios/{id}/etapas/` crea etapa
- [ ] `POST /etapas/{id}/actividades/` crea actividad
- [ ] `PATCH /actividades/reordenar/` actualiza campo `orden` en bloque
- [ ] Reordenamiento bulk usa una sola transacción DB
- [ ] No existe PATCH individual para reordenar (invariante)

---

### TASK-029
**Nombre:** API hoteles + grupos + asignación de alumnos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-025

**Descripción:**  
CRUD de hoteles y grupos. Endpoint para asignar lista de alumnos a un grupo.

**Archivos afectados:**
- `backend/apps/viajes/views.py`
- `backend/apps/viajes/serializers.py`

**Criterios de aceptación:**
- [ ] CRUD hoteles vinculados a viaje
- [ ] CRUD grupos con capacidad opcional
- [ ] `POST /grupos/{id}/alumnos/` asigna lista de alumnos
- [ ] Respeta capacidad máxima del grupo si está definida

---

### TASK-030
**Nombre:** API documentos requeridos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-025

**Descripción:**  
CRUD de tipos de documentos requeridos por viaje.

**Archivos afectados:**
- `backend/apps/viajes/views.py`
- `backend/apps/viajes/serializers.py`

**Criterios de aceptación:**
- [ ] Solo agente puede crear/editar/eliminar
- [ ] `GET` accesible por cualquier usuario autenticado con acceso al viaje
- [ ] `formatos_permitidos` parseado correctamente como lista

---

### TASK-031
**Nombre:** Modelo LogAuditoria (inmutable)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 1h  
**Dependencias:** TASK-006

**Descripción:**  
Crear la app `auditoria` con el modelo `LogAuditoria`. Solo admite INSERT. Configurar para que sea imposible hacer UPDATE o DELETE desde el ORM.

**Archivos afectados:**
- `backend/apps/auditoria/models.py`
- `backend/apps/auditoria/migrations/`

**Criterios de aceptación:**
- [ ] `LogAuditoria` con todos los campos de `DATABASE.md`
- [ ] Override de `save()` que bloquea updates (solo permite INSERT)
- [ ] Override de `delete()` que lanza excepción
- [ ] UUID como PK, `timestamp` auto_now_add

---

### TASK-032
**Nombre:** Modelos Alumno, PadreTutor e Inscripcion  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-006, TASK-021

**Descripción:**  
Crear la app `inscripciones` con los modelos `Alumno`, `PadreTutor` e `Inscripcion`. Incluir campos pendientes de resolución (género, datos de colegio).

**Archivos afectados:**
- `backend/apps/inscripciones/models.py`
- `backend/apps/inscripciones/migrations/`

**Criterios de aceptación:**
- [ ] `Inscripcion` unique_together `(alumno, viaje)`
- [ ] `on_delete=PROTECT` en `alumno`, `viaje`, `padre_tutor`
- [ ] `saldo_pendiente`, `total_pagado`, `porcentaje_pagado` como propiedades Python (no columnas)
- [ ] `notas_internas` presente en el modelo pero excluido de serializers de padre/alumno
- [ ] UUID como PK en todos
- [ ] Índices `(viaje, estado)` y `padre_tutor`

---

### TASK-033
**Nombre:** API inscripciones — POST (wizard) + GET  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-032

**Descripción:**  
Endpoint de creación de inscripción: verifica cupo disponible, unicidad alumno/viaje, crea o recupera `Alumno`, crea `Inscripcion`. GET con detalle completo (resumen pagos + docs + hotel).

**Archivos afectados:**
- `backend/apps/inscripciones/views.py`
- `backend/apps/inscripciones/serializers.py`
- `backend/apps/inscripciones/urls.py`

**Criterios de aceptación:**
- [ ] Sin cupo → `409 Conflict`
- [ ] Alumno ya inscrito → `409 Conflict`
- [ ] `estado = 'pendiente'` al crear
- [ ] `precio_final = viaje.precio_total`
- [ ] GET `/inscripciones/{id}/` devuelve contrato de `AI_CONTEXT.md §Contratos UX`
- [ ] `notas_internas` ausente en serializer del padre

---

### TASK-034
**Nombre:** Signal Inscripcion.CREATE → email bienvenida  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 1h  
**Dependencias:** TASK-033

**Descripción:**  
Signal `post_save` en `Inscripcion` que envía email de bienvenida al tutor al crear una inscripción nueva.

**Archivos afectados:**
- `backend/apps/inscripciones/signals.py`
- `backend/apps/inscripciones/apps.py`
- `backend/templates/emails/bienvenida_inscripcion.html`

**Criterios de aceptación:**
- [ ] Email enviado al tutor al crear inscripción
- [ ] Email incluye nombre del viaje, fechas y próximos pasos
- [ ] Signal no bloquea la response de la API (envío síncrono aceptable en Fase 1)

---

### TASK-035
**Nombre:** Modelo Pago + API POST (upload comprobante)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-032

**Descripción:**  
App `pagos` con modelo `Pago`. Endpoint POST que acepta multipart (comprobante), valida tamaño y formato, sube a S3.

**Archivos afectados:**
- `backend/apps/pagos/models.py`
- `backend/apps/pagos/views.py`
- `backend/apps/pagos/serializers.py`
- `backend/apps/pagos/migrations/`

**Criterios de aceptación:**
- [ ] Constraint BD: `importe > 0`
- [ ] `estado = 'pendiente'` al crear
- [ ] Comprobante subido a S3 en `pagos/comprobantes/%Y/%m/`
- [ ] Validación de tamaño ≤ 10 MB y formato (pdf, jpg) en backend
- [ ] `pagado_por` = usuario autenticado (padre/mecenas) o especificado por agente
- [ ] Signal `post_save` disparado al crear

---

### TASK-036
**Nombre:** API Pago — PATCH verificar/rechazar + signals  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-035, TASK-031

**Descripción:**  
Endpoint PATCH para que el agente verifique o rechace pagos. Signals que crean `LogAuditoria` y `Notificacion` y envían emails.

**Archivos afectados:**
- `backend/apps/pagos/views.py`
- `backend/apps/pagos/signals.py`
- `backend/apps/pagos/apps.py`
- `backend/templates/emails/pago_verificado.html`
- `backend/templates/emails/pago_rechazado.html`

**Criterios de aceptación:**
- [ ] Solo rol `agente` puede hacer PATCH
- [ ] `estado=verificado` → `LogAuditoria(PAGO_ACTUALIZADO)` + `Notificacion` al tutor + email
- [ ] `estado=rechazado` → `LogAuditoria` + `Notificacion` con `notas` como motivo + email
- [ ] `estado=pendiente` al crear → `LogAuditoria(PAGO_REGISTRADO)` + email al agente
- [ ] Agente recibe notificación de nuevo pago pendiente

---

### TASK-037
**Nombre:** Modelo DocumentoEntregado + API POST (upload)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-032, TASK-030

**Descripción:**  
App `documentos` con modelo `DocumentoEntregado`. Endpoint POST que valida MIME type, extensión y tamaño, sube a S3.

**Archivos afectados:**
- `backend/apps/documentos/models.py`
- `backend/apps/documentos/views.py`
- `backend/apps/documentos/serializers.py`
- `backend/apps/documentos/validators.py`
- `backend/apps/documentos/migrations/`

**Criterios de aceptación:**
- [ ] Formato inválido → `400 Bad Request`
- [ ] Tamaño > 10 MB → `400 Bad Request`
- [ ] Validación de extensión Y MIME type (no solo extensión)
- [ ] Archivo subido a S3 en `documentos/%Y/%m/`
- [ ] `estado = 'pendiente'` al crear
- [ ] Permite múltiples versiones del mismo documento (tras rechazos)

---

### TASK-038
**Nombre:** API Documento — PATCH validar/rechazar + signals  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-037, TASK-031

**Descripción:**  
Endpoint PATCH para que el agente valide o rechace documentos. Signals crean `Notificacion` al tutor.

**Archivos afectados:**
- `backend/apps/documentos/views.py`
- `backend/apps/documentos/signals.py`
- `backend/apps/documentos/apps.py`

**Criterios de aceptación:**
- [ ] Solo agente puede PATCH
- [ ] `estado=validado` → registra `validado_por` + `fecha_validacion` + `Notificacion(doc_validado)`
- [ ] `estado=rechazado` → registra `motivo_rechazo` + `Notificacion(doc_rechazado)` con motivo
- [ ] Panel agente: `GET /documentos/?estado=pendiente&viaje_id=`

---

## FASE E — Automatización Celery

---

### TASK-039
**Nombre:** Modelo Notificacion + API notificaciones  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-006

**Descripción:**  
App `notificaciones` con modelo `Notificacion`. Endpoints GET (lista del usuario), PATCH (marcar leída) y POST (marcar todas leídas).

**Archivos afectados:**
- `backend/apps/notificaciones/models.py`
- `backend/apps/notificaciones/views.py`
- `backend/apps/notificaciones/serializers.py`
- `backend/apps/notificaciones/migrations/`

**Criterios de aceptación:**
- [ ] `TipoNotificacion` TextChoices: pago_vencido, doc_rechazado, doc_validado, comunicado, recordatorio
- [ ] `GET /notificaciones/` filtra por usuario autenticado, soporta `?leida=false`
- [ ] `PATCH /notificaciones/{id}/` marca como leída
- [ ] `POST /notificaciones/marcar-todas/` marca todas del usuario
- [ ] `referencia_id` y `referencia_tipo` permiten deep-link

---

### TASK-040
**Nombre:** Modelo Comunicado + API + task Celery envío masivo  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-039, TASK-033

**Descripción:**  
App `comunicados`. `POST /viajes/{id}/comunicados/` crea el comunicado y encola tarea Celery idempotente que envía email a todos los tutores del viaje.

**Archivos afectados:**
- `backend/apps/comunicados/models.py`
- `backend/apps/comunicados/views.py`
- `backend/apps/comunicados/tasks.py`
- `backend/apps/comunicados/migrations/`
- `backend/templates/emails/comunicado.html`

**Criterios de aceptación:**
- [ ] `enviado_email=False` al crear → Celery actualiza a `True` al completar
- [ ] Tarea idempotente (cache key en Redis)
- [ ] Solo inscripciones activas reciben el email
- [ ] `Notificacion(tipo=comunicado)` creada para cada tutor
- [ ] Agente no bloqueado mientras Celery envía

---

### TASK-041
**Nombre:** Celery tasks — recordatorios de pago (cadencia 30/15/7/3/0 días)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-039, TASK-035

**Descripción:**  
Task diaria `verificar_cuotas_por_vencer` que busca cuotas próximas a vencer y envía recordatorios según cadencia. Anti-spam via Redis. Horario de envío 9:00–20:00h.

**Archivos afectados:**
- `backend/tasks/recordatorios.py`

**Criterios de aceptación:**
- [ ] Triggers: 30d, 15d, 7d, 3d, 0d antes del vencimiento
- [ ] Solo cuotas sin pago verificado
- [ ] Anti-spam: máximo 1 recordatorio por canal por día por cuota
- [ ] Si todos los pagos están verificados → no se envía
- [ ] Cache key: `recordatorio:{cuota_id}:{tutor_id}:{trigger_dias}:{fecha}`
- [ ] Crea `Notificacion(tipo=recordatorio)` para el tutor
- [ ] Task idempotente y reintentable

---

### TASK-042
**Nombre:** Celery tasks — marcar cuotas vencidas + archivar viajes  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-039

**Descripción:**  
Task diaria `marcar_cuotas_vencidas`: cuotas con `fecha_vencimiento < hoy` sin pago verificado → `Notificacion(pago_vencido)`.  
Task diaria `archivar_viajes_finalizados`: viajes con `fecha_regreso + X días` → `estado=archivado`.

**Archivos afectados:**
- `backend/tasks/mantenimiento.py`
- `backend/celery.py` (schedule Beat)

**Criterios de aceptación:**
- [ ] `marcar_cuotas_vencidas`: crea notificación por cada cuota vencida, idempotente
- [ ] `archivar_viajes_finalizados`: X días configurado en `DOCS_ARCHIVE_DAYS_AFTER_RETURN`
- [ ] Ambas tasks registradas en Celery Beat con frecuencia diaria
- [ ] Ambas idempotentes

---

### TASK-043
**Nombre:** Celery task — alerta documentación incompleta  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 1h  
**Dependencias:** TASK-039, TASK-037

**Descripción:**  
Task diaria `alerta_docs_umbral`: si el % de documentación incompleta de un viaje activo supera `DOC_INCOMPLETE_ALERT_THRESHOLD`, crea notificación para el agente.

**Archivos afectados:**
- `backend/tasks/mantenimiento.py`

**Criterios de aceptación:**
- [ ] Umbral configurable por `DOC_INCOMPLETE_ALERT_THRESHOLD`
- [ ] Solo aplica a viajes en estado `activo`
- [ ] Task idempotente
- [ ] Notificación al agente con % actual

---

## FASE C — Frontend Core

---

### TASK-044
**Nombre:** Frontend — componentes transversales UI  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-018

**Descripción:**  
Crear los 6 componentes base reutilizables: `<Badge>`, `<ProgressBar>`, `<FileUploader>`, `<AlertCard>`, `<CardViaje>` y wrappers `LazyMotion`.

**Archivos afectados:**
- `frontend/components/ui/Badge.tsx`
- `frontend/components/ui/ProgressBar.tsx`
- `frontend/components/ui/AlertCard.tsx`
- `frontend/components/ui/CardViaje.tsx`
- `frontend/components/forms/FileUploader.tsx`
- `frontend/components/motion/LazyWrapper.tsx`

**Criterios de aceptación:**
- [ ] `<Badge>`: color + ícono + texto siempre (nunca solo texto)
- [ ] `<ProgressBar>`: porcentaje numérico visible, colores semánticos (verde/azul/rojo)
- [ ] `<FileUploader>`: preview del nombre+tamaño antes de confirmar, error si > 10 MB o formato inválido, progress bar durante upload
- [ ] `<AlertCard>`: prop obligatorio `href` (deep-link); si falta, error en TypeScript
- [ ] `<CardViaje>`: imagen miniatura + badge estado + 3 sub-cards
- [ ] `LazyWrapper`: usa `LazyMotion + domAnimation + m.*` (no `motion.*`)
- [ ] Sin errores TypeScript ni lint

---

### TASK-045
**Nombre:** Frontend — landing pública /viajes/[slug]/  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-044, TASK-025

**Descripción:**  
Página pública del viaje con todas las secciones obligatorias de `UI_UX.md §Pantalla 1`: Hero, datos, propuesta de valor, itinerario resumido (máx. 6 días), CTAs.

**Archivos afectados:**
- `frontend/app/(public)/viajes/[slug]/page.tsx`
- `frontend/app/(public)/viajes/[slug]/loading.tsx`
- `frontend/components/public/HeroSection.tsx`
- `frontend/components/public/ItinerarioResumen.tsx`

**Criterios de aceptación:**
- [ ] Server Component (sin `'use client'`)
- [ ] Datos cargados desde API: nombre, destino, fechas, cupo, imagen, itinerario
- [ ] CTA "INSCRIBIR A MI HIJ@" visible en hero y al final
- [ ] Licencia de agencia visible en footer
- [ ] Responsive (375px mínimo)

---

### TASK-046
**Nombre:** Frontend — wizard de inscripción (3 pasos)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 6h  
**Dependencias:** TASK-044, TASK-033

**Descripción:**  
Wizard de inscripción con barra de progreso, 3 pasos (datos básicos, centro educativo + validación inteligente, salud + T&C) y navegación sin pérdida de datos.

**Archivos afectados:**
- `frontend/app/(padre)/app/inscribir/[viaje_id]/page.tsx`
- `frontend/app/(padre)/app/inscribir/[viaje_id]/steps/Step1.tsx`
- `frontend/app/(padre)/app/inscribir/[viaje_id]/steps/Step2.tsx`
- `frontend/app/(padre)/app/inscribir/[viaje_id]/steps/Step3.tsx`
- `frontend/components/forms/WizardProgress.tsx`

**Criterios de aceptación:**
- [ ] Barra de progreso visible en los 3 pasos
- [ ] Puedo volver al paso anterior sin perder datos
- [ ] Paso 1: nombre, apellidos, DNI, fecha nacimiento, género
- [ ] Paso 2: departamento, colegio (typeahead), nivel, grado + validación inteligente con 3 casos
- [ ] Paso 3: 14 checkboxes alérgenos EU, teléfono opcional, checkbox T&C
- [ ] T&C es obligatorio (no puede continuar sin aceptar)
- [ ] Al completar: POST a API y redirect a dashboard

---

### TASK-047
**Nombre:** Frontend — dashboard del padre  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 5h  
**Dependencias:** TASK-044, TASK-033, TASK-035, TASK-037

**Descripción:**  
Dashboard `/app/` con badge de estado de inscripción, barra de progreso global, 3 sub-cards (Pagos/Docs/Alojamiento) y alertas con deep-link.

**Archivos afectados:**
- `frontend/app/(padre)/app/page.tsx`
- `frontend/components/padre/InscripcionCard.tsx`
- `frontend/components/padre/AlertasPendientes.tsx`
- `frontend/components/padre/SubCardPagos.tsx`
- `frontend/components/padre/SubCardDocumentos.tsx`
- `frontend/components/padre/SubCardAlojamiento.tsx`

**Criterios de aceptación:**
- [ ] Badge de estado usa exactamente los 4 estados del sistema (lista espera/pre-inscrito/confirmado/en camino)
- [ ] Barra de progreso global con % numérico
- [ ] Sub-cards siempre visibles aunque estén completas
- [ ] Alertas tienen deep-link a la pantalla de acción (nunca texto genérico)
- [ ] CTAs: [Ir a Pagos] [Subir Docs] [Ver todo]
- [ ] Server Component principal + Client Components para interacciones

---

### TASK-048
**Nombre:** Frontend — pantalla de pagos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-044, TASK-035

**Descripción:**  
Pantalla `/app/pagos/{inscripcion_id}/` con plan de cuotas y estados, formulario de registro de pago con uploader de comprobante.

**Archivos afectados:**
- `frontend/app/(padre)/app/pagos/[id]/page.tsx`
- `frontend/components/padre/PlanCuotas.tsx`
- `frontend/components/padre/FormularioPago.tsx`

**Criterios de aceptación:**
- [ ] Cada cuota muestra estado con color + ícono (pagado/en revisión/pendiente/vencida)
- [ ] Saldo pendiente calculado visualmente
- [ ] Formulario: cuota, importe, fecha, método, comprobante (file uploader)
- [ ] Cuota vencida → alerta roja visible
- [ ] Tras enviar: estado "Pendiente de revisión"

---

### TASK-049
**Nombre:** Frontend — pantalla de documentos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-044, TASK-037

**Descripción:**  
Pantalla `/app/documentos/{inscripcion_id}/` con checklist de documentos, estados visuales, uploader y motivo de rechazo visible.

**Archivos afectados:**
- `frontend/app/(padre)/app/documentos/[id]/page.tsx`
- `frontend/components/padre/ChecklistDocumentos.tsx`
- `frontend/components/padre/ItemDocumento.tsx`

**Criterios de aceptación:**
- [ ] 4 estados exactos: pendiente (sin subir), pendiente (en revisión), validado, rechazado
- [ ] "En revisión" inferido del frontend (`pendiente` con `archivo != null`)
- [ ] Motivo de rechazo visible + CTA "Volver a subir"
- [ ] Historial de versiones del documento
- [ ] Barra de progreso: X/N aprobados

---

### TASK-050
**Nombre:** Frontend — centro de notificaciones  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 2h  
**Dependencias:** TASK-044, TASK-039

**Descripción:**  
Pantalla `/app/notificaciones/` con lista de notificaciones del usuario, íconos por tipo, deep-links y marcar como leída.

**Archivos afectados:**
- `frontend/app/(padre)/app/notificaciones/page.tsx`
- `frontend/components/padre/ItemNotificacion.tsx`

**Criterios de aceptación:**
- [ ] Íconos por tipo según `UI_UX.md §Pantalla 7`
- [ ] Deep-link en cada notificación a la pantalla de acción
- [ ] "Marcar todo como leído" funcional
- [ ] Notificaciones no leídas destacadas visualmente

---

### TASK-051
**Nombre:** Frontend — portal alumno (solo lectura)  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 2h  
**Dependencias:** TASK-044, TASK-025, TASK-037

**Descripción:**  
Portal `/app/alumno/` con itinerario, estado de documentación y comunicados. Solo lectura.

**Archivos afectados:**
- `frontend/app/(alumno)/app/alumno/page.tsx`
- `frontend/app/(alumno)/layout.tsx`

**Criterios de aceptación:**
- [ ] Layout verifica acceso habilitado por agente (flag en inscripción)
- [ ] Sin formularios ni acciones (solo lectura)
- [ ] Itinerario completo día a día
- [ ] Estado de documentación sin botones de subida

---

## FASE D — Backoffice Agente

---

### TASK-052
**Nombre:** Backoffice — layout agente + panel de viajes  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 4h  
**Dependencias:** TASK-044, TASK-025

**Descripción:**  
Layout del backoffice con navegación. Panel de viajes con lista, creación, activación y métricas rápidas.

**Archivos afectados:**
- `frontend/app/(agente)/layout.tsx`
- `frontend/app/(agente)/backoffice/viajes/page.tsx`
- `frontend/app/(agente)/backoffice/viajes/nuevo/page.tsx`
- `frontend/app/(agente)/backoffice/viajes/[id]/page.tsx`
- `frontend/components/agente/NavBackoffice.tsx`

**Criterios de aceptación:**
- [ ] Layout verifica rol agente; redirección si no tiene acceso
- [ ] Lista de viajes con estado, fechas y % inscritos
- [ ] Formulario de creación de viaje
- [ ] Botón "Activar viaje" disponible solo en estado borrador
- [ ] Métricas del viaje visibles en header del detalle

---

### TASK-053
**Nombre:** Backoffice — panel de inscritos con filtros  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-044, TASK-033

**Descripción:**  
Panel `/backoffice/viajes/{id}/inscritos/` con tabla de inscritos, filtros y acceso a ficha individual.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/inscritos/page.tsx`
- `frontend/components/agente/TablaInscritos.tsx`
- `frontend/components/agente/FiltrosInscritos.tsx`

**Criterios de aceptación:**
- [ ] Columnas: Alumno · Tutor · Estado inscripción · % Pagado · Estado Docs · Grupo · Acciones
- [ ] Filtros: estado inscripción, % pagado, estado docs, grupo
- [ ] Acción "Ver ficha" por inscripción
- [ ] Acceso rápido a chat desde la fila

---

### TASK-054
**Nombre:** Backoffice — verificación de pagos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-044, TASK-035, TASK-036

**Descripción:**  
Panel de pagos pendientes con vista del comprobante y botones aprobar/rechazar.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/pagos/page.tsx`
- `frontend/components/agente/PanelVerificacionPago.tsx`

**Criterios de aceptación:**
- [ ] Lista de pagos pendientes filtrada por viaje
- [ ] Preview del comprobante (PDF en iframe, imagen como img)
- [ ] Botón "Verificar" → PATCH `{estado: "verificado"}`
- [ ] Botón "Rechazar" → modal con campo de motivo → PATCH

---

### TASK-055
**Nombre:** Backoffice — validación de documentos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-044, TASK-037, TASK-038

**Descripción:**  
Panel de documentos pendientes con preview y botones validar/rechazar.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/documentos/page.tsx`
- `frontend/components/agente/PanelValidacionDocumento.tsx`

**Criterios de aceptación:**
- [ ] Lista de documentos pendientes por viaje
- [ ] Preview del documento (PDF/imagen)
- [ ] Botón "Validar" → PATCH `{estado: "validado"}`
- [ ] Botón "Rechazar" → modal con motivo → PATCH

---

### TASK-056
**Nombre:** Backoffice — constructor de itinerario (drag & drop)  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 6h  
**Dependencias:** TASK-044, TASK-028

**Descripción:**  
Constructor visual del itinerario con días en columna izquierda, actividades con drag & drop y PATCH bulk al soltar.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/page.tsx`
- `frontend/components/agente/ConstructorItinerario.tsx`
- `frontend/components/agente/EtapaDia.tsx`
- `frontend/components/agente/ActividadCard.tsx`

**Criterios de aceptación:**
- [ ] Lista de días (etapas) en columna izquierda
- [ ] Actividades del día seleccionado con drag & drop (`@dnd-kit/core`)
- [ ] Al soltar: `PATCH /actividades/reordenar/` con array de `{id, orden}`
- [ ] Botones: [+ Añadir día] [+ Añadir actividad]
- [ ] Íconos por tipo de actividad (🚌/🍽/🏛/🛏/🕰)
- [ ] Client Component (drag & drop requiere JS)

---

### TASK-057
**Nombre:** Backoffice — gestión de grupos, hoteles y docs requeridos  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 3h  
**Dependencias:** TASK-044, TASK-029, TASK-030

**Descripción:**  
Pantallas de gestión de grupos (crear, asignar alumnos), hoteles y documentos requeridos del viaje.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/grupos/page.tsx`
- `frontend/app/(agente)/backoffice/viajes/[id]/hoteles/page.tsx`
- `frontend/app/(agente)/backoffice/viajes/[id]/documentos-requeridos/page.tsx`

**Criterios de aceptación:**
- [ ] Grupos: crear, ver alumnos asignados, asignar nuevos alumnos
- [ ] Hoteles: CRUD con campos web_url y maps_url
- [ ] Docs requeridos: CRUD con nombre, obligatorio, formatos permitidos

---

### TASK-058
**Nombre:** Backoffice — comunicados masivos  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 2h  
**Dependencias:** TASK-044, TASK-040

**Descripción:**  
Panel para redactar y enviar comunicados masivos. Muestra estado de envío.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/comunicados/page.tsx`
- `frontend/components/agente/FormularioComunicado.tsx`

**Criterios de aceptación:**
- [ ] Formulario: título + cuerpo (rich text o textarea)
- [ ] Tras enviar: estado "Enviando..." → "Enviado" cuando Celery confirma
- [ ] Lista de comunicados anteriores visible

---

## FASE F — Características Avanzadas

---

### TASK-059
**Nombre:** Backend — Mecenas + MecenasInscripcion + API  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 3h  
**Dependencias:** TASK-006, TASK-032

**Descripción:**  
App `mecenas` con modelos `Mecenas` y `MecenasInscripcion`. Endpoints para portal mecenas y asignación por agente.

**Archivos afectados:**
- `backend/apps/mecenas/models.py`
- `backend/apps/mecenas/views.py`
- `backend/apps/mecenas/serializers.py`
- `backend/apps/mecenas/migrations/`

**Criterios de aceptación:**
- [ ] `monto_comprometido > 0` constraint BD
- [ ] unique_together `(mecenas, inscripcion)`
- [ ] `GET /mecenas/{id}/alumnos/` devuelve inscripciones patrocinadas
- [ ] `POST /inscripciones/{id}/mecenas/` solo agente puede asignar
- [ ] Mecenas puede registrar pagos con `pagado_por=mecenas.usuario`

---

### TASK-060
**Nombre:** Frontend — portal mecenas  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 3h  
**Dependencias:** TASK-044, TASK-059

**Descripción:**  
Portal `/app/mecenas/` con lista de alumnos patrocinados, estado de pagos y formulario de pago en nombre de alumno.

**Archivos afectados:**
- `frontend/app/(padre)/app/mecenas/page.tsx`
- `frontend/components/mecenas/ListaAlumnosPatrocinados.tsx`
- `frontend/components/mecenas/FormularioPagoMecenas.tsx`

**Criterios de aceptación:**
- [ ] Lista de alumnos con estado de pago por cada uno
- [ ] Formulario de pago con comprobante (reutiliza `<FileUploader>`)
- [ ] Descarga de resumen de contribución en PDF

---

### TASK-061
**Nombre:** Backend — chat in-app (Conversacion + Mensaje + API)  
**Estado:** `Pending` (bloqueado por Duda D-01)  
**Prioridad:** Media  
**Estimación:** 4h  
**Dependencias:** TASK-033, TASK-039 — **Requiere resolución de Duda D-01**

**Descripción:**  
App `mensajes` con modelos `Conversacion` y `Mensaje`. API para historial, envío y marcar como leído.

**Archivos afectados:**
- `backend/apps/mensajes/models.py`
- `backend/apps/mensajes/views.py`
- `backend/apps/mensajes/serializers.py`
- `backend/apps/mensajes/migrations/`

**Criterios de aceptación:**
- [ ] Schema de modelos aprobado (resolver Duda D-01 primero)
- [ ] Conversación por viaje (o inscripción, según decisión)
- [ ] Mensajes con estados enviado/leído
- [ ] Soporte para adjuntos (archivos)
- [ ] GET historial paginado

---

### TASK-062
**Nombre:** Frontend — chat in-app  
**Estado:** `Pending` (bloqueado por TASK-061)  
**Prioridad:** Media  
**Estimación:** 4h  
**Dependencias:** TASK-044, TASK-061

**Descripción:**  
Pantalla de chat `/app/mensajes/{viaje_id}/` con historial, quick replies, adjuntos y estados de mensaje.

**Archivos afectados:**
- `frontend/app/(padre)/app/mensajes/[viaje_id]/page.tsx`
- `frontend/components/padre/ChatWindow.tsx`
- `frontend/components/padre/QuickReplies.tsx`

**Criterios de aceptación:**
- [ ] Historial persistente con contexto viaje + alumno
- [ ] Quick replies predefinidos
- [ ] Estados: enviado ✓ / leído ✓✓
- [ ] Adjuntar archivos (reutiliza `<FileUploader>`)
- [ ] Polling cada 30s para nuevos mensajes

---

### TASK-063
**Nombre:** Backend — exportaciones CSV/XLSX  
**Estado:** `Pending`  
**Prioridad:** Alta  
**Estimación:** 3h  
**Dependencias:** TASK-033, TASK-035, TASK-037

**Descripción:**  
Endpoints de exportación de inscritos, pagos y documentación en CSV y XLSX.

**Archivos afectados:**
- `backend/apps/exportaciones/views.py`
- `backend/apps/exportaciones/generators/xlsx.py`
- `backend/apps/exportaciones/generators/csv.py`
- `backend/apps/exportaciones/urls.py`

**Criterios de aceptación:**
- [ ] `GET /viajes/{id}/exportar/inscritos/?formato=csv|xlsx`
- [ ] `GET /viajes/{id}/exportar/pagos/?formato=csv|xlsx`
- [ ] `GET /viajes/{id}/exportar/documentacion/?formato=csv|xlsx`
- [ ] Solo accesible por agente
- [ ] Headers de descarga correctos (`Content-Disposition`)

---

### TASK-064
**Nombre:** Backend — exportaciones PDF (informe estado + ficha inscripción)  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 4h  
**Dependencias:** TASK-033

**Descripción:**  
Generación de PDF del informe de estado del viaje y ficha individual de inscripción.

**Archivos afectados:**
- `backend/apps/exportaciones/generators/pdf.py`
- `backend/templates/pdf/informe_viaje.html`
- `backend/templates/pdf/ficha_inscripcion.html`

**Criterios de aceptación:**
- [ ] `GET /viajes/{id}/exportar/informe-pdf/` genera PDF con métricas
- [ ] `GET /inscripciones/{id}/resumen-pdf/` accesible por padre/alumno
- [ ] PDF descargable con `Content-Disposition: attachment`

---

### TASK-065
**Nombre:** Frontend — UI de exportaciones en backoffice  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 1h  
**Dependencias:** TASK-044, TASK-063, TASK-064

**Descripción:**  
Sección "Exportar" en el backoffice con botones para cada tipo de exportación.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/exportar/page.tsx`

**Criterios de aceptación:**
- [ ] Botones para CSV/XLSX de inscritos, pagos, documentación
- [ ] Botón para PDF del informe de estado
- [ ] Descarga directa (no apertura en nueva pestaña)

---

### TASK-066
**Nombre:** Frontend — WhatsApp link wa.me (Nivel 1)  
**Estado:** `Pending`  
**Prioridad:** Baja  
**Estimación:** 1h  
**Dependencias:** TASK-033

**Descripción:**  
Generar links `wa.me` pre-cargados con mensaje contextualizado para que el agente los use manualmente. No hay integración API.

**Archivos afectados:**
- `frontend/lib/whatsapp.ts`
- `frontend/components/agente/BotonWhatsApp.tsx`

**Criterios de aceptación:**
- [ ] Link genera URL `https://wa.me/{telefono}?text={mensaje_url_encoded}`
- [ ] Mensaje incluye nombre del alumno, viaje y contexto del recordatorio
- [ ] Botón visible en ficha de inscripción del agente

---

### TASK-067
**Nombre:** Backend — preferencias de notificación (modelo + API)  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 2h  
**Dependencias:** TASK-006 — **Requiere resolución de Duda D-08**

**Descripción:**  
Modelo `PreferenciasNotificacion` vinculado a `Usuario`. API para leer y actualizar preferencias.

**Archivos afectados:**
- `backend/apps/notificaciones/models.py`
- `backend/apps/notificaciones/views.py`
- `backend/apps/notificaciones/serializers.py`

**Criterios de aceptación:**
- [ ] Campos: `canal_preferido`, `horario_inicio`, `horario_fin`, `max_por_dia`
- [ ] Preferencias consultadas en tasks de recordatorio (anti-spam)
- [ ] `GET/PATCH /usuarios/preferencias/notificacion/`

---

### TASK-068
**Nombre:** Frontend — configuración de preferencias de notificación  
**Estado:** `Pending`  
**Prioridad:** Media  
**Estimación:** 2h  
**Dependencias:** TASK-044, TASK-067

**Descripción:**  
Pantalla `/app/configuracion/notificaciones/` para que el padre configure canal preferido, horario y frecuencia.

**Archivos afectados:**
- `frontend/app/(padre)/app/configuracion/notificaciones/page.tsx`

**Criterios de aceptación:**
- [ ] Opciones de canal: WhatsApp, SMS, Email, Solo in-app
- [ ] Opciones de horario: 9-20h, días laborables, cualquier hora
- [ ] Opciones de frecuencia: 1 por día, sin límite en eventos críticos
- [ ] Cambios guardados inmediatamente

---

*Total de tareas: 68*  
*Tareas pendientes de aprobación: 68*  
*Tareas bloqueadas: 2 (TASK-061, TASK-062 — Duda D-01)*
