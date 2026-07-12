# DEVELOPMENT_PLAN.md — Plan de Desarrollo: Tottem Hub (Fase 1)

> Generado tras análisis completo de los 11 documentos de especificación.
> Estado: **En desarrollo activo** (~70% backend, ~50% frontend).
> Última actualización: 2026-07-09 — Incorporados hallazgos de code review y análisis de CLAUDE_RULES.md.

---

## 1. Arquitectura Entendida

### Diagrama de capas

```
[BROWSER / MOBILE — Web Responsive]
        │
  Next.js 16.2.6 (App Router)
  React 19 · TailwindCSS 4 · Framer Motion (LazyMotion)
        │
        │  HTTPS · JWT en cookie httpOnly
        ▼
[API GATEWAY — Node.js puro (node:http)]
  • CORS manual · Rate limit (Redis) · Headers seguridad
  • Auth forwarding (cookie → Authorization header)
  • Multipart parsing · Validación 10 MB (1ª línea defensa)
  • Sin lógica de negocio
        │
        │  HTTP interno
        ▼
[BACKEND — Django 4.2+ + DRF]
  • REST endpoints · Permisos por rol · filtro agencia_id
  • Django Signals (efectos secundarios automáticos)
  • Celery tasks (dispatch)
  • LogAuditoria inmutable
        │
  ┌─────┼──────┬─────────────┐
  ▼     ▼      ▼             ▼
[PG]  [Redis] [Celery]    [S3/GCS]
 BD   JWT+Broker Workers  Storage
```

### Portales Frontend (route groups en App Router)

| Route group | URL base | Audiencia | Middleware |
|---|---|---|---|
| `(public)` | `/viajes/{slug}/` | Sin auth | Ninguno |
| `(padre)` | `/app/` | Padre + Mecenas | JWT → rol padre/mecenas |
| `(alumno)` | `/app/alumno/` | Alumno | JWT → rol alumno + flag acceso |
| `(agente)` | `/backoffice/` | Agente Totem Travel | JWT → rol agente |

---

## 2. Módulos del Sistema

### Backend (Django Apps)

| App | Modelos principales | Responsabilidad |
|---|---|---|
| `autenticacion` | `Usuario` (AbstractBaseUser) | JWT, registro, verificación email, login/logout/refresh, password recovery |
| `agencias` | `Agencia` | Perfil tenant (1 en Fase 1) |
| `viajes` | `Viaje`, `Grupo`, `PlanPago`, `Cuota`, `Itinerario`, `EtapaItinerario`, `Actividad`, `Hotel`, `DocumentoRequerido` | CRUD de viajes, itinerario drag&drop, plan de pagos, hoteles, documentos requeridos |
| `inscripciones` | `Inscripcion`, `Alumno`, `PadreTutor` | Wizard de inscripción, perfiles de alumno/tutor |
| `pagos` | `Pago` | Subida de comprobante, verificación/rechazo, signals |
| `documentos` | `DocumentoEntregado` | Upload, validación/rechazo, signals |
| `comunicados` | `Comunicado` | Comunicados masivos vía Celery |
| `notificaciones` | `Notificacion` | In-app + email, lectura |
| `mensajes` | `Mensaje`, `Conversacion` | Chat in-app padre ↔ agente (*modelo ausente en DATABASE.md — ver Dudas*) |
| `mecenas` | `Mecenas`, `MecenasInscripcion` | Portal mecenas, asignación, pagos en nombre |
| `auditoria` | `LogAuditoria` | Log inmutable via signals post_save |
| `exportaciones` | (sin modelos propios) | Generadores CSV/XLSX/PDF usando datos de otras apps |

### Gateway (Node.js puro)

| Módulo | Archivo | Función |
|---|---|---|
| Servidor | `server.js` | `createServer(node:http)`, punto de entrada |
| Router | `router.js` | Map `{method, path}` → handler |
| CORS | `middleware/cors.js` | Headers manuales por `CORS_ORIGINS` |
| Rate limit | `middleware/rateLimit.js` | Contador Redis por IP/endpoint |
| Auth | `middleware/auth.js` | Lee cookie JWT → `Authorization: Bearer` |
| Seguridad | `middleware/security.js` | HSTS, X-Frame-Options, X-Content-Type |
| Proxy Django | `proxy/django.js` | `http.request` + pipe de response |
| Multipart | `proxy/multipart.js` | Parse multipart/form-data antes de reenviar |

### Frontend (Next.js)

| Módulo | Ubicación | Descripción |
|---|---|---|
| Auth | `app/(auth)/`, `middleware.ts` | Login, registro, verificación, guard por rol |
| Landing pública | `app/(public)/viajes/[slug]/` | Página de aterrizaje del viaje |
| Búsqueda viaje | `app/(padre)/app/buscar-viaje/` | Por código o por colegio |
| Wizard inscripción | `app/(padre)/app/inscribir/[viaje_id]/` | 3 pasos + validación inteligente |
| Dashboard padre | `app/(padre)/app/` | Estado completo, alertas con deep-link |
| Pagos | `app/(padre)/app/pagos/[id]/` | Plan de cuotas, formulario de pago |
| Documentos | `app/(padre)/app/documentos/[id]/` | Checklist, uploader, historial |
| Notificaciones | `app/(padre)/app/notificaciones/` | Centro de notificaciones |
| Chat | `app/(padre)/app/mensajes/[viaje_id]/` | Chat in-app |
| Portal mecenas | `app/(padre)/app/mecenas/` | Alumnos patrocinados, pagos |
| Backoffice - Viajes | `app/(agente)/backoffice/viajes/` | CRUD viajes, métricas |
| Backoffice - Inscritos | `app/(agente)/backoffice/viajes/[id]/inscritos/` | Listado + filtros |
| Backoffice - Pagos | `app/(agente)/backoffice/viajes/[id]/pagos/` | Verificación |
| Backoffice - Docs | `app/(agente)/backoffice/viajes/[id]/documentos/` | Validación |
| Backoffice - Itinerario | `app/(agente)/backoffice/viajes/[id]/itinerario/` | Constructor drag&drop |
| Backoffice - Comunicados | `app/(agente)/backoffice/viajes/[id]/comunicados/` | Envío masivo |
| Portal alumno | `app/(alumno)/app/alumno/` | Solo lectura |

