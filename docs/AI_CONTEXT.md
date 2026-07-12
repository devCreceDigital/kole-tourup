# AI_CONTEXT.md — Contexto para Agentes IA

> Lee este archivo completo antes de escribir cualquier línea de código. Contiene las decisiones ya tomadas, los invariantes del dominio, los errores críticos a evitar y los contratos entre capas.

---

## Identidad del Proyecto

| Campo | Valor |
|-------|-------|
| Nombre | Minka Group / Tottem Hub |
| Cliente | Totem Travel — agencia de viajes escolares, Perú |
| Propósito | Digitalizar el ciclo de vida completo de viajes grupales escolares |
| Fase actual | Fase 1 — MVP mono-agencia |
| KPI #1 | −70% tiempo validación de pagos y documentos |
| KPI #2 | −40% morosidad en cuotas (recordatorios automáticos) |

---

## Stack — No Cambiar, No Sustituir

| Capa | Tecnología | Versión | Restricción |
|------|-----------|---------|-------------|
| Frontend | Next.js | **16.2.6** | App Router — sin Pages Router |
| Frontend | React | **19** | Server Components por defecto |
| Frontend | TailwindCSS | **4** | `@theme {}` en CSS — sin `tailwind.config.js` |
| Frontend | Framer Motion | latest | Solo UI — sin lógica de negocio |
| Gateway | Node.js puro | LTS | `node:http`/`node:https` — **sin Express, Fastify, Koa, Hapi** |
| Backend | Django + DRF | **4.2+** | ORM + Signals + Permisos por rol |
| BD | PostgreSQL | — | UUID PKs, constraints de BD, índices explícitos |
| Cache/Broker | Redis | — | Allowlist JWT + broker Celery |
| Tareas | Celery | — | Idempotentes — reintentables sin duplicados |
| Storage | S3 / GCS | configurable | `FileField` con backend intercambiable |
| Auth | JWT | — | access 15 min · refresh 7 días · cookies `httpOnly` |

---

## Mapa Mental del Dominio

```
Agencia (tenant — 1 en Fase 1: Totem Travel)
  └── Viaje  [borrador → activo → cerrado → archivado]
        ├── PlanPago (1:1)
        │     └── Cuota[]  (numero, importe, fecha_vencimiento)
        ├── Itinerario (1:1, creado auto al crear Viaje)
        │     └── EtapaItinerario[]  (dia_numero)
        │           └── Actividad[]  (hora, tipo, orden)
        ├── Hotel[]
        ├── Grupo[]
        ├── DocumentoRequerido[]
        ├── Comunicado[]
        └── Inscripcion[]  [pendiente → confirmado|cancelado|baja]
              ├── Pago[]  [pendiente → verificado|rechazado]
              ├── DocumentoEntregado[]  [pendiente → validado|rechazado]
              └── MecenasInscripcion[]  (mecenas + monto)

Usuario  (AbstractBaseUser, USERNAME_FIELD='email')
  ├── PadreTutor (OneToOne) ←M:N→ Alumno
  ├── Alumno (OneToOne nullable — puede no tener cuenta)
  └── Mecenas (OneToOne)

Notificacion  (usuario + tipo + referencia polimórfica)
LogAuditoria  (inmutable — solo INSERT, nunca UPDATE/DELETE)
```

---

## Invariantes — Nunca Violar

| # | Invariante |
|---|-----------|
| 1 | `(alumno_id, viaje_id)` es **UNIQUE** en `Inscripcion` |
| 2 | `fecha_regreso > fecha_salida` — constraint de BD, no solo validación |
| 3 | `saldo_pendiente = precio_final − Σ(pagos verificados)` — propiedad Python, **nunca columna** |
| 4 | Solo pagos con `estado='verificado'` cuentan para el saldo |
| 5 | Un viaje nuevo siempre nace en `estado='borrador'` |
| 6 | `LogAuditoria` es inmutable — **nunca UPDATE ni DELETE** |
| 7 | Archivos máx. 10 MB — validado en gateway **y** en backend |
| 8 | Login bloqueado si `email_verificado=False` |
| 9 | `notas_internas` de `Inscripcion` **nunca** en serializers del padre/alumno |
| 10 | `importe` de Pago y Cuota debe ser **> 0** — constraint de BD |
| 11 | Al crear un Viaje → se crea automáticamente un Itinerario vacío |
| 12 | JWT en cookies `httpOnly` en el frontend — **nunca en localStorage** |
| 13 | Toda consulta del agente **debe filtrar por `agencia_id`** |
| 14 | Las tareas Celery deben ser **idempotentes** — con cache key anti-duplicado |

---

## Signals Django — Efectos Secundarios Obligatorios

| Modelo | Trigger | Efectos automáticos |
|--------|---------|---------------------|
| `Pago` | CREATE | `LogAuditoria(PAGO_REGISTRADO)` + email al agente |
| `Pago` | estado → `verificado` | `LogAuditoria(PAGO_ACTUALIZADO)` + `Notificacion` al tutor + email |
| `Pago` | estado → `rechazado` | `LogAuditoria(PAGO_ACTUALIZADO)` + `Notificacion` al tutor con motivo |
| `DocumentoEntregado` | estado → `validado` | `Notificacion(doc_validado)` al tutor |
| `DocumentoEntregado` | estado → `rechazado` | `Notificacion(doc_rechazado)` con `motivo_rechazo` |
| `Inscripcion` | CREATE | Email de bienvenida al tutor |

