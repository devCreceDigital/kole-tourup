# PROTOCOLO_VALIDACION_TAREAS.md — Cómo verificar cualquier tarea antes de aprobarla

> Extraído del ciclo real TASK-100→104.5, donde este protocolo detectó:
> un bypass de auditoría reabierto (M8), una migración aplicada sin commit,
> un falso positivo mal cerrado, y documentación desincronizada entre
> BUSINESS_RULES.md-final y AI_CONTEXT.md-final.
>
> Regla de oro: **el reporte del agente es una hipótesis, no un hecho.**
> Cada punto de este checklist existe porque en algún momento de este
> proyecto un reporte "todo OK" resultó ser falso o incompleto.

---

## Checklist de cierre — aplicar a CUALQUIER tarea antes de aprobarla

### 1. ¿El código existe realmente, no solo en el resumen?

```bash
git status --porcelain          # ¿hay archivos untracked o modified sin commit?
git diff --stat HEAD            # ¿qué cambió realmente?
git log --oneline -5            # ¿el commit existe y tiene el hash que dicen?
```
**Por qué:** la migración de TASK-104 estuvo aplicada en BD durante toda la sesión sin existir en git. Sin este paso no se hubiera detectado.

### 2. ¿Los tests "que pasan" corren contra el proyecto completo, no solo el módulo tocado?

```bash
docker compose exec backend python manage.py test --keepdb --verbosity=2 \
  2>&1 | grep -E "(FAIL|ERROR|^Ran |^FAILED|^OK)"
```
**Por qué:** "128/128 en viajes" no dice nada sobre si se rompió algo en pagos o inscripciones. Correr el proyecto completo (o al menos las apps relacionadas por FK) es la única forma de confirmar cero regresiones.

### 3. Si hay tests que fallan, ¿son pre-existentes o los introdujo esta tarea?

```bash
git stash --include-untracked
docker compose exec backend python manage.py test --keepdb 2>&1 | tail -20
git stash pop
```
Comparar el resultado ANTES vs. DESPUÉS del cambio. Nunca aceptar "son pre-existentes" como afirmación sin la comparación real.
**Por qué:** así se descubrió TD-021 (el 500 en vez de 400) — un fallo que se hubiera archivado como "ruido" sin esta comparación.

### 4. ¿El hallazgo original seguía vigente, o ya estaba resuelto (falso positivo)?

Antes de escribir código de fix, grep del estado actual:
```bash
grep -n "<campo o comportamiento en cuestión>" <archivo>
```
Si el problema ya no existe, **no lo "arregles" de nuevo** — documenta el falso positivo explícitamente (ver plantilla abajo). No dejar el hallazgo original tal cual, porque un agente futuro lo va a reabrir.

**Plantilla de falso positivo (para TECH_DEBT.md-final):**
```
| TD-XXX-FP | <regla o hallazgo original> | **Falso positivo.** <qué se encontró
  realmente> Confirmado en <TASK-ID>. <Por qué el hallazgo quedó desactualizado> |
```

### 5. ¿Los documentos afectados quedaron sincronizados, sin IDs duplicados?

Cualquier ID de regla de negocio o deuda técnica debe ser único:
```bash
grep -n "BR-XXX\|TD-XXX" docs/BUSINESS_RULES.md-final docs/AI_CONTEXT.md-final docs/TECH_DEBT.md-final
```
Si aparece el mismo ID dos veces con redacciones distintas → **fusionar, nunca dejar ambas filas.**
**Por qué:** pasó literalmente con `BR-V-01` tras el fix de TD-021 — el agente agregó una fila nueva en vez de reemplazar la vieja.

### 6. ¿Hay documentos duplicando el mismo invariante que quedaron desincronizados?

Este proyecto tiene reglas repetidas entre `BUSINESS_RULES.md-final` y `AI_CONTEXT.md-final` (y a veces `ARCHITECTURE.md`/`Task.md`). Actualizar solo uno dejó pasar el bug de M8. Preguntar explícitamente:
> "¿Qué otros documentos mencionan esta misma regla, y quedaron actualizados también?"

### 7. Si la tarea afecta admin.py/serializers.py/signals.py — regla R-19

Grep cruzado contra `validacion_*.md` y `auditoria_*.md` para confirmar que el fix no reabre un hallazgo ya documentado en otro archivo (exactamente lo que pasó con M8 → bypass de auditoría en pagos).

### 8. ¿El alcance de la tarea se mantuvo, o hubo scope creep sin aprobación?

Si el agente descubre problemas nuevos mientras ejecuta la tarea (como pasó en TASK-105 con chat/colegios/exportaciones/gateway/idempotencia Celery), **no los resuelve silenciosamente**. Deben presentarse como hallazgos nuevos con ID propio (`TD-0XX`), separados del alcance original, esperando tu aprobación explícita para entrar o no al ciclo actual (R-04).

### 9. Números/conteos raros se explican, nunca se asumen benignos

Si un conteo no cuadra (ej. "5 tareas periódicas cuando se sembraron 4", "177 tests cuando el baseline+nuevos daba 176"), pedir el detalle exacto (nombre por nombre, o test por test) antes de aceptarlo como "todo en orden".

### 10. Reporte final — plantilla mínima que debe traer el agente

```
## Tarea: [ID] — [Nombre]

### Verificado (no solo reportado)
- [ ] git status limpio tras commit
- [ ] Suite completa corrida (no solo el módulo), resultado exacto (Ran X tests... OK/FAILED)
- [ ] Comparación antes/después si había fallos pre-existentes
- [ ] Grep de falso-positivo hecho antes de escribir fix
- [ ] IDs de reglas/deuda sin duplicados tras la edición
- [ ] Documentos duplicados (BUSINESS_RULES/AI_CONTEXT/otros) sincronizados
- [ ] R-19 aplicado si tocó admin/serializers/signals
- [ ] Hallazgos fuera de alcance listados aparte, no resueltos sin aprobación
- [ ] Conteos anómalos explicados uno por uno

### Commit
`<hash>` — `<mensaje que referencia TASK-ID>`
```

---

## Cómo usarlo en la práctica

No necesitas correr los 10 puntos completos en tareas triviales (ej. un rename de variable). Pero para **cualquier tarea que toque**:
- un signal, un admin, un serializer,
- una migración,
- una regla de negocio documentada (`BR-*`),
- o deuda técnica documentada (`TD-*`),

exige el checklist completo antes de aprobar. Es más lento por tarea, pero en este proyecto ya evitó al menos 3 regresiones invisibles en un solo ciclo (P0).
