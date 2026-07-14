# TASK-204 — Diseño Funcional / Técnico — Punto de Aprobación

> **Estado**: Aprobado con ajustes (ver sección "Ajustes obligatorios pre-implementación")
> **Fecha**: 2026-07-13
> **Contexto**: TASK-207 (esquema itinerarios reutilizables) ya aplicado en `dev`. Este documento recoge el diseño revisado y aprobado para TASK-204 (selector + aplicación desde backoffice).

---

## 1. Objetivo de Producto

Permitir que el agente, desde el backoffice, seleccione una `ItinerarioPlantilla` existente y la aplique al `ItinerarioViaje` de un viaje concreto, viendo inmediatamente las etapas resultantes, sin romper viajes ya configurados.

---

## 2. Alcance — Confirmado

### 2.1 Incluido en TASK-204

| Área | Qué |
|------|-----|
| **Backend** | Endpoint listado plantillas (`GET /api/v1/itinerarios-plantilla/`) + endpoint aplicar (`POST /api/v1/viajes/{id}/aplicar-plantilla/`). Validaciones tenant/estado. Warning no bloqueante por inscripciones activas. |
| **Migración** | `0012_task_204_plantilla_agencia` — añade FK `agencia` NOT NULL a `ItinerarioPlantilla` con backfill trazable (Opción A). |
| **Frontend** | Selector en `/backoffice/viajes/[id]/itinerario` + modal confirmación + refresco UI via `onAplicada(...)` + estado local. |
| **Tests** | 15 tests backend (incluye doble submit / reintento) + 9 casos UI + mini-smoke test. |
| **Docs** | `BUSINESS_RULES.md-final` (BR-ITI-10/11/12/13), `AI_CONTEXT.md-final` (invariantes nuevos). |

### 2.2 Excluido (Backlog Futuro)

- CRUD de plantillas desde UI → TASK-210+
- Preview de etapas pre-aplicación → TASK-211 (si procede)
- Sustituir `prompt()` por input inline en `ConstructorItinerario` → TASK-206
- Migrar `ConstructorItinerario` de `fetch` a `fetchApi` → TASK-206
- Wizard multi-paso con paso "elegir plantilla" → TASK-205+
- Historial de versiones por re-aplicación → TBD

---

## 3. Decisiones Aprobadas (Congeladas)

| Punto | Decisión |
|-------|----------|
| Multi-tenancy plantilla | **Opción A** — FK `agencia` NOT NULL en `ItinerarioPlantilla` (migración con backfill) |
| Estados permitidos para aplicar | `borrador` + `activo` |
| Estados bloqueados | `cerrado` + `archivado` |
| Warning por inscripciones activas | Sí, **no bloqueante** |
| Preview pre-aplicación | **No en MVP** |
| CRUD de plantillas | **Fuera de TASK-204** |
| Refresco UI | `onAplicada(...)` + estado local, **sin `router.refresh()`** |

---

## 4. Ajustes Obligatorios Pre-Implementación

*Estos 4 puntos **deben** incorporarse en la implementación. No son negociables.*

| # | Ajuste | Detalle |
|---|--------|---------|
| **1** | **Blindar la migración** | Antes del `AlterField(null=False)`, validar que el backfill cubre 100% de plantillas históricas. En `RunPython`, registrar cuántas quedaron `agencia=null`; si >0, abortar con `Exception` explícita listando `pk` afectados para revisión manual. |
| **2** | **Warning estable desde backend** | Backend retorna `warning` con: `etapas_reemplazadas`, `inscripciones_activas`, `mensaje` (string estable). Frontend **sólo renderiza**, no reconstruye semántica. |
| **3** | **Atomicidad explícita** | `aplicar_plantilla_a_viaje(...)` ya corre en `transaction.atomic()` — **re-confirmar en implementación, no romper**. |
| **4** | **Test de doble submit / reintento** | Añadir `test_aplicar_plantilla_no_duplica_si_response_se_reintenta` además de los 14 tests base. |

---

## 5. Backend — Especificación Detallada

### 5.1 Migración `0012_task_204_plantilla_agencia`

```python
# Pasos:
# 1. AddField agencia FK null=True
# 2. RunPython(_backfill_agencia) — resuelve vía instancias_aplicadas.first().viaje.agencia
#    - Si alguna plantilla queda con agencia=null → raise Exception(listado_pks)
# 3. AlterField null=False
# 4. Index (agencia, nombre)
```

