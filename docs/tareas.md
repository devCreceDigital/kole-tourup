# tareas.md — Registro de Tareas Tottem Hub

> Formato: `[ESTADO] ID - Nombre` | Estado: `✅ Done` | `🔄 In Progress` | `⏳ Pending` | `🚫 Blocked`

---

## FASE A — Cimientos (Completada)

- ✅ TASK-001 - Setup del monorepo
- ✅ TASK-002 - Docker Compose infraestructura local
- ✅ TASK-002.1 - Validación entorno Docker
- ✅ TASK-003 - Variables de entorno .env.example
- ✅ TASK-004 - Django project setup + settings
- ✅ TASK-005 - Modelo Agencia + seed Totem Travel
- ✅ TASK-006 - Modelo Usuario (AbstractBaseUser)
- ✅ TASK-007 - Modelo PadreTutor
- ✅ TASK-008 - Auth POST /auth/registro/ + email verificación
- ✅ TASK-009 - Auth GET /auth/verificar/
- ✅ TASK-010 - Auth POST /auth/login/ + JWT + Redis allowlist
- ✅ TASK-011 - Auth POST /auth/refresh/ + /auth/logout/
- ✅ TASK-012 - Auth GET/PATCH /agencias/perfil/
- ✅ TASK-013 - Gateway server.js + router.js + health check
- ✅ TASK-014 - Gateway middleware CORS
- ✅ TASK-015 - Gateway middleware auth (cookie → Bearer)
- ✅ TASK-016 - Gateway middleware seguridad + rate limiting
- ✅ TASK-017 - Gateway proxy Django + multipart + validación 10MB
- ✅ TASK-018 - Next.js setup + TailwindCSS 4 + route groups

---

## FASE B — Dominio Core Backend (Completada)

### B1-B3: APIs Viajes + Documentos Requeridos + LogAuditoria
- ✅ **TASK-030** - API Documentos Requeridos (CRUD)
- ✅ **TASK-031** - Modelo LogAuditoria inmutable
- ✅ **TASK-032** - Verificar modelos Inscripción completos

### B4-B5: Inscripciones + Signals
- ✅ **TASK-033** - API Inscripciones POST (wizard) + GET detalle
- ✅ **TASK-034** - Signal Inscripcion.CREATE → email bienvenida

### B6-B7: Pagos + Documentos Entregados
- ✅ **TASK-035** - Modelo Pago + API POST (upload comprobante S3)
- ✅ **TASK-036** - API Pago PATCH verificar/rechazar + signals auditoría/notificación/email
- ✅ **TASK-037** - Modelo DocumentoEntregado + API POST (upload validado MIME/tamaño)
- ✅ **TASK-038** - API Documento PATCH validar/rechazar + signals notificación

### B8-B9: Notificaciones + Comunicados
- ✅ **TASK-039** - Modelo Notificacion + API (list, marcar leída, marcar todas, preferencias)
- ✅ **TASK-040** - Modelo Comunicado + API + Celery task envío masivo idempotente

---

## FASE C — Frontend Core
- ⏳ **TASK-019** - Frontend middleware.ts (auth guard + redirect por rol)
- ⏳ **TASK-020** - Frontend páginas auth (login, registro, verificación)
- ⏳ **TASK-044** - Componentes UI base (Badge, ProgressBar, FileUploader, AlertCard, CardViaje, LazyWrapper)
- ⏳ **TASK-045** - Landing pública /viajes/[slug]/
- ⏳ **TASK-046** - Wizard inscripción 3 pasos + validación inteligente
- ⏳ **TASK-047** - Dashboard padre (badge, progreso, 3 sub-cards, alertas deep-link)
- ⏳ **TASK-048** - Pantalla pagos (plan cuotas + formulario + uploader)
- ⏳ **TASK-049** - Pantalla documentos (checklist 4 estados + uploader + historial)
- ⏳ **TASK-050** - Centro notificaciones (lista + íconos + deep-links + marcar todo)
- ⏳ **TASK-051** - Portal alumno (solo lectura)

---

