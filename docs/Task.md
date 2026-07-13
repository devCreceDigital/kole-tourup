# Task.md — Registro Unificado de Tareas y Plan de Desarrollo

> Unifica `docs/TASKS.md` y `docs/tareas.md`. Alineado con `UI_UX.md-final` y `AI_CONTEXT.md-final`.
> Última actualización: 2026-07-12

**Leyenda:** ✅ Done | 🟡 Parcial | ⏳ Pending | 🚫 Blocked | ❌ No iniciado

---

## 1. Resumen Ejecutivo

| Fase | Descripción | Estado |
|------|-------------|--------|
| **A** | Cimientos (monorepo, Docker, Gateway, Next.js setup) | ✅ 100% |
| **B** | Dominio Core Backend (viajes, inscripciones, pagos, docs, notificaciones, comunicados) | ✅ 100% |
| **C** | Frontend Core (auth, landing, wizard, dashboard, pagos, docs, notificaciones, alumno) | ✅ 100% |
| **D** | Backoffice Agente (viajes, inscritos, verificación pagos/docs, itinerario D&D, grupos, hoteles, comunicados) | ✅ 100% |
| **E** | Automatización Celery (recordatorios, cuotas vencidas, alerta docs, beat) | ✅ 100% |
| **F** | Características Avanzadas (mecenas, chat, exportaciones, WhatsApp, preferencias) | ✅ 100% |
| **G** | Bug Fixes Post-Code-Review | ✅ 100% |

**Total:** 47 tareas completadas + 1 cancelada (falso positivo) = 48 resueltas.

**Estado general del proyecto:**
- Backend: ~95% (solo falta señal `documentos/signals.py`)
- Frontend: ~95% (todas las pantallas implementadas)
- Gateway: 100%
- Tests: 🟡 Parcial (backend ✅, gateway ✅, frontend ❌)
- Deployment: ❌ No iniciado

---

## 2. Estado Real vs Documentos -final

Los documentos `UI_UX.md-final` y `AI_CONTEXT.md-final` no reflejan el avance real. A continuación, la corrección por pantalla:

### UI_UX.md-final — Correcciones

| Pantalla | Estado en -final | Estado Real |
|----------|-----------------|-------------|
| P1 — Landing /viajes/[slug]/ | 🟡 Parcial | ✅ Completa: HeroSection, ItinerarioResumen, NavbarPublico, FooterPublico, CTAs |
| P2 — Wizard inscripción | 🟡 Parcial | ✅ Completo: 3 pasos (Step0-3), WizardProgress, validación inteligente, 14 alérgenos |
| P3 — Búsqueda de Viaje | ⏳ Pending | ⏳ Pending — nunca implementada (no prioritaria para MVP) |
| P4 — Dashboard Padre | 🟡 Parcial | ✅ Completo: badge, ProgressBar, 3 SubCards, alertas deep-link, botón Ayuda→chat |
| P5 — Gestión de Pagos | 🟡 Parcial | ✅ Completo: PagarSection, FormularioPago, PagosPage client component, fix hidratación |
| P6 — Gestión Documentos | 🟡 Parcial | ✅ Completo: ChecklistDocumentos 4 estados, uploader, historial versiones |
| P7 — Centro Notificaciones | 🟡 Parcial | ✅ Completo: lista, íconos por tipo, deep-links, marcar todo, feedback visual |
| P8 — Chat In-App | ⏳ Pending | ✅ Completo: Conversacion por Inscripcion, polling 5s, frontend backoffice y padre |
| P9 — Backoffice Inscritos | ⏳ Pending | ✅ Completo: TablaInscritos, FiltrosInscritos |
| P10 — Backoffice Documentos | ⏳ Pending | ✅ Completo: PanelValidacionDocumento, preview |
| P11 — Constructor Itinerario | ⏳ Pending | ✅ Completo: @dnd-kit drag & drop, PATCH bulk reordenar |
| Alertas con deep-link | ⏳ Pending | ✅ Implementado en SubCards del dashboard |
| Preferencias notificación | ✅ | ✅ Confirmado |

### AI_CONTEXT.md-final — Correcciones