**Salvaguarda clave**: el backfill TASK-207 garantiza trazabilidad 1:1 (cada plantilla tiene exactamente un `ItinerarioViaje` origen). Si staging valida 100% cobertura, una sola migración controlada es aceptable.

### 5.2 Endpoints

#### `GET /api/v1/itinerarios-plantilla/`

| Atributo | Valor |
|----------|-------|
| Permisos | `IsAuthenticated`, `EsAgente` |
| Queryset | `ItinerarioPlantilla.objects.filter(agencia=request.user.agencia).annotate(cant_etapas=Count('etapas')).order_by('nombre')` |
| Serializer | `ItinerarioPlantillaSerializer` — `fields = ['id','nombre','destinos','dias_totales','cant_etapas','created_at','updated_at']` |
| Respuesta 200 | Lista de resúmenes (sin etapas anidadas) |

#### `POST /api/v1/viajes/{viaje_id}/aplicar-plantilla/`

| Atributo | Valor |
|----------|-------|
| Permisos | `IsAuthenticated`, `EsAgente` |
| Body | `{ "plantilla_id": "<uuid>" }` |
| Serializer | `AplicarPlantillaSerializer` — `plantilla_id = UUIDField()` con `validate_plantilla_id` (verifica tenant + existencia) |
| Validación viaje | `_get_viaje_o_404(viaje_id, request.user.agencia)` → 404 si no pertenece a la agencia |
| Validación estado viaje | `borrador`/`activo` → 200; `cerrado`/`archivado` → 400 `"No se puede aplicar una plantilla a un viaje {estado}."` |
| Acción | `aplicar_plantilla_a_viaje(viaje, plantilla)` (reutiliza `services.py`) |
| Respuesta 200 | Ver sección 5.3 |

### 5.3 Formato de Respuesta POST Aplicar Plantilla

```json
{
  "itinerario": {
    "id": "uuid-itinerario-viaje",
    "viaje": "uuid-viaje",
    "etapas": [
      { "id": "...", "dia_numero": 1, "titulo": "...", "actividades": [] }
    ],
    "created_at": "...",
    "updated_at": "..."
  },
  "warning": null
}
```

**Con warning (inscripciones activas + etapas previas):**

```json
{
  "itinerario": { ... },
  "warning": {
    "etapas_reemplazadas": 3,
    "inscripciones_activas": 12,
    "mensaje": "Se reemplazaron 3 etapas. Las 12 inscripciones activas verán el nuevo itinerario al refrescar el portal."
  }
}
```

> **Regla de warning**: solo no-nulo si `ItinerarioViaje.etapas` **no estaba vacío ANTES** de aplicar Y `viaje.inscripciones.exclude(estado='cancelada').count() > 0`.

### 5.4 Reglas de Negocio (Documentar Post-Merge)

| ID | Regla |
|----|-------|
| **BR-ITI-10** | `ItinerarioPlantilla` scoped a una sola agencia (FK NOT NULL). Un agente solo ve/aplica plantillas de su agencia. |
| **BR-ITI-11** | Re-aplicar sustituye íntegramente etapas/actividades actuales (idempotencia por reemplazo, transaccional). `ItinerarioViaje` nunca inconsistente. |
| **BR-ITI-12** | No se permite aplicar plantilla a `Viaje` en estado `cerrado` o `archivado`. |
| **BR-ITI-13** | Si hay inscripciones activas y re-aplicar cambia el itinerario, backend retorna `warning` no bloqueante con mensaje estable. |

### 5.5 Estados de `plantilla_origen` en `ItinerarioViaje`

- `null` — ItinerarioViaje creado por signal, sin plantilla aplicada (válido).
- FK a `ItinerarioPlantilla` de su misma agencia — válido.
- Re-aplicar con plantilla distinta → `plantilla_origen` se sobrescribe (trazabilidad de la **última** aplicada, no historial).

### 5.6 Re-aplicación y Actividades Existentes

- `ItinerarioViaje.etapas` vacío → aplica limpio.
- Ya tiene etapas → elimina (CASCADE) + crea nuevas desde plantilla. `Actividad` se elimina en cascada (FK CASCADE).
- Inscripciones activas + etapas previas no vacías → `warning` no nulo. Operación permitida.

---

## 6. Frontend Backoffice — Especificación UX

### 6.1 Página `/backoffice/viajes/[id]/itinerario` (Server Component)

**Archivo**: `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/page.tsx`

