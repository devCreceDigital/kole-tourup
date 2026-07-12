# USER_FLOWS.md — Flujos de Secuencia (Estado Real)

> Notación: Mermaid `sequenceDiagram`. Renderizable en GitHub, Notion, y cualquier editor compatible.
> Última actualización: 2026-07-09 — Se actualizaron los flujos para reflejar el uso de `fetchApi`, cookies `httpOnly` y Gateway.

---

## FLOW 01 — Registro y Verificación de Cuenta (Padre/Tutor)

```mermaid
sequenceDiagram
    actor PT as Padre/Tutor
    participant UI as Frontend
    participant API as Django API
    participant DB as Base de Datos
    participant EMAIL as Servicio Email

    PT->>UI: Completa formulario de registro
    UI->>API: POST /auth/registro/ {email, password, nombre, apellidos, rol}
    API->>DB: Verifica que email no exista
    DB-->>API: Email disponible
    API->>DB: Crea Usuario (email_verificado=False)
    API->>EMAIL: Envía email con token de verificación
    EMAIL-->>PT: Email con enlace de activación
    API-->>UI: 201 Created
    UI-->>PT: Pantalla de confirmación

    PT->>UI: Clic en enlace de activación
    UI->>API: GET /auth/verificar/?token=<TOKEN>
    API->>DB: Valida token y actualiza email_verificado=True
    DB-->>API: OK
    API-->>UI: 200 OK
    UI-->>PT: Redirect a /login
```

---

## FLOW 02 — Login y Generación de JWT

```mermaid
sequenceDiagram
    actor U as Usuario (cualquier rol)
    participant UI as Frontend
    participant GW as Gateway (Node.js)
    participant API as Django API
    participant DB as Base de Datos
    participant CACHE as Redis Cache

    U->>UI: Ingresa email y contraseña
    UI->>GW: POST /auth/login/ {email, password}
    GW->>API: Reenvía al backend
    API->>DB: Busca usuario por email
    DB-->>API: Usuario encontrado
    API->>API: Verifica password_hash con bcrypt

    alt Credenciales inválidas
        API-->>GW: 401 Unauthorized
        GW-->>UI: 401
        UI-->>U: "Email o contraseña incorrectos"
    else Cuenta no verificada
        API-->>GW: 403 Forbidden
        GW-->>UI: 403
        UI-->>U: "Verifica tu email primero"
    else Credenciales válidas
        API->>API: Genera JWT access_token (15min) + refresh_token (7d)
        API->>DB: Actualiza ultimo_login
        API->>CACHE: Almacena refresh_token en allowlist
        API-->>GW: 200 + Set-Cookie (access_token, refresh_token) httpOnly
        GW-->>UI: Reenvía response con cookies
        UI->>UI: Cookies almacenadas automáticamente (httpOnly)
        UI-->>U: Redirect a dashboard según rol
    end
```

---

## FLOW 03 — Creación de Viaje (Agente) — Sin cambios

```mermaid
sequenceDiagram
    actor AV as Agente de Viajes
    participant UI as Frontend
    participant API as Django API
    participant DB as Base de Datos
    participant STORAGE as Cloud Storage

    AV->>UI: Accede a "Nuevo Viaje"
    UI->>API: GET /viajes/nuevo/ (JWT requerido)
    API-->>UI: Formulario vacío

    AV->>UI: Completa datos del viaje + sube imagen portada
    UI->>API: POST /viajes/ {nombre, destino, fechas, cupo, precio, imagen}
    API->>API: Valida fecha_regreso > fecha_salida
    API->>STORAGE: Sube imagen de portada
    STORAGE-->>API: imagen_url
    API->>DB: Crea Viaje (estado=borrador, agencia=agente.agencia)
    DB-->>API: viaje_id
    API->>DB: Crea Itinerario vacío vinculado al viaje
    API-->>UI: 201 Created {viaje_id, estado: "borrador"}
    UI-->>AV: Redirect a panel de configuración del viaje

    AV->>UI: Configura plan de pagos (N cuotas)
    UI->>API: POST /viajes/{viaje_id}/plan-pago/ {total_cuotas, cuotas:[...]}
    API->>DB: Crea PlanPago + Cuotas asociadas
    DB-->>API: plan_pago_id
    API-->>UI: 201 Created

    AV->>UI: Añade hoteles al viaje
    UI->>API: POST /viajes/{viaje_id}/hoteles/ {nombre, tasa, fianza, urls}
    API->>DB: Crea Hotel vinculado al viaje
    API-->>UI: 201 Created

    AV->>UI: Activa el viaje
    UI->>API: PATCH /viajes/{viaje_id}/ {estado: "activo"}
    API->>DB: Actualiza estado=activo
    API-->>UI: 200 OK
    UI-->>AV: "Viaje publicado y visible para familias"
```

