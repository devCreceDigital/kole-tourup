# TASKS_MODULO_GRUPISTA_VIAJES.md — Backlog Fase 1 (Normalización)

> Generado: 2026-07-13
> Actualizado: 2026-07-13 09:43 — verificación de código real (grep) completada para TASK-207 y TASK-201
> Fuente: `docs/prd-modulo-grupista-viajes.pdf` + `docs/prd-wireframes-grupista-viajes.html` (ya versionados en el repo, no son adjuntos externos)
> Formato compatible con el protocolo de `CLAUDE_RULES.md` y `PROTOCOLO_VALIDACION_TAREAS.md`

---

## ⚠️ Nota de persistencia (2026-07-13)

Este archivo **no existía en el repo** al momento de iniciar TASK-207 — el agente de código confirmó con grep que no hay `*TASK-207*`, ni referencia en `AGENTS.md` ni en ningún `.md` del proyecto. Toda la especificación de este backlog vivía únicamente en la conversación con el usuario.

**Acción obligatoria antes de escribir cualquier migración:** copiar este archivo completo a `docs/TASK-207.md` (o mantenerlo como `docs/TASKS_MODULO_GRUPISTA_VIAJES.md`) mediante un commit `docs:` separado, sin código, ANTES de tocar `models.py`. Esto evita que el agente pierda contexto entre sesiones y tenga que re-verificar contra la palabra del usuario en lugar de contra el repo.

---

## Instrucciones para el agente

- **Antes de empezar cualquier tarea de este backlog, leer `docs/prd-modulo-grupista-viajes.pdf` y `docs/prd-wireframes-grupista-viajes.html` directamente del repo** — ya están commiteados ahí, no hace falta que el usuario los vuelva a adjuntar. Usarlos como fuente de verdad de wireframes/RF-IDs citados en cada tarea de este archivo.
- **Una sola tarea por sesión** (R-07). No combinar, no anticipar.
- **TASK-200 es bloqueante y no técnica** — requiere una decisión del usuario, no código. Ninguna otra tarea de este backlog empieza hasta que TASK-200 quede resuelta y documentada en `DECISIONS.md-final`.
- Al cerrar cada tarea, aplicar `PROTOCOLO_VALIDACION_TAREAS.md` completo (suite completa, git limpio, docs sincronizados, sin IDs duplicados).
- Todo modelo nuevo sigue los patrones ya establecidos en el proyecto: UUID v4 PK (R-05), catálogo-maestro + puente-con-precio donde aplique (patrón `Complemento`/`ComplementoViaje`), signals para efectos secundarios, `agencia_id` filtrado en cada endpoint (BR-G-02).
- El wizard, el editor de itinerario y cualquier UI rica van a `frontend/app/(agente)/backoffice/`. **Nada de este backlog se implementa en Django admin.**
- **No asumir estado de código a partir de `Task.md`/`DATABASE.md-final` optimistas.** Verificar siempre con grep/lectura directa antes de diseñar (lección TD-001 / TASK-105).

---

## 🔍 Verificación de código real (grep) — previa a TASK-207 y TASK-201

Ejecutada 2026-07-13. Resultados confirmados contra `backend/apps/viajes/models.py` e `backend/apps/inscripciones/models.py`:

| Verificación | Resultado |
|---|---|
| `Hotel` — cardinalidad con `Viaje` | `ForeignKey(Viaje, related_name="hoteles")` — **ya es 1:N**, coincide con DEC-010 |
| `Hotel` — campos existentes | `nombre`, `descripcion`, `tasa_turistica`, `fianza`, `telefono`, `latitud`, `longitud`, `web_url`, `maps_url`, `slug`. **No tiene** `categoria`, `destino` ni vínculo a `EtapaItinerario` |
| Vínculo `Hotel` ↔ `EtapaItinerario` | **No existe** — cero FK entre ambos modelos. No es un vínculo parcial a completar, es diseño nuevo sobre modelo existente |
| `Inscripcion.hotel_asignado` | `ForeignKey('viajes.Hotel', on_delete=SET_NULL, null=True, blank=True, related_name='inscripciones')` — asignación por inscripción individual, no por viaje completo |
| `Itinerario` — cardinalidad con `Viaje` | `OneToOneField(Viaje, related_name="itinerario")` — modelos.py línea 174/177. **Confirmado, BR-V-06/BR-V-08 vigentes sin cambios hasta que TASK-207 se ejecute** |
| Segunda relación `OneToOneField` en el archivo (línea 123) | Pertenece a `PlanPago` (`related_name="plan_pago"`), **dominio distinto, fuera de alcance de TASK-207** — no compite ni se ve afectado |
| Campo `responsable` en `Viaje` | **No existe** — cero coincidencias en `models.py`. TASK-202 sigue vigente tal cual |
| Editor de itinerario D&D en frontend | Confirmado existente: `frontend/components/agente/ConstructorItinerario.tsx` + ruta `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/`. `@dnd-kit` ya elegido e implementado (TASK-056) |

**Puntos que se rompen al migrar `Itinerario` (OneToOne) → nuevo esquema**, detectados por grep de `.itinerario\b` y `viaje\.itinerario\b`:

| Archivo | Línea(s) | Uso actual | Riesgo si cambia cardinalidad a FK |
|---|---|---|---|
| `viajes/tests.py` | 50, 55 | `.itinerario.id` | Alto — rompe si el accessor pasa a Manager |
| `viajes/tests.py` | 661, 819, 860, 920, 1000 | `self.viaje.itinerario` / `self.viaje_ajeno.itinerario` | Alto — patrón repetido, mismo riesgo |
| `viajes/admin.py` | 78 | `hasattr(obj, 'itinerario')` | Crítico — con Manager, `hasattr` es siempre `True`, deja de detectar ausencia real |
| `viajes/admin.py` | 80 | `.itinerario.etapas.all()` | Alto — `.etapas` no existe en Manager |
| `viajes/admin.py` | 155 | `.itinerario.viaje.nombre` | Alto — `.viaje` no existe en Manager |
| `agencias/.../seed_demo_data.py` | 118 | `viaje.itinerario = ...` | Crítico — asignación directa incompatible con Manager |

**Serializers:** `viajes/serializers.py` no referencia `itinerario` — sin impacto directo.
**Views:** usan `get_object_or_404(Itinerario, viaje=...)` y lookups `itinerario__viaje` (FK forward) — no el accessor reverso, seguro sin cambios.

---

## ✅ Cardinalidad confirmada de `ItinerarioViaje` (aclaración 2026-07-13)

**Fuente de verdad:** este mismo documento, sección TASK-207 más abajo (diagrama original). El agente de código señaló correctamente que no podía verificar esta cardinalidad contra el repo porque el archivo no estaba persistido ahí — queda resuelto con esta actualización.

```
ItinerarioViaje (instancia aplicada — nuevo puente, copia independiente)
├── viaje               — OneToOne → Viaje (cada viaje sigue teniendo UN itinerario aplicado)
├── plantilla_origen    — FK → ItinerarioPlantilla, nullable (trazabilidad, no fuente en vivo)
└── etapas propias      — EtapaItinerario del viaje, copiadas de la plantilla al aplicar
```

**Implicación directa para el DoD de TASK-207:** `ItinerarioViaje.viaje` mantiene la **misma cardinalidad OneToOne** que el `Itinerario.viaje` actual. Lo que cambia no es cuántos itinerarios puede tener un viaje (sigue siendo uno), sino que las etapas maestras ahora viven en `ItinerarioPlantilla` (reutilizable entre viajes), mientras `ItinerarioViaje` guarda una copia propia.

