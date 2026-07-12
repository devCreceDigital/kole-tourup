# ARCHITECTURE.md — Decisiones de Arquitectura (Actualizado)

> **Última actualización:** 2026-07-09  
> **Estado:** Refleja la implementación real en el repositorio `Tottem-Hub/`

---

## Visión General

Arquitectura de tres capas con separación explícita entre frontend, API gateway y backend de lógica de negocio. Multi-tenant por campo (`agencia_id`). Fase 1 opera con un único tenant: Totem Travel.

---

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENTES                                 │
│   Browser / Mobile (Web — responsive mobile-first)                  │
│                                                                     │
│   Next.js 16.2.6 · React 19 · TailwindCSS 4 · Framer Motion        │
│                                                                     │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌───────────────┐  │
│  │  (public)        │  │  (padre) (mecenas)  │  │  (agente)     │  │
│  │  Landing viaje   │  │  Dashboard, pagos   │  │  Backoffice   │  │
│  │  /viajes/{slug}/ │  │  docs, mensajes     │  │  /backoffice/ │  │
│  └────────┬─────────┘  └──────────┬──────────┘  └──────┬────────┘  │
└───────────┼────────────────────────┼───────────────────┼────────────┘
            └────────────────────────┼───────────────────┘
                                     │ HTTPS · JWT en cookie httpOnly
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY — Node.js puro                      │
│              node:http · node:https  (sin Express/Fastify)          │
│                                                                     │
│  • Routing hacia backend Django                                     │
│  • CORS (headers manuales por origen)                               │
│  • Rate limiting (por IP + por endpoint, contadores en Redis)       │
│  • Headers de seguridad (HSTS, X-Frame-Options, X-Content-Type...)  │
│  • Auth forwarding (cookie → Authorization: Bearer)                 │
│  • Multipart parsing + Validación 10 MB (primera línea defensa)     │
│  • Health check: GET /health → 200                                  │
│                                                                     │
│  ⚠ Sin lógica de negocio. Todo el dominio vive en Django.           │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ HTTP interno
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND — Django 4.2+ + DRF                      │
│                                                                     │
│  Endpoints REST · Permisos por rol · Django Signals                 │
│  Celery task dispatch · LogAuditoria inmutable · Multi-tenant filter│
└────┬───────────────────┬──────────────────────────┬─────────────────┘
     │                   │                          │
┌────▼──────┐   ┌────────▼──────────┐   ┌──────────▼──────────────┐
│PostgreSQL │   │   Redis           │   │   Celery Workers        │
│           │   │                   │   │                         │
│ Datos     │   │ • Allowlist JWT   │   │ • enviar_comunicado     │
│ Índices   │   │ • Celery broker   │   │ • recordatorios_pago    │
│ Constraints│  │ • Rate limit data │   │ • recordatorios_docs    │
└───────────┘   └───────────────────┘   │ • marcar_vencidas       │
                                        │ • archivar_viajes       │
                                        │ • alerta_docs_umbral    │
                                        └────────────┬────────────┘
                                                     │
                                           ┌─────────▼──────────┐
                                           │  Servicios externos │
                                           │  Email SMTP / SES   │
                                           │  S3 / GCS (storage) │
                                           │  WhatsApp (futuro)  │
                                           └─────────────────────┘