---

## FLOW 04 — Inscripción de Alumno (Wizard 3 pasos)

```mermaid
sequenceDiagram
    actor PT as Padre/Tutor
    participant UI as Frontend
    participant GW as Gateway
    participant API as Django API
    participant DB as Base de Datos

    PT->>UI: Completa Paso 1 (datos alumno)
    PT->>UI: Completa Paso 2 (colegio)
    PT->>UI: Completa Paso 3 (alergias + T&C) + Confirma

    UI->>GW: POST /inscripciones/ (via fetchApi + credentials: include)
    GW->>API: POST /api/v1/inscripciones/ {viaje_id, alumno{...}}

    API->>DB: Verifica cupo disponible
    API->>DB: Verifica alumno no inscrito en este viaje
    API->>DB: get_or_create Alumno (por dni) + update campos
    API->>DB: Crea Inscripcion (estado='pre_inscrito', precio_final=viaje.precio_total)
    API->>API: Signal post_save → email bienvenida

    API-->>GW: 201 Created {inscripcion_id, estado}
    GW-->>UI: Response
    UI-->>PT: Confirmación + redirect a dashboard
```

**NOTA:** El campo `nombre` en el serializer debe ser `nombres` para coincidir con el modelo `Alumno`. Ver TD-009.

---

## FLOW 05 — Registro de Pago con Comprobante (Padre/Tutor)

```mermaid
sequenceDiagram
    actor PT as Padre/Tutor
    participant UI as Frontend
    participant GW as Gateway
    participant API as Django API
    participant DB as Base de Datos
    participant STORAGE as S3/GCS

    PT->>UI: Selecciona cuota, ingresa importe, adjunta comprobante
    UI->>GW: POST /pagos/ (multipart via fetchApi)
    GW->>GW: Valida tamaño ≤ 10 MB
    alt > 10 MB
        GW-->>UI: 413 Payload Too Large
        UI-->>PT: "El archivo excede el tamaño máximo"
    else ≤ 10 MB
        GW->>API: Reenvía multipart
        API->>API: Valida formato (MIME + extensión)
        API->>STORAGE: Sube comprobante
        API->>DB: Crea Pago (estado='pendiente')
        API->>API: Signal post_save → LogAuditoria + email agente
        API-->>GW: 201 Created
        GW-->>UI: Response
        UI-->>PT: "Pago registrado — pendiente de verificación"
    end
```

---

## FLOW 06 — Verificación de Pago (Agente)

```mermaid
sequenceDiagram
    actor AV as Agente
    participant UI as Frontend
    participant GW as Gateway
    participant API as Django API
    participant DB as Base de Datos

    AV->>UI: Ve lista de pagos pendientes
    AV->>UI: Revisa comprobante y decide: verificar o rechazar
    UI->>GW: PATCH /pagos/{id}/ {estado, notas} (via fetchApi)
    GW->>API: PATCH /api/v1/pagos/{id}/

    alt Verificar
        API->>DB: pago.estado = 'verificado'
        API->>API: Signal → LogAuditoria + Notificacion + email tutor
        API-->>GW: 200 OK
    else Rechazar
        API->>DB: pago.estado = 'rechazado', pago.notas = motivo
        API->>API: Signal → LogAuditoria + Notificacion con motivo + email
        API-->>GW: 200 OK
    end

    GW-->>UI: Response
    UI-->>AV: Confirmación visual
```

