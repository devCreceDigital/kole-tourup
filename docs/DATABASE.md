# DATABASE.md — Esquema de Base de Datos

## Motor: PostgreSQL
## ORM: Django 4.2+ (`models.py`)

---

## Convenciones Globales

- **PK:** `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)` en todas las tablas
- **Timestamps:** `created_at = auto_now_add=True`, `updated_at = auto_now=True`
- **Enumeraciones:** `models.TextChoices`
- **Storage:** `FileField` / `ImageField` con backend S3/GCS configurable
- **Multi-tenant:** campo `agencia` (FK) en modelos raíz
- **Eliminación protegida:** `on_delete=PROTECT` en relaciones que no deben perder datos (Inscripcion, Pago)

---

## Enumeraciones (TextChoices)

```python
class RolUsuario(TextChoices):
    PADRE    = 'padre'
    ALUMNO   = 'alumno'
    AGENTE   = 'agente'
    MECENAS  = 'mecenas'

class EstadoViaje(TextChoices):
    BORRADOR  = 'borrador'
    ACTIVO    = 'activo'
    CERRADO   = 'cerrado'
    ARCHIVADO = 'archivado'

class EstadoInscripcion(TextChoices):
    PENDIENTE  = 'pendiente'
    CONFIRMADO = 'confirmado'
    CANCELADO  = 'cancelado'
    BAJA       = 'baja'

class EstadoPago(TextChoices):
    PENDIENTE  = 'pendiente'
    VERIFICADO = 'verificado'
    RECHAZADO  = 'rechazado'

class MetodoPago(TextChoices):
    TRANSFERENCIA = 'transferencia'
    EFECTIVO      = 'efectivo'
    TARJETA       = 'tarjeta'
    OTRO          = 'otro'

class EstadoDocumento(TextChoices):
    PENDIENTE = 'pendiente'
    VALIDADO  = 'validado'
    RECHAZADO = 'rechazado'

class TipoActividad(TextChoices):
    TRANSPORTE  = 'transporte'
    COMIDA      = 'comida'
    VISITA      = 'visita'
    ALOJAMIENTO = 'alojamiento'
    LIBRE       = 'libre'

class TipoMecenas(TextChoices):
    EMPRESA     = 'empresa'
    PARTICULAR  = 'particular'
    INSTITUCION = 'institucion'

class TipoNotificacion(TextChoices):
    PAGO_VENCIDO  = 'pago_vencido'
    DOC_RECHAZADO = 'doc_rechazado'
    DOC_VALIDADO  = 'doc_validado'
    COMUNICADO    = 'comunicado'
    RECORDATORIO  = 'recordatorio'

class RelacionAlumno(TextChoices):
    PADRE = 'padre'
    MADRE = 'madre'
    TUTOR = 'tutor_legal'
```

---

## Diagrama de Entidades (Conceptual)

```
AGENCIA ──1:*──> VIAJE ──1:*──> GRUPO
                   │                │
                 1:1              1:*
                   │                │
              ITINERARIO         ALUMNO ──*:*──> PADRE_TUTOR
                1:*                 │
           ETAPA_ITINERARIO      1:*
                1:*             INSCRIPCION ──1:*──> PAGO
            ACTIVIDAD              │                   │
                               1:*                    │
                           DOCUMENTO_ENTREGADO      MECENAS
                                                  (vía MecenasInscripcion)
VIAJE ──1:1──> PLAN_PAGO ──1:*──> CUOTA
VIAJE ──1:*──> HOTEL
VIAJE ──1:*──> DOCUMENTO_REQUERIDO
VIAJE ──1:*──> COMUNICADO
```

---

## Entidades — Detalle Completo