**Consecuencia sobre los 7 puntos de ruptura detectados:** al mantenerse OneToOne, el accessor reverso `viaje.itinerario` (o su nuevo nombre si cambia el `related_name`) **sigue devolviendo un objeto único, no un Manager**. Los 7 puntos probablemente solo requieren:
1. Renombrar referencias de la clase `Itinerario` a `ItinerarioViaje` donde corresponda (imports, `isinstance`, admin).
2. Confirmar si el `related_name` se mantiene como `"itinerario"` o cambia — de mantenerse, el impacto en `tests.py`/`admin.py`/`seed_demo_data.py` se reduce a casi cero.

**Acción pendiente para el agente:** re-verificar los 7 puntos con esta cardinalidad confirmada y actualizar el DoD de TASK-207 indicando si el fix es solo rename o requiere lógica adicional.

---

## ✅ Decisiones resueltas (2026-07-13) — registrar en `DECISIONS.md-final` antes de tocar código

Las 4 decisiones bloqueantes del backlog original ya fueron resueltas por el usuario. **Primer paso de cualquier tarea de este archivo: confirmar que las 4 entradas siguientes existen en `DECISIONS.md-final` con estos IDs exactos; si no existen, crearlas ANTES de escribir código.**

### DEC-009 — Complementos = Servicios/Tarifas del PRD (mismo concepto)

**Decisión:** El precio de un viaje en Totem Travel es fijo (no varía por categoría de pasajero adulto/niño). "Servicios y Tarifas" del PRD (RF-10) es el mismo concepto que el módulo `Complemento`/`ComplementoViaje`/`ComplementoContratado` ya existente (BR-COMP-01 a 07). No se crea ningún modelo nuevo.