---

## 3. Orden Recomendado de Implementación

### Fase A — Cimientos (sin esto nada funciona)

| # | Tarea | Capa | Justificación |
|---|---|---|---|
| A1 | Setup monorepo + Docker Compose (pg, redis, celery) | Infra | Base de todo |
| A2 | Django project + settings (base/local/prod) + `requirements.txt` | Backend | Prerequisito |
| A3 | Modelos de BD: `Agencia`, `Usuario` (AbstractBaseUser) | Backend | Auth depende de esto |
| A4 | JWT auth: registro, verificación email, login, refresh, logout | Backend | Todo lo demás requiere auth |
| A5 | Gateway Node.js: server + router + middleware (cors, auth, security, rateLimit) + proxy Django | Gateway | Frontend → Backend depende de esto |
| A6 | Next.js project setup: TailwindCSS 4 (`@theme {}`), `middleware.ts`, route groups | Frontend | Prerequisito frontend |
| A7 | Páginas de auth frontend: registro, login, verificación email | Frontend | Primer flujo usable |

### Fase B — Dominio Core

| # | Tarea | Capa | Dependencias |
|---|---|---|---|
| B1 | Modelos: `Viaje`, `PlanPago`, `Cuota`, `Grupo`, `Hotel`, `Itinerario`, `EtapaItinerario`, `Actividad`, `DocumentoRequerido` | Backend | A3 |
| B2 | API viajes: CRUD + activar/cerrar/archivar + métricas | Backend | B1 |
| B3 | API plan de pagos y cuotas | Backend | B1 |
| B4 | API itinerario: etapas + actividades + reordenamiento bulk | Backend | B1 |
| B5 | API hoteles + grupos | Backend | B1 |
| B6 | API documentos requeridos | Backend | B1 |
| B7 | Modelos: `Alumno`, `PadreTutor`, `Inscripcion` | Backend | A3, B1 |
| B8 | API inscripciones: wizard POST (verificación cupo, unicidad) + GET | Backend | B7 |
| B9 | Signal `Inscripcion.CREATE` → email bienvenida | Backend | B8 |
| B10 | Modelos: `Pago` | Backend | B7 |
| B11 | API pagos: POST (subida comprobante a S3) + PATCH verificar/rechazar | Backend | B10 |
| B12 | Signal `Pago`: `PAGO_REGISTRADO` + `PAGO_ACTUALIZADO` → `LogAuditoria` + `Notificacion` + email | Backend | B11 |
| B13 | Modelo: `DocumentoEntregado` | Backend | B7 |
| B14 | API documentos: POST (upload validado) + PATCH validar/rechazar | Backend | B13 |
| B15 | Signal `DocumentoEntregado` → `Notificacion` + email | Backend | B14 |
| B16 | Modelo `LogAuditoria` (inmutable) | Backend | A3 |

### Fase C — Frontend Core

| # | Tarea | Capa | Dependencias |
|---|---|---|---|
| C1 | Landing pública `/viajes/{slug}/` + secciones obligatorias | Frontend | B2 |
| C2 | Búsqueda de viaje (por código + typeahead colegio) | Frontend | B2, *Duda D-15* |
| C3 | Wizard inscripción 3 pasos + validación inteligente | Frontend | B8 |
| C4 | Dashboard padre: barra progreso + 3 sub-cards + alertas deep-link | Frontend | B8, B11, B14 |
| C5 | Pantalla de pagos: plan cuotas + formulario de pago + comprobante uploader | Frontend | B11 |
| C6 | Pantalla de documentos: checklist + uploader + historial versiones | Frontend | B14 |
| C7 | Centro de notificaciones + marcar leída | Frontend | Notificaciones |
| C8 | Portal alumno (solo lectura: itinerario, estado docs, comunicados) | Frontend | B2, B14 |

### Fase D — Backoffice Agente

| # | Tarea | Capa | Dependencias |
|---|---|---|---|
| D1 | Panel de viajes + CRUD + activar viaje | Frontend | B2 |
| D2 | Panel de inscritos con filtros + exportar | Frontend | B8 |
| D3 | Panel de verificación de pagos (ver comprobante + aprobar/rechazar) | Frontend | B11 |
| D4 | Panel de validación de documentos (preview + aprobar/rechazar) | Frontend | B14 |
| D5 | Constructor de itinerario con drag & drop | Frontend | B4 |
| D6 | Gestión de grupos + asignación de alumnos | Frontend | B5 |
| D7 | Panel de hoteles | Frontend | B5 |
| D8 | Configuración de documentos requeridos | Frontend | B6 |
| D9 | Métricas del viaje (% inscritos, pagado, documentado) | Frontend | B2 API métricas |
| D10 | Gestión de plan de pagos | Frontend | B3 |

### Fase E — Automatización (Celery)