---

## Tareas Celery — Cron Jobs

| Tarea | Frecuencia | Qué hace |
|-------|-----------|----------|
| `verificar_cuotas_por_vencer` | Diario | Evalúa triggers 30d/15d/7d/3d/0d, respeta anti-spam |
| `marcar_cuotas_vencidas` | Diario | `fecha_vencimiento < hoy` sin pago verificado → notificación |
| `enviar_comunicado_masivo` | On-demand | Encolada al crear `Comunicado`, envía a todos los tutores del viaje |
| `archivar_viajes_finalizados` | Diario | `fecha_regreso + X días` → `estado=archivado` |
| `alerta_docs_umbral` | Diario | % docs < umbral configurable → alerta al agente |

---

## Patrones de URL de la API

```
/api/v1/auth/registro/              POST  — crear usuario
/api/v1/auth/verificar/?token=...   GET   — activar cuenta
/api/v1/auth/login/                 POST  — obtener JWT
/api/v1/auth/refresh/               POST  — renovar access token
/api/v1/auth/logout/                POST  — invalidar refresh token

/api/v1/viajes/                     GET/POST
/api/v1/viajes/{id}/                GET/PATCH/DELETE
/api/v1/viajes/{id}/metricas/       GET   — % inscritos/pagado/documentado
/api/v1/viajes/{id}/plan-pago/      GET/POST/PATCH
/api/v1/viajes/{id}/grupos/         GET/POST
/api/v1/viajes/{id}/hoteles/        GET/POST
/api/v1/viajes/{id}/itinerario/     GET
/api/v1/viajes/{id}/documentos-requeridos/  GET/POST
/api/v1/viajes/{id}/comunicados/    GET/POST
/api/v1/viajes/{id}/exportar/{tipo}/  GET  — tipo: inscritos|pagos|docs|informe-pdf

/api/v1/itinerarios/{id}/etapas/    POST
/api/v1/etapas/{id}/               PATCH/DELETE
/api/v1/etapas/{id}/actividades/   POST
/api/v1/actividades/{id}/          PATCH/DELETE
/api/v1/actividades/reordenar/     PATCH  — bulk, nunca individual

/api/v1/inscripciones/             GET/POST
/api/v1/inscripciones/{id}/        GET/PATCH
/api/v1/inscripciones/{id}/pagos/  GET
/api/v1/inscripciones/{id}/documentos/  GET
/api/v1/inscripciones/{id}/resumen-pdf/ GET

/api/v1/pagos/                     GET/POST
/api/v1/pagos/{id}/                PATCH  — solo agente

/api/v1/documentos/                POST
/api/v1/documentos/{id}/           PATCH  — solo agente
/api/v1/documentos/?estado=pendiente&viaje_id={id}  GET  — panel agente

/api/v1/notificaciones/            GET
/api/v1/notificaciones/{id}/       PATCH  — marcar leída
/api/v1/notificaciones/marcar-todas/  POST

/api/v1/mecenas/{id}/alumnos/      GET
/api/v1/agencias/perfil/           GET/PATCH
```

---

## Contratos UX — Lo Que el Frontend Espera del Backend

### Dashboard del padre — respuesta esperada de `/api/v1/inscripciones/{id}/`

```json
{
  "id": "uuid",
  "estado": "pendiente",
  "precio_final": "840.00",
  "saldo_pendiente": "560.00",
  "porcentaje_pagado": 33.3,
  "total_pagado": "280.00",
  "viaje": {
    "id": "uuid",
    "nombre": "Machu Picchu & Cusco",
    "destino": "Cusco, Perú",
    "fecha_salida": "2026-11-15",
    "fecha_regreso": "2026-11-22",
    "imagen_url": "https://..."
  },
  "alumno": {
    "nombre": "Juan",
    "apellidos": "Abarca",
    "nombre_colegio": "Colegio San Agustín"
  },
  "pagos_resumen": {
    "total_cuotas": 3,
    "cuotas_pagadas": 1,
    "tiene_cuota_vencida": true
  },
  "documentos_resumen": {
    "total_requeridos": 4,
    "total_validados": 1,
    "tiene_rechazado": true
  },
  "hotel_asignado": {
    "nombre": "Hotel Monasterio",
    "maps_url": "https://..."
  }
}
```

### Checklist de documentos — `/api/v1/inscripciones/{id}/documentos/`

