# Proceso de Pagos — Tottem Hub

## Flujo completo: Frontend → Gateway → Backend

```
Padre (navegador)         Gateway (Node.js)          Backend (Django)
      │                        │                         │
      │  POST /api/v1/pagos/   │                         │
      │──────────────────────► │                         │
      │                        │  proxy a backend:8000   │
      │                        │───────────────────────► │
      │                        │                         │
      │                        │                         │── PagoCreateSerializer
      │                        │                         │── valida importe > 0
      │                        │                         │── valida comprobante (≤10MB, PDF/JPG/PNG)
      │                        │                         │── guarda con estado='pendiente'
      │                        │                         │
      │                        │                         │── Signal pago_post_save()
      │                        │                         │   ├── LogAuditoria (PAGO_REGISTRADO)
      │                        │                         │   └── Email a agencia
      │                        │                         │
      │  ← 201 Pago creado     │                         │
      │◄────────────────────── │◄────────────────────────│
```

## Modelos involucrados

### Relaciones

```
Viaje ──1:1──► PlanPago ──1:N──► Cuota ──1:N──► Pago
  │                                  ▲              │
  │                                  │              │
  └──1:N──► Inscripcion ────────────┘              │
                    │                               │
                    └──1:N──► Pago ─────────────────┘
```

### Diagrama de campos clave

```
PlanPago:
  id (UUID PK)
  viaje (OneToOneField → Viaje, related_name='plan_pago')
  descripcion (CharField)
  total_cuotas (PositiveIntegerField)
  created_at (DateTimeField)

Cuota:
  id (UUID PK)
  plan_pago (ForeignKey → PlanPago, related_name='cuotas')
  numero_cuota (PositiveIntegerField)           # 1, 2, 3...
  descripcion (CharField)
  importe (DecimalField, max_digits=10, 2)
  fecha_vencimiento (DateField)
  UniqueConstraint: (plan_pago, numero_cuota)

Pago:
  id (UUID PK)
  inscripcion (ForeignKey → Inscripcion, related_name='pagos')
  cuota (ForeignKey → Cuota, nullable, related_name='pagos')
  pagado_por (ForeignKey → Usuario, related_name='pagos_realizados')
  registrado_por (ForeignKey → Usuario, related_name='pagos_registrados')
  importe (DecimalField)
  fecha_pago (DateField)
  metodo_pago: transferencia | efectivo | tarjeta | otro
  comprobante (FileField, opcional, upload_to='pagos/comprobantes/%Y/%m/')
  estado: pendiente | verificado | rechazado
  notas (TextField)
  created_at / updated_at (DateTimeField)
```

## Frontend

### Componentes involucrados

| Componente | Tipo | Ruta |
|---|---|---|
| `PagosPage` | client (`'use client'`) | `app/(padre)/app/inscripciones/[id]/pagos/page.tsx` |
| `PagarSection` | client | `components/padre/PagarSection.tsx` |
| `FormularioPago` | client | `components/padre/FormularioPago.tsx` |
| `FileUploader` | client | `components/forms/FileUploader.tsx` |
| `LayoutViajePadre` | client | `components/padre/LayoutViajePadre.tsx` |
| `ErrorBoundary` | client | `components/ui/ErrorBoundary.tsx` |

### Flujo frontend

**1. Página de pagos (`PagosPage`)**

Obtiene datos de la API client-side vía `fetchApi`:
- `GET /api/v1/inscripciones/{id}/` — datos de la inscripción + resumen de pagos
- `GET /api/v1/inscripciones/{id}/plan-pago/` — plan de pagos con cuotas y estados computados

Renderiza:
- `LayoutViajePadre` con header, tabs y contenido
- Resumen: total del plan, pagado, pendiente, barra de progreso
- Alerta de cuotas vencidas (si aplica)
- `<PagarSection>` con la tabla de cuotas y botones de acción

**2. Sección de pago (`PagarSection`)**

Props:
```typescript
interface PagarSectionProps {
  inscripcionId: string
  cuotas: CuotaData[]      // { id, numero_cuota, descripcion, importe: string, fecha_vencimiento, estado }
  primeraCuotaPendiente: CuotaData | null
}
```

Estados locales:
- `cuotaSeleccionada: string | null` — ID de la cuota a pagar
- `mostrarFormulario: boolean` — visibilidad del formulario

Flujo:
1. Usuario ve tabla de cuotas con estados (pagado/en_revision/vencido/pendiente)
2. Botón "Pagar" aparece solo si `estado === 'vencido' || estado === 'pendiente'`
3. Usuario hace clic → `handlePagar(cuotaId)` → `mostrarFormulario = true`
4. Se renderiza `<FormularioPago>` inline