```tsx
// Añadir:
async function getPlantillas() { /* GET /api/v1/itinerarios-plantilla/ */ }

// En page.tsx:
const [viaje, etapas, plantillas] = await Promise.all([
  getViaje(id), getItinerario(id), getPlantillas()
])

<ConstructorItinerario
  etapasIniciales={etapas}
  viajeId={id}
  plantillasIniciales={plantillas}
  tieneInscripciones={viaje.inscripciones_count > 0}
  onAplicada={/* callback a definir en Client Component */}
/>
```

### 6.2 `SelectorPlantilla.tsx` — Nuevo Componente

**Archivo**: `frontend/components/agente/SelectorPlantilla.tsx` (`"use client"`, Tailwind puro, sin libs nuevas)

**Props**:

```ts
interface SelectorPlantillaProps {
  viajeId: string
  plantillas: PlantillaResumen[]
  itinerarioTieneEtapas: boolean
  tieneInscripciones: boolean
  onAplicada: (nuevasEtapas: Etapa[]) => void
}

interface PlantillaResumen {
  id: string
  nombre: string
  destinos: string
  dias_totales: number | null
  cant_etapas: number
}
```

**Layout**:

- `<select>` nativo (patrón `FiltrosInscritos.tsx`) + botón "Aplicar"
- Label: "Plantilla de itinerario"
- Placeholder: `<option value="">— Elegir plantilla —</option>`
- Option text: `"{nombre} · {dias_totales}d · {cant_etapas} etapas"`
- Botón "Aplicar" deshabilitado si no hay selección o `aplicando`

**Estados**: `idle` | `cargando` | `aplicando` | `error` | `feedback`

**Modal de Confirmación** (patrón `fixed inset-0 bg-black/40` — ver `pagos/page.tsx`):

| Condición | Mensajes |
|-----------|----------|
| Solo etapas (`itinerarioTieneEtapas=true`, `tieneInscripciones=false`) | 1. "Se reemplazará el itinerario actual de este viaje."<br>2. "Las etapas y actividades existentes se perderán." |
| Con inscripciones (`tieneInscripciones=true`) | 1-2 anteriores +<br>3. "Las inscripciones activas seguirán vigentes y verán el nuevo itinerario." |

**Copies aprobados** (no improvisar):

> "Se reemplazará el itinerario actual de este viaje."
> "Las etapas y actividades existentes se perderán."
> "Las inscripciones activas seguirán vigentes y verán el nuevo itinerario."

**Llamada API**: vía `fetchApi` (`lib/api.ts`, **NO** `fetch` directo — alinea con wrapper idiomático y gana refresh 401 automático).

**Refresco UI tras éxito**:

- `onAplicada(itinerario.etapas)` → `ConstructorItinerario.setEtapas(nuevasEtapas)`
- **NO `router.refresh()`** (aprobado: estado local + respuesta API = fuente única)
- Refresh manual del navegador → server component repinta correcto

### 6.3 Cambios en `ConstructorItinerario.tsx`

- Recibe nuevas props: `plantillas`, `tieneInscripciones`, `onAplicada`
- Renderiza `<SelectorPlantilla>` arriba del `DndContext`
- Expone `setEtapas` vía callback `onAplicada`
- **No** refactoriza `fetch` → `fetchApi` en esta task (TASK-206)
- **No** sustituye `prompt()` (TASK-206)

### 6.4 No Amplía Scope del Constructor

- Sin botón "editar plantilla" ni "crear plantilla nueva"
- Sin preview Ajax

---

## 7. Definition of Done (DoD)

### 7.1 Tests Backend — 15 Tests (`apps/viajes/tests.py`)

