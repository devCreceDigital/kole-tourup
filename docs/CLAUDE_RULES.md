# CLAUDE_RULES.md — Contrato de Trabajo del Agente

> Este documento define las reglas de comportamiento del agente durante el desarrollo de Tottem Hub.
> Son de cumplimiento obligatorio en cada sesión de trabajo.

---

## 1. Reglas de Lectura y Comprensión

### R-01 — Leer documentación antes de programar

Antes de escribir cualquier línea de código, el agente DEBE leer:

| Siempre | Según módulo |
|---|---|
| `AI_CONTEXT.md` (invariantes y errores críticos) | `DATABASE.md` si se crean modelos |
| `BUSINESS_RULES.md` (reglas del dominio) | `API.md` si se implementan endpoints |
| `TASKS.md` (tarea actual) | `UI_UX.md` si se desarrollan pantallas |
| `DEVELOPMENT_PLAN.md` (contexto del plan) | `USER_STORIES.md` si hay dudas de comportamiento |

### R-02 — No asumir requisitos

Si la documentación es ambigua, incompleta o contradictoria:
- **NO** asumir un comportamiento por convención o experiencia propia.
- **SÍ** identificar la duda, nombrarla con un ID (D-XX) y preguntar antes de continuar.
- Registrar la duda en `DEVELOPMENT_PLAN.md` si es nueva.

### R-03 — La documentación es la fuente de verdad

En caso de conflicto entre documentos, el orden de prioridad es:

```
1. AI_CONTEXT.md (invariantes y errores críticos)
2. BUSINESS_RULES.md (reglas de negocio)
3. DATABASE.md (esquema de datos)
4. API.md (contratos de endpoints)
5. REQUIREMENTS.md (requisitos funcionales)
6. UI_UX.md (contratos de interfaz)
7. USER_STORIES.md (historias de usuario)
```

---

## 2. Reglas de Alcance

### R-04 — No modificar archivos no relacionados con la tarea

Cada tarea en `TASKS.md` lista explícitamente los archivos afectados. El agente SOLO modifica esos archivos. Si descubre que es necesario modificar un archivo adicional, lo anuncia y espera aprobación.

**Prohibido:**
- Refactorizar código de módulos no relacionados con la tarea.
- Añadir "mejoras" o "limpieza" no solicitadas.
- Modificar migraciones existentes (solo crear nuevas).
- Cambiar el esquema de BD sin que la tarea lo indique.

### R-05 — No cambiar la arquitectura sin autorización

Las siguientes decisiones están **fijadas** y no pueden modificarse sin aprobación explícita del usuario:

| Decisión fija | Alternativa prohibida |
|---|---|
| Next.js 16.2.6 + App Router | Pages Router, cualquier otra versión |
| TailwindCSS 4 con `@theme {}` | `tailwind.config.js` para tokens |
| Gateway Node.js puro (`node:http`) | Express, Fastify, Koa, Hapi, cualquier framework |
| Django 4.2+ + DRF | FastAPI, Flask, cualquier otro framework |
| JWT en cookies `httpOnly` | `localStorage`, `sessionStorage` |
| Framer Motion con `LazyMotion` | Importar `motion` directamente |
| UUID v4 como PK en todos los modelos | ID numérico autoincremental |
| `saldo_pendiente` como propiedad Python | Columna en la base de datos |
| `LogAuditoria` solo INSERT | UPDATE o DELETE sobre LogAuditoria |

### R-06 — No implementar funcionalidades de Fase 2

Las siguientes funcionalidades están **explícitamente fuera del alcance** de Fase 1:

- Multi-agencia (el código debe prepararse con `agencia_id`, pero solo Totem Travel opera)
- Pasarela de pago automática (Culqi, Stripe)
- WhatsApp Business API con bot automatizado
- Módulo de rooming con selección de compañero
- Push notifications nativas (Web Push, APNs, FCM)
- App móvil iOS/Android

---

## 3. Reglas de Ejecución

### R-07 — Una sola tarea por sesión

El agente trabaja en **exactamente una tarea** de `TASKS.md` por sesión. No combina tareas, no anticipa la siguiente, no divide tareas en sub-tareas no documentadas.

### R-08 — Anunciar antes de modificar

Antes de usar cualquier herramienta de escritura (`Write`, `Edit`), el agente debe declarar:

```
"Voy a [crear/modificar] los siguientes archivos:
- [ruta/archivo1] — [motivo]
- [ruta/archivo2] — [motivo]
```

### R-09 — Detenerse y esperar aprobación

Al finalizar una tarea, el agente:
1. Actualiza el estado en `TASKS.md` a `Done`
2. Presenta un resumen de lo implementado
3. Lista los criterios del DoD que verificó
4. **Se detiene completamente**
5. No escribe código adicional hasta recibir aprobación explícita

**Aprobación implícita NO existe.** Solo cuenta un mensaje explícito del usuario indicando que puede continuar.

### R-10 — Justificar decisiones no triviales

Cuando el agente elija entre varias opciones técnicas equivalentes, debe:
1. Presentar las opciones disponibles
2. Recomendar una con su justificación
3. Esperar confirmación antes de implementar

---

## 4. Reglas de Calidad

### R-11 — Auto-revisión obligatoria

Antes de marcar cualquier tarea como `Done`, el agente ejecuta `CODE_REVIEW_CHECKLIST.md` completo. Esta revisión no es opcional.

### R-12 — Verificar el DoD

Antes de declarar una tarea terminada, el agente verifica punto a punto el `DoD` de `DEVELOPMENT_PLAN.md §10`. Si algún punto no se cumple, la tarea no está terminada.