| # | Tarea | Capa |
|---|---|---|
| E1 | Modelo `Notificacion` + API GET/PATCH/marcar-todas | Backend |
| E2 | Task `verificar_cuotas_por_vencer` (30d/15d/7d/3d/0d) + anti-spam Redis | Backend |
| E3 | Task `marcar_cuotas_vencidas` (diaria) | Backend |
| E4 | Task `archivar_viajes_finalizados` (diaria) | Backend |
| E5 | Task `alerta_docs_umbral` (diaria, configurable) | Backend |
| E6 | Task `enviar_comunicado_masivo` (on-demand) | Backend |
| E7 | Modelo `Comunicado` + API POST + encolar tarea | Backend |
| E8 | Celery Beat schedule (cron) | Infra |

### Fase F — Características Avanzadas

| # | Tarea | Capa |
|---|---|---|
| F1 | Modelo `Mecenas` + `MecenasInscripcion` + API | Backend |
| F2 | Portal mecenas (alumnos patrocinados, pagos en nombre) | Frontend |
| F3 | Chat in-app: modelo `Conversacion` + `Mensaje` + API (*ver Duda D-01*) | Backend |
| F4 | Chat frontend (Pantalla 8: historial, adjuntos, quick replies) | Frontend |
| F5 | Exportaciones CSV/XLSX (inscritos, pagos, documentación) | Backend |
| F6 | Exportación PDF (informe estado viaje, ficha inscripción) | Backend |
| F7 | UI de exportaciones en backoffice | Frontend |
| F8 | WhatsApp mensaje pre-cargado enriquecido (Nivel 1: link `wa.me`) | Frontend |
| F9 | Preferencias de notificación (modelo + UI) | Backend + Frontend |
| F10 | Notas internas del agente por inscripción | Backend + Frontend |
| F11 | Resumen de inscripción en PDF (padre descarga) | Backend |

---

## 4. Dependencias entre Módulos

```
Agencia
  └── A3 ← todos los modelos tienen FK agencia

Auth (A4)
  └── B1, B7, B10, B13 (todo modelo tiene FK usuario)

Viaje (B1/B2)
  └── B3 (PlanPago)
  └── B4 (Itinerario)
  └── B5 (Hotel, Grupo)
  └── B6 (DocumentoRequerido)
  └── B7 → B8 (Inscripcion)

Inscripcion (B8)
  └── B10 → B11 (Pago)
  └── B13 → B14 (DocumentoEntregado)
  └── F1 (MecenasInscripcion)
  └── F3 (Chat por inscripcion/viaje)

Signals (B12, B15)
  └── E1 (Notificacion model)
  └── B16 (LogAuditoria)

Celery (E2–E6)
  └── E1 (Notificacion)
  └── Redis broker (A1)
  └── E8 (Beat schedule)
```

---

## 5. Riesgos Técnicos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Gateway Node.js sin framework** — Routing, multipart, proxy desde cero son propensos a bugs | Alta | Alta | Implementar unit tests para el gateway; considerar casos edge (chunked encoding, large files) |
| R2 | **Drag & drop itinerario** — @dnd-kit o similar requiere gestión de estado compleja en Server Components vs Client Components | Media | Media | Usar `@dnd-kit/core` solo como Client Component; estado local + `PATCH /actividades/reordenar/` al drop |
| R3 | **Celery idempotencia** — Recordatorios duplicados si el worker reinicia | Media | Alta | Patrón de cache key en Redis documentado en ARCHITECTURE.md — aplicar en TODAS las tasks |
| R4 | **File upload pipeline** — Gateway multipart → Django validate → S3 upload → signal | Alta | Alta | Testear con archivos grandes (9.9 MB), formatos inválidos, conexión lenta |
| R5 | **Notificaciones en tiempo real** — Arquitectura no define WebSockets; polling puede saturar | Alta | Media | Implementar polling cada 30s desde el frontend como primera iteración; WebSockets en Fase 2 |
| R6 | **Chat sin modelo definido** — `Mensaje` ausente de DATABASE.md | Alta | Alta | Definir el modelo antes de implementar (*ver Duda D-01*) |
| R7 | **TailwindCSS 4** — `@theme {}` es la sintaxis nueva; plugins legacy pueden no funcionar | Media | Baja | No usar plugins externos; definir todos los tokens en `globals.css` |
| R8 | **PDF generation** — ReportLab/WeasyPrint pueden ser complejos para layouts ricos | Media | Media | Usar `weasyprint` o `xhtml2pdf`; evaluar si templates HTML + CSS es suficiente |
| R9 | **Búsqueda typeahead de colegios** — No hay modelo `Colegio` en BD | Alta | Media | Definir fuente de datos (*ver Duda D-15*) |
| R10 | **React 19 + Server Components** — Ecosistema más joven; librerías pueden no ser compatibles | Media | Media | Validar compatibilidad de cada librería antes de instalar |

---

## 6. Dudas e Inconsistencias Detectadas

> Estas dudas **deben resolverse antes de iniciar el desarrollo** del módulo correspondiente.

### D-01 — Modelo `Mensaje` / Chat ausente del DATABASE.md [CRÍTICO]

**Problema:** La historia US-COM-02, la Pantalla 8 de UI_UX.md y el RF-PT-12 describen un chat in-app padre ↔ agente completo (historial, adjuntos, estados enviado/leído, quick replies). Sin embargo, **no existe ningún modelo `Mensaje` ni `Conversacion` en DATABASE.md**.

**Preguntas:**
- ¿Es el chat una funcionalidad de Fase 1 o se pospone a Fase 2?
- Si es Fase 1: ¿cuál es el esquema de la tabla `Mensaje`? (conversacion_id, remitente, contenido, adjunto, estado, timestamp, leido_en)
- ¿El chat es por viaje o por inscripción?