## FASE D — Backoffice Agente
- ⏳ **TASK-052** - Layout agente + panel viajes (lista, crear, activar, métricas)
- ⏳ **TASK-053** - Panel inscritos con filtros + tabla + acciones
- ⏳ **TASK-054** - Verificación pagos (preview comprobante + aprobar/rechazar)
- ⏳ **TASK-055** - Validación documentos (preview + validar/rechazar con motivo)
- ⏳ **TASK-056** - Constructor itinerario drag & drop (@dnd-kit) + PATCH bulk
- ⏳ **TASK-057** - Gestión grupos, hoteles, docs requeridos
- ⏳ **TASK-058** - Comunicados masivos (formulario + estado envío)

---

## FASE E — Automatización Celery
- ⏳ **TASK-041** - Task recordatorios pago (30/15/7/3/0d) + anti-spam Redis
- ⏳ **TASK-042** - Tasks marcar cuotas vencidas + archivar viajes finalizados
- ⏳ **TASK-043** - Task alerta documentación umbral configurable
- ⏳ **TASK-E4** - Celery Beat schedule (cron diario)
- ⏳ **TASK-E5** - Tests idempotencia tasks

---

## FASE F — Características Avanzadas
- ⏳ **TASK-059** - Backend Mecenas + MecenasInscripcion + API
- ⏳ **TASK-060** - Frontend portal mecenas
- 🚫 **TASK-061** - Backend chat in-app (Conversacion + Mensaje) — **DECIDIDO: por Inscripcion**
- 🚫 **TASK-062** - Frontend chat in-app
- ⏳ **TASK-063** - Exportaciones CSV/XLSX
- ⏳ **TASK-064** - Exportaciones PDF (informe + ficha)
- ⏳ **TASK-065** - UI exportaciones backoffice
- ⏳ **TASK-066** - WhatsApp link wa.me Nivel 1
- ⏳ **TASK-067** - Preferencias notificación (modelo + API) — requiere D-08
- ⏳ **TASK-068** - Frontend configuración preferencias notificación

---

## Dudas Resueltas

| ID | Decisión |
|----|----------|
| **D-01 Chat** | ✅ **Opción B**: `Conversacion` por `Inscripcion` (contexto padre-agente granular) |
| **D-03 Colegios** | ✅ El agente los crea (no catálogo importado) |
| **D-07 Hotel** | ✅ Asignación manual por `Inscripcion.hotel_asignado` (no por Grupo) |
| **D-12 WhatsApp** | ✅ Nivel 1 = link `wa.me` manual desde ficha inscripción |

---

## Próximas Acciones Inmediatas

1. **TASK-032**: Verificar `apps/inscripciones/models.py` tiene todos los campos (hotel_asignado, acceso_alumno_habilitado, 14 alergenos, snapshot fields)
2. **TASK-033**: API Inscripciones POST (wizard) + GET detalle

---

## Tareas Realizadas

### ✅ TASK-LAYOUT-001 — Navbar y Footer público compartido

**Problema:**
El layout del grupo `(public)` (que envuelve las rutas `/viajes/[slug]`, `/inscribir/[viaje_id]` y `/mecenas/[alumno_id]`) contenía solo placeholders `{/* TODO: Navbar público */}` y `{/* TODO: Footer público */}`. Las páginas hijas tenían sus propios navbars/footers inline duplicados o ninguno.

**Solución:**
Se crearon dos componentes reutilizables y se integraron en el layout compartido.

**Archivos creados:**

1. `frontend/components/public/NavbarPublico.tsx`
   - Componente `'use client'` que renderiza un header sticky con:
     - Logo "Tottem Hub" con icono `explore` (mismo branding que landing page)
     - Enlace a `/` mediante `<Link>`
     - Botón de login (`account_circle`) que navega a `/login`
   - Usa las mismas clases Tailwind y variables CSS del tema (`landing-theme.css`): `bg-white/80 backdrop-blur-md`, `border-outline-variant/30`, `text-headline-md font-headline-md`, `px-margin-desktop`, `max-w-container-max`
   - Misma estructura visual que el navbar de `app/page.tsx`

2. `frontend/components/public/FooterPublico.tsx`
   - Componente server component que renderiza:
     - Nombre de la marca "Tottem Hub"
     - Enlaces: Privacidad, Términos, Contacto
     - Copyright con año dinámico
   - Usa clases del tema: `bg-inverse-surface`, `text-surface-container-lowest`, `text-tertiary-fixed-dim`

**Archivo modificado:**