```

---

## Stack — Versiones Fijadas

| Capa | Tecnología | Versión | Notas clave |
|------|-----------|---------|-------------|
| Frontend | Next.js | 16.2.6 | App Router obligatorio |
| Frontend | React | 19 | Server Components por defecto |
| Frontend | TailwindCSS | 4 | `@theme {}` en CSS, no `tailwind.config.js` |
| Frontend | Framer Motion | latest | Solo UI — nunca lógica de negocio |
| Gateway | Node.js (`node:http/https`) | LTS | Sin Express, Fastify, Koa, Hapi |
| Backend | Django | 4.2+ | DRF para API REST |
| Backend | PostgreSQL | — | UUID PKs, índices explícitos, constraints |
| Cache / Broker | Redis | — | Allowlist JWT + Celery broker |
| Tareas async | Celery | — | Beat para cron + workers para tasks |
| Storage | S3 / GCS | configurable | `FileField` con backend intercambiable |
| Auth | JWT | — | access 15 min · refresh 7 días · cookies httpOnly |

---

## Decisiones de Arquitectura

### DA-01 — App Router de Next.js con grupos de layout por portal

Cada portal vive en su propio route group para separar autenticación, layouts y middleware:

```
frontend/app/
├── (public)/            # Landing pública — sin auth
│   └── viajes/[slug]/
├── (padre)/             # Dashboard padre y mecenas
│   ├── layout.tsx       # Verifica rol: padre | mecenas
│   └── app/
├── (agente)/            # Backoffice completo
│   ├── layout.tsx       # Verifica rol: agente
│   └── backoffice/
└── (alumno)/            # Solo lectura
    ├── layout.tsx       # Verifica rol: alumno + flag acceso
    └── app/alumno/
```

**Regla:** `middleware.ts` en la raíz verifica JWT y redirige según rol antes de renderizar cualquier layout protegido.

---

### DA-02 — Server Components por defecto, Client Components solo donde necesario

| Usar Server Component | Usar Client Component (`'use client'`) |
|----------------------|----------------------------------------|
| Fetch de datos desde gateway | Formularios con estado |
| Listados, páginas estáticas | Drag & drop del itinerario |
| Layouts y páginas de solo lectura | Uploader de archivos |
| Redirect según estado | Notificaciones en tiempo real |
| — | Animaciones con Framer Motion |

**No usar `useEffect` para fetching.** Usar Server Components o `use()` de React 19.

---

### DA-03 — TailwindCSS 4 con `@theme {}`

```css
/* CORRECTO en TailwindCSS 4 */
@theme {
  --color-primary: #0d4f7c;
  --color-warning: #ef9f27;
  --radius-card: 12px;
}

/* INCORRECTO — no usar tailwind.config.js para design tokens */
```

---

### DA-04 — Framer Motion con LazyMotion

```tsx
// CORRECTO — bundle mínimo
import { LazyMotion, domAnimation, m } from 'framer-motion'

export function PageWrapper({ children }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {children}
      </m.div>
    </LazyMotion>
  )
}

// INCORRECTO — importa todo Framer Motion
import { motion } from 'framer-motion'
```

---

### DA-05 — API Gateway Node.js sin frameworks

Estructura:

```
gateway/
├── server.js          # createServer(node:http) → punto de entrada
├── router.js          # Map {method, path} → handler function
├── middleware/
│   ├── cors.js        # Headers CORS manuales por origin
│   ├── rateLimit.js   # Contador en Redis por IP
│   ├── auth.js        # Lee cookie JWT → header Authorization
│   └── security.js    # HSTS, X-Frame-Options, X-Content-Type-Options
├── proxy/
│   ├── django.js      # http.request al backend + pipe de response
│   └── multipart.js   # Parse multipart/form-data antes de reenviar
└── config.js          # Variables de entorno centralizadas
```

**El gateway no importa lógica de negocio.** Si una condición de negocio necesita evaluarse, va en Django.

---

### DA-06 — JWT en cookies httpOnly (nunca localStorage)

```
LOGIN FLOW:
1. Frontend → POST /auth/login/ → Gateway → Django
2. Django responde con {rol, agencia_id} + Set-Cookie:
   access_token  — HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
   refresh_token — HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/; Max-Age=604800
3. Frontend recibe cookie automáticamente (no accesible desde JS)
4. Cada request siguiente: Gateway lee cookie, agrega Authorization: Bearer al forward
```

---

### DA-07 — Multi-tenant por campo (preparado para Fase 2)

```python
# TODA consulta del agente debe filtrar por agencia
Viaje.objects.filter(agencia=request.user.agencia)

