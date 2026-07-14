# TASK-204 — Selector de plantilla de itinerario (copia-al-aplicar desde UI)

> Especificación cerrada de implementación. Aprobada 2026-07-13.
> Previo: TASK-207 (ItinerarioPlantilla + ItinerarioViaje + copia-al-aplicar) aplicada en dev.
> Fuente: diseño técnico/UX revisado y aprobado por el usuario.

---

## Objetivo de producto

Permitir que el agente, desde el backoffice, seleccione una `ItinerarioPlantilla` existente y la aplique al `ItinerarioViaje` de un viaje concreto, viendo inmediatamente las etapas resultantes, sin romper viajes ya configurados.

## Alcance

Incluido:
- Endpoint de listado de plantillas accesibles por agencia.
- Endpoint de aplicación de plantilla a un viaje (copia-al-aplicar).
- Migración para añadir `agencia` a `ItinerarioPlantilla` (multi-tenancy Opción A).
- Selector UI + modal de confirmación en `/backoffice/viajes/[id]/itinerario`.
- Tests backend y mini-smoke test.

Excluido (backlog futuro):
- CRUD de plantillas desde la UI → TASK-210+.
- Preview de etapas pre-aplicación → TASK-211 si se decide necesario.
- Sustituir `prompt()` por input inline en `ConstructorItinerario` → TASK-206.
- Migrar `ConstructorItinerario` de `fetch` a `fetchApi` → TASK-206.
- Wizard multi-paso con paso "elegir plantilla" → TASK-205+.
- Historial de versiones por re-aplicación → TBD.

## Decisiones aprobadas

| Punto | Decisión |
|---|---|
| Multi-tenancy plantilla | **Opción A** — añadir FK `agencia` NOT NULL a `ItinerarioPlantilla` (migración con backfill) |
| Estados permitidos | `borrador` + `activo` |
| Estados bloqueados | `cerrado` + `archivado` |
| Warning por inscripciones | Sí, no bloqueante |
| Preview pre-aplicación | No en MVP |
| CRUD de plantillas | Fuera de TASK-204 |
| Refresco UI | `onAplicada(...)` + estado local, sin `router.refresh()` |

## Ajustes finos del revisor (obligatorios en implementación)

1. **Blindar la migración**: antes de `AlterField(null=False)`, validar que el backfill cubre 100% de las plantillas históricas. Registrar en el RunPython cuántas quedaron con `agencia=null`; si >0, abortar con `离Exception` para revisión manual. Si la trazabilidad del backfill TASK-207 garantiza origen único (caso actual: 9/9), una sola migración controlada es aceptable.
2. **Mensaje de warning estable desde backend**: no reconstruir lógica semántica en frontend. Backend retorna un `warning` con: cantidad de etapas reemplazadas, cantidad de inscripciones activas, y frase de impacto al portal padre. Frontend sólo rendering.
3. **Atomicidad explícita**: `aplicar_plantilla_a_viaje(...)` debe ejecutarse dentro de `transaction.atomic()` (ya lo hace — re-confirmar en implementación, no romper).
4. **Test de doble submit / reintento**: añadir `test_aplicar_plantilla_no_duplica_si_response_se_reintenta` además de los 14 tests base.
5. **UI copy operativa, no técnica**: el modal de confirmación debe hablar en lenguaje operativo. Copies aprobados:
   > "Se reemplazará el itinerario actual de este viaje."
   > "Las etapas y actividades existentes se perderán."
   > "Las inscripciones activas seguirán vigentes y verán el nuevo itinerario."

---

## Backend

### Migración `0012_task_204_plantilla_agencia`

- Añade `ItinerarioPlantilla.agencia` FK → `agencias.Agencia`, `null=True` primero.
- Backfill (RunPython): para cada `ItinerarioPlantilla`, resuelve la agencia vía `instancias_aplicadas.first().viaje.agencia` (trazabilidad del backfill TASK-207 — cada plantilla tiene exactamente un `ItinerarioViaje` origen).
- ** salvaguarda**: si alguna plantilla queda con `agencia=null` tras el backfill, levantar excepción explícita con el listado de `pk` afectados (no pasar al `AlterField(null=False)`).
- `AlterField` a `null=False` tras validación.
- Index en `(agencia, nombre)`.
- NO toca `EtapaPlantilla` (sigue heredando tenant vía plantilla → agencia).