---

## FLOW 07 — Subida y Validación de Documentos (Análogo a FLOW 05/06 — Gateway valida tamaño + formato, Django valida MIME + extensión)

```mermaid
sequenceDiagram
    actor PT as Padre/Tutor
    actor AV as Agente de Viajes
    participant UI as Frontend
    participant API as Django API
    participant STORAGE as Cloud Storage
    participant DB as Base de Datos

    PT->>UI: Accede a sección "Documentación"
    UI->>API: GET /inscripciones/{id}/documentos/
    API->>DB: Carga DocumentosRequeridos del viaje + estado de entregas
    DB-->>API: Lista con estado por documento
    API-->>UI: Checklist de documentos (pendiente/validado/rechazado)

    PT->>UI: Selecciona documento y sube archivo
    UI->>API: POST /documentos/ {inscripcion_id, documento_requerido_id, archivo}
    API->>API: Valida formato y tamaño (max 10 MB)

    alt Formato o tamaño inválido
        API-->>UI: 400 Bad Request "Formato no permitido" o "Archivo demasiado grande"
        UI-->>PT: Mensaje de error
    else Válido
        API->>STORAGE: Sube archivo cifrado
        STORAGE-->>API: archivo_url
        API->>DB: Crea DocumentoEntregado {estado: pendiente}
        API-->>UI: 201 Created
        UI-->>PT: "Documento enviado. En revisión."
    end

    Note over AV,DB: Revisión por el Agente

    AV->>UI: Panel de documentación pendiente
    UI->>API: GET /documentos/?estado=pendiente&viaje_id={id}
    API-->>UI: Lista de documentos con preview

    AV->>UI: Revisa documento

    alt Validar
        AV->>UI: Clic "Validar"
        UI->>API: PATCH /documentos/{id}/ {estado: "validado"}
        API->>DB: Actualiza estado + validado_por + fecha_validacion
        API->>DB: Signal → Notificacion doc_validado al tutor
        API-->>UI: 200 OK
    else Rechazar
        AV->>UI: Clic "Rechazar" + motivo
        UI->>API: PATCH /documentos/{id}/ {estado: "rechazado", motivo_rechazo: "..."}
        API->>DB: Actualiza estado + motivo_rechazo
        API->>DB: Signal → Notificacion doc_rechazado al tutor
        API-->>UI: 200 OK
        UI-->>PT: Notificación con motivo de rechazo
    end
```

---

## FLOW 08 — Gestión de Itinerario (Agente)

```mermaid
sequenceDiagram
    actor AV as Agente de Viajes
    participant UI as Frontend
    participant API as Django API
    participant DB as Base de Datos
    participant STORAGE as Cloud Storage

    AV->>UI: Accede a "Constructor de Itinerario" del viaje
    UI->>API: GET /viajes/{viaje_id}/itinerario/
    API->>DB: Carga Itinerario + EtapasItinerario + Actividades
    DB-->>API: Estructura completa
    API-->>UI: Vista de itinerario por días

    loop Para cada día del viaje
        AV->>UI: Clic "Añadir día"
        UI->>API: POST /itinerarios/{id}/etapas/ {dia_numero, titulo, descripcion}
        API->>DB: Crea EtapaItinerario
        DB-->>API: etapa_id
        API-->>UI: Nuevo día creado

        loop Para cada actividad del día
            AV->>UI: Clic "Añadir actividad"
            UI->>API: POST /etapas/{etapa_id}/actividades/ {hora, titulo, tipo, orden}
            API->>DB: Crea Actividad
            API-->>UI: Actividad añadida al timeline
        end
    end

    AV->>UI: Reordena actividades (drag & drop)
    UI->>API: PATCH /actividades/reordenar/ {actividades: [{id, orden}...]}
    API->>DB: Actualiza campo orden en bloque
    API-->>UI: 200 OK — Orden guardado
```

---

## FLOW 09 — Envío de Comunicado Masivo (Agente)