3. `frontend/app/(public)/layout.tsx`:
   - Importa `NavbarPublico` y `FooterPublico`
   - Estructura: `div.flex.flex-col.min-h-screen > NavbarPublico + main.flex-1 + FooterPublico`
   - Eliminados los comentarios TODO
   - El `flex-col` + `flex-1` + `mt-auto` en footer asegura que el footer siempre se pegue al fondo incluso en páginas con poco contenido

---

### ✅ TASK-PAGOS-001 — Implementar `PlanPago.tiene_pagos_verificados` real

**Problema:**
La propiedad `tiene_pagos_verificados` en `PlanPago` era un stub que retornaba `False` con un TODO comentado esperando la existencia de la app `Pagos`. La app `Pagos` ya estaba implementada con el modelo `Pago` que tiene FK a `viajes.Cuota`.

**Relaciones entre modelos verificadas:**
- `PlanPago` → `Cuota` vía `Cuota.plan_pago` (`related_name='cuotas'`)
- `Cuota` → `Pago` vía `Pago.cuota` (`related_name='pagos'`)  
- `Pago.estado` tiene choices: `'pendiente'`, `'verificado'`, `'rechazado'`

**Solución:**
`backend/apps/viajes/models.py:94-96`:
```python
@property
def tiene_pagos_verificados(self):
    return self.cuotas.filter(pagos__estado='verificado').exists()
```
- Eliminado docstring, TODO, línea comentada, y `return False`
- La consulta recorre: `PlanPago → cuotas (Cuota) → pagos (Pago)` filtrando por `estado='verificado'`
- Semánticamente: "¿Existe al menos un pago verificado para alguna cuota de este plan?"

---

### ✅ TASK-PAGOS-002 — Corregir botón "Pagar" sin acción en vista padre (v3 — fix definitivo de hidratación)

**Problema original:**
La página `app/(padre)/app/inscripciones/[id]/pagos/page.tsx` era un Server Component que renderizaba una tabla de cuotas y botones CTA con etiquetas `<button>` que **no tenían manejadores `onClick`**.

**Fix v1 (anterior):**
Se creó `PagarSection.tsx` con botones que tienen `onClick` y abren el `FormularioPago`.

**Fix v2 (actual — aún no funcionaba):**
Se identificaron y corrigieron tres problemas adicionales:

1. **Falta `type="button"` en los `<button>`** — En HTML, un `<button>` sin `type` dentro de ciertos contextos puede comportarse como `type="submit"` y no ejecutar el `onClick` correctamente. Se agregó `type="button"` a todos los botones "Pagar" (tabla y CTA).

2. **`cuotaId` no se pre-seleccionaba en `FormularioPago`** — Cuando el usuario hacía clic en "Pagar" de una cuota específica, el `FormularioPago` se abría con `cuotaId=''` (sin cuota seleccionada), obligando al usuario a seleccionarla manualmente. Se agregó la prop `cuotaIdInicial` a `FormularioPago` para pre-seleccionar la cuota clickeada.

3. **Sin visibilidad de depuración** — No había logs para saber si el `handlePagar` se ejecutaba. Se agregaron `console.log` en `handlePagar` y `handleExito` para depuración en consola.

**Archivos modificados:**

- `frontend/components/padre/PagarSection.tsx`:
  - `type="button"` en ambos botones "Pagar"
  - Pasa `cuotaIdInicial={cuotaSeleccionada ?? undefined}` a `FormularioPago`
  - `console.log` en `handlePagar` y `handleExito`

- `frontend/components/padre/FormularioPago.tsx`:
  - Nueva prop opcional `cuotaIdInicial?: string`
  - `useState(cuotaIdInicial ?? '')` para inicializar el selector de cuota

**Fix v3 (definitivo — problema de hidratación):**
Se identificó que el componente `PagarSection` (cliente) estaba anidado dentro de `LayoutViajePadre` (cliente) mediante `{children}`, renderizado desde un Server Component (`PagosPage`). Esta doble frontera server→client→client impedía la correcta hidratación del componente en React 19 + Next.js 16.