### Agencia (Tenant raíz)

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | NOT NULL | Identificador único |
| nombre | CharField(200) | NOT NULL | Nombre comercial |
| logo | ImageField | NULLABLE | upload_to='agencias/logos/' |
| email_contacto | EmailField | UNIQUE NOT NULL | Email principal |
| telefono | CharField(20) | blank=True | Teléfono de contacto |
| licencia_agencia | CharField(100) | blank=True | Nº licencia oficial |
| slug | SlugField(100) | UNIQUE NOT NULL | Identificador URL |
| activa | BooleanField | DEFAULT True | Estado del tenant |
| created_at | DateTimeField | auto_now_add | Fecha de creación |

**Meta:** `ordering = ['nombre']`

---

### Usuario (Custom Auth — AbstractBaseUser)

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | NOT NULL | Identificador único |
| email | EmailField | UNIQUE NOT NULL | Login principal |
| nombre | CharField(100) | NOT NULL | Nombre |
| apellidos | CharField(150) | NOT NULL | Apellidos |
| telefono | CharField(20) | blank=True | Teléfono |
| rol | CharField(20) | NOT NULL | RolUsuario.choices |
| agencia | FK(Agencia) | SET_NULL nullable | Agencia a la que pertenece |
| email_verificado | BooleanField | DEFAULT False | Verificación de email |
| activo | BooleanField | DEFAULT True | Estado de la cuenta |
| ultimo_login | DateTimeField | NULLABLE | Último acceso |
| is_staff | BooleanField | DEFAULT False | Acceso admin Django |
| is_superuser | BooleanField | DEFAULT False | Superusuario |
| created_at | DateTimeField | auto_now_add | |

**USERNAME_FIELD:** `email`  
**Índices:** `(agencia, rol)`, `email`  
**Propiedad:** `nombre_completo → f'{nombre} {apellidos}'`

---

### PadreTutor (perfil extendido)

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| usuario | OneToOneField(Usuario) | CASCADE | related_name='perfil_tutor' |
| dni | CharField(20) | blank=True | DNI del tutor |
| relacion_alumno | CharField(20) | RelacionAlumno.choices | padre / madre / tutor_legal |
| created_at | DateTimeField | auto_now_add | |

**Relación:** `PadreTutor ↔ Alumno` es M:N vía `Alumno.tutores` (ManyToManyField).

---

### Alumno (perfil extendido)

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| usuario | OneToOneField(Usuario) | CASCADE nullable | Cuenta opcional |
| nombre | CharField(100) | NOT NULL | Nombre propio |
| apellidos | CharField(150) | NOT NULL | Apellidos |
| fecha_nacimiento | DateField | NOT NULL | Para cálculo de edad |
| dni | CharField(20) | NOT NULL | Documento de identidad |
| num_pasaporte | CharField(30) | blank=True | Pasaporte |
| necesidades_especiales | TextField | blank=True | Alergias, condiciones médicas |
| nombre_tutor_legal | CharField(200) | NOT NULL | Nombre del responsable |
| telefono_emergencia | CharField(20) | NOT NULL | Contacto emergencia |
| tutores | M2M(PadreTutor) | blank=True | related_name='alumnos' |
| grupo | FK(Grupo) | SET_NULL nullable | Grupo asignado |
| created_at | DateTimeField | auto_now_add | |

**Índices:** `dni`

---

### Mecenas (perfil extendido)

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| usuario | OneToOneField(Usuario) | CASCADE | related_name='perfil_mecenas' |
| tipo | CharField(20) | NOT NULL | TipoMecenas.choices |
| razon_social | CharField(200) | blank=True | Para tipo empresa |
| ruc | CharField(20) | blank=True | RUC/NIF fiscal |
| created_at | DateTimeField | auto_now_add | |

---