---

### D-02 — Slug y código de viaje no existen en el modelo `Viaje` [CRÍTICO]

**Problema:** La landing pública usa `/viajes/{slug}/` y US-INS-03 menciona "código de viaje", pero el modelo `Viaje` en DATABASE.md **no tiene campo `slug` ni `codigo`**.

**Preguntas:**
- ¿Se genera el slug automáticamente (del nombre)? ¿Es único globalmente o por agencia?
- ¿El "código de viaje" es el mismo slug o un campo numérico/alfanumérico separado?

---

### D-03 — Modelo de colegio para typeahead [ALTA]

**Problema:** El Paso 2 del wizard y la búsqueda de viaje requieren provincia → colegio (typeahead dinámico). No existe modelo `Colegio` en DATABASE.md.

**Preguntas:**
- ¿Los colegios son un catálogo estático (JSON/CSV importado)?
- ¿O son entidades del dominio que el agente gestiona?
- ¿Dónde se almacena la asociación Viaje ↔ Colegio (un viaje es para alumnos de X colegio de Y nivel)?

---

### D-04 — Datos de colegio del alumno no están en `Alumno` [ALTA]

**Problema:** El Paso 2 del wizard captura departamento, colegio, nivel educativo y grado. El contrato UX de AI_CONTEXT.md muestra `alumno.nombre_colegio`. Sin embargo, el modelo `Alumno` **no tiene campos de colegio, nivel ni grado**.

**Preguntas:**
- ¿Se añaden campos `colegio`, `nivel`, `grado` al modelo `Alumno`?
- ¿O se almacenan en la `Inscripcion` (ya que un alumno puede cambiar de nivel en viajes futuros)?

---

### D-05 — Campo `genero` ausente del modelo `Alumno` [ALTA]

**Problema:** El Paso 1 del wizard captura "Género: Chico / Chica" pero el modelo `Alumno` no tiene campo `genero`.

**Resolución sugerida:** Agregar `genero = CharField(10, choices=[('chico','Chico'),('chica','Chica')])`.

---

### D-06 — Alergias: 14 checkboxes EU vs TextField [MEDIA]

**Problema:** El Paso 3 del wizard muestra 14 checkboxes de alérgenos EU, pero el modelo `Alumno` solo tiene `necesidades_especiales = TextField`.

**Preguntas:**
- ¿Se almacenan las alergias como texto libre o como un `ArrayField` / `JSONField` con los 14 alérgenos EU?
- Recomendación: `alergias = ArrayField(CharField)` o `JSONField` para habilitar filtros futuros.

---

### D-07 — Asignación de hotel a inscripción [MEDIA]

**Problema:** El dashboard del padre muestra "🏨 Alojamiento — Asignado" como tercera sub-card y el contrato UX devuelve `hotel_asignado.nombre`. Sin embargo, no hay FK `hotel` ni en `Inscripcion` ni en `Alumno`.

**Preguntas:**
- ¿La asignación de hotel es a nivel de `Grupo` (todos los del Grupo A van al Hotel X)?
- ¿O es a nivel de `Inscripcion` individual?
- ¿Se necesita un modelo intermedio `Alojamiento`?

---

### D-08 — Preferencias de notificación sin modelo en BD [MEDIA]

**Problema:** RF-PT-18 y la UI de "Preferencias de Notificación" describen un sistema de canal preferido, horario y frecuencia. No hay modelo `PreferenciasNotificacion` en DATABASE.md.

**Resolución sugerida:** Modelo `PreferenciasNotificacion(usuario FK, canal_preferido, horario_inicio, horario_fin, max_por_dia)`.

---

### D-09 — Token de verificación de email no está en el modelo `Usuario` [MEDIA]

**Problema:** El flow de registro genera un token de verificación pero `Usuario` no tiene campo `email_verification_token` ni `token_expiry`.

**Resolución sugerida:** Usar `django.contrib.auth.tokens.PasswordResetTokenGenerator` (no requiere campo en BD) o agregar `verification_token = UUIDField` + `token_expiry = DateTimeField`.

---

### D-10 — Password recovery: endpoint ausente de API.md [MEDIA]

**Problema:** US-AUTH-03 existe pero API.md no documenta ningún endpoint de recuperación de contraseña (`POST /auth/password-reset/`, `POST /auth/password-reset/confirm/`).

**Pregunta:** ¿Es Fase 1 o Fase 2?

---

### D-11 — Flag de acceso habilitado para alumno [MEDIA]

**Problema:** RF-AL-01 dice "acceder si el agente habilita el acceso". No hay campo `acceso_habilitado` ni en `Alumno` ni en `Inscripcion`.

**Resolución sugerida:** Agregar `acceso_alumno_habilitado = BooleanField(default=False)` en `Inscripcion`.

---

### D-12 — WhatsApp Nivel 1: ¿link `wa.me` o llamada a API? [MEDIA]

**Problema:** Los recordatorios en la cadencia (15d/7d/3d/0d) mencionan "Canal WhatsApp". ARCHITECTURE.md dice "WhatsApp (futuro)" en servicios externos, pero REQUIREMENTS.md lo incluye en la cadencia de Fase 1.

**Clarificación necesaria:**
- Nivel 1 (Fase 1): El sistema genera un link `https://wa.me/{telefono}?text=...` que el agente abre manualmente. **Sin API.**
- Nivel 2 (Fase 2): WhatsApp Business API (bot automatizado).

---

### D-13 — SMS: sin proveedor definido [BAJA]

**Problema:** La matriz de canales incluye SMS para eventos críticos. No hay proveedor en ARCHITECTURE.md ni en las variables de entorno del backend.