**Solución:**
Se convirtió `PagosPage` de Server Component (`export default async function`) a Client Component (`'use client'` + `useEffect` + `useState` + `useParams`):
- Eliminada la barrera server/client — todo el árbol de pagos es ahora cliente
- Data fetching con `fetchApi` (usa `credentials: 'include'`) en `useEffect` en lugar de `async/await` server-side
- Estado `loading` para mostrar esqueleto mientras se cargan datos
- Eliminadas constantes duplicadas `ESTADO_CUOTA_CONFIG` y `formatFecha` (viven en `PagarSection`)
- Eliminada dependencia de `cookies()` (server API) — ahora usa `fetchApi` que gestiona credenciales automáticamente

**Archivos modificados:**
- `frontend/app/(padre)/app/inscripciones/[id]/pagos/page.tsx`:
  - Convertido a cliente (`'use client'`)
  - `useParams()` para obtener `id`
  - `useEffect` con `fetchApi` para obtener inscripción y plan de pago
  - Estados `loading`, `inscripcion`, `planPago`
  - Renderiza LayoutViajePadre con datos estáticos durante carga (skeleton)

**Archivos creados:**
- `frontend/components/ui/ErrorBoundary.tsx` — Error boundary genérico (clase React) para capturar errores de renderizado en componentes cliente. Usado por `PagarSection`.
- `frontend/docs/proceso_pagos.md` — Documentación completa del flujo de pagos (modelos, frontend, gateway, backend, señales, automatismos)

**Archivos modificados adicionales:**
- `frontend/components/padre/PagarSection.tsx`:
  - Envuelto en `<ErrorBoundary>` para capturar errores de render
  - `type="button"` en todos los `<button>` (evita comportamiento de submit implícito)
  - `safeParseFloat()` con fallback a 0 (evita `NaN.toFixed()` crash)
  - `console.log` en render, handlePagar, handleExito para depuración
  - Pasa `cuotaIdInicial` a `FormularioPago` para pre-seleccionar cuota

**Problema:**
La página `app/(padre)/app/inscripciones/[id]/pagos/page.tsx` era un Server Component que renderizaba una tabla de cuotas y botones CTA con etiquetas `<button>` que **no tenían manejadores `onClick`**. Al hacer clic en "Pagar" no ocurría nada, y se producía un error en consola (probablemente por eventos no vinculados en el árbol React).

El componente `FormularioPago` ya existía como componente cliente en `components/padre/FormularioPago.tsx` pero **no era utilizado** por la página.

**Solución:**
Se creó un componente cliente intermedio `PagarSection` que encapsula toda la lógica de interacción de pagos.

**Archivo creado:**

`frontend/components/padre/PagarSection.tsx`

- **Props interface:**
  ```typescript
  interface PagarSectionProps {
    inscripcionId: string
    cuotas: CuotaData[]          // { id, numero_cuota, descripcion, importe: string, fecha_vencimiento, estado }
    primeraCuotaPendiente: CuotaData | null
  }
  ```

- **Estados locales:**
  - `cuotaSeleccionada: string | null` — ID de la cuota a pagar (null = todas las pendientes)
  - `mostrarFormulario: boolean` — controla visibilidad del `FormularioPago`

- **Funcionalidad:**
  - `handlePagar(cuotaId?)` — setea la cuota seleccionada y muestra el formulario
  - `handleExito()` — oculta el formulario y resetea selección tras pago exitoso
  - `cuotasFormulario` (useMemo) — filtra cuotas por selección y convierte `importe` de `string` a `number` para la interface `Cuota` de `FormularioPago`
  - Constantes `ESTADO_CUOTA_CONFIG` y función `formatFecha` movidas del server component al cliente

- **Flujo:**
  1. Usuario hace clic en "Pagar" (fila de tabla o CTA inferior)
  2. `handlePagar(cuota.id)` → `mostrarFormulario = true`
  3. Se renderiza `<FormularioPago>` inline debajo de la tabla
  4. Usuario completa: importe, fecha, método, comprobante (opcional)
  5. `fetchApi('POST /api/v1/pagos/')` → gateway → Django → `PagoListCreateView` → `PagoCreateSerializer`
  6. En éxito: `handleExito()` oculta formulario

**Archivo modificado:**

`frontend/app/(padre)/app/inscripciones/[id]/pagos/page.tsx`:
- Agregado import de `PagarSection`
- Eliminadas las constantes `ESTADO_CUOTA_CONFIG`, `formatFecha` (migradas al componente)
- Eliminada la tabla HTML estática con `<table>` + `<tbody>` + `<button>` sin onClick
- Eliminado el CTA inferior con botones estáticos
- Reemplazado todo con: `<PagarSection inscripcionId={id} cuotas={cuotas} primeraCuotaPendiente={primeraCuotaPendiente} />`
- La sección de resumen (totales, progreso, alerta de vencidos) se mantiene como server-rendered