### Endpoints

#### `GET /api/v1/itinerarios-plantilla/`

Lista plantillas accesibles para el agente.

- **Permisos**: `IsAuthenticated`, `EsAgente`.
- **Queryset**: `ItinerarioPlantilla.objects.filter(agencia=request.user.agencia).annotate(cant_etapas=Count('etapas'))` ordenado por `nombre`.
- **Serializer**: `ItinerarioPlantillaSerializer` (nuevo):
  - `fields = ['id', 'nombre', 'destinos', 'dias_totales', 'cant_etapas', 'created_at', 'updated_at']`
  - `read_only_fields = ['id', 'created_at', 'updated_at']`
- **Respuesta `200`**: lista de resúmenes. Sin etapas anidadas.
- **URL**: Hanging de `config/urls.py` bajo prefijo `itinerarios-plantilla/` que apunta a `viajes/urls.py` (o ruta directa en `viajes/urls.py`). Name: `itinerario-plantilla-list`.

#### `POST /api/v1/viajes/{viaje_id}/aplicar-plantilla/`

Aplica (copia) una plantilla al `ItinerarioViaje` del viaje. Re-aplicación = sobrescritura idempotente (`aplicar_plantilla_a_viaje` ya existe y es testeado).

- **Permisos**: `IsAuthenticated`, `EsAgente`.
- **Body**: `{ "plantilla_id": "<uuid>" }` → `AplicarPlantillaSerializer` con `plantilla_id = UUIDField()`.
  - `validate_plantilla_id`: resuelve la plantilla, verifica `agencia == request.user.agencia`, guarda el objeto en contexto. 400 si no existe o es de otra agencia. Error atado a `plantilla_id` (consistencia con DRF).
- **Validación de tenant del viaje**: `_get_viaje_o_404(viaje_id, request.user.agencia)` → 404 si no (no revela existencia).
- **Validación de estado del viaje**:
  - `borrador` → permitido.
  - `activo` → permitido.
  - `cerrado` → 400 `"No se puede aplicar una plantilla a un viaje cerrado."`
  - `archivado` → 400 `"No se puede aplicar una plantilla a un viaje archivado."`
- **Acción**: `aplicar_plantilla_a_viaje(viaje, plantilla)` (reutiliza `services.py`, NO modificarlo salvo verificar `transaction.atomic()`).
- **Respuesta `200`**:
  ```json
  {
    "itinerario": { /* ItinerarioSerializer(ItinerarioViaje, etapas+actividades) */ },
    "warning": null | {
      "etapas_reemplazadas": N,
      "inscripciones_activas": K,
      "mensaje": "Se reemplazaron N etapas. Las K inscripciones activas verán el nuevo itinerario al refrescar el portal."
    }
  }
  ```
  El `warning` sólo no nulo si `ItinerarioViaje.etapas` no estaba vacío ANTES de aplicar Y `viaje.inscripciones.exclude(estado='cancelada').count() > 0`. El mensaje es **string estable desde backend** — frontend no lo reconstruye.

### Permisos e invariantes

- `EsAgente` vigente; no se añaden nuevos permisos.
- `aplicar_plantilla_a_viaje` se ejecuta dentro de `transaction.atomic()` (servicio ya lo hace — verificar, no romper).

### Reglas de negocio a documentar post-merge

| ID | Regla |
|---|---|
| **BR-ITI-10** | `ItinerarioPlantilla` está scoped a una y solo una agencia (FK NOT NULL tras TASK-204). Un agente sólo puede ver y aplicar plantillas de su agencia. |
| **BR-ITI-11** | Re-aplicar una plantilla a un `ItinerarioViaje` ya poblado sustituye íntegramente las etapas y actividades actuales (idempotencia por reemplazo, transaccional). El `ItinerarioViaje` nunca queda inconsistente. |
| **BR-ITI-12** | No se permite aplicar plantilla a un `Viaje` en estado `cerrado` o `archivado`. |
| **BR-ITI-13** | Si el `Viaje` tiene inscripciones activas y re-aplicar cambia el itinerario, el backend retorna `warning` no bloqueante con mensaje estable. |

### Estados permitidos de `plantilla_origen`

- `null` — ItinerarioViaje creado automáticamente por signal, aún sin plantilla aplicada. Válido.
- FK a `ItinerarioPlantilla` de su misma agencia — válido.
- Re-aplicar con plantilla distinta → `plantilla_origen` se sobrescribe (trazabilidad de la última aplicada, no historial).

