# KOLE Viajes — TOUR UP Hub

> Portal digital que transforma los viajes grupales escolares en Perú.

---

## Propósito

Conecta a la agencia **Tourup travel** con padres/tutores, alumnos y mecenas (patrocinadores). Digitaliza y automatiza el ciclo de vida completo de un viaje escolar grupal: publicación del viaje, inscripciones, cobro de cuotas fraccionadas, validación documental, asignación de alojamiento y comunicación omnicanal.

**Fase 1:** Una sola agencia operativa — Totem Travel. Arquitectura preparada para escalar a multi-agencia sin cambios de esquema.

---

## Cliente

| Campo | Valor |
|-------|-------|
| Nombre | Totem Travel |
| País | Perú |
| Sitio | `totemstravel.com.pe` |
| Tipo | Agencia de viajes escolares grupales |

---

## Objetivos Medibles

| KPI | Meta |
|-----|------|
| Tiempo de validación de pagos y documentos | −70% |
| Tasa de morosidad en cuotas | −40% mediante recordatorios omnicanal automáticos |

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js · React · TailwindCSS · Framer Motion | 16.2.6 · 19 · 4 · latest |
| API Gateway | Node.js puro (`node:http` / `node:https`) | Sin frameworks — implementación custom |
| Backend | Django + Django REST Framework | 4.2+ |
| Base de datos | PostgreSQL | — |
| Cache | Redis | Tokens + Celery broker |
| Cola de tareas | Celery | Emails, recordatorios, cron jobs |
| Storage | S3 / GCS configurable | AES-256 en reposo |
| Auth | JWT | access 15 min · refresh 7 días |

---

## Actores del Sistema

| Actor | Rol |
|-------|-----|
| **Agente de Viajes** | Operador del backoffice. Crea viajes, valida pagos y documentos. |
| **Padre / Tutor** | Usuario primario. Inscribe alumnos, paga cuotas, sube documentación. |
| **Alumno** | Viajero. Solo lectura sobre su perfil e itinerario. |
| **Mecenas** | Patrocinador. Paga en nombre de uno o más alumnos. |
| **Sistema** | Actor automatizado: recordatorios, vencimientos, archivados, logs. |

---

## Ciclos de Vida

```
Viaje:       BORRADOR → ACTIVO → CERRADO → ARCHIVADO

Inscripción: PENDIENTE → CONFIRMADO
                       → CANCELADO
                       → BAJA

Pago:        PENDIENTE → VERIFICADO
                       → RECHAZADO

Documento:   PENDIENTE → VALIDADO
                       → RECHAZADO
```

---

## Estructura de la Base de Conocimiento

| Archivo | Contenido |
|---------|-----------|
| `README.md` | Este archivo. Visión general y punto de entrada. |
| `PROJECT_OVERVIEW.md` | Contexto de negocio, propuesta de valor y restricciones de fase. |
| `REQUIREMENTS.md` | Todos los requerimientos funcionales y no funcionales por actor. |
| `BUSINESS_RULES.md` | Reglas de negocio, invariantes, transiciones de estado y restricciones. |
| `USER_STORIES.md` | Historias de usuario en formato estándar por actor y módulo. |
| `USER_FLOWS.md` | 12 flujos de secuencia en Mermaid + Customer Journey del padre. |
| `DATABASE.md` | Esquema completo: entidades, atributos, relaciones, ORM Django y constraints. |
| `API.md` | Endpoints REST: métodos, payloads, respuestas y códigos de error. |
| `ARCHITECTURE.md` | Decisiones de arquitectura, componentes, seguridad y estructura de repos. |
| `UI_UX.md` | Contratos de interfaz: pantallas, estados visuales, componentes y flujos UX. |
| `AI_CONTEXT.md` | Contexto comprimido para agentes IA que desarrollen el proyecto. |

---

## Restricciones Inamovibles de Fase 1

- Una sola agencia: Totem Travel
- Pagos 100% manuales — el padre sube comprobante, el agente verifica
- Sin pasarela de pago automática (Stripe/Culqi va en Fase 2)
- Sin módulo de rooming con selección de compañero (el agente asigna manualmente)
- WhatsApp con mensaje pre-cargado enriquecido, sin bot ni WhatsApp Business API

---

## Inicio Rápido para Desarrolladores

```bash
# Repositorio monorepo
minka-group/
├── frontend/   → Next.js 16.2.6
├── gateway/    → Node.js puro
└── backend/    → Django 4.2+
```

Leer en este orden antes de escribir código:
1. `AI_CONTEXT.md` — invariantes y errores críticos a evitar
2. `ARCHITECTURE.md` — decisiones de stack ya tomadas
3. `DATABASE.md` — esquema de datos
4. `API.md` — contratos de endpoints