# NUNCA sin filtro en endpoints del agente
Viaje.objects.all()  # ❌ INCORRECTO
```

- Campo `agencia_id` en todos los modelos raíz: `Viaje`, `Usuario`
- Fase 1: un tenant, Slug: `totem`
- Fase 2+: middleware de tenant que inyecte `agencia_id` automáticamente

---

### DA-08 — Signals Django para efectos secundarios

Los signals garantizan que los efectos ocurran aunque el endpoint no los llame explícitamente:

```python
# apps/pagos/signals.py
@receiver(post_save, sender=Pago)
def on_pago_save(sender, instance, created, **kwargs):
    if created:
        LogAuditoria.objects.create(accion='PAGO_REGISTRADO', ...)
        notify_agente_new_payment(instance)
    elif instance.estado == EstadoPago.VERIFICADO:
        LogAuditoria.objects.create(accion='PAGO_ACTUALIZADO', ...)
        Notificacion.objects.create(usuario=instance.inscripcion.padre_tutor.usuario, ...)
        send_payment_confirmed_email.delay(instance.id)
    elif instance.estado == EstadoPago.RECHAZADO:
        ...
```

---

### DA-09 — Tareas Celery idempotentes

Todas las tareas Celery deben ser reintentables sin efectos duplicados:

```python
@shared_task(bind=True, max_retries=3)
def enviar_recordatorio_pago(self, cuota_id, tutor_id, trigger_dias):
    # Verificar si ya se envió este recordatorio hoy (anti-spam)
    cache_key = f'recordatorio:{cuota_id}:{tutor_id}:{trigger_dias}:{today}'
    if cache.get(cache_key):
        return  # Ya enviado — no duplicar
    # ... enviar
    cache.set(cache_key, True, timeout=86400)
```

---

## Seguridad — Capas y Responsabilidades

| Aspecto | Capa | Implementación |
|---------|------|----------------|
| HTTPS | Infra | TLS terminado en el gateway |
| CORS | Gateway | Headers manuales, `CORS_ORIGINS` por env |
| Rate limiting | Gateway | Por IP + por endpoint, contadores en Redis |
| Headers de seguridad | Gateway | HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection |
| JWT almacenado | Frontend | Cookie `httpOnly; Secure; SameSite=Strict` |
| JWT validado | Backend | DRF — `IsAuthenticated` + verificación de firma |
| Expiración tokens | Backend | access 15 min; refresh 7 días en allowlist Redis |
| Verificación email | Backend | Token one-time; cuenta inactiva hasta verificación |
| Control de acceso | Backend | Permisos DRF por rol; filtro por `agencia_id` |
| Contraseñas | Backend | bcrypt — `AbstractBaseUser.set_password()` |
| Archivos en tránsito | Gateway | HTTPS |
| Archivos en reposo | Storage | AES-256 (S3/GCS) |
| Tamaño de archivo | Gateway + Backend | 10 MB — doble validación |
| Auditoría | Backend | `LogAuditoria` inmutable vía signals |

---

## Variables de Entorno

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_GATEWAY_URL=https://api.tottemhub.com
NEXT_PUBLIC_APP_URL=https://tottemhub.com
```

### Gateway (`gateway/.env`)
```env
PORT=3001
BACKEND_URL=http://backend:8000
CORS_ORIGINS=https://tottemhub.com,https://www.tottemhub.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
MAX_FILE_SIZE_BYTES=10485760
REDIS_URL=redis://redis:6379
PROXY_TIMEOUT_MS=30000
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@db:5432/tottemhub
REDIS_URL=redis://redis:6379
DEFAULT_FILE_STORAGE=storages.backends.s3boto3.S3Boto3Storage
AWS_STORAGE_BUCKET_NAME=tottemhub-files
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
JWT_SECRET_KEY=...
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
CELERY_BROKER_URL=redis://redis:6379/0
DOCS_ARCHIVE_DAYS_AFTER_RETURN=30
DOC_INCOMPLETE_ALERT_THRESHOLD=30
```