**Impacto:** TASK-200 queda cerrada sin código de backend. El único trabajo es de **naming en la UI** — la pestaña "Servicios y Tarifas" del detalle de viaje (wireframe #3) debe listar los `ComplementoViaje` existentes bajo esa etiqueta. Ver TASK-205.

### DEC-010 — Alojamiento: relación 1:N con Viaje (multi-destino)

**Decisión:** Un viaje típico de Totem Travel puede tocar varias ciudades/hoteles (multi-destino). **Confirmado por grep:** `Hotel` YA es `ForeignKey` hacia `Viaje` — cumple la relación 1:N sin cambios de esquema en ese punto. Un viaje puede tener 0, 1 o varios hoteles asociados.

**Impacto directo (actualizado tras verificación de código):** NO se crea `Alojamiento`/`AlojamientoViaje` como modelo nuevo — se **extiende** `Hotel` con los campos faltantes (`categoria`, `destino`) y se diseña desde cero el vínculo a un tramo/destino del itinerario, que hoy no existe en absoluto (no es un vínculo parcial a completar). Ver TASK-201 actualizada.

### DEC-011 — Responsable de viaje: obligatorio siempre

**Decisión:** Todo viaje debe tener un agente responsable asignado desde su creación, sin excepción, incluso en estado `borrador`. Campo FK `responsable` en `Viaje` con `null=False` (no `nullable`).

**Confirmado por grep:** el campo no existe en `models.py` — cero ambigüedad, TASK-202 procede directo.

**Impacto:** El wizard de creación (TASK-204, paso 3) no puede completarse sin seleccionar responsable — es un campo obligatorio del formulario, no un paso que se pueda saltar.

### DEC-012 — Itinerario: reutilizable entre viajes, con copia-al-aplicar (rompe BR-V-06/BR-V-08 actuales)

**Decisión:** Un itinerario debe poder aplicarse a varios viajes distintos (ej. vender "5D4N Cusco" tres veces al año reutilizando la misma estructura de días/eventos), no ser exclusivo de un solo viaje como hoy. **Mecanismo confirmado: copia-al-aplicar** — al asignar una `ItinerarioPlantilla` a un viaje, sus `EtapaItinerario` se copian a una instancia propia del viaje (`ItinerarioViaje`), editable sin afectar la plantilla maestra ni otros viajes que la usan.

**Impacto — el más grande de las 4 decisiones:** Esto **contradice directamente `BR-V-06` y `BR-V-08`** (relación 1:1 automática Viaje↔Itinerario). No es un cambio de UI, es un cambio de modelo de datos con migración de datos existente. Requiere su propia tarea dedicada — ver **TASK-207** (nueva, antes que nada de TASK-204).

**Cardinalidad confirmada (2026-07-13):** `ItinerarioViaje.viaje` es `OneToOneField` — misma cardinalidad que el `Itinerario.viaje` actual. Lo reutilizable es `ItinerarioPlantilla`, no la relación viaje↔instancia-aplicada. Ver sección de verificación de código arriba.

**Acción inmediata:** Actualizar `BUSINESS_RULES.md-final` (`BR-V-06`, `BR-V-08`) y `AI_CONTEXT.md-final` en cuanto TASK-207 quede implementada y migrada — no antes, para no documentar un modelo que aún no existe.

---

## 🟠 Fase 1 — Normalización (backlog técnico, depende de TASK-200)

### TASK-201 — Extender `Hotel` existente (NO crear modelo `Alojamiento` paralelo)

**Ref PRD:** RF-06, HU-04, wireframe #4 (§8) | **Ref decisión:** DEC-010
**Actualizado tras verificación de código (2026-07-13):** el diseño original de este documento proponía crear `Alojamiento` + `AlojamientoViaje` desde cero. Grep confirmó que `Hotel` (`apps.viajes.models.Hotel`) ya existe con relación 1:N a `Viaje` — crear un modelo paralelo generaría duplicación de dominio. **Se descarta esa ruta.**

**Diseño actualizado — extender `Hotel`, no reemplazarlo:**
```
Hotel (ya existe, apps.viajes.models.Hotel)
├── nombre, descripcion, tasa_turistica, fianza, telefono,
│   latitud, longitud, web_url, maps_url, slug   — ya existen
├── categoria          — NUEVO, ej. 3/4/5 estrellas
├── destino            — NUEVO
└── etapa_itinerario   — NUEVO, FK → EtapaItinerario, nullable
                          (vincula el hotel a un rango de días específico;
                          nullable para viajes de un solo destino)
```

**⚠️ Decisión de diseño pendiente, a confirmar con el usuario antes de migrar (sin cambios respecto al análisis original):** ¿el vínculo `Hotel → EtapaItinerario` es por **etapa individual** (un hotel por día) o por **rango de etapas** (un hotel cubre los días 1 a 3, otro los días 4 a 5)? La segunda opción es más realista para multi-destino pero requiere campos adicionales (`etapa_inicio`, `etapa_fin`) en vez de una FK simple. Preguntar antes de escribir la migración — no asumir.

**Archivos afectados:**
- `backend/apps/viajes/models.py` — extender `class Hotel` existente, NO crear app/modelo nuevo
- Migración nueva (agregar campos, no crear tabla nueva desde cero)
- `backend/apps/viajes/admin.py` (gestión interna de catálogo)
- `backend/apps/viajes/serializers.py` + endpoint DRF (ajustar el ya existente, no duplicar)
- `frontend/app/(agente)/backoffice/viajes/[id]/hoteles/` (adaptar a soportar vínculo a tramo si aplica)

**DoD:**
- [ ] Vínculo etapa-individual-vs-rango resuelto con el usuario antes de migrar.
- [ ] Confirmado que no se creó ningún modelo `Alojamiento` paralelo — solo extensión de `Hotel`.
- [ ] Endpoint filtrado por `agencia_id` (BR-G-02).
- [ ] `Inscripcion.hotel_asignado` revisado — ajustar solo si el nuevo vínculo a etapa lo requiere.

---

### TASK-202 — Campo `responsable` en `Viaje` (obligatorio)

**Ref PRD:** RF-08, HU-instrucción "Paso 3: responsable y validaciones previas a crear" | **Ref decisión:** DEC-011

**Confirmado por grep:** el campo no existe en `models.py`. Proceder directo con `null=False, blank=False`.

**Archivos afectados:**
- `backend/apps/viajes/models.py` — FK `responsable` → `Usuario` (rol agente), `null=False, blank=False`.
- Migración — **atención especial aquí:** si ya existen viajes en BD sin responsable asignado, la migración no puede aplicar `null=False` directamente sin antes poblar un valor default o pedir al usuario cómo resolver los registros existentes. Verificar con:
  ```bash
  docker compose exec backend python manage.py shell -c "
  from apps.viajes.models import Viaje
  print(Viaje.objects.filter(responsable__isnull=True).count() if hasattr(Viaje, 'responsable') else 'campo no existe aún')
  "
  ```
  Si hay registros existentes sin responsable, **parar y preguntar al usuario** cómo asignarlos (¿un agente por defecto? ¿manual uno por uno?) antes de aplicar la constraint — no usar un valor arbitrario en silencio.
- Serializer del wizard de creación (ver TASK-204/TASK-207)

**DoD:**
- [ ] Confirmado que el campo no existe (grep ya realizado — sin duplicar migración).
- [ ] Si hay viajes existentes sin responsable, resuelto con el usuario antes de aplicar `null=False` (no asumido).
- [ ] Wizard de creación no permite avanzar sin seleccionar responsable (validación de frontend + backend).

---

### TASK-203 — Endpoint de listado de viajes con columnas del PRD (RF-01, RF-02)

**Problema:** El PRD pide tabla con ID, nombre interno, código, estado, itinerario, responsable, operaciones, más filtros por estado/fechas/responsable/publicación.

**Archivos afectados:**
- `backend/apps/viajes/views.py` — endpoint de listado con filtros (`django-filter` o query params manuales, seguir convención ya usada en el proyecto)
- `frontend/app/(agente)/backoffice/viajes/page.tsx`

**DoD:**
- [ ] Filtrado por `agencia_id` (BR-G-02) — el listado nunca muestra viajes de otra agencia.
- [ ] Exportaciones (CSV/XLSX/PDF) reutilizan `BR-EXP-01/02` ya existente, no se reinventan.

---

### TASK-207 — [PREREQUISITO DE TASK-204] Migrar `Itinerario` de exclusivo-por-viaje a reutilizable

**Ref decisión:** DEC-012 (mecanismo confirmado: **copia-al-aplicar**) | **Prioridad:** la tarea de mayor riesgo de todo este backlog — la migración de datos se prueba contra copia de BD antes de tocar el entorno real.

**Estado actual verificado por grep (2026-07-13):** `Itinerario.viaje` es `OneToOneField(Viaje, related_name="itinerario")` en `models.py` línea 174/177. La segunda relación `OneToOneField` del archivo (línea 123) pertenece a `PlanPago` — dominio distinto, no afectado por esta migración.

**Problema:** `BR-V-06`/`BR-V-08` establecen que el sistema crea automáticamente un `Itinerario` vacío en relación 1:1 con cada `Viaje`. DEC-012 exige que un itinerario se pueda reutilizar entre varios viajes, copiándose al aplicarse (no como referencia viva).

**Diseño confirmado:**
```
ItinerarioPlantilla (activo reutilizable — reemplaza al Itinerario actual como "maestro")
├── nombre             — ej. "5D4N Cusco Clásico"
├── destinos            — lista/FK a destinos
├── dias_totales
└── etapas (EtapaItinerario, ahora FK a ItinerarioPlantilla en vez de a Viaje)

ItinerarioViaje (instancia aplicada — nuevo puente, copia independiente)
├── viaje               — OneToOne → Viaje (cada viaje sigue teniendo UN itinerario aplicado;
│                          MISMA cardinalidad que el Itinerario.viaje actual, confirmado 2026-07-13)
├── plantilla_origen    — FK → ItinerarioPlantilla, nullable (de dónde se copió, para trazabilidad —
│                          NO es la fuente de datos en vivo, solo referencia histórica)
└── etapas propias      — EtapaItinerario del viaje, copiadas de la plantilla al momento de aplicar;
                           editar estas NO modifica ItinerarioPlantilla ni otros viajes que la usaron
```

**Mecanismo de copia (implementar en `apps.viajes.services` o similar, fuera del serializer para que sea testeable de forma aislada):**
```python
def aplicar_plantilla_a_viaje(viaje, plantilla: ItinerarioPlantilla) -> ItinerarioViaje:
    itinerario_viaje = ItinerarioViaje.objects.create(viaje=viaje, plantilla_origen=plantilla)
    for etapa_plantilla in plantilla.etapas.all():
        EtapaItinerario.objects.create(
            itinerario=itinerario_viaje,
            dia_numero=etapa_plantilla.dia_numero,
            # ... copiar el resto de campos, generar slug/codigo nuevo (BR-ITI-04) por instancia
        )
    return itinerario_viaje
```
> La copia debe generar `slug`/`codigo` propios por instancia (BR-ITI-04 sigue aplicando), no reutilizar los de la plantilla — de lo contrario dos viajes con la misma plantilla tendrían slugs duplicados.

**Puntos de código a actualizar (grep 2026-07-13, cardinalidad OneToOne confirmada — impacto reducido a rename, verificar caso por caso):**

| Archivo | Línea(s) | Uso actual | Acción esperada |
|---|---|---|---|
| `viajes/tests.py` | 50, 55, 661, 819, 860, 920, 1000 | `.itinerario.id` / `self.viaje.itinerario` / `self.viaje_ajeno.itinerario` | Verificar si solo requiere ajuste de clase/import (`Itinerario`→`ItinerarioViaje`) dado que sigue OneToOne |
| `viajes/admin.py` | 78, 80, 155 | `hasattr(obj, 'itinerario')`, `.itinerario.etapas.all()`, `.itinerario.viaje.nombre` | Igual — confirmar si el related_name se mantiene como `"itinerario"` |
| `agencias/.../seed_demo_data.py` | 118 | `viaje.itinerario = ...` | Ajustar a la nueva clase si el related_name o la clase cambian |

**Archivos afectados:**
- Migración de datos (no solo de esquema): los `Itinerario` existentes 1:1 deben convertirse en `ItinerarioPlantilla` + `ItinerarioViaje` (con sus `EtapaItinerario` ya copiadas, no solo referenciadas) sin perder ninguna etapa ya cargada. **Esto se prueba primero contra una copia de la BD, nunca directo en producción.**
- `backend/apps/viajes/models.py`, `serializers.py`, `admin.py`, `services.py` (función de copia)
- Actualizar `BUSINESS_RULES.md-final` (BR-V-06, BR-V-08) y `AI_CONTEXT.md-final` **solo después** de que la migración esté probada y aplicada — no antes.
- `frontend/app/(agente)/backoffice/viajes/nuevo/` (paso 2 del wizard ahora lista `ItinerarioPlantilla` existentes, no crea uno vacío automáticamente)

**DoD:**
- [ ] Cardinalidad `ItinerarioViaje.viaje = OneToOneField` confirmada y documentada (hecho 2026-07-13).
- [ ] Los 7 puntos de código detectados (tests.py, admin.py, seed_demo_data.py) re-verificados con la cardinalidad confirmada — documentar si el fix es solo rename o requiere lógica adicional.
- [ ] `PlanPago` confirmado fuera de alcance — sin cambios en su OneToOneField ni en su related_name `plan_pago`.
- [ ] Función de copia testeada de forma aislada: aplicar la misma plantilla a 2 viajes distintos, editar el itinerario de uno, confirmar que el otro y la plantilla maestra quedan intactos.
- [ ] `slug`/`codigo` únicos por instancia confirmados (no duplicados entre viajes que comparten plantilla).
- [ ] Migración de datos probada contra copia de BD antes de aplicar en el entorno real — mostrar conteo de `Itinerario`/`EtapaItinerario` antes y después para confirmar cero pérdida de datos.
- [ ] `BR-V-06`/`BR-V-08` actualizadas en ambos documentos (`BUSINESS_RULES.md-final` y `AI_CONTEXT.md-final`) reflejando el nuevo modelo, sin dejar fila vieja + fila nueva con el mismo ID (aplicar la lección de `BR-V-01` de la ronda anterior).
- [ ] Suite completa corrida tras la migración — comparar conteo de tests antes/después (protocolo de validación, punto 2).
- [ ] Este documento (o su equivalente `docs/TASK-207.md`) commiteado en el repo ANTES de escribir la migración de esquema.

---

### TASK-204 — Wizard de creación de viaje (4 pasos)

**Ref PRD:** RF-03, wireframe #2 | **Depende de:** TASK-202 (responsable), **TASK-207 (itinerario reutilizable — bloqueante real, no construir el paso 2 del wizard sin TASK-207 cerrada)**

**Confirmado por grep:** el único wizard existente en el proyecto es el de inscripción del padre (P2, 3 pasos) — no existe wizard de creación de viaje para el agente. La creación de `Viaje` sigue siendo el flujo simple que auto-crea el `Itinerario` vacío (BR-V-06 sin cambios hasta TASK-207).

**Problema:** UI multi-paso: (1) datos base + código + etiquetas, (2) selector de `ItinerarioPlantilla` existente (ya no "itinerario 1:1 recién creado vacío" — cambia por TASK-207), (3) responsable (ahora obligatorio, DEC-011), (4) confirmación + accesos rápidos a configuración posterior.

**DoD:**
- [ ] Paso 2 lista plantillas reutilizables reales (post-TASK-207), no un mock.
- [ ] Paso 3 no permite avanzar sin responsable seleccionado (DEC-011, sin excepciones).
- [ ] Validación mínima antes de crear (nombre + plantilla de itinerario obligatorios).
- [ ] Tras crear, redirige a detalle del viaje.

---

### TASK-205 — Vista de detalle del viaje (hub central)

**Ref PRD:** wireframe #3, RF-04 | **Depende de:** TASK-207 (para que el panel de completitud pueda reflejar itinerario aplicado real), TASK-201 (alojamiento(s))

**Problema:** Cabecera sticky + tabs (Configuración, Descripciones, Servicios, Tarifas, Viajeros, Documentación) + panel de completitud.

**Resuelto por DEC-009:** la pestaña "Servicios y Tarifas" consume directamente `ComplementoViaje` existente — no hay modelo nuevo que construir, solo el componente de UI que liste/edite complementos bajo esa etiqueta.

**Archivos afectados:**
- `frontend/app/(agente)/backoffice/viajes/[id]/page.tsx` + subrutas por tab
- Endpoint agregador que devuelva resumen de completitud (¿tiene itinerario aplicado? ¿hotel(es) asignado(s)? ¿documentación requerida configurada?)

**DoD:**
- [ ] Pestaña "Servicios y Tarifas" lista `ComplementoViaje` del viaje, reutilizando el endpoint existente de Complementos.
- [ ] El checklist de completitud refleja datos reales (post-TASK-207 para itinerario, post-TASK-201 para hotel(es) — ahora plural), no un mock estático.
- [ ] Acciones "Ver viaje" y "Exportar" visibles y funcionales desde la cabecera (RF-12, RF-13, ya existen los endpoints subyacentes).

---

### TASK-206 — Adaptar el editor de itinerario ya existente (NO construir desde cero)

**Ref PRD:** RF-07, wireframe #5
**Actualizado tras verificación de código (2026-07-13):** confirmado que `frontend/components/agente/ConstructorItinerario.tsx` y la ruta `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/` ya existen, con `@dnd-kit` implementado y endpoint de reordenamiento en bloque (`PATCH /actividades/reordenar/`, BR-ITI-03). **Esta tarea NO construye el editor — lo adapta al nuevo modelo `ItinerarioViaje` post-TASK-207.**

**Archivos afectados:**
- `frontend/components/agente/ConstructorItinerario.tsx` — ajustar referencias de `Itinerario` a `ItinerarioViaje` si el modelo/endpoint cambia de nombre.
- `frontend/app/(agente)/backoffice/viajes/[id]/itinerario/` — ajustar fetch/mutations al nuevo esquema.
- Backend: agregar acción "duplicar día/evento" si no existe (grep primero — puede que solo falte `reordenar`, no duplicar).

**DoD:**
- [ ] Reordenar sigue usando el endpoint en bloque existente, no PATCH individuales (invariante ya establecido, no reabrir el error #9 de `AI_CONTEXT.md-final`).
- [ ] Grep confirmado de qué operaciones (duplicar, eliminar) ya existen en backend antes de asumir que hay que crearlas.
- [ ] Confirmado que no se reescribió el componente D&D desde cero — solo se adaptó al nuevo modelo.

---

## 🟡 Fase 2 — Orquestación (no planificar en detalle todavía)

Según el propio roadmap del PRD: conectar mejor itinerario, servicios, tarifas, documentación y viajeros dentro del detalle del viaje. **No desglosar en tareas hasta cerrar Fase 1** — evita el mismo error de scope creep que ya vimos en TASK-105.

## 🟢 Fase 3 — Optimización (backlog futuro)

Indicadores de completitud avanzados, validaciones proactivas, automatizaciones, auditoría/exportación enriquecida. Fuera de alcance hasta Fase 2 cerrada.

---

## Resumen — decisiones resueltas + verificación de código completada

| ID | Decisión | Resuelto | Verificado por grep | Sub-decisión técnica que aún falta |
|---|---|---|---|---|
| DEC-009 | Complementos = Servicios/Tarifas | ✅ | N/A (sin modelo) | Ninguna — solo trabajo de naming en UI |
| DEC-010 | Alojamiento 1:N | ✅ | ✅ `Hotel` ya es FK 1:N | Vínculo etapa-individual vs. rango de etapas (TASK-201) |
| DEC-011 | Responsable obligatorio | ✅ | ✅ campo confirmado ausente | Qué hacer con viajes existentes sin responsable, si los hay (TASK-202) |
| DEC-012 | Itinerario reutilizable, copia-al-aplicar | ✅ | ✅ `Itinerario` confirmado OneToOne; cardinalidad de `ItinerarioViaje` confirmada igual | Re-verificar los 7 puntos de código con cardinalidad confirmada (TASK-207) |

**Orden de ejecución actualizado:**
```
TASK-207 (migración itinerario — la más riesgosa, primero y sola)
    ↓
TASK-201 (extender Hotel — NO crear modelo nuevo)
TASK-202 (responsable obligatorio)
    ↓ (pueden ir en paralelo entre sí, ambas después de TASK-207)
TASK-203 (listado de viajes)
TASK-204 (wizard — depende de 202 y 207)
TASK-205 (detalle del viaje — depende de 207, 201, y de DEC-009 ya resuelta)
TASK-206 (adaptar editor de itinerario ya existente — depende de 207)
```

**Todas las decisiones y sub-decisiones de diseño quedaron cerradas, y el estado del código real fue verificado contra ellas (2026-07-13).** El agente puede empezar directamente por TASK-207 sin necesidad de otra ronda de aprobación de diseño — solo aplica el protocolo de validación al cierre de cada tarea, como siempre. **Primer paso obligatorio antes de cualquier migración: commitear este documento actualizado en `docs/` del repo.**