| # | Test | Qué Verifica |
|---|------|--------------|
| 1 | `test_itinerario_plantilla_tiene_agencia_post_migracion` | 9 plantillas existentes tienen `agencia` y coincide con `instancia_aplicada.viaje.agencia` |
| 2 | `test_itinerario_plantilla_list_deniega_no_agente` | GET sin auth → 401/403; rol no-agente → 403 |
| 3 | `test_itinerario_plantilla_list_filtra_por_agencia` | Agente A ve solo sus plantillas; B no aparece |
| 4 | `test_aplicar_plantilla_viaje_borrador_ok` | POST plantilla válida → 200, `itinerario.etapas` con N etapas, `plantilla_origen` seteado |
| 5 | `test_aplicar_plantilla_a_viaje_sin_etapas_previas` | ItinerarioViaje vacío → 200, etapas = plantilla, slug/codigo únicos |
| 6 | `test_aplicar_plantilla_idempotente_reemplazo` | Aplicar 2x misma plantilla → conteo estable, no duplica, slugs únicos |
| 7 | `test_re_aplicar_plantilla_distinta_reemplaza_etapas` | Plantilla A (3 etapas, 2 act c/u) → Plantilla B (2 etapas, 0 act) → `etapas.count()==2`, 0 act, `plantilla_origen==B` |
| 8 | `test_aplicar_plantilla_de_otra_agencia_400` | Agente A con `plantilla_id` de B → 400 en `plantilla_id`, no aplica |
| 9 | `test_aplicar_plantilla_viaje_otra_agencia_404` | Agente A con `viaje_id` de B → 404 (no revela existencia) |
| 10 | `test_aplicar_plantilla_viaje_cerrado_400` | Viaje `cerrado` → 400 con `detail` |
| 11 | `test_aplicar_plantilla_viaje_archivado_400` | Viaje `archivado` → 400 con `detail` |
| 12 | `test_aplicar_plantilla_viaje_activo_con_inscripciones_retorna_warning` | `activo` + inscripciones activas + etapas previas → 200 con `warning` no nulo y mensaje estable |
| 13 | `test_aplicar_plantilla_uuid_invalido_400` | UUID mal formado → 400 estándar DRF |
| 14 | `test_aplicar_plantilla_sin_body_400` | Body vacío → 400 con `plantilla_id` requerido |
| 15 | `test_aplicar_plantilla_no_duplica_si_response_se_reintenta` | **NUEVO** — Dos POST consecutivos mismo `plantilla_id` no duplican; segundo reemplaza al primero (idempotencia real) |

**Cobertura existente preservada**: 240 tests actuales siguen OK.

### 7.2 Casos de UI a Probar

| # | Caso | Esperado |
|---|------|----------|
| U1 | Abrir itinerario con ItinerarioViaje vacío | Selector visible con plantillas agencia; botón deshabilitado sin selección |
| U2 | Elegir plantilla + Aplicar | "aplicando…" → botón libre → etapas se reemplazan (`cant_etapas == plantilla.cant_etapas`) |
| U3 | Aplicar a viaje con etapas existentes | Modal confirmación con conteo exacto (N etapas, M actividades). Botones claros |
| U4 | Cancelar modal | Sin request; estado local intacto |
| U5 | Aplicar con inscripciones activas | Modal muestra bloque warning inscripciones. Tras Aplicar: banner verde efímero + warning visible 5s |
| U6 | Aplicar a viaje cerrado | Banner rojo con mensaje backend (400 detail) |
| U7 | Sesión caducada → Aplicar | `fetchApi` refresca token 401 → reintenta → 200 |
| U8 | Error de red (gateway abajo) | Banner rojo genérico; botón reactivado |
| U9 | Responsive mínimo (375px) | Selector + botón en columna, no se desborda |

### 7.3 Mini-Smoke Test Post-Merge

**Vía gateway `:3001` con cookie JWT `agente@tottem.com`:**

| Endpoint | Resultado Esperado |
|----------|-------------------|
| `GET /api/v1/itinerarios-plantilla/` | 200, lista 9 plantillas, `cant_etapas` correcto |
| `POST /api/v1/viajes/{viaje_borrador_id}/aplicar-plantilla/` | 200, `itinerario.etapas` con N etapas copiadas |
| `GET /api/v1/viajes/{viaje_id}/itinerario/` (post) | 200, etapas coherentes |
| `POST /api/v1/viajes/{viaje_cerrado_id}/aplicar-plantilla/` | 400 con `detail` |
| `POST /api/v1/viajes/{viaje_otra_agencia_id}/aplicar-plantilla/` | 404 |
| Logs backend | 0 errores 500 en 30 min post-aplicación |

**Frontend:**
- `npm run build` limpio
- Wizard/inscripción de viaje con itinerario aplicado → no rompe `/api/v1/inscripciones/{id}/itinerario/`

**Suite backend:**
- `python manage.py test` → 240 + 15 = 255 OK

### 7.4 Documentación a Actualizar Post-Merge

- `BUSINESS_RULES.md-final` — añadir BR-ITI-10/11/12/13
- `AI_CONTEXT.md-final` — añadir invariantes nuevos (tenant en plantilla, idempotencia re-aplicación, estados bloqueados)
- `docs/TASK-204.md` — este archivo (commiteado **antes** de implementar, como spec)

