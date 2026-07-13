# Validación: Flujo de cambio de estado de Pago (PATCH /api/v1/pagos/{id}/)

> **Pago validado:** `fe555f25-c5f9-4150-9459-377dccbefb77`
> **Estado actual:** `verificado`

---

## 1. Pipeline completo

```
Cliente (agente)
  │
  │ PATCH /api/v1/pagos/fe555f25-.../
  │ Content-Type: application/json
  │ {"estado": "verificado"|"rechazado", "notas": "..."}
  │ Cookie: access_token=...
  ▼
Gateway (gateway/server.js)
  │ 1. cors        — verifica Origin, preflight OPTIONS
  │ 2. auth        — cookie access_token → Authorization: Bearer
  │ 3. security    — headers HTTP de seguridad
  │ 4. rateLimit   — contador Redis por IP
  │ 5. router      — sin match (solo GET /health)
  │ 6. fallback    — req.url.startsWith('/api/') → multipart → proxyToDjango
  ▼
Django (backend:8000/api/v1/pagos/<uuid:pk>/)
  │ url: <uuid:pk>/ → PagoVerificarRechazarView.patch()
  ▼
PagoVerificarRechazarView (apps/pagos/views.py:64-90)
```

---

## 2. Validaciones en `PagoVerificarRechazarView.patch()`

| Condición | Validación | Código | Respuesta |
|---|---|---|---|
| Pago existe | `Pago.objects.get(pk=pk)` | `views.py:66` | 404 si no existe |
| `estado` en body | `nuevo_estado in ['verificado', 'rechazado']` | `views.py:72` | 400 si inválido |
| Usuario es agente | `EsAgente` permission | `views.py:39` | 403 si no es agente |
| `notas` opcional | Si está en body, se asigna | `views.py:77` | — |
| Estado anterior | Capturado antes de `save()` | `views.py:75` | Para LogAuditoria |

---

## 3. Efectos secundarios

### 3.1 LogAuditoria (`PAGO_ACTUALIZADO`)

```python
LogAuditoria.objects.create(
    usuario=request.user,
    accion='PAGO_ACTUALIZADO',
    modelo='Pago',
    objeto_id=pago.id,
    valor_anterior={'estado': estado_anterior},
    valor_nuevo={'estado': nuevo_estado},
    ip=request.META.get('REMOTE_ADDR')
)
```

- **Inmutable**: `LogAuditoria.save()` bloquea UPDATE, `delete()` lanza excepción.
- **Consulta de ejemplo**:
  ```python
  LogAuditoria.objects.filter(
      objeto_id='fe555f25-c5f9-4150-9459-377dccbefb77',
      accion='PAGO_ACTUALIZADO'
  )
  ```

### 3.2 Email al tutor

| Estado | Template | Asunto | Variables |
|---|---|---|---|
| `verificado` | `emails/pago_verificado.html` | "Pago verificado - {viaje}" | `nombre_tutor`, `importe`, `nombre_viaje` |
| `rechazado` | `emails/pago_rechazado.html` | "Pago rechazado - {viaje}" | `nombre_tutor`, `importe`, `nombre_viaje`, `motivo` |

```python
def _enviar_email_estado(self, pago):
    tutor = pago.inscripcion.padre_tutor.usuario
    # ...
    send_mail(
        subject=subject,
        message='',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[tutor.email],
        html_message=html,
        fail_silently=True,
    )
```

---

## 4. Propiedades derivadas (consultas en tiempo real)

| Propiedad | Modelo | Código |
|---|---|---|
| `PlanPago.tiene_pagos_verificados` | `apps/viajes/models.py:94` | `self.cuotas.filter(pagos__estado='verificado').exists()` |
| `Inscripcion.total_pagado` | `apps/inscripciones/models.py` | `SUM de pagos where estado='verificado'` |
| `Inscripcion.saldo_pendiente` | `apps/inscripciones/models.py` | `precio_final - total_pagado` |
| `Inscripcion.porcentaje_pagado` | `apps/inscripciones/models.py` | `(total_pagado / precio_final) * 100` |

---

## 5. Resultados de validación

| Aspecto | Estado | Valor |
|---|---|---|
| Pago.estado | ✅ Verificado | `verificado` |
| Pago.cuota | ✅ Asignada | `3881a765-2e3c-42a0-ba86-9b230cb9ea0d` |
| PlanPago.tiene_pagos_verificados | ✅ `True` | |
| Inscripcion.total_pagado | ✅ `400.00` | |
| Inscripcion.saldo_pendiente | ✅ `800.00` | |
| Inscripcion.porcentaje_pagado | ✅ `33.33%` | |
| LogAuditoria PAGO_ACTUALIZADO | ❌ **No existe** (pre-fix) | El cambio se hizo directo en BD/admin. **TASK-100 corrigió:** `estado` ahora readonly en admin. |
| Signal pago_post_save usuario | ✅ **Incluye `usuario`** | `usuario=instance.registrado_por` presente en código; docs actualizados en TASK-103 |