### Viaje

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| agencia | FK(Agencia) | CASCADE NOT NULL | Agencia propietaria |
| nombre | CharField(300) | NOT NULL | Nombre del viaje |
| destino | CharField(200) | NOT NULL | Destino principal |
| fecha_salida | DateField | NOT NULL | Fecha de inicio |
| fecha_regreso | DateField | NOT NULL | Fecha de fin |
| descripcion | TextField | blank=True | Descripción larga |
| cupo_maximo | PositiveIntegerField | NOT NULL | Plazas disponibles |
| precio_total | DecimalField(10,2) | NOT NULL | Precio por alumno |
| estado | CharField(20) | DEFAULT 'borrador' | EstadoViaje.choices |
| imagen | ImageField | NULLABLE | upload_to='viajes/portadas/' |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Índices:** `(agencia, estado)`, `fecha_salida`  
**Constraint:** `fecha_regreso > fecha_salida`  
**Propiedad:** `duracion_dias → (fecha_regreso - fecha_salida).days`

---

### Grupo

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| viaje | FK(Viaje) | CASCADE NOT NULL | related_name='grupos' |
| nombre | CharField(100) | NOT NULL | "Grupo A", "Bus 2" |
| descripcion | CharField(300) | blank=True | |
| capacidad | PositiveIntegerField | NULLABLE | Límite de alumnos |
| created_at | DateTimeField | auto_now_add | |

**Unique Together:** `(viaje, nombre)`

---

### PlanPago

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| viaje | OneToOneField(Viaje) | CASCADE | related_name='plan_pago' |
| descripcion | CharField(300) | blank=True | |
| total_cuotas | PositiveIntegerField | NOT NULL | Número de pagos |
| created_at | DateTimeField | auto_now_add | |

---

### Cuota

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| plan_pago | FK(PlanPago) | CASCADE NOT NULL | related_name='cuotas' |
| numero_cuota | PositiveIntegerField | NOT NULL | Orden: 1, 2, 3… |
| descripcion | CharField(200) | blank=True | "Reserva", "2ª cuota" |
| importe | DecimalField(10,2) | NOT NULL, > 0 | Monto a pagar |
| fecha_vencimiento | DateField | NOT NULL | Fecha límite |

**Unique Together:** `(plan_pago, numero_cuota)`  
**Constraint:** `importe > 0`  
**Meta:** `ordering = ['numero_cuota']`

---

### Inscripcion

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| alumno | FK(Alumno) | PROTECT NOT NULL | related_name='inscripciones' |
| viaje | FK(Viaje) | PROTECT NOT NULL | related_name='inscripciones' |
| padre_tutor | FK(PadreTutor) | PROTECT NOT NULL | related_name='inscripciones' |
| fecha_inscripcion | DateTimeField | auto_now_add | |
| estado | CharField(20) | DEFAULT 'pendiente' | EstadoInscripcion.choices |
| notas_internas | TextField | blank=True | Solo visibles para agente |
| precio_final | DecimalField(10,2) | NOT NULL | Precio acordado |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Unique Together:** `(alumno, viaje)` — un alumno, un viaje, una inscripción  
**Índices:** `(viaje, estado)`, `padre_tutor`  
**Propiedades computadas:**
- `total_pagado → SUM(pagos.importe WHERE estado='verificado')`
- `saldo_pendiente → precio_final - total_pagado`
- `porcentaje_pagado → round(total_pagado / precio_final * 100, 2)`

---

### Pago

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| inscripcion | FK(Inscripcion) | PROTECT NOT NULL | related_name='pagos' |
| cuota | FK(Cuota) | SET_NULL nullable | Cuota específica cubierta |
| pagado_por | FK(Usuario) | PROTECT NOT NULL | Quien realizó el pago |
| registrado_por | FK(Usuario) | PROTECT NOT NULL | Quien lo cargó (agente/tutor) |
| importe | DecimalField(10,2) | NOT NULL, > 0 | Monto pagado |
| fecha_pago | DateField | NOT NULL | Fecha del pago |
| metodo_pago | CharField(20) | NOT NULL | MetodoPago.choices |
| comprobante | FileField | NULLABLE | upload_to='pagos/comprobantes/%Y/%m/' |
| estado | CharField(20) | DEFAULT 'pendiente' | EstadoPago.choices |
| notas | TextField | blank=True | Observaciones del agente |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Índices:** `(inscripcion, estado)`, `fecha_pago`  
**Constraint:** `importe > 0`