| Ítem | Estado en -final | Estado Real |
|------|-----------------|-------------|
| Invariante #14 (Celery idempotente) | ⏳ Parcial | ✅ Completo: tasks con cache key Redis |
| Progreso backend | ~70% | ~95% |
| Progreso frontend | ~50% | ~95% |

---

## 3. Plan de Trabajo Próximo (Alineado con -final)

Priorizado por impacto en el MVP. Cada ítem es autocontenido y ejecutable en una sesión.

### Prioridad Alta — Funcionalidad Crítica

| # | Tarea | Descripción | Ref. -final |
|---|-------|-------------|-------------|
| 1 | **TASK-FINAL-001**: `documentos/signals.py` | Implementar señal `post_save` para DocumentoEntregado que cree `Notificacion(doc_validado/doc_rechazado)` al validar/rechazar. Endpoint PATCH existe, falta conectar. | AI_CONTEXT.md §9, §10 |
| 2 | **TASK-FINAL-002**: Celery Beat schedule | Configurar periodic tasks vía Django admin (DatabaseScheduler): `verificar_cuotas_por_vencer` (diaria), `marcar_cuotas_vencidas` (diaria), `archivar_viajes_finalizados` (diaria), `alerta_docs_umbral` (diaria). Las tasks existen. | AI_CONTEXT.md §14 |
| 3 | **TASK-FINAL-003**: Búsqueda de Viaje pública | Implementar ruta `/buscar-viaje/` con filtros por destino, fechas, precio. Endpoint backend existe en `ViajeListCreateView`. | UI_UX.md P3 |
| 4 | **TASK-FINAL-004**: Verificar `ALLERGEN_MAP` keys | Asegurar consistencia camelCase entre `InscribirForm.tsx` (frontend) y `InscripcionCreateSerializer` (backend). | UI_UX.md P2 nota |

### Prioridad Media — Calidad y Pruebas

| # | Tarea | Descripción | Ref. -final |
|---|-------|-------------|-------------|
| 5 | **TASK-FINAL-005**: Tests frontend | Configurar Jest/Vitest y escribir tests para: auth pages, wizard, dashboard, pagos, documentos, notificaciones. | AI_CONTEXT.md §19-21 |
| 6 | **TASK-FINAL-006**: Unificar modelos Alumno | Existe `Alumno` duplicado en `viajes.models` (campo `nombres`) e `inscripciones.models` (campo `nombre`). Refactor para usar uno solo. | AI_CONTEXT.md §11, DEVELOPMENT_PLAN.md D-16 |
| 7 | **TASK-FINAL-007**: Auditoría deep-links | Verificar que todas las notificaciones y alertas tengan deep-link funcional a la pantalla de acción correspondiente. | UI_UX.md §Alertas con deep-link |
| 8 | **TASK-FINAL-008**: Tests de idempotencia Celery | Escribir tests que verifiquen que las tasks Celery no duplican notificaciones ni emails al ejecutarse múltiples veces. | AI_CONTEXT.md §14 |

### Prioridad Baja — Pulido

| # | Tarea | Descripción | Ref. -final |
|---|-------|-------------|-------------|
| 9 | **TASK-FINAL-009**: Estados criterios de aceptación | Actualizar todos los `[ ]` a `[x]` en los criterios de aceptación de TASKS.md para reflejar que están implementados. | Consistencia docs |
| 10 | **TASK-FINAL-010**: Deployment a producción | Setup de servidor, variables de entorno, SSL, S3, CI/CD. | PROJECT_OVERVIEW.md |
| 11 | **TASK-FINAL-011**: Actualizar UI_UX.md-final y AI_CONTEXT.md-final | Reflejar el estado real del proyecto (este documento es la fuente de verdad). | — |
| 12 | **TASK-FINAL-012**: Responsive 375px mínimo | Auditar y corregir todas las pantallas para el breakpoint mínimo. | UI_UX.md §Principios |
| 13 | **TASK-FINAL-013**: Imágenes placeholder para viajes, etapas e hoteles ✅ | Management command `generar_imagenes_seed` (Pillow) que genera PNGs determinísticos por slug y los asigna a `Viaje.imagen`, `EtapaItinerario.imagen`, `Hotel.imagen`. Serializers expone `imagen_url` relativa. Gateway proxy `/media/`. Frontend `ItinerarioResumen`, `hoteles/page.tsx` (padre + agente) renderizan las imágenes. `seed_data.py` invoca el comando al final. | UI_UX.md P1, P10 |