### Re-aplicación y actividades existentes

- Si `ItinerarioViaje.etapas` está vacío: aplica limpio.
- Si ya tiene etapas: las elimina, crea las nuevas desde plantilla. Las `Actividad` existentes se eliminan en cascada (FK CASCADE).
- Si el viaje tiene inscripciones activas y `ItinerarioViaje.etapas` no estaba vacío → `warning` no nulo. Operación permitida.

---

## Frontend backoffice

### Cambios en `/backoffice/viajes/[id]/itinerario` (server component)

Archivo: `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/page.tsx`

- Añadir `getPlantillas()` — llama a `GET /api/v1/itinerarios-plantilla/` con cookie. Devuelve `PlantillaResumen[]`.
- Pasar a `<ConstructorItinerario>`:
  - `plantillasIniciales` (lista de resúmenes)
  - `tieneInscripciones` (boolean — derivado de `viaje.inscripciones_count > 0`)
- El server component obtiene inscripciones_count desde `ViajeSerializer` ya expuesto.

### UX del selector

**Componente nuevo**: `frontend/components/agente/SelectorPlantilla.tsx` ("use client", sin libs nuevas — Tailwind puro).

Props:
```ts
interface SelectorPlantillaProps {
  viajeId: string
  plantillas: PlantillaResumen[]
  itinerarioTieneEtapas: boolean
  tieneInscripciones: boolean
  onAplicada: (nuevasEtapas: Etapa[]) => void
}
```

Layout (Tailwind, sin shadcn/radix):
- Bloque horizontal: `<select>` nativo (patrón `FiltrosInscritos.tsx`) + botón "Aplicar".
- Label: "Plantilla de itinerario".
- Placeholder `<option value="">— Elegir plantilla —</option>`.
- Texto de cada option: `"{nombre} · {dias_totales}d · {cant_etapas} etapas"`.
- Botón `Aplicar` deshabilitado si no hay selección o si `aplicando`.

**Estados**:
- `cargando`, `aplicando`, `error`, `feedback` (mensaje efímero 5s).
- Estado idle: select vacío + botón deshabilitado.
- Selección válida → botón activo.
- Click en Aplicar → `setAplicando(true)`, deshabilita todo.
- 200 → `onAplicada(itinerario.etapas)`, banner verde efímero "Plantilla aplicada · N etapas", resetea selector a vacío, cierra modal.
- 400 → banner rojo con `errorData.detail` o `errorData.plantilla_id`.
- 404 viaje → mensaje "El viaje no existe o no pertenece a tu agencia" (defensivo).

**Modal de confirmación** (patrón existente `fixed inset-0 bg-black/40` — ver `pagos/page.tsx`):
- Se abre sólo si `itinerarioTieneEtapas === true` o `tieneInscripciones === true`.
- Caso sólo etapas (sin inscripciones): muestra "Se reemplazará el itinerario actual de este viaje." + "Las etapas y actividades existentes se perderán."
- Caso con inscripciones: añadir "Las inscripciones activas seguirán vigentes y verán el nuevo itinerario."
- Botones: "Aplicar igualmente" / "Cancelar".

**Llamada API**: vía `fetchApi` (`lib/api.ts`, NO `fetch` directo — alinea con wrapper idiomático y gana refresh 401).

**Refresco UI tras éxito**:
- `onAplicada(itinerario.etapas)` → `ConstructorItinerario.setEtapas(nuevasEtapas)`.
- NO `router.refresh()` (aprobado: estado local + respuesta API es fuente única).
- Si el usuario refresca el navegador manualmente, el server component repinta correcto.

### Cambios en `ConstructorItinerario.tsx`

- Recibe nuevas props: `plantillas`, `tieneInscripciones`.
- Renderiza `<SelectorPlantilla>` arriba del `DndContext`.
- Expone `setEtapas` vía callback `onAplicada` (no romper el estado actual).
- No refactoriza `fetch` directo → `fetchApi` en esta task (台山 - TASK-206).
- No sustituye `prompt()` (TASK-206).

### No amplía el scope del Constructor

- Sin botón "editar plantilla" ni "crear plantilla nueva".
- Sin preview Ajax.

---

## Definition of Done

### Tests backend (`apps/viajes/tests.py`) — 15 tests