**Manejo de multipart en gateway:**
- `gateway/proxy/multipart.js`: Acumula body multipart, valida tamaño ≤ 10MB, responde 413 si excede
- `gateway/proxy/django.js`: Reenvía el body acumulado al backend Django con Content-Type y Content-Length correctos
- El flujo `FormularioPago → fetchApi → gateway → Django` funciona correctamente para POST con archivo comprobante

---

### ✅ TASK-PAGOS-003 — Validar flujo cambio de estado PATCH /api/v1/pagos/{id}/

**Propósito:** Análisis y validación del endpoint de verificación/rechazo de pagos.
**Pago de prueba:** `fe555f25-c5f9-4150-9459-377dccbefb77`

**Archivo creado:**
- `docs/validacion_flujo_pago.md` — Documentación completa del flujo validado

**Resultados de validación:**

| Aspecto | Estado | Detalle |
|---|---|---|
| Pago.estado | ✅ Verificado | Cambiado de `pendiente` a `verificado` |
| `tiene_pagos_verificados` | ✅ `True` | Query correcta en `viajes/models.py:94` |
| `total_pagado` | ✅ S/ 400.00 | |
| `saldo_pendiente` | ✅ S/ 800.00 | |
| `porcentaje_pagado` | ✅ 33.33% | |
| LogAuditoria PAGO_ACTUALIZADO | ❌ **No existe** | Cambio no pasó por PATCH endpoint |
| Signal `pago_post_save` | ❌ **Falta `usuario`** | No pasa `instance.registrado_por` |

**Hallazgos:**

1. **Estado cambiado sin pasar por PATCH** — El pago se creó a las 13:47, el `updated_at` cambió a las 14:13, pero no hay `PAGO_ACTUALIZADO` en LogAuditoria. El cambio se hizo directo en BD/admin. Consecuencia: sin trazabilidad ni email al tutor.

2. **Signal `pago_post_save` no registra `usuario`** — En `apps/pagos/signals.py:14-18` se crea el LogAuditoria sin `usuario=instance.registrado_por`, quedando `None` en la BD.

3. **No se encontraron bugs en el código del endpoint** — `PagoVerificarRechazarView.patch()` funciona correctamente con validaciones, LogAuditoria y email.

**Fixes aplicados (post-validación):**

1. **Signal `pago_post_save`** — Agregado `usuario=instance.registrado_por` en `apps/pagos/signals.py:15` para que el LogAuditoria `PAGO_REGISTRADO` quede vinculado al usuario que registró el pago.

2. **Admin Pago** — Agregado `'estado'` a `readonly_fields` en `apps/pagos/admin.py` para evitar que el estado se cambie directamente por el panel de admin, forzando el uso del endpoint PATCH.

**Archivos analizados:**
- `backend/apps/pagos/views.py` — `PagoVerificarRechazarView.patch()` (líneas 38-90)
- `backend/apps/pagos/serializers.py` — `PagoCreateSerializer` + `PagoDetalleSerializer`
- `backend/apps/pagos/models.py` — Modelo Pago con choices y constraints
- `backend/apps/pagos/admin.py` — PagoAdmin (estado editable, no en readonly)
- `backend/apps/pagos/signals.py` — Signal `pago_post_save` (falta usuario)
- `backend/apps/auditoria/models.py` — LogAuditoria inmutable
- `backend/templates/emails/pago_verificado.html` / `pago_rechazado.html`
- `backend/config/urls.py` — Ruta `api/v1/pagos/` incluida
- `gateway/server.js` — Pipeline completo con fallback `/api/*`
- `gateway/router.js` — Matching exacto (no soporta UUID params, pero el fallback lo cubre)

---

## Notas de Desarrollo

- **Tests**: Añadir tests unitarios en cada TASK (pytest backend, node --test gateway, Jest frontend)
- **Docker**: Todo desarrollo en `docker compose up`; no instalar deps localmente
- **Commits**: Un commit por TASK completada con mensaje convencional
- **Docs**: Actualizar `DATABASE.md-final`, `API.md-final` si hay cambios de schema/endpoints