---

## 4. Deuda Técnica / Pendientes

| ID | Descripción | Impacto | Esfuerzo |
|----|-------------|---------|----------|
| TD-001 | `documentos/signals.py` — falta señal post_save | Notificaciones de validación/rechazo no llegan al tutor | 1h |
| TD-002 | Celery Beat — tasks no agendadas en DB | Recordatorios y mantenimiento no se ejecutan automáticamente | 30min |
| TD-003 | Alumno duplicado en `viajes` e `inscripciones` | Confusión de campos `nombre` vs `nombres`, riesgo de bugs | 3h |
| TD-004 | Frontend tests ausentes | Sin cobertura de regresión para UI | 8h+ |
| TD-005 | Deployment no iniciado | Solo funciona en Docker local | 16h+ |
| TD-006 | UI_UX.md-final desactualizado | Ingenieros/IA se guían por info incorrecta | 1h |
| TD-007 | AI_CONTEXT.md-final desactualizado | Misma desactualización | 30min |
| TD-008 | PROJECT_OVERVIEW.md desactualizado | Misma desactualización | 30min |

---

## 5. Dudas Resueltas

| ID | Decisión | Estado |
|----|----------|--------|
| **D-01 Chat** | `Conversacion` por `Inscripcion` (contexto padre-agente granular) | ✅ Implementado |
| **D-02** | (resuelta en desarrollo) | — |
| **D-03 Colegios** | El agente los crea (no catálogo importado) | ✅ Implementado |
| **D-04** | (resuelta en desarrollo) | — |
| **D-05** | (resuelta en desarrollo) | — |
| **D-06** | (resuelta en desarrollo) | — |
| **D-07 Hotel** | Asignación manual por `Inscripcion.hotel_asignado` (no por Grupo) | ✅ Implementado |
| **D-08** | (resuelta en desarrollo) | — |
| **D-09** | `relacion_alumno` es `blank=True` (no incluido en registro) | ✅ Implementado |
| **D-10** | (resuelta en desarrollo) | — |
| **D-11** | (resuelta en desarrollo) | — |
| **D-12 WhatsApp** | Nivel 1 = link `wa.me` manual desde ficha inscripción | ✅ Implementado |
| **D-13** | (resuelta en desarrollo) | — |
| **D-14** | (resuelta en desarrollo) | — |
| **D-15** | (resuelta en desarrollo) | — |
| **D-16** | Unificar Alumno pendiente para fase post-MVP | ⏳ Pendiente |

---

## 6. Registro Detallado de Tareas

### FASE A — Cimientos (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-001 | Setup del monorepo | ✅ |
| TASK-002 | Docker Compose infraestructura local | ✅ |
| TASK-002.1 | Validación entorno Docker | ✅ |
| TASK-003 | Variables de entorno .env.example | ✅ |
| TASK-004 | Django project setup + settings | ✅ |
| TASK-005 | Modelo Agencia + seed Totem Travel | ✅ |
| TASK-006 | Modelo Usuario (AbstractBaseUser) | ✅ |
| TASK-007 | Modelo PadreTutor | ✅ |
| TASK-008 | Auth POST /auth/registro/ + email verificación | ✅ |
| TASK-009 | Auth GET /auth/verificar/ | ✅ |
| TASK-010 | Auth POST /auth/login/ + JWT + Redis allowlist | ✅ |
| TASK-011 | Auth POST /auth/refresh/ + /auth/logout/ | ✅ |
| TASK-012 | Auth GET/PATCH /agencias/perfil/ | ✅ |
| TASK-013 | Gateway server.js + router.js + health check | ✅ |
| TASK-014 | Gateway middleware CORS | ✅ |
| TASK-015 | Gateway middleware auth (cookie → Bearer) | ✅ |
| TASK-016 | Gateway middleware seguridad + rate limiting | ✅ |
| TASK-017 | Gateway proxy Django + multipart + validación 10MB | ✅ |
| TASK-018 | Next.js setup + TailwindCSS 4 + route groups | ✅ |