**Migración + scoped listado**:
1. `test_itinerario_plantilla_tiene_agencia_post_migracion` — tras `0012`, las 9 plantillas existentes tienen `agencia` seteada y coincide con `instancia_aplicada.viaje.agencia`.
2. `test_itinerario_plantilla_list_deniega_no_agente` — GET List sin auth → 401/403; con rol no-agente → 403.
3. `test_itinerario_plantilla_list_filtra_por_agencia` — agente A ve sólo sus plantillas; plantilla de agencia B no aparece.

**Aplicación exitosa**:
4. `test_aplicar_plantilla_viaje_borrador_ok` — POST con `plantilla_id` válido → 200, response `itinerario.etapas` con N etapas, `plantilla_origen` del `ItinerarioViaje` seteado.
5. `test_aplicar_plantilla_a_viaje_sin_etapas_previas` — vía ItinerarioViaje vacío → 200, etapas = etapas de la plantilla, slug/codigo únicos.
6. `test_aplicar_plantilla_idempotente_reemplazo` — aplicar dos veces la misma plantilla → conteo estable, no duplica, slugs únicos.
7. `test_re_aplicar_plantilla_distinta_reemplaza_etapas` — viaje con plantilla A (3 etapas, 2 actividades c/u); aplicar plantilla B (2 etapas, 0 actividades); validar: `etapas.count()==2`, 0 actividades (todas viejas eliminadas en cascada), `plantilla_origen==B`.

**Validación de tenant**:
8. `test_aplicar_plantilla_de_otra_agencia_400` — agente A invoca con `plantilla_id` de agencia B → 400 con `plantilla_id` en data, nunca aplica.
9. `test_aplicar_plantilla_viaje_otra_agencia_404` — agente A invoca con `viaje_id` de agencia B → 404 (no revela existencia).

**Validación de estado**:
10. `test_aplicar_plantilla_viaje_cerrado_400` — viaje en `cerrado` → 400 con `detail`.
11. `test_aplicar_plantilla_viaje_archivado_400` — ídem `archivado`.
12. `test_aplicar_plantilla_viaje_activo_con_inscripciones_retorna_warning` — viaje `activo` con 1+ inscripciones activas y etapas previas → 200 con `warning` no nulo y mensaje estable. Etapas reemplazadas OK.

**Errores**:
13. `test_aplicar_plantilla_uuid_invalido_400` — body con UUID mal formado → 400 estándar DRF.
14. `test_aplicar_plantilla_sin_body_400` — body vacío → 400 con `plantilla_id` requerido.

**Doble submit / reintento** (test defensivo extra del revisor):
15. `test_aplicar_plantilla_no_duplica_si_response_se_reintenta` — dos POST consecutivos con mismo `plantilla_id` no duplican etapas; el segundo reemplaza al primero (idempotencia real, no suma).

**Cobertura existente preservada**: 240 tests actuales siguen OK.

### Casos de UI a probar

| # | Caso | Esperado |
|---|---|---|
| U1 | Abrir `/backoffice/viajes/{id}/itinerario` para viaje con ItinerarioViaje vacío | Selector visible con plantillas de la agencia; botón Aplicar deshabilitado sin selección. |
| U2 | Elegir plantilla + Aplicar | "aplicando…" → botón se libera → lista de etapas se reemplaza (cant_etapas == plantilla.cant_etapas). |
| U3 | Aplicar a viaje con etapas existentes | Modal de confirmación con conteo exacto (N etapas, M actividades). Botones claros. |
| U4 | Cancelar modal | No request; estado local intacto. |
| U5 | Aplicar a viaje con inscripciones activas | Modal muestra bloque de warning inscripciones. Tras Aplicar, banner verde efímero + warning visible 5s. |
| U6 | Aplicar a viaje cerrado (forzando estado) | Banner rojo con mensaje backend (400 detail). |
| U7 | Sesión caducada → Aplicar | `fetchApi` refresca token 401 → reintenta → 200. |
| U8 | Error de red (gateway abajo) | Banner rojo genérico; botón reactivado. |
| U9 | Responsive mínimo (375px) | Selector + botón en columna, no se desborda. |

### Mini-smoke test post-merge

Vía gateway `:3001` con cookie JWT `agente@tottem.com`:

| Endpoint | Resultado esperado |
|---|---|
| `GET /api/v1/itinerarios-plantilla/` | 200, lista con 9 plantillas, `cant_etapas` correcto. |
| `POST /api/v1/viajes/{viaje_borrador_id}/aplicar-plantilla/` body `{plantilla_id}` | 200, response `itinerario.etapas` con N etapas copiadas. |
| `GET /api/v1/viajes/{viaje_id}/itinerario/` (post-aplicación) | 200, etapas coherentes. |
| `POST /api/v1/viajes/{viaje_cerrado_id}/aplicar-plantilla/` | 400 con `detail`. |
| `POST /api/v1/viajes/{viaje_otra_agencia_id}/aplicar-plantilla/` | 404. |
| Logs backend | 0 errores 500 en 30 min post-aplicación. |

Frontend:
- `npm run build` limpio.
- Wizard/inscripción de un viaje con itinerario aplicado → no rompe `/api/v1/inscripciones/{id}/itinerario/`.

Suite backend:
- `python manage.py test` → 240 + 15 = 255 OK.

### Documentación a actualizar post-merge (lección TD-001: no documentar hasta merged)

- `BUSINESS_RULES.md-final`: añadir BR-ITI-10/11/12/13.
- `AI_CONTEXT.md-final`: añadir invariantes nuevos (tenant en plantilla, idempotencia de re-aplicación, estados bloqueados).
- `docs/TASK-204.md`: este archivo (commiteado antes de implementar, como spec).

---

## Archivos a tocar (inventario)

**Backend**:
- `viajes/migrations/0012_task_204_plantilla_agencia.py` — nuevo.
- `viajes/models.py` — añadir `agencia` FK en `ItinerarioPlantilla`.
- `viajes/serializers.py` — `ItinerarioPlantillaSerializer`, `AplicarPlantillaSerializer`.
- `viajes/views.py` — `ItinerarioPlantillaListView`, `ViajeAplicarPlantillaView`.
- `viajes/urls.py` — nueva ruta `POST /viajes/<uuid:viaje_id>/aplicar-plantilla/` y tramo `itinerarios-plantilla/`.
- `config/urls.py` — incluir `itinerarios-plantilla/` fuera del prefijo `viajes/`.
- `viajes/tests.py` — 15 tests nuevos.
- `viajes/admin.py` — `ItinerarioPlantillaAdmin` filtra por agencia.

**Frontend**:
- `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/page.tsx` — `getPlantillas` + props nuevas.
- `frontend/components/agente/SelectorPlantilla.tsx` — nuevo (~120 líneas Tailwind puro).
- `frontend/components/agente/ConstructorItinerario.tsx` — recibe `plantillas`, `tieneInscripciones`, renderiza `<SelectorPlantilla>`, expone `setEtapas` vía callback.

**Docs**:
- `docs/TASK-204.md` — este archivo.
- `BUSINESS_RULES.md-final` y `AI_CONTEXT.md-final` — post-merge.

**No se toca**:
- `services.py` (reutiliza `aplicar_plantilla_a_viaje` sin cambios, sólo verificar `transaction.atomic()`).
- `inscripciones/views.py`, seed scripts, señales.

---

## Orden de implementación

1. Commit `docs:` con este archivo (`docs/TASK-204.md`).
2. Commit `feat(viajes): TASK-204 migración plantilla.agencia + backfill` — `0012_task_204_plantilla_agencia.py` y ajuste de `models.py`. Validar migración en bd local.
3. Commit `feat(viajes): TASK-204 endpoint listado + aplicación plantilla` — serializers, views, urls, admin. Tests backend.
4. Commit `feat(frontend): TASK-204 selector de plantilla + modal confirmación` — `SelectorPlantilla.tsx`, ajuste de `page.tsx` y `ConstructorItinerario.tsx`.
5. Commit `test`: validación de suite completa + smoke (no se commitea el resultado, sólo evidencia en PR).
6. PR a main con body de este archivo + reporte de verificación.
7. Post-merge: `docs:` actualizando `BUSINESS_RULES.md-final` y `AI_CONTEXT.md-final`.

---

## Plan de rollback (no ejecutado — innecesario en dev)

```bash
docker compose exec db pg_restore -U tottem -d tottem_hub -c /tmp/task204_before.sql
docker compose exec backend python manage.py migrate viajes 0011
```

En entornos compartidos: `pg_dump` previo + validación A/A+B en BD paralela antes de aplicar.