**Pregunta:** ¿SMS está en Fase 1 o es Fase 2 como WhatsApp API?

---

### D-14 — Feature "Snooze" de recordatorios [BAJA]

**Problema:** REQUIREMENTS.md menciona "Opción snooze: recordarme en 2 días" pero no hay UI ni modelo para esto.

**Pregunta:** ¿Es Fase 1 o Fase 2?

---

### D-15 — Contradicción: Push notifications en Fase 1 [BAJA]

**Problema:** La matriz de notificaciones en REQUIREMENTS.md incluye "Push" como canal para múltiples eventos. AI_CONTEXT.md lo excluye explícitamente de Fase 1 ("Push notifications móviles nativas — ❌ No implementar").

**Aclaración:** Push en Fase 1 = notificaciones in-app (badge + lista en `/app/notificaciones/`). **No** Web Push ni push nativo.

---

## 7. Lista Completa de Tareas (Checklist)

### Infraestructura
- [ ] Monorepo con `frontend/`, `gateway/`, `backend/`
- [ ] `docker-compose.yml`: PostgreSQL, Redis, Django, Celery Worker, Celery Beat, Next.js, Gateway
- [ ] Variables de entorno documentadas (`.env.example` por capa)
- [ ] Configuraciones Django: `base.py`, `local.py`, `production.py`

### Backend — Auth y Agencia
- [ ] Modelo `Agencia` + seed Totem Travel
- [ ] `Usuario` (AbstractBaseUser, email como USERNAME_FIELD)
- [ ] `PadreTutor` (OneToOne Usuario)
- [ ] `POST /auth/registro/` — crear usuario + enviar email verificación
- [ ] `GET /auth/verificar/?token=` — activar cuenta
- [ ] `POST /auth/login/` — JWT access (15min) + refresh (7d) + allowlist Redis
- [ ] `POST /auth/refresh/` — renovar access token
- [ ] `POST /auth/logout/` — invalidar refresh en Redis
- [ ] `GET/PATCH /agencias/perfil/`
- [ ] Password recovery endpoints (pendiente confirmación Duda D-10)