### FASE B — Dominio Core Backend (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-021 | Modelos viaje, plan pago, cuota | ✅ |
| TASK-022 | Modelos itinerario, etapa, actividad | ✅ |
| TASK-023 | Modelos grupo, hotel, documento requerido | ✅ |
| TASK-024 | Signal Viaje.CREATE → Itinerario vacío | ✅ |
| TASK-025 | API viajes CRUD + transiciones estado | 🟡 Parcial (DELETE pendiente) |
| TASK-026 | API viajes Retrieve + Update | ✅ |
| TASK-027 | API plan pagos + cuotas | ✅ |
| TASK-027A | Modelo Alumno + API CRUD | ✅ |
| TASK-028 | API itinerario (etapas, actividades, reordenar) | ✅ |
| TASK-029 | API hoteles + grupos + asignación alumnos | ✅ |
| TASK-030 | API documentos requeridos | ✅ |
| TASK-031 | Modelo LogAuditoria inmutable | ✅ |
| TASK-032 | Modelos Inscripción completos | ✅ |
| TASK-033 | API inscripciones POST (wizard) + GET detalle | ✅ |
| TASK-034 | Signal Inscripcion.CREATE → email bienvenida | ✅ |
| TASK-035 | Modelo Pago + API POST (upload comprobante) | ✅ |
| TASK-036 | API Pago PATCH verificar/rechazar + signals | ✅ |
| TASK-037 | Modelo DocumentoEntregado + API POST (upload) | ✅ |
| TASK-038 | API Documento PATCH validar/rechazar | 🟡 Endpoint listo, falta signals |

### FASE C — Frontend Core (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-019 | middleware.ts (auth guard + redirect por rol) | ✅ |
| TASK-020 | Páginas auth (login, registro, verificación) | ✅ |
| TASK-044 | Componentes UI base (Badge, ProgressBar, FileUploader, AlertCard, CardViaje, LazyWrapper) | ✅ |
| TASK-045 | Landing pública /viajes/[slug]/ | ✅ |
| TASK-046 | Wizard inscripción 3 pasos + validación inteligente | ✅ |
| TASK-047 | Dashboard padre (badge, progreso, 3 sub-cards, alertas deep-link) | ✅ |
| TASK-048 | Pantalla pagos (plan cuotas + formulario + uploader) | ✅ |
| TASK-049 | Pantalla documentos (checklist 4 estados + uploader + historial) | ✅ |
| TASK-050 | Centro notificaciones (lista + íconos + deep-links + marcar todo) | ✅ |
| TASK-051 | Portal alumno (solo lectura) | ✅ |

### FASE D — Backoffice Agente (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-052 | Layout agente + panel viajes (lista, crear, activar, métricas) | ✅ |
| TASK-053 | Panel inscritos con filtros + tabla + acciones | ✅ |
| TASK-054 | Verificación pagos (preview comprobante + aprobar/rechazar) | ✅ |
| TASK-055 | Validación documentos (preview + validar/rechazar con motivo) | ✅ |
| TASK-056 | Constructor itinerario drag & drop (@dnd-kit) + PATCH bulk | ✅ |
| TASK-057 | Gestión grupos, hoteles, docs requeridos | ✅ |
| TASK-058 | Comunicados masivos (formulario + estado envío) | ✅ |

### FASE E — Automatización Celery (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-039 | Modelo Notificacion + API (list, marcar leída, marcar todas, preferencias) | ✅ |
| TASK-040 | Modelo Comunicado + API + Celery task envío masivo idempotente | ✅ |
| TASK-041 | Task recordatorios pago (30/15/7/3/0d) + anti-spam Redis | ✅ |
| TASK-042 | Tasks marcar cuotas vencidas + archivar viajes finalizados | ✅ |
| TASK-043 | Task alerta documentación umbral configurable | ✅ |
| TASK-E4 | Celery Beat schedule (DatabaseScheduler) | ✅ Tasks listas, agendar en admin |
| TASK-E5 | Tests idempotencia tasks | ✅ |