---

## 6. Hallazgos

### 6.1 Estado cambiado sin pasar por PATCH

> **CORREGIDO por TASK-100 (2026-07-12):** `estado` se devolvió a `readonly_fields` en `PagoAdmin`. Todo cambio de estado debe pasar exclusivamente por `PagoVerificarRechazarView.patch()`.

El pago `fe555f25-c5f9-4150-9459-377dccbefb77` cambió de `pendiente` a `verificado` ~26 minutos después de crearse, pero no hay registro `PAGO_ACTUALIZADO` en LogAuditoria. Esto indica que el cambio se hizo directamente por:

- Admin de Django (`estado` es editable, no está en `readonly_fields`)
- SQL directo
- Shell de Django

**Consecuencias (pre-fix):**
- No hay trazabilidad de quién cambió el estado
- No se envió email al tutor notificando la verificación
- `updated_at` se actualizó (por `auto_now=True`) pero sin registro de auditoría

**Fix aplicado:**
- `backend/apps/pagos/admin.py`: `estado` agregado a `readonly_fields` (TASK-100, Opción A)
- Transiciones de estado ahora solo por PATCH API, que registra `LogAuditoria(PAGO_ACTUALIZADO)` con `usuario` + email al tutor
- Ver `docs/auditoria_admin.md` M8 (nota post-fix)

### 6.2 Signal `pago_post_save` no registra usuario

> **CORREGIDO (pre-TASK-103):** El código ya incluye `usuario=instance.registrado_por`. Los docs (BUSINESS_RULES.md-final BR-AUD-06, tabla de signals) se actualizaron en TASK-103 para reflejar el estado real.

`apps/pagos/signals.py:14-19` (estado actual):

```python
LogAuditoria.objects.create(
    usuario=instance.registrado_por,  # ✅ presente
    accion='PAGO_REGISTRADO',
    modelo='Pago',
    objeto_id=instance.id,
    valor_nuevo={'estado': instance.estado, 'importe': str(instance.importe)},
)
```

- `usuario=instance.registrado_por` está incluido desde que el archivo se escribió.
- La documentación previa (BR-AUD-06, tabla de signals) indicaba que faltaba por un error de auditoría; se corrigió en TASK-103.

### 6.3 No se encontraron bugs en el código del endpoint

- `PagoVerificarRechazarView.patch()` funciona correctamente.
- Gateway enruta correctamente PATCH a través del fallback `/api/*`.
- LogAuditoria es inmutable.
- Email templates existen y están completos.

---

## 7. CURL de ejemplo

```bash
# Verificar
curl -X PATCH 'http://localhost/api/v1/pagos/fe555f25-c5f9-4150-9459-377dccbefb77/' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: access_token=<TOKEN_AGENTE>' \
  -d '{"estado": "verificado"}'

# Rechazar
curl -X PATCH 'http://localhost/api/v1/pagos/fe555f25-c5f9-4150-9459-377dccbefb77/' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: access_token=<TOKEN_AGENTE>' \
  -d '{"estado": "rechazado", "notas": "Comprobante ilegible"}'
```

---

## 8. Comandos de validación

```bash
# 1. Estado actual del pago
docker compose exec backend python manage.py shell -c "
from apps.pagos.models import Pago
p = Pago.objects.get(pk='fe555f25-c5f9-4150-9459-377dccbefb77')
print(f'Estado: {p.estado}')
print(f'Importe: {p.importe}')
print(f'Inscripción: {p.inscripcion_id}')
print(f'Cuota: {p.cuota_id}')
print(f'Registrado por: {p.registrado_por_id}')
print(f'Pagado por: {p.pagado_por_id}')
print(f'Notas: {p.notas}')
print(f'Created: {p.created_at}')
print(f'Updated: {p.updated_at}')
"

# 2. Logs de auditoría
docker compose exec backend python manage.py shell -c "
from apps.auditoria.models import LogAuditoria
logs = LogAuditoria.objects.filter(
    objeto_id='fe555f25-c5f9-4150-9459-377dccbefb77'
).order_by('timestamp')
for log in logs:
    print(f'[{log.timestamp}] {log.accion} | usuario={log.usuario_id} | anterior={log.valor_anterior} | nuevo={log.valor_nuevo}')
"

# 3. Propiedades derivadas
docker compose exec backend python manage.py shell -c "
from apps.pagos.models import Pago
p = Pago.objects.get(pk='fe555f25-c5f9-4150-9459-377dccbefb77')
plan = p.cuota.plan_pago
print(f'PlanPago.tiene_pagos_verificados: {plan.tiene_pagos_verificados}')
insc = p.inscripcion
print(f'Inscripcion.total_pagado: {insc.total_pagado}')
print(f'Inscripcion.saldo_pendiente: {insc.saldo_pendiente}')
print(f'Inscripcion.porcentaje_pagado: {insc.porcentaje_pagado}')
"
```