```mermaid
sequenceDiagram
    actor AV as Agente de Viajes
    participant UI as Frontend
    participant API as Django API
    participant DB as Base de Datos
    participant CELERY as Celery Worker
    participant EMAIL as Servicio Email

    AV->>UI: Redacta comunicado en backoffice
    UI->>API: POST /viajes/{viaje_id}/comunicados/ {titulo, cuerpo}
    API->>DB: Crea Comunicado {enviado_email: false}
    DB-->>API: comunicado_id
    API->>CELERY: Encola tarea enviar_comunicado_masivo(comunicado_id)
    API-->>UI: 201 Created "Comunicado publicado. Enviando emails..."

    CELERY->>DB: Obtiene todas las inscripciones activas del viaje
    DB-->>CELERY: Lista de tutores (emails)
    loop Para cada tutor
        CELERY->>EMAIL: Envía email con título y cuerpo del comunicado
        EMAIL-->>PT: Email del comunicado
        CELERY->>DB: Crea Notificacion {tipo: comunicado} para el tutor
    end
    CELERY->>DB: Actualiza Comunicado {enviado_email: true}
    DB-->>CELERY: OK
```

---

## FLOW 10 — Recordatorio Automático de Pago (Sistema/Celery)

```mermaid
sequenceDiagram
    participant CRON as Celery Beat (cron)
    participant CELERY as Celery Worker
    participant DB as Base de Datos
    participant EMAIL as Servicio Email
    participant WHATSAPP as WhatsApp API

    CRON->>CELERY: Dispara tarea diaria: verificar_cuotas_por_vencer()
    CELERY->>DB: Busca cuotas con fecha_vencimiento en rango {X días}
    DB-->>CELERY: Lista de cuotas próximas a vencer

    loop Para cada cuota sin pago verificado
        CELERY->>DB: Obtiene tutor de la inscripción
        CELERY->>DB: Verifica reglas anti-spam (mensajes de hoy)

        alt Canal: Email
            CELERY->>EMAIL: Envía recordatorio con deep-link a /pagos/{inscripcion_id}
            EMAIL-->>PT: Email de recordatorio
        end

        alt Trigger ≤ 15 días Y canal WhatsApp habilitado
            CELERY->>WHATSAPP: Envía mensaje WhatsApp contextualizado
            WHATSAPP-->>PT: Mensaje WhatsApp
        end

        CELERY->>DB: Crea Notificacion {tipo: recordatorio} para tutor
        CELERY->>DB: Registra envío (anti-spam)
    end

    CRON->>CELERY: Dispara tarea diaria: marcar_cuotas_vencidas()
    CELERY->>DB: Cuotas con fecha_vencimiento < hoy sin pago verificado
    CELERY->>DB: Crea Notificacion {tipo: pago_vencido} para tutores afectados
```

---

## FLOW 11 — Acceso del Mecenas y Pago en Nombre del Alumno

```mermaid
sequenceDiagram
    actor ME as Mecenas
    participant UI as Frontend
    participant API as Django API
    participant DB as Base de Datos
    participant STORAGE as Cloud Storage

    ME->>UI: Login con credenciales propias
    UI->>API: POST /auth/login/ {email, password}
    API-->>UI: 200 OK {rol: "mecenas"}
    UI-->>ME: Dashboard de mecenas

    ME->>UI: Ver alumnos patrocinados
    UI->>API: GET /mecenas/{mecenas_id}/alumnos/
    API->>DB: Filtra MecenasInscripcion donde mecenas_id + activo=True
    DB-->>API: Lista de inscripciones patrocinadas
    API-->>UI: Lista con estado de pago por alumno

    ME->>UI: Registra pago por alumno X
    UI->>API: POST /pagos/ {inscripcion_id, importe, fecha, metodo, comprobante}
    API->>STORAGE: Sube comprobante
    API->>DB: Crea Pago {pagado_por: mecenas.usuario, estado: pendiente}
    API-->>UI: 201 Created
    UI-->>ME: "Pago registrado. En revisión por la agencia."
```

---

## FLOW 12 — Exportación y Reportes (Agente)