**3. Formulario de pago (`FormularioPago`)**

Props:
```typescript
interface FormularioPagoProps {
  inscripcionId: string
  cuotas: Cuota[]           // { id, numero_cuota, descripcion, importe: number }
  cuotaIdInicial?: string   // pre-selecciona una cuota
  onExito: () => void
}
```

Campos del formulario:
- Cuota (select, opcional, pre-seleccionado si viene de botón específico)
- Importe (number, obligatorio) — validado > 0 por backend
- Fecha de pago (date, obligatorio)
- Método de pago (select: transferencia/efectivo/tarjeta/otro, obligatorio)
- Comprobante (FileUploader, opcional, PDF/JPG/PNG, máx 10MB)

Submit → `fetchApi('/api/v1/pagos/', { method: 'POST', body: formData })`

```typescript
const formData = new FormData()
formData.append('inscripcion', inscripcionId)   // UUID
formData.append('importe', importe)             // decimal string
formData.append('fecha_pago', fechaPago)        // YYYY-MM-DD
formData.append('metodo_pago', metodoPago)      // transferencia|efectivo|tarjeta|otro
if (cuotaId) formData.append('cuota', cuotaId)  // UUID opcional
if (comprobante) formData.append('comprobante', comprobante)  // File opcional
```

**4. FileUploader**

- Drop zone + click para seleccionar archivo
- Validación client-side: ≤10MB, formatos PDF/JPG/PNG
- Muestra nombre y tamaño del archivo seleccionado

## Gateway (Node.js)

### Pipeline de middlewares

```
Request → CORS → Auth (cookie→Bearer) → Security → RateLimit → Multipart → Proxy Django
```

### Multipart (`proxy/multipart.js`)
- Solo aplica a requests con `Content-Type: multipart/form-data`
- Acumula el body en memoria
- Valida tamaño ≤ `MAX_FILE_SIZE_BYTES` (10MB configurable)
- Responde 413 Payload Too Large si excede
- Adjunta `req._body` (Buffer) para el proxy

### Proxy Django (`proxy/django.js`)
- Construye URL: `BACKEND_URL + req.url`
- Reenvía headers (excepto host/connection/transfer-encoding)
- Para multipart: escribe `req._body` directamente con Content-Length corregido
- Para no-multipart: pipe del stream original
- Timeout: 30s → 504 Gateway Timeout
- Error de conexión → 502 Bad Gateway

### Auth (`middleware/auth.js`)
- Lee cookie `access_token`
- Inyecta `Authorization: Bearer {token}` en headers

## Backend Django

### Endpoint de creación: `POST /api/v1/pagos/`

**View:** `PagoListCreateView.post()` (`apps/pagos/views.py:23-31`)

```python
def post(self, request):
    serializer = PagoCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(
        pagado_por=request.user,
        registrado_por=request.user,
        estado='pendiente'
    )
    return Response(PagoDetalleSerializer(serializer.instance).data, status=201)
```

**Serializer:** `PagoCreateSerializer` (`apps/pagos/serializers.py:8-24`)

```python
class PagoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ['inscripcion', 'cuota', 'importe', 'fecha_pago', 'metodo_pago', 'comprobante', 'notas']

    def validate_comprobante(self, value):
        if value:
            if value.size > 10 * 1024 * 1024:
                raise ValidationError('El archivo no puede superar 10 MB.')
            if value.content_type not in ['application/pdf', 'image/jpeg', 'image/png']:
                raise ValidationError('Formato no permitido. Use PDF, JPG o PNG.')
        return value

    def validate_importe(self, value):
        if value <= 0:
            raise ValidationError('El importe debe ser mayor a 0.')
        return value
```

### Signal: `pago_post_save` (`apps/pagos/signals.py:10-29`)

```python
@receiver(post_save, sender=Pago)
def pago_post_save(sender, instance, created, **kwargs):
    if not created:
        return

    # 1. Auditoría
    LogAuditoria.objects.create(
        accion='PAGO_REGISTRADO',
        modelo='Pago',
        objeto_id=instance.id,
        valor_nuevo={'estado': instance.estado, 'importe': str(instance.importe)},
    )

    # 2. Email al agente
    agente_email = instance.inscripcion.viaje.agencia.email_contacto
    send_mail(
        subject='Nuevo pago pendiente - ' + viaje.nombre,
        message='Nuevo pago de S/ ' + str(instance.importe) + ' registrado para ' + viaje.nombre,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[agente_email],
    )
```

Se ejecutan **2 automatismos** al crear un pago:
1. ✅ **Auditoría** — registro inmutable en `LogAuditoria` (modelo, objeto_id, valor_nuevo)
2. ✅ **Email al agente** — notifica que hay un pago pendiente de revisión