---

## 8. Inventario de Archivos a Tocar

### Backend
| Archivo | Acción |
|---------|--------|
| `viajes/migrations/0012_task_204_plantilla_agencia.py` | Nuevo |
| `viajes/models.py` | Añadir FK `agencia` en `ItinerarioPlantilla` |
| `viajes/serializers.py` | `ItinerarioPlantillaSerializer`, `AplicarPlantillaSerializer` |
| `viajes/views.py` | `ItinerarioPlantillaListView`, `ViajeAplicarPlantillaView` |
| `viajes/urls.py` | Rutas `itinerarios-plantilla/` y `viajes/<uuid:viaje_id>/aplicar-plantilla/` |
| `config/urls.py` | Incluir `itinerarios-plantilla/` fuera del prefijo `viajes/` |
| `viajes/tests.py` | 15 tests nuevos |
| `viajes/admin.py` | `ItinerarioPlantillaAdmin` filtra por agencia |

### Frontend
| Archivo | Acción |
|---------|--------|
| `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/page.tsx` | `getPlantillas` + props nuevas |
| `frontend/components/agente/SelectorPlantilla.tsx` | **Nuevo** (~120 líneas Tailwind puro) |
| `frontend/components/agente/ConstructorItinerario.tsx` | Recibe `plantillas`, `tieneInscripciones`, renderiza `<SelectorPlantilla>`, expone `setEtapas` vía callback |

### No Se Toca
- `services.py` (reutiliza `aplicar_plantilla_a_viaje` sin cambios, **solo verificar `transaction.atomic()`**)
- `inscripciones/views.py`, seed scripts, señales

---

## 9. Orden de Implementación

1. **Commit `docs:`** — este archivo (`docs/TASK-204-diseno-funcional-pto-aprobacion.md`)
2. **Commit `feat(viajes):`** — migración `0012` + ajuste `models.py`. Validar migración en BD local.
3. **Commit `feat(viajes):`** — serializers, views, urls, admin. Tests backend (15 tests).
4. **Commit `feat(frontend):`** — `SelectorPlantilla.tsx`, ajuste `page.tsx` y `ConstructorItinerario.tsx`.
5. **Commit `test:`** — validación suite completa + smoke (no se commitea resultado, solo evidencia en PR).
6. **PR a main** con body de este archivo + reporte de verificación.
7. **Post-merge:** `docs:` actualizando `BUSINESS_RULES.md-final` y `AI_CONTEXT.md-final`.

---

## 10. Riesgos Identificados y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Backfill migración deja plantillas sin `agencia` | Baja (trazabilidad 1:1 validada en TASK-207) | Alto (migración aborta) | `RunPython` con excepción explícita listando PKs; revisión manual antes de `AlterField` |
| Doble submit en UI causa duplicados | Media (usuarios impacientes) | Medio | Test #15 + idempotencia real en servicio (`transaction.atomic` + borra-crea) |
| `fetch` directo en `ConstructorItinerario` no refresca token 401 | Media | Bajo | Usar `fetchApi` en `SelectorPlantilla` (ya aprobado); `ConstructorItinerario` se migra en TASK-206 |
| Warning backend cambia y frontend rompe | Baja | Medio | Mensaje estable desde backend; frontend solo renderiza string |
| Modal confirmación no se muestra en móvil | Baja | Bajo | Test U9 (375px) + Tailwind responsive nativo |

---

## 11. Referencias Cruzadas

| Documento | Sección |
|-----------|---------|
| `docs/TASK-204.md` | Spec técnica detallada (mirror de este diseño) |
| `docs/DECISIONS.md-final` | DEC-012 (itinerario reutilizable), DEC-008 (Alumno duplicado) |
| `docs/BUSINESS_RULES.md-final` | BR-V-06/08, BR-ITI-01..06, BR-ITI-10..13 (post-merge) |
| `docs/AI_CONTEXT.md-final` | Invariantes #11, #18, #19, #20 |
| `docs/PROTOCOLO_VALIDACION_TAREAS.md` | Checklist 10 puntos aplicable a esta task |

---

## 12. Aprobación Final

**Este diseño está aprobado para implementación con los 4 ajustes obligatorios de la Sección 4 incorporados.**

> Próximo paso: **Commit `docs:`** con este archivo, luego iniciar implementación backend (migración + endpoints + tests).

---

*Generado como guía de implementación y punto de aprobación único para TASK-204.*