```mermaid
sequenceDiagram
    actor AV as Agente de Viajes
    participant UI as Frontend
    participant API as Django API
    participant DB as Base de Datos
    participant CELERY as Celery Worker

    AV->>UI: Panel del viaje → sección "Exportar"
    UI-->>AV: Opciones de exportación

    alt Exportar inscritos CSV/Excel
        AV->>UI: Selecciona "Inscritos" + formato
        UI->>API: GET /viajes/{viaje_id}/exportar/inscritos/?formato=xlsx
        API->>DB: Consulta inscripciones + alumnos + grupos
        DB-->>API: Dataset completo
        API-->>UI: Archivo .xlsx para descarga
        UI-->>AV: Descarga del archivo
    end

    alt Generar informe PDF
        AV->>UI: Clic "Informe de estado PDF"
        UI->>API: GET /viajes/{viaje_id}/exportar/informe-pdf/
        API->>DB: Obtiene métricas del viaje
        API->>CELERY: Genera PDF con métricas, listados y gráficos
        CELERY-->>API: URL del PDF generado
        API-->>UI: URL de descarga
        UI-->>AV: Descarga del informe PDF
    end
```

---

## Resumen de Customer Journey — Padre/Tutor

### Fases del Journey

| Fase | Nombre | Emoción principal |
|------|--------|------------------|
| 1 | Conciencia y Descubrimiento | 😃 Entusiasmo |
| 2 | Evaluación y Decisión | 🤔→😊 Confianza |
| 3 | Registro e Inscripción | 😐→😤→😌 |
| 4 | Gestión: Documentación | 😰→😤→😌 |
| 5 | Pagos | 😌 con alerta si hay vencidos |
| 6 | Preparación (pre-viaje) | 😊 Expectativa |
| 7 | Post-viaje | 😊 Satisfacción |

### Touchpoints por Fase

**Fase 1 — Conciencia:**
- Agencia envía link del viaje por WhatsApp o email
- Padre accede a la **landing pública** del viaje (`/viajes/{slug}/`)
- Landing incluye: Hero full-width, destino, fechas, plazas, precio desde, CTA "Inscribir a mi hij@"

**Fase 2 — Evaluación:**
- Revisa: licencia de agencia, seguro incluido, pago fraccionado, monitores, T&C
- Puntos de dolor: sin reseñas de padres, precio total no visible hasta avanzar

**Fase 3 — Registro:**
- Wizard de 3 pasos: Datos básicos → Centro educativo → Salud y T&C
- Búsqueda de viaje: por código directo o por centro educativo (provincia → colegio → destino)
- Validación inteligente: si el alumno no corresponde al nivel/colegio del viaje, se avisa

**Fase 4 — Documentación:**
- Dashboard muestra alerta con deep-link directo a `/documentos/{id}`
- Checklist visual con estados: Pendiente 🟡 / En revisión / Aprobado 🟢 / Rechazado 🔴
- Historial de versiones por documento (tras rechazos)

**Fase 5 — Pagos:**
- Plan de pagos con cuotas, fechas, estados
- Registro de pago manual + comprobante
- Recordatorios omnicanal automáticos (Celery)

**Estados del viaje comunicados al padre:**
- 🟠 Lista de espera → CTA: "Completar inscripción"
- 🟡 Pre-inscrito → CTA: "Ver qué falta"
- 🟢 Confirmado → CTA: "Ver detalles del viaje"
- 🔵 En camino → CTA: "Ver itinerario en vivo"

### Métricas Clave a Instrumentar

| Métrica | Fase |
|---------|------|
| Tasa de click en CTA "INSCRIBIR A MI HIJ@" | 1 |
| Tiempo en landing antes del primer click | 1 |
| Bounce rate de la landing | 1 |
| Tasa de completado del formulario paso 1 | 3 |
| Tasa de abandono en búsqueda de colegio/destino | 3 |
| Tiempo promedio para completar inscripción | 3 |
| % documentos aprobados antes de la fecha límite | 4 |
| Tasa de resubida tras rechazo | 4 |
| Tiempo promedio entre subida y aprobación | 4 |
| % de padres que completan todos los documentos a tiempo | 4 |