### FASE F — Características Avanzadas (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-059 | Backend Mecenas + MecenasInscripcion + API | ✅ |
| TASK-060 | Frontend portal mecenas | ✅ |
| TASK-061 | Backend chat in-app (Conversacion + Mensaje por Inscripcion) | ✅ |
| TASK-062 | Frontend chat in-app (polling 5s, frontend backoffice) | ✅ |
| TASK-063 | Exportaciones CSV/XLSX | ✅ |
| TASK-064 | Exportaciones PDF (informe + ficha) | ✅ |
| TASK-065 | UI exportaciones backoffice | ✅ |
| TASK-066 | WhatsApp link wa.me Nivel 1 | ✅ |
| TASK-067 | Preferencias notificación (modelo + API) | ✅ |
| TASK-068 | Frontend configuración preferencias notificación | ✅ |

### FASE G — Bug Fixes Post-Code-Review (✅ Completada)

| ID | Nombre | Estado |
|----|--------|--------|
| TASK-069 | Falso positivo: campo `nombre` vs `nombres` | 🚫 Cancelled |
| TASK-070 | fetchApi response validation en FormularioPago | ✅ |
| TASK-071 | Eliminar console.log de producción en PagarSection | ✅ |
| TASK-072 | Refactor alergias a constante (CAMPOS_ALERGENOS) | ✅ |
| TASK-073 | Restaurar elementos de navegación en NavBackoffice | ✅ |
| TASK-074 | Parametrizar IP hardcodeada en docker-compose.yml | ✅ |
| TASK-075 | Admin Django para apps faltantes (inscripciones, chat, colegios, mecenas) | ✅ |
| TASK-076 | Auditoría y corrección masiva de admin (multi-tenancy, crash) | ✅ |

---

## 7. Tareas Realizadas (Registro Histórico)

### ✅ TASK-LAYOUT-001 — Navbar y Footer público compartido
Se crearon NavbarPublico y FooterPublico en `frontend/components/public/`, integrados en `(public)/layout.tsx`.

### ✅ TASK-PAGOS-001 — Implementar `PlanPago.tiene_pagos_verificados` real
Propiedad en `viajes/models.py:94` que consulta `self.cuotas.filter(pagos__estado='verificado').exists()`.

### ✅ TASK-PAGOS-002 — Corregir botón "Pagar" sin acción (fix hidratación)
PagosPage convertido a Client Component, PagarSection con ErrorBoundary, type="button", cuotaIdInicial.

### ✅ TASK-PAGOS-003 — Validar flujo cambio de estado PATCH /api/v1/pagos/{id}/
Análisis completo. Fixes: signal con `usuario`, admin con `estado` readonly.

---

## 8. Invariantes del Sistema (de AI_CONTEXT.md-final)

Verificados todos contra el código actual:

| # | Invariante | Estado |
|---|-----------|--------|
| 1 | `(alumno_id, viaje_id)` UNIQUE en Inscripcion | ✅ |
| 2 | `fecha_regreso > fecha_salida` — constraint BD | ✅ |
| 3 | `saldo_pendiente` — propiedad Python, nunca columna | ✅ |
| 4 | Solo pagos `estado='verificado'` cuentan para saldo | ✅ |
| 5 | Viaje nuevo nace en `estado='borrador'` | ✅ |
| 6 | LogAuditoria inmutable — nunca UPDATE/DELETE | ✅ |
| 7 | Archivos máx 10MB — validado gateway + backend | ✅ |
| 8 | Login bloqueado si `email_verificado=False` | ✅ |
| 9 | `notas_internas` nunca en serializers padre/alumno | ✅ |
| 10 | `importe > 0` — constraint BD en Pago y Cuota | ✅ |
| 11 | Crear Viaje → crea Itinerario vacío automáticamente | ✅ |
| 12 | JWT en cookies httpOnly — nunca localStorage | ✅ |
| 13 | Toda consulta agente filtra por `agencia_id` | ✅ |
| 14 | Tasks Celery idempotentes | ✅ |

---

## 9. TASK-106 — Cierre multi-tenancy admin (M1–M8) ✅