### Backend — Viajes
- [ ] Modelos: `Viaje`, `PlanPago`, `Cuota`, `Itinerario`, `EtapaItinerario`, `Actividad`, `Grupo`, `Hotel`, `DocumentoRequerido`
- [ ] Signal: `Viaje.CREATE` → crea `Itinerario` vacío (invariante #11)
- [ ] `GET/POST /viajes/` + `GET/PATCH/DELETE /viajes/{id}/`
- [ ] Constraint BD: `fecha_regreso > fecha_salida`
- [ ] `GET /viajes/{id}/metricas/`
- [ ] `GET/POST/PATCH /viajes/{id}/plan-pago/`
- [ ] `GET/POST /itinerarios/{id}/etapas/`
- [ ] `PATCH/DELETE /etapas/{id}/`
- [ ] `POST /etapas/{id}/actividades/` + `PATCH/DELETE /actividades/{id}/`
- [ ] `PATCH /actividades/reordenar/` (bulk — nunca individual)
- [ ] `GET/POST /viajes/{id}/grupos/` + `PATCH /grupos/{id}/`
- [ ] `POST /grupos/{id}/alumnos/`
- [ ] `GET/POST/PATCH/DELETE /viajes/{id}/hoteles/`
- [ ] `GET/POST/PATCH/DELETE /viajes/{id}/documentos-requeridos/`
- [ ] Slug de viaje (resolver Duda D-02)

### Backend — Inscripciones
- [ ] Modelos: `Alumno` (+ campos pendientes de Dudas D-04, D-05, D-06, D-11)
- [ ] `POST /inscripciones/` — verificar cupo, unicidad (alumno, viaje), crear inscripción
- [ ] `GET /inscripciones/` (agente con filtros) + `GET /inscripciones/{id}/` (agente + padre propietario)
- [ ] `PATCH /inscripciones/{id}/` — cambiar estado o notas_internas (solo agente)
- [ ] `notas_internas` NUNCA en serializer del padre/alumno (invariante #9)
- [ ] Signal `Inscripcion.CREATE` → email bienvenida al tutor

### Backend — Pagos
- [ ] Modelo `Pago` con `importe > 0` (constraint BD)
- [ ] `POST /pagos/` — subida comprobante a S3, validación tamaño y formato
- [ ] `PATCH /pagos/{id}/` — solo agente: verificar o rechazar
- [ ] `GET /pagos/?estado=pendiente&viaje_id=` — panel agente
- [ ] Signal `Pago.CREATE` → `LogAuditoria(PAGO_REGISTRADO)` + email al agente
- [ ] Signal `Pago.estado=verificado` → `LogAuditoria(PAGO_ACTUALIZADO)` + `Notificacion` + email tutor
- [ ] Signal `Pago.estado=rechazado` → `LogAuditoria` + `Notificacion` con motivo + email tutor
- [ ] `saldo_pendiente` como propiedad Python (NUNCA columna — invariante #3)

### Backend — Documentos
- [ ] Modelo `DocumentoEntregado` + validación MIME type + extensión
- [ ] `POST /documentos/` — upload S3, validar 10 MB y formatos (gateway + backend doble validación — invariante #7)
- [ ] `PATCH /documentos/{id}/` — solo agente: validar o rechazar con motivo
- [ ] Signal `DocumentoEntregado.estado=validado` → `Notificacion(doc_validado)` al tutor
- [ ] Signal `DocumentoEntregado.estado=rechazado` → `Notificacion(doc_rechazado)` con motivo

### Backend — Comunicados y Notificaciones
- [ ] Modelo `Comunicado` + `POST /viajes/{id}/comunicados/` + encolar Celery
- [ ] Modelo `Notificacion` + `GET /notificaciones/` + `PATCH /{id}/` + `POST /marcar-todas/`
- [ ] Modelo `LogAuditoria` (inmutable — nunca UPDATE/DELETE — invariante #6)

### Backend — Celery Tasks
- [ ] `enviar_comunicado_masivo(comunicado_id)` — on-demand, idempotente
- [ ] `verificar_cuotas_por_vencer()` — diaria, triggers 30/15/7/3/0 días, anti-spam Redis
- [ ] `marcar_cuotas_vencidas()` — diaria
- [ ] `archivar_viajes_finalizados()` — diaria, configurable `DOCS_ARCHIVE_DAYS_AFTER_RETURN`
- [ ] `alerta_docs_umbral()` — diaria, configurable `DOC_INCOMPLETE_ALERT_THRESHOLD`
- [ ] Celery Beat schedule configurado

### Backend — Mecenas
- [ ] Modelos `Mecenas`, `MecenasInscripcion` (con `monto_comprometido > 0`)
- [ ] `GET /mecenas/{id}/alumnos/`
- [ ] `POST /viajes/{id}/inscripciones/{id}/mecenas/` (solo agente)

### Backend — Exportaciones
- [ ] `GET /viajes/{id}/exportar/inscritos/?formato=csv|xlsx`
- [ ] `GET /viajes/{id}/exportar/pagos/?formato=csv|xlsx`
- [ ] `GET /viajes/{id}/exportar/documentacion/?formato=csv|xlsx`
- [ ] `GET /viajes/{id}/exportar/informe-pdf/`
- [ ] `GET /inscripciones/{id}/resumen-pdf/`

### Backend — Chat (resolver Duda D-01 primero)
- [ ] Modelo `Conversacion` + `Mensaje` (schema por definir)
- [ ] API chat: GET historial + POST enviar mensaje + PATCH marcar leído
- [ ] Upload de adjuntos en mensajes

### Gateway — Node.js puro
- [ ] `server.js` — `createServer(node:http)`, puerto, health check `GET /health`
- [ ] `router.js` — map `{method, pathPattern}` → handler
- [ ] `middleware/cors.js` — headers manuales con `CORS_ORIGINS`
- [ ] `middleware/auth.js` — cookie JWT → `Authorization: Bearer`
- [ ] `middleware/security.js` — HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- [ ] `middleware/rateLimit.js` — contadores Redis por IP/endpoint, ventana configurable
- [ ] `proxy/django.js` — `http.request` al backend + pipe de response
- [ ] `proxy/multipart.js` — parse multipart/form-data antes de reenviar
- [ ] Validación tamaño de archivo ≤ 10 MB (primera línea de defensa)
- [ ] Manejo de errores (timeouts, backend down → 502)

### Frontend — Auth
- [ ] `middleware.ts` — leer cookie JWT, verificar rol, redirigir según portal
- [ ] Página de login (Server Component + form Client)
- [ ] Página de registro (wizard o single form)
- [ ] Página de verificación email (link de activación)
- [ ] Página de password recovery (si es Fase 1)
- [ ] Redirect post-login según rol (`padre` → `/app/`, `agente` → `/backoffice/`, etc.)

### Frontend — Portal Público
- [ ] Landing `/viajes/[slug]/` — Hero, datos, itinerario resumido, CTA
- [ ] Datos dinámicos desde API (nombre, fechas, cupo, imagen, itinerario)

### Frontend — Portal Padre
- [ ] Layout `(padre)` con verificación JWT/rol
- [ ] Búsqueda de viaje (por código + typeahead colegio — Duda D-03)
- [ ] Wizard de inscripción 3 pasos + barra de progreso + validación inteligente
- [ ] Dashboard: badge estado, barra progreso, 3 sub-cards, alertas deep-link
- [ ] Pantalla de pagos: plan cuotas con estados, formulario + file uploader
- [ ] Pantalla de documentos: checklist, uploader, historial versiones, motivo rechazo
- [ ] Centro de notificaciones (tipos, íconos, deep-links)
- [ ] Configuración preferencias notificación (Duda D-08)
- [ ] Chat in-app (resolver D-01 primero)
- [ ] Descarga resumen inscripción PDF

### Frontend — Portal Mecenas
- [ ] Lista alumnos patrocinados + estado pago
- [ ] Formulario pago en nombre de alumno + comprobante
- [ ] Descarga resumen contribución PDF

### Frontend — Portal Alumno
- [ ] Layout `(alumno)` con verificación acceso habilitado (Duda D-11)
- [ ] Itinerario (solo lectura)
- [ ] Estado documentación (solo lectura)
- [ ] Comunicados (solo lectura)

### Frontend — Backoffice Agente
- [ ] Panel de viajes (lista, CRUD, activar/cerrar)
- [ ] Panel de inscritos (tabla con filtros, exportar)
- [ ] Panel de pagos pendientes (ver comprobante, aprobar/rechazar)
- [ ] Panel de documentos pendientes (preview, validar/rechazar)
- [ ] Constructor de itinerario (drag & drop, añadir día/actividad)
- [ ] Gestión de grupos + asignar alumnos
- [ ] Gestión de hoteles
- [ ] Configuración de documentos requeridos
- [ ] Métricas del viaje (header con KPIs)
- [ ] Configuración del plan de pagos
- [ ] Panel de comunicados (redactar + enviar masivo)
- [ ] Notas internas por inscripción
- [ ] Asignación de mecenas a inscripciones
- [ ] Exportaciones (CSV/XLSX/PDF)

### Componentes Transversales (Frontend)
- [ ] `<Badge>` de estado (color + ícono + texto — nunca solo texto)
- [ ] `<ProgressBar>` (% numérico, colores semánticos)
- [ ] `<FileUploader>` (drag & drop, preview, progress bar, error 10 MB/formato)
- [ ] `<AlertCard>` (con deep-link obligatorio)
- [ ] `<CardViaje>` (imagen + badge + 3 sub-cards)
- [ ] Wrappers `LazyMotion` para Framer Motion
- [ ] Design tokens en `globals.css` con `@theme {}` (no `tailwind.config.js`)

---

## 8. Estimación de Complejidad por Módulo

| Módulo | Complejidad | Razón |
|---|---|---|
| Auth (JWT + verificación email) | ★★★☆☆ | AbstractBaseUser + Redis allowlist + email token |
| Viajes (CRUD + estados) | ★★☆☆☆ | CRUD estándar con state machine simple |
| Plan de pagos + cuotas | ★★☆☆☆ | Modelo simple, lógica de negocio acotada |
| Itinerario + drag & drop | ★★★★☆ | PATCH bulk + UI drag & drop en Server/Client components |
| Inscripción (wizard) | ★★★☆☆ | Verificación cupo + unicidad + 3 pasos UI |
| Pagos (upload + verificación) | ★★★★☆ | Pipeline Gateway → Django → S3 + signals + doble validación |
| Documentos (upload + validación) | ★★★★☆ | Igual que pagos + historial versiones + validación MIME |
| Celery tasks (recordatorios) | ★★★★☆ | Idempotencia + anti-spam Redis + cadencia multi-trigger |
| Notificaciones (in-app) | ★★★☆☆ | Modelo + polling frontend (no WebSockets en Fase 1) |
| Comunicados masivos | ★★★☆☆ | Celery async + todas las familias del viaje |
| Chat in-app | ★★★★☆ | Modelo por definir + polling/SSE + adjuntos |
| Mecenas | ★★☆☆☆ | Relación M:N + portal solo lectura + pagos delegados |
| Exportaciones CSV/XLSX | ★★★☆☆ | openpyxl/csv + queries complejas |
| Exportaciones PDF | ★★★★☆ | Layout rico con WeasyPrint/ReportLab |
| Gateway Node.js puro | ★★★★★ | Sin framework: routing manual, multipart, proxy, rate limiting desde cero |
| Landing pública | ★★☆☆☆ | Server Component estático con datos dinámicos |
| Dashboard padre | ★★★★☆ | Lógica de estado compuesta (pagos + docs + alojamiento + alertas) |
| Backoffice agente | ★★★☆☆ | Muchas pantallas pero patrones repetidos (tabla + filtros + acción) |

---

## 9. Resumen de Dudas Críticas (requieren respuesta antes de empezar)

| Duda | Impacto | Bloquea |
|---|---|---|
| D-01: Modelo `Mensaje`/Chat | CRÍTICO | Módulo chat completo |
| D-02: Slug y código de viaje | CRÍTICO | Landing pública, búsqueda, API viajes |
| D-03: Modelo/catálogo de colegios | ALTO | Wizard Paso 2, búsqueda por colegio |
| D-04: Datos colegio en Alumno | ALTO | Wizard Paso 2, validación inteligente, serializer |
| D-05: Campo género en Alumno | ALTO | Wizard Paso 1, modelo BD |
| D-06: Alergias como checkbox vs TextField | MEDIO | Wizard Paso 3, modelo BD |
| D-07: Asignación hotel a inscripción | MEDIO | Dashboard (sub-card alojamiento), contrato API |
| D-08: Modelo PreferenciasNotificacion | MEDIO | Módulo notificaciones, anti-spam |
| D-10: Password recovery en Fase 1 | MEDIO | Flujo auth completo |
| D-11: Flag acceso alumno | MEDIO | Portal alumno, permiso JWT |
| D-12: WhatsApp Nivel 1 = link wa.me | MEDIO | Cadencia Celery, implementación canal |

---

> **Próximo paso:** Esperar aprobación y respuestas a las dudas críticas (especialmente D-01 a D-08) antes de iniciar el desarrollo.

---

## 10. Definition of Done (DoD)

Una tarea **solo se considera terminada** cuando cumple todos los criterios siguientes sin excepción:

### Criterios de compilación y calidad
- [ ] El proyecto compila correctamente sin errores (frontend y backend).
- [ ] No existen errores de TypeScript en el frontend.
- [ ] No existen errores de lint (ESLint en frontend, flake8/ruff en backend).
- [ ] No existen errores en Django (`python manage.py check` sin warnings críticos).
- [ ] Las migraciones de Django se generan y aplican correctamente (`makemigrations` + `migrate`).

### Criterios funcionales
- [ ] La funcionalidad implementada cumple exactamente los requisitos documentados en `REQUIREMENTS.md` y `USER_STORIES.md`.
- [ ] Se respetan todas las reglas de negocio de `BUSINESS_RULES.md` afectadas por la tarea.
- [ ] La API responde con los códigos HTTP y payloads definidos en `API.md`.
- [ ] No se rompe ninguna funcionalidad existente (regresión cero).

### Criterios de seguridad
- [ ] Se verificó el checklist de seguridad de `AI_CONTEXT.md` para cada endpoint nuevo.
- [ ] Ningún endpoint expone datos que no correspondan al rol del usuario autenticado.
- [ ] Los archivos subidos son validados en Gateway **y** en Backend (doble validación — invariante #7).

### Criterios de código
- [ ] Se realizó una auto-revisión completa usando `CODE_REVIEW_CHECKLIST.md` antes de marcar la tarea como terminada.
- [ ] No existe código duplicado evitable.
- [ ] Los nombres de variables, funciones y clases son claros y consistentes con el resto del proyecto.

### Criterios de documentación y pruebas
- [ ] Se actualiza `TASKS.md` marcando la tarea como `Done`.
- [ ] Se actualizan los documentos afectados si la implementación difiere del plan.
- [ ] Se agregan pruebas unitarias o de integración cuando la lógica de negocio lo justifica.

---

## 11. Análisis de CLAUDE_RULES.md — Cumplimiento Post-Code-Review

> Se analizó `CLAUDE_RULES.md` a la luz de los hallazgos del code review del 2026-07-09.

### Reglas cumplidas correctamente

| Regla | Hallazgo |
|-------|----------|
| **R-05** (no cambiar arquitectura) | ✅ Stack respetado: Node.js puro sin Express, Django DRF, TailwindCSS 4 con `@theme {}` |
| **R-13** (seguridad) | ✅ JWT en cookies httpOnly, LogAuditoria inmutable, doble validación archivos |
| **R-14** (notas_internas) | ✅ No expuestas en serializers de padre/alumno |
| **R-07** (una tarea por sesión) | ✅ Respetado — commits atómicos por tarea |

### Reglas con incumplimiento parcial

| Regla | Incumplimiento |
|-------|----------------|
| **R-11** (auto-revisión obligatoria) | ⚠️ El code review encontró bugs que debieron ser detectados en auto-revisión: TD-009 (field name mismatch), TD-010 (fetchApi validation incorrecta), TD-011 (console.log en producción). La checklist no incluía checks específicos para `get_or_create` field names ni validación de `fetchApi`. |
| **R-12** (verificar DoD) | ⚠️ El DoD no incluye verificación de nombres de campos modelo vs serializer. |

### Mejoras necesarias en CLAUDE_RULES.md

1. **§3 R-11 — Ampliar auto-revisión:** Añadir verificación explícita de que los nombres de campos en `get_or_create(defaults=...)` y `Serializer.Meta.fields` coinciden con el modelo.
2. **§3 R-13 — Seguridad:** Añadir check: "¿La validación de respuesta de fetchApi usa `if (!res.ok)` en lugar de `if (!res)`?"
3. **§6 Errores Críticos — Backend:** Añadir error #11: "Usar `nombre` en lugar de `nombres` en get_or_create — el modelo Alumno expone `nombres`, no `nombre`."
4. **§6 Errores Críticos — Frontend:** Añadir error #18: "Validar respuesta de fetchApi con `if (!res)` — usar `if (!res.ok)` y capturar ApiError."
5. **§6 Errores Críticos — Frontend:** Añadir error #19: "Dejar console.log en producción."

### Acciones requeridas

- [ ] Actualizar `CLAUDE_RULES.md` con los nuevos errores críticos y checks de auto-revisión.
- [ ] Actualizar `CODE_REVIEW_CHECKLIST.md` con los nuevos checks (ya se hizo en v2026-07-09).

---

## 12. Estrategia de Desarrollo

Estas reglas son **obligatorias** para todo el proceso de desarrollo del proyecto.

### Reglas de ejecución

| # | Regla | Detalle |
|---|---|---|
| ED-01 | **Una tarea a la vez** | Solo se trabaja en una tarea de `TASKS.md` por sesión. No se inicia la siguiente sin aprobación explícita. |
| ED-02 | **Sin avance automático** | Al terminar, el agente se detiene, presenta el resumen y espera aprobación antes de continuar. |
| ED-03 | **Anunciar archivos antes de modificar** | Se listan explícitamente todos los archivos a crear/modificar y el motivo antes de escribir código. |
| ED-04 | **Justificar decisiones técnicas** | Cualquier elección no trivial (patrón, librería, estructura) se explica antes de implementarla. |
| ED-05 | **Respetar la arquitectura definida** | No se cambia el stack, la estructura de carpetas ni los patrones sin aprobación previa. |
| ED-06 | **Documentación primero** | Antes de escribir código se leen los documentos relevantes (`AI_CONTEXT.md`, `DATABASE.md`, `API.md`, `BUSINESS_RULES.md`). |
| ED-07 | **No asumir requisitos** | Si existe ambigüedad o información faltante, se pregunta antes de asumir. |

### Revisión obligatoria antes de cerrar cada tarea

Antes de marcar cualquier tarea como `Done`, el agente ejecuta la revisión de `CODE_REVIEW_CHECKLIST.md` buscando:

- **Bugs**: lógica incorrecta, casos borde no manejados, condiciones de carrera.
- **Código duplicado**: extraer solo si la abstracción es claramente necesaria.
- **Rendimiento**: N+1 queries, operaciones bloqueantes, ausencia de `select_related`/`prefetch_related`.
- **Seguridad**: ausencia de autenticación, exposición de datos sensibles, falta de validación de entrada.

### Flujo de una sesión de desarrollo

```
1. Leer TASKS.md → identificar la tarea actual (estado: Pending)
2. Marcar tarea como In Progress en TASKS.md
3. Leer documentación relevante (AI_CONTEXT.md + docs específicos)
4. Anunciar: "Voy a modificar [lista de archivos] porque [razón]"
5. Implementar únicamente lo que la tarea requiere
6. Auto-revisión con CODE_REVIEW_CHECKLIST.md
7. Verificar cada punto del DoD
8. Marcar tarea como Done en TASKS.md
9. Presentar resumen al usuario
10. DETENER y esperar aprobación explícita
```