---

### DocumentoRequerido

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| viaje | FK(Viaje) | CASCADE NOT NULL | related_name='documentos_requeridos' |
| nombre | CharField(200) | NOT NULL | "DNI alumno", "Autorización" |
| descripcion | TextField | blank=True | Instrucciones para la familia |
| obligatorio | BooleanField | DEFAULT True | Si es mandatorio |
| formatos_permitidos | CharField(100) | DEFAULT 'pdf,jpg,png' | Extensiones separadas por comas |

**Propiedad:** `formatos_lista → ['pdf', 'jpg', 'png']`

---

### DocumentoEntregado

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| inscripcion | FK(Inscripcion) | CASCADE NOT NULL | related_name='documentos' |
| documento_requerido | FK(DocumentoRequerido) | PROTECT NOT NULL | Tipo de documento |
| archivo | FileField | NOT NULL | upload_to='documentos/%Y/%m/' |
| nombre_archivo | CharField(255) | NOT NULL | Nombre original del archivo |
| tamano_bytes | PositiveIntegerField | NOT NULL | Máximo: 10_485_760 (10 MB) |
| estado | CharField(20) | DEFAULT 'pendiente' | EstadoDocumento.choices |
| motivo_rechazo | TextField | blank=True | Razón del rechazo |
| validado_por | FK(Usuario) | SET_NULL nullable | Agente que revisó |
| fecha_validacion | DateTimeField | NULLABLE | Cuándo fue revisado |
| uploaded_at | DateTimeField | auto_now_add | |

**Regla:** Por `(inscripcion, documento_requerido)` puede haber múltiples registros (resubidas), pero solo uno con `estado=validado` simultáneamente.  
**Índices:** `(inscripcion, estado)`, `(documento_requerido, estado)`  
**Propiedad:** `tamano_legible → 'X.X KB' o 'X.X MB'`

---

### Itinerario

| Campo | Tipo ORM | Descripción |
|-------|----------|-------------|
| id | UUIDField PK | |
| viaje | OneToOneField(Viaje) CASCADE | related_name='itinerario' |
| created_at | DateTimeField auto_now_add | |
| updated_at | DateTimeField auto_now | |

---

### EtapaItinerario

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| itinerario | FK(Itinerario) | CASCADE NOT NULL | related_name='etapas' |
| dia_numero | PositiveIntegerField | NOT NULL | Día 1, 2, 3… |
| titulo | CharField(200) | NOT NULL | "Día 1 — Llegada" |
| descripcion | TextField | blank=True | |
| imagen | ImageField | NULLABLE | upload_to='itinerarios/etapas/' |

**Unique Together:** `(itinerario, dia_numero)`  
**Meta:** `ordering = ['dia_numero']`

---

### Actividad

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| etapa | FK(EtapaItinerario) | CASCADE NOT NULL | related_name='actividades' |
| hora | TimeField | NULLABLE | Hora aproximada |
| titulo | CharField(200) | NOT NULL | Nombre de la actividad |
| descripcion | TextField | blank=True | |
| tipo | CharField(20) | NULLABLE | TipoActividad.choices (ver DEC-007) |
| orden | PositiveIntegerField | DEFAULT 0 | Posición dentro de la etapa |

**Meta:** `ordering = ['orden', 'hora']`

---

### Hotel

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| viaje | FK(Viaje) | CASCADE NOT NULL | related_name='hoteles' |
| nombre | CharField(200) | NOT NULL | Nombre del hotel |
| descripcion | TextField | blank=True | |
| tasa_turistica | DecimalField(8,2) | NULLABLE | Importe tasa por noche |
| fianza | DecimalField(8,2) | NULLABLE | Depósito requerido |
| web_url | URLField(500) | blank=True | Enlace sitio web |
| maps_url | URLField(500) | blank=True | Enlace Google Maps |
| imagen | ImageField | NULLABLE | upload_to='hoteles/' |