### R-13 — Reglas de seguridad son invariantes

Los siguientes checks de seguridad se aplican a **cada endpoint** sin excepción:

- [ ] ¿Requiere JWT? → `IsAuthenticated` en DRF
- [ ] ¿El objeto pertenece a la agencia del usuario? → filtrar por `agencia_id` (agente)
- [ ] ¿El objeto pertenece al padre autenticado? → filtrar por `padre_tutor` (padre)
- [ ] ¿El alumno tiene acceso habilitado? → verificar flag (alumno)
- [ ] ¿La acción requiere log? → `LogAuditoria`
- [ ] ¿La acción requiere notificación? → signal o Celery
- [ ] ¿Es un archivo? → validar ≤ 10 MB y formato en Gateway Y en Backend
- [ ] ¿Se usa `get_or_create()`? → verificar que los nombres de campo en `defaults` coinciden exactamente con el modelo
- [ ] ¿Se usa `fetchApi()`? → verificar que la respuesta se valida con `if (!res.ok)` y se captura `ApiError`
- [ ] ¿Hay `console.log`? → eliminar o dejar solo en desarrollo

### R-14 — Nunca exponer notas internas al padre/alumno

El campo `notas_internas` de `Inscripcion` **nunca** puede aparecer en serializers accesibles por roles `padre` o `alumno`. Verificar en cada serializer que incluya datos de inscripción.

### R-15 — Tareas Celery siempre idempotentes

Toda tarea Celery debe incluir una cache key en Redis que prevenga ejecuciones duplicadas. El patrón obligatorio:

```python
cache_key = f'{task_name}:{objeto_id}:{fecha}'
if cache.get(cache_key):
    return  # Ya ejecutado — no duplicar
# ... lógica de la tarea
cache.set(cache_key, True, timeout=86400)
```

---

## 5. Reglas de Documentación

### R-16 — Actualizar TASKS.md

En cada sesión, el agente debe:
- Marcar la tarea como `In Progress` al iniciar
- Marcar la tarea como `Done` al finalizar (solo si cumple el DoD)

### R-17 — Documentar cambios que difieran del plan

Si la implementación requiere apartarse de lo especificado en `DEVELOPMENT_PLAN.md`, `DATABASE.md` o `API.md`, el agente debe:
1. Identificar la divergencia
2. Explicar el motivo técnico
3. Proponer la actualización del documento correspondiente
4. Esperar aprobación antes de continuar

### R-18 — No crear documentos de análisis como archivos

El razonamiento, las opciones consideradas y el análisis interno del agente se expresan en el chat, NO como archivos `.md` adicionales en el repositorio (a menos que el usuario lo solicite explícitamente).

---

## 6. Errores Críticos a Evitar

Estos errores están documentados en `AI_CONTEXT.md`. Se repiten aquí como recordatorio rápido:

### Backend (Django)
1. Calcular `saldo_pendiente` como columna de BD
2. Exponer `notas_internas` en serializers del padre o alumno
3. Permitir login con `email_verificado=False`
4. Contar pagos `pendiente` o `rechazado` en el cálculo del saldo
5. Olvidar filtrar por `agencia_id` en endpoints del agente
6. Validar tamaño de archivo solo en Django (debe validarse también en el gateway)
7. No crear itinerario vacío al crear un viaje
8. Reutilizar refresh_token invalidado
9. Reordenar actividades con PATCH individual (usar `/actividades/reordenar/`)
10. No registrar en `LogAuditoria`
11. Usar `nombre` en lugar de `nombres` en `get_or_create()` — el modelo Alumno tiene `nombres`, revisar todos los `defaults_dict`

### Frontend (Next.js)
11. Guardar JWT en `localStorage`
12. Añadir `'use client'` a componentes que solo muestran datos
13. Usar `useEffect` para fetching
14. Definir design tokens en `tailwind.config.js`
15. Importar `motion` completo de Framer Motion
16. Mezclar layouts de portal
17. Mostrar alertas sin deep-link
18. Validar respuesta de `fetchApi` con `if (!res)` — usar `if (!res.ok)` y capturar `ApiError`
19. Dejar `console.log` en producción — eliminar o envolver con `if (process.env.NODE_ENV === 'development')`

### Gateway (Node.js puro)
18. Instalar Express, Fastify u otro framework
19. Poner lógica de negocio en el gateway
20. No validar tamaño de archivo antes de enviar al backend

---

## 7. Protocolo de Comunicación

### Cómo el agente reporta el fin de una tarea

```
## Tarea completada: [TASK-XXX] — [Nombre]

### Archivos modificados
- `ruta/archivo1` — [qué se hizo]
- `ruta/archivo2` — [qué se hizo]

### DoD verificado
- [x] Compila sin errores
- [x] Sin errores TypeScript/lint
- [x] Migraciones correctas (si aplica)
- [x] API responde según API.md (si aplica)
- [x] Reglas de negocio respetadas
- [x] Sin regresiones
- [x] TASKS.md actualizado

### Notas
[Decisiones tomadas, dificultades encontradas, dependencias desbloqueadas]

---
⏸ Esperando aprobación para continuar con TASK-[XXX+1].
```

### Cómo el agente reporta un bloqueo

```
## Bloqueado en: [TASK-XXX] — [Nombre]

### Motivo
[Descripción clara del problema]

### Opciones disponibles
1. [Opción A] — [pros / contras]
2. [Opción B] — [pros / contras]

### Recomendación
[Opción recomendada y justificación]

¿Cómo deseas proceder?
```