```json
[
  {
    "documento_requerido": {
      "id": "uuid",
      "nombre": "DNI del alumno",
      "obligatorio": true,
      "formatos_permitidos": "pdf,jpg,png"
    },
    "entrega_actual": {
      "id": "uuid",
      "estado": "validado",
      "nombre_archivo": "dni_juan.pdf",
      "uploaded_at": "2026-04-20T10:00:00Z",
      "fecha_validacion": "2026-04-21T09:00:00Z"
    },
    "entrega_anterior": null
  },
  {
    "documento_requerido": { "nombre": "Seguro médico", "obligatorio": true },
    "entrega_actual": {
      "estado": "rechazado",
      "motivo_rechazo": "La póliza venció el 01/03/2025."
    },
    "entrega_anterior": {
      "nombre_archivo": "seguro_v1.pdf"
    }
  }
]
```

---

## Checklist de Seguridad por Endpoint

Antes de implementar cualquier endpoint verificar:

- [ ] ¿Requiere JWT? → `IsAuthenticated` en DRF
- [ ] ¿El objeto pertenece a la agencia del usuario? → filtrar por `agencia_id` (agente)
- [ ] ¿El objeto pertenece a la inscripción del padre? → filtrar por `padre_tutor` (padre)
- [ ] ¿El alumno tiene acceso habilitado? → verificar flag del agente (alumno)
- [ ] ¿La acción requiere log? → signal o llamada explícita a `LogAuditoria`
- [ ] ¿La acción requiere notificación? → signal o tarea Celery
- [ ] ¿Es un archivo? → validar tamaño ≤ 10 MB y formato permitido

---

## Errores Críticos a Evitar

### Backend (Django)
1. Calcular `saldo_pendiente` como columna de BD — es propiedad Python
2. Exponer `notas_internas` en serializers del padre o alumno
3. Permitir login con `email_verificado=False`
4. Contar pagos `pendiente` o `rechazado` al calcular saldo
5. Olvidar filtrar por `agencia_id` en endpoints del agente
6. Validar tamaño de archivo solo en Django — debe validarse también en el gateway
7. No crear itinerario vacío al crear un viaje
8. Reutilizar refresh_token invalidado (no está en Redis allowlist)
9. Reordenar actividades con PATCH individual — usar `/actividades/reordenar/`
10. No registrar en `LogAuditoria` — usar signal, no el endpoint directamente

### Frontend (Next.js 16.2.6)
11. Guardar JWT en `localStorage` — usar cookies `httpOnly`
12. Añadir `'use client'` a componentes que solo muestran datos — usar Server Components
13. Usar `useEffect` para fetching — usar Server Components o `use()` de React 19
14. Definir design tokens en `tailwind.config.js` — usar `@theme {}` en CSS
15. Importar `motion` completo de Framer Motion — usar `LazyMotion` + `domAnimation`
16. Mezclar layouts de portal — cada portal tiene su propio layout group y middleware
17. Mostrar alertas sin deep-link — siempre con CTA que lleve a la pantalla de acción
18. Validar respuesta de `fetchApi` con `if (!res)` — usar `if (!res.ok)` o capturar `ApiError` explícitamente
19. Dejar `console.log` en producción — eliminar o envolver con `process.env.NODE_ENV === 'development'`
20. Usar nombre de campo incorrecto en `get_or_create` — verificar que el nombre del campo coincida exactamente con el modelo

### Gateway (Node.js puro)
18. Instalar Express, Fastify u otro framework — usar solo `node:http`/`node:https`
19. Poner lógica de negocio en el gateway — todo el dominio vive en Django
20. No validar tamaño de archivo antes de enviar al backend — primera defensa aquí

---

## Fase 1 vs Fase 2 — Límites Claros

### ✅ Implementar en Fase 1
- Una sola agencia: Totem Travel
- Pagos manuales con comprobante + verificación del agente
- Notificaciones in-app + email
- WhatsApp con mensaje pre-cargado contextualizado (Nivel 1)
- Chat in-app padre ↔ agente
- Exportaciones CSV / XLSX / PDF

### ❌ No implementar en Fase 1 (arquitectura ya preparada)
- Multi-agencia (campo `agencia_id` ya existe en todos los modelos)
- Pasarela de pago automática (Culqi / Stripe)
- WhatsApp Business API con bot (Nivel 2/3)
- Selección de compañero de habitación (rooming)
- Push notifications móviles nativas
- App móvil iOS/Android

---

## Mapa de Documentos

| Pregunta | Documento |
|---------|-----------|
| ¿Qué hace el sistema y para quién? | `PROJECT_OVERVIEW.md` |
| ¿Qué debe hacer el sistema? | `REQUIREMENTS.md` |
| ¿Qué puede y qué no puede hacer cada actor? | `REQUIREMENTS.md` + `BUSINESS_RULES.md` |
| ¿Cuáles son las reglas del dominio? | `BUSINESS_RULES.md` |
| ¿Qué quiere el usuario? | `USER_STORIES.md` |
| ¿Cómo fluye el sistema? | `USER_FLOWS.md` |
| ¿Cómo está la base de datos? | `DATABASE.md` |
| ¿Cómo son los endpoints? | `API.md` |
| ¿Qué decisiones de arquitectura existen? | `ARCHITECTURE.md` |
| ¿Cómo se ven las pantallas? | `UI_UX.md` |
| ¿Contexto rápido para desarrollar? | Este archivo |