---

### MecenasInscripcion (tabla de relación M:N)

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| mecenas | FK(Mecenas) | PROTECT NOT NULL | related_name='patrocinios' |
| inscripcion | FK(Inscripcion) | PROTECT NOT NULL | related_name='mecenas' |
| monto_comprometido | DecimalField(10,2) | NOT NULL, > 0 | Importe que cubre el mecenas |
| activo | BooleanField | DEFAULT True | Estado del patrocinio |

**Unique Together:** `(mecenas, inscripcion)`  
**Constraint:** `monto_comprometido > 0`

---

### Comunicado

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| viaje | FK(Viaje) | CASCADE NOT NULL | related_name='comunicados' |
| autor | FK(Usuario) | PROTECT NOT NULL | Agente que lo envió |
| titulo | CharField(300) | NOT NULL | Asunto |
| cuerpo | TextField | NOT NULL | Contenido completo |
| enviado_email | BooleanField | DEFAULT False | Si Celery completó el envío |
| fecha_publicacion | DateTimeField | auto_now_add | |

**Meta:** `ordering = ['-fecha_publicacion']`

---

### Notificacion

| Campo | Tipo ORM | Restricción | Descripción |
|-------|----------|-------------|-------------|
| id | UUIDField PK | | |
| usuario | FK(Usuario) | NOT NULL | Destinatario |
| tipo | CharField(20) | NOT NULL | TipoNotificacion.choices |
| titulo | CharField(200) | NOT NULL | Texto breve |
| mensaje | TextField | NOT NULL | Detalle |
| leida | BooleanField | DEFAULT False | Estado de lectura |
| referencia_id | UUIDField | NULLABLE | ID del objeto relacionado (polimórfico) |
| referencia_tipo | CharField(50) | NULLABLE | Tipo del objeto: Pago, Documento… |
| created_at | DateTimeField | auto_now_add | |

---

### LogAuditoria (inmutable)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUIDField PK | |
| usuario_id | FK(Usuario) nullable | Quien realizó la acción |
| accion | VARCHAR(100) | PAGO_REGISTRADO, PAGO_ACTUALIZADO, etc. |
| modelo | VARCHAR(100) | Nombre del modelo afectado |
| objeto_id | UUID nullable | ID del objeto afectado |
| valor_anterior | JSONField nullable | Estado previo |
| valor_nuevo | JSONField nullable | Estado posterior |
| ip | GenericIPAddressField nullable | IP del request |
| timestamp | DateTimeField auto_now_add | |

**Nunca se actualiza ni elimina.**

---

## Índices Críticos Declarados

```python
# Usuario
Index(fields=['agencia', 'rol'])
Index(fields=['email'])

# Viaje
Index(fields=['agencia', 'estado'])
Index(fields=['fecha_salida'])

# Alumno
Index(fields=['dni'])

# Inscripcion
Index(fields=['viaje', 'estado'])
Index(fields=['padre_tutor'])

# Pago
Index(fields=['inscripcion', 'estado'])
Index(fields=['fecha_pago'])

# DocumentoEntregado
Index(fields=['inscripcion', 'estado'])
Index(fields=['documento_requerido', 'estado'])
```

---

## Constraints de Base de Datos

```python
# Viaje
CheckConstraint(check=Q(fecha_regreso__gt=F('fecha_salida')), name='fecha_regreso_posterior_salida')

# Cuota
CheckConstraint(check=Q(importe__gt=0), name='cuota_importe_positivo')

# Pago
CheckConstraint(check=Q(importe__gt=0), name='pago_importe_positivo')

# MecenasInscripcion
CheckConstraint(check=Q(monto_comprometido__gt=0), name='mecenas_monto_positivo')
```
