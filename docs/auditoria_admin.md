# Auditoría de Admin — Django Admin

> Fecha: 2026-07-12  
> Alcance: Todos los `admin.py` del backend (13 archivos)  
> Método: Revisión sistemática de inlines, formfield_for_foreignkey, get_queryset, readonly_fields, field references

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Archivos admin.py auditados | 13 |
| Bugs críticos (crash) | 1 |
| Bugs de creación bloqueada | 3 |
| Fugas multi-tenancy | 8 |
| Modelos sin registrar | 2 |
| Archivos sin issues | 5 |

---

## Matriz de hallazgos

### 🔴 CRITICAL — Crash

| ID | Archivo | Línea | Problema | Fix |
|----|---------|-------|----------|-----|
| C1 | `inscripciones/admin.py` | 53-56 | `Alumno.objects.filter(agencia=...)` pero `inscripciones.models.Alumno` no tiene campo `agencia` → `FieldError` | Eliminado el bloque; `InscripcionAlumno` registrado independientemente |

### 🟠 Creación bloqueada

| ID | Archivo | Línea | Problema | Fix |
|----|---------|-------|----------|-----|
| B1 | `viajes/admin.py` | 11-15 | `CuotaInline`: `extra=0` + `numero_cuota` readonly → no se pueden crear cuotas nuevas | `extra=1`, readonly eliminado |
| B2 | `viajes/admin.py` | 147-153 | `EtapaItinerarioAdmin.readonly_fields=['itinerario']` → no se puede crear etapa standalone | readonly eliminado |
| B3 | `viajes/admin.py` | 167-173 | `formfield_for_foreignkey` busca `viaje`; el campo real es `itinerario` → código muerto | Corregido a `itinerario` |

### 🟡 Multi-tenancy — Sin filtro por agencia

| ID | Archivo | Problema | Fix |
|----|---------|----------|-----|
| M1 | `pagos/admin.py` | Sin `get_queryset` ni `formfield_for_foreignkey` en 4 FK | Agregado ambos |
| M2 | `comunicados/admin.py` | Sin `get_queryset` ni filtro FK | Agregado ambos |
| M3 | `documentos/admin.py` | Sin `get_queryset` ni filtro FK | Agregado ambos |
| M4 | `notificaciones/admin.py` | `get_queryset` ya existía; **faltaba `formfield_for_foreignkey`** en FK `usuario` (dropdown exponía usuarios de otras agencias). Mismo gap en `PreferenciasNotificacionAdmin`. | **TASK-106 (2026-07-13):** agregado `formfield_for_foreignkey` en ambos admin (filtrando `usuario__agencia=request.user.agencia`). Test de regresión: `test_agente_no_ve_objetos_de_otra_agencia_en_dropdown` en `notificaciones/tests/test_admin_multitenancy.py`. NOTA: descripción original "Sin get_queryset" era parcialmente falsa — `get_queryset` existía previamente; el gap real era el dropdown. |
| M5 | `inscripciones/admin.py:48` | FK `padre_tutor` sin filtrar | Agregado filtro `usuario__agencia` |
| M6 | `inscripciones/admin.py:6-15` | Inlines: `hotel`, `alumno_solicitado` sin filtrar | Agregado `formfield_for_foreignkey` en inlines |
| M7 | `mecenas/admin.py:12-22` | FK `inscripcion` sin filtrar | Agregado filtro |
| M8 | `pagos/admin.py:10` | `estado` en readonly | Removido de readonly en fix inicial. **TASK-100 (2026-07-12):** restaurado a readonly tras cruce con `validacion_flujo_pago.md` §6.1 — el campo editable reabría bypass de auditoría documentado. |

### 🟢 Modelos registrados

| ID | Modelo | App | Situación anterior | Situación actual |
|----|--------|-----|-------------------|------------------|
| R1 | `inscripciones.Alumno` | inscripciones | No registrado | ✅ `InscripcionAlumnoAdmin` |
| R2 | `viajes.Cuota` | viajes | Solo inline de PlanPago | ✅ `CuotaAdmin` |

---

## Archivos sin issues

| Archivo | Razón |
|---------|-------|
| `autenticacion/admin.py` | Filtros por agencia correctos; readonly solo en campos auto-set |
| `agencias/admin.py` | Sin FK; readonly correcto |
| `colegios/admin.py` | Modelo global sin agencia |
| `chat/admin.py` | `get_queryset` y `formfield_for_foreignkey` correctos |
| `auditoria/admin.py` | Log inmutable; readonly programático correcto |
| `exportaciones/admin.py` | Placeholder sin modelos |

---

## Estado post-fix

- `python manage.py check` → 0 silenced
- Todos los FK dropdowns filtrados por agencia (excepto modelos globales)
- Todas las listas filtradas por `get_queryset`
- Todos los inlines con `extra >= 1` o `has_add_permission=False` (consistente)