---

## Estructura del Repositorio (REAL)

```
Tottem-Hub/
├── frontend/                        # Next.js 16.2.6
│   ├── app/
│   │   ├── (public)/viajes/[slug]/  # Landing pública
│   │   ├── (padre)/app/             # Portal padre/mecenas
│   │   ├── (agente)/backoffice/     # Backoffice agente
│   │   ├── (alumno)/app/alumno/     # Portal alumno (solo lectura)
│   │   ├── (auth)/                  # Login, registro, verificación
│   │   ├── globals.css              # @theme {} tokens TailwindCSS 4
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                      # Badge, ProgressBar, CardViaje, etc.
│   │   ├── motion/                  # LazyWrapper (Framer Motion)
│   │   ├── forms/                   # FileUploader, WizardProgress
│   │   ├── padre/                   # InscripcionCard, AlertasPendientes...
│   │   ├── agente/                  # TablaInscritos, PanelValidacion...
│   │   ├── mecenas/                 # ListaAlumnosPatrocinados...
│   │   ├── public/                  # HeroSection, ItinerarioResumen
│   │   └── chat/                    # ChatInscripcion
│   ├── lib/
│   │   ├── api.ts                   # fetchApi + ApiError
│   │   ├── auth.ts                  # decodeJwtPayload
│   │   └── whatsapp.ts              # generarLinkWhatsApp helpers
│   ├── middleware.ts                # Auth guard por portal
│   ├── next.config.js
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
│
├── gateway/                         # Node.js puro (sin frameworks)
│   ├── server.js                    # createServer, health check
│   ├── router.js                    # Map {method, path} → handler
│   ├── config.js                    # Env vars centralizadas
│   ├── middleware/
│   │   ├── cors.js                  # CORS manual + preflight
│   │   ├── rateLimit.js             # Redis fixed-window counter
│   │   ├── auth.js                  # Cookie → Authorization header
│   │   └── security.js              # HSTS, X-Frame-Options, etc.
│   ├── proxy/
│   │   ├── django.js                # http.request + pipe response
│   │   └── multipart.js             # Parse multipart, valida 10MB
│   ├── tests/                       # 76 tests (router, server, cors, auth, security, rateLimit, multipart, django)
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
│
├── backend/                         # Django 4.2+ + DRF
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py              # Settings comunes
│   │   │   ├── local.py             # Desarrollo local
│   │   │   └── production.py        # Producción
│   │   ├── urls.py                  # URLConf principal
│   │   ├── celery.py                # Celery app
│   │   ├── wsgi.py / asgi.py
│   │   └── __init__.py
│   ├── apps/
│   │   ├── autenticacion/           # Usuario custom, JWT, registro, login, verificación, password reset
│   │   ├── agencias/                # Agencia + perfil (GET/PATCH /perfil/)
│   │   ├── viajes/                  # Viaje, PlanPago, Cuota, Itinerario, Etapa, Actividad, Hotel, Grupo, DocumentoRequerido, Alumno (catálogo)
│   │   ├── inscripciones/           # Inscripcion, Alumno (perfil inscripción), MisAlumnos
│   │   ├── pagos/                   # Pago (modelo + vistas upload/verificar)
│   │   ├── documentos/              # DocumentoEntregado (upload/validar)
│   │   ├── comunicados/             # Comunicado + Celery task masivo
│   │   ├── notificaciones/          # Notificacion + preferencias
│   │   ├── mecenas/                 # (PENDIENTE) Mecenas, MecenasInscripcion
│   │   ├── auditoria/               # (PENDIENTE) LogAuditoria inmutable
│   │   ├── exportaciones/           # (PENDIENTE) Generadores CSV/XLSX/PDF
│   │   ├── chat/                    # (PENDIENTE) Conversacion, Mensaje
│   │   ├── colegios/                # (BÁSICO) Catálogo colegios
│   │   └── tareas/                  # Tasks de mantenimiento
│   ├── templates/
│   │   ├── emails/                  # HTML emails (verificación, bienvenida, pago, comunicado)
│   │   └── pdf/                     # Templates PDF (ficha, informe)
│   ├── fixtures/
│   │   └── agencia_totem.json       # Seed Totem Travel
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
│
├── docker-compose.yml               # 7 servicios: postgres, redis, backend, celery_worker, celery_beat, gateway, frontend
├── .gitignore
├── README.md
│
└── docs/                            # Documentación del proyecto
    ├── DATABASE.md                  # Esquema BD actualizado
    ├── API.md                       # Endpoints reales implementados
    ├── MASTER_PLAN.md               # Plan maestro estado real
    ├── PROJECT_OVERVIEW.md          # Visión general estado real
    ├── ARCHITECTURE.md              # Este archivo
    ├── DEVELOPMENT_PLAN.md          # Plan detallado por fases
    ├── TASKS.md                     # Tracking tareas (estados Done/Pending)
    ├── PENDING.txt                  # Lista tareas pendientes
    ├── REQUIREMENTS.md              # Requerimientos funcionales/no funcionales
    ├── USER_STORIES.md              # Historias de usuario
    ├── USER_FLOWS.md                # Flujos de usuario
    ├── BUSINESS_RULES.md            # Reglas de negocio (invariantes)
    ├── DECISIONS.md                 # Registro decisiones técnicas (DEC-001 a DEC-007)
    ├── TECH_DEBT.md                 # Deuda técnica (TD-001 a TD-008)
    ├── AI_CONTEXT.md                # Contexto para agentes IA
    ├── UI_UX.md                     # Especificaciones UI/UX
    ├── CODE_REVIEW_CHECKLIST.md     # Checklist revisión código
    ├── CLAUDE_RULES.md              # Reglas para agente IA
    └── README.md                    # Índice de docs
```