### Endpoint de verificación/rechazo: `PATCH /api/v1/pagos/{id}/`

**View:** `PagoVerificarRechazarView.patch()` (`apps/pagos/views.py:64-90`)
- Solo accesible por rol `agente` (`EsAgente` permission)
- Cambia `estado` a `'verificado'` o `'rechazado'`
- Crea `LogAuditoria(PAGO_ACTUALIZADO)` con valor_anterior y valor_nuevo
- Envía email al tutor:
  - Verificado → template `emails/pago_verificado.html`
  - Rechazado → template `emails/pago_rechazado.html` (incluye `notas` como motivo)

```python
def patch(self, request, pk):
    pago = Pago.objects.select_related('inscripcion__padre_tutor__usuario', 'inscripcion__viaje').get(pk=pk)
    nuevo_estado = request.data.get('estado')  # 'verificado' | 'rechazado'
    pago.estado = nuevo_estado
    if 'notas' in request.data:
        pago.notas = request.data['notas']
    pago.save()
    LogAuditoria.objects.create(accion='PAGO_ACTUALIZADO', ...)
    self._enviar_email_estado(pago)
    return Response(PagoDetalleSerializer(pago).data)
```

### Propagación de estado — Lectura (`GET /api/v1/inscripciones/{id}/plan-pago/`)

**View:** `InscripcionPlanPagoView.get()` (`apps/inscripciones/views.py:90-141`)

Para cada cuota, computa el estado según:

```python
pagos_de_inscripcion = {p.cuota_id: p for p in inscripcion.pagos.filter(cuota__isnull=False)}

for cuota in plan_pago.cuotas.all().order_by('numero_cuota'):
    pago = pagos_de_inscripcion.get(cuota.id)
    if pago and pago.estado == 'verificado':       # → 'pagado'
    elif pago and pago.estado == 'pendiente':      # → 'en_revision'
    elif cuota.fecha_vencimiento < hoy:             # → 'vencido'
    else:                                           # → 'pendiente'
```

### Propiedades de Inscripcion (`apps/inscripciones/models.py:103-116`)

```python
@property
def total_pagado(self):
    result = self.pagos.filter(estado='verificado').aggregate(total=Sum('importe'))['total']
    return result or 0

@property
def saldo_pendiente(self):
    return self.precio_final - self.total_pagado

@property
def porcentaje_pagado(self):
    if self.precio_final == 0: return 0
    return round(float(self.total_pagado) / float(self.precio_final) * 100, 2)
```

### PlanPago.tiene_pagos_verificados (`apps/viajes/models.py:94-96`)

```python
@property
def tiene_pagos_verificados(self):
    return self.cuotas.filter(pagos__estado='verificado').exists()
```

Usado en el serializer de PlanPago para bloquear modificaciones cuando ya hay pagos verificados.

## Tabla resumen de automatismos

| Evento | Trigger | Acción automática | Archivo | Línea |
|---|---|---|---|---|
| Pago creado | `post_save` signal | Log auditoría `PAGO_REGISTRADO` | `signals.py` | 14 |
| Pago creado | `post_save` signal | Email "nuevo pago pendiente" al agente | `signals.py` | 23 |
| Pago verificado | Agent PATCH | Log auditoría `PAGO_ACTUALIZADO` | `views.py` | 80 |
| Pago verificado | Agent PATCH | Email "pago verificado" al tutor (template HTML) | `views.py` | 48-50 |
| Pago rechazado | Agent PATCH | Log auditoría + email "pago rechazado" al tutor (+ motivo) | `views.py` | 51-54,80 |
| Consulta plan-pago | GET endpoint | Estado de cuota computado según pagos y fecha | `views.py` | 116-134 |
| Modificación plan | serializer validate | Bloqueado si `tiene_pagos_verificados` | `serializers.py` | 109 |

## Acciones manuales

1. **Padre** — Completa formulario de pago (frontend) → crea `Pago` con `estado='pendiente'`
2. **Agente** — Verifica o rechaza el pago (backoffice) → actualiza `estado`

## URLs del gateway

| Método | Ruta | View | Permiso |
|---|---|---|---|
| GET | `/api/v1/pagos/` | `PagoListCreateView.get()` | Autenticado (padre: propios, agente: de su agencia) |
| POST | `/api/v1/pagos/` | `PagoListCreateView.post()` | Autenticado (padre) |
| PATCH | `/api/v1/pagos/{id}/` | `PagoVerificarRechazarView.patch()` | Agente |
| GET | `/api/v1/inscripciones/{id}/plan-pago/` | `InscripcionPlanPagoView.get()` | Autenticado (padre: propia, agente: de su agencia) |