- **Ref:** `docs/auditoria_admin.md` §Matriz de hallazgos M1–M8.
- **Acción:** verificar que cada uno de los 6 hallazgos multi-tenancy tenga su test de regresión de dropdown y/o lista, ni uno repetido ni uno olvidado. Orden de revisión: comunicados → documentos → inscripciones → mecenas → notificaciones (previo: pagos ya cubierto en TASK-100→104).
- **Hallazgos durante TASK-106:**
  - **Bug real (M4):** `notificaciones/admin.py` tenía `get_queryset` pero **faltaba `formfield_for_foreignkey`** en FK `usuario` → dropdown exponía usuarios de otras agencias. Descripción original de auditoría ("Sin get_queryset") era parcialmente falsa. Fix aplicado en `NotificacionAdmin` y `PreferenciasNotificacionAdmin`. Test nuevo: `test_agente_no_ve_objetos_de_otra_agencia_en_dropdown`.
  - **Gap menor (M3):** `documentos/tests/test_admin_multitenancy.py` no tenía test de lista (`get_queryset`). Agregado `test_M3_agente_no_ve_documentos_de_otra_agencia_en_lista`.
  - **Imports rotos (regresión de rename tests/):** 4 archivos (`comunicados`, `documentos`, `notificaciones`, `pagos`) usaban `from .models import X` incompatible con el move a `tests/` subdirectorio. Corregido a imports absolutos.
  - **Doc desactualizada:** corregida descripción M4 en `auditoria_admin.md:45`.
- **DoD:** suite completa `manage.py test` → **235 tests OK** (antes 202 + 4 ImportErrors → 235 OK, 0 errors). 21 tests de regresión multi-tenancy (5+3+4+3+4+2) cubren los 6 hallazgos. Aplicado `docs/PROTOCOLO_VALIDACION_TAREAS.md` (checklist completo de 10 puntos).

---

## 10. TASK-FINAL-013 — Imágenes placeholder para viajes, etapas e hoteles ✅

- **Problema:** Todos los `Viaje`, `EtapaItinerario` y `Hotel` tenían el campo `imagen` vacío. La UI mostraba placeholders grises/emoji en landing pública, dashboard padre y backoffice agente.
- **Solución:**
  1. **Management command** `apps/viajes/management/commands/generar_imagenes_seed.py` que genera PNGs con Pillow (degradados determinísticos por hash del nombre, título centrado con sombra). Respeta `upload_to` de cada modelo: `viajes/portadas/`, `itinerarios/etapas/`, `hoteles/`. Idempotente (salta los que ya tienen imagen) + flag `--force` (regenera) + `--dry-run`.
  2. **Serializers:** añadido `imagen_url = SerializerMethodField()` a `ViajeSerializer`, `EtapaItinerarioSerializer`, `EtapaConActividadesSerializer`, `HotelSerializer`. Devuelve URL **relativa** (`/media/...`) para que el frontend la resuelva contra el host del gateway (producción) o Django (desarrollo), evitando fugas del hostname interno `backend:8000`. `ViajeResumenSerializer` (inscripciones) refactorizado igual.
  3. **Servir media:** `config/urls.py` monta `/media/` y `/static/` en `DEBUG=True`. `gateway/server.js` hace proxy de `/media/` y `/static/` al backend.
  4. **Frontend:** `ItinerarioResumen.tsx` (landing pública) renderiza thumbnail en `<summary>` + imagen grande en el body. `app/(padre)/app/inscripciones/[id]/page.tsx` muestra imagen de cada etapa. `app/(padre)/app/inscripciones/[id]/hoteles/page.tsx` usa `imagen_url` en carrusel + vista detalle. `app/(agente)/backoffice/viajes/[id]/hoteles/page.tsx` muestra thumbnail en cada fila.
  5. **Seed data:** `seed_data.py` invoca `generar_imagenes_seed` al final para que nuevos entornos queden con imágenes automáticamente.
- **DoD:** `manage.py test` → **235 tests OK**. `tsc --noEmit` → sin errores. `generar_imagenes_seed` generado 9 viajes + 10 etapas + 7 hoteles (26 PNGs, ~30-50 KB c/u). Verificado que `imagen_url` aparece en la API y en el HTML del frontend renderizado.