---

## Performance

| Métrica | Target | Implementación |
|---------|--------|----------------|
| Dashboard del padre | ≤ 3 seg | Server Components + índices PostgreSQL |
| API listados | ≤ 500 ms | Índices + `select_related` + `prefetch_related` |
| Emails masivos | No bloquea UI | Celery async |
| Bundle JS | Mínimo | Server Components + LazyMotion |
| `saldo_pendiente` | No en BD | Propiedad Python — computada en tiempo real |

---

## Convenciones de Código

### Backend (Django)
- `models.py`: constraints de BD + `TextChoices` para enums
- `views.py`: `GenericAPIView` + mixins, permisos explícitos
- `serializers.py`: validación de entrada, `read_only_fields` para campos internos
- `signals.py`: efectos secundarios obligatorios (auditoría, notificaciones)
- `tests.py`: un test por caso de aceptación documentado

### Gateway (Node.js)
- `node:http` / `node:https` únicamente
- Sin `console.log` en producción
- Tests con `node --test` (built-in, sin dependencias)
- Mock de Redis inyectable para tests

### Frontend (Next.js)
- Server Components por defecto
- `'use client'` solo cuando es estrictamente necesario
- Design tokens en `globals.css` con `@theme {}`
- Componentes base en `components/ui/`
- Helpers de fetch en `lib/api.ts`
- Sin `useEffect` para data fetching

---

## Testing Strategy

| Capa | Framework | Cobertura objetivo |
|------|-----------|-------------------|
| Backend | pytest + DRF test client | Auth, agencias, viajes, inscripciones |
| Gateway | `node --test` (built-in) | Router, middlewares, proxy, multipart |
| Frontend | Jest + React Testing Library | Componentes UI, hooks, utils |
| E2E | Playwright (futuro) | Flujos críticos: login → wizard → dashboard |

**Nota:** Tests de auth backend (TASK-008 a TASK-011) documentan casos en notas pero **no existen archivos de test persistidos** — ver `TECH_DEBT.md` TD-001.