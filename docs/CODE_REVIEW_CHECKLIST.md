# CODE_REVIEW_CHECKLIST.md — Lista de Verificación Pre-Entrega

> El agente ejecuta esta lista **antes de marcar cualquier tarea como Done**.
> Si algún punto falla, la tarea no está terminada.

---

## 1. Arquitectura

- [ ] ¿El código respeta la capa en la que se encuentra? (no hay lógica de negocio en el gateway, no hay queries directas en el frontend)
- [ ] ¿Los nuevos archivos están en la carpeta correcta según `ARCHITECTURE.md`?
- [ ] ¿Se respeta la separación de portales en Next.js (route groups correctos)?
- [ ] ¿Los Server Components no tienen estado (`useState`, `useEffect`)?
- [ ] ¿Los Client Components están marcados con `'use client'` y son los mínimos necesarios?
- [ ] ¿No se crearon abstracciones prematuras para funcionalidad que no existe aún?
- [ ] ¿Las rutas de API siguen el patrón `/api/v1/` definido en `API.md`?

---

## 2. Seguridad

- [ ] ¿Todos los endpoints nuevos verifican autenticación JWT (`IsAuthenticated`)?
- [ ] ¿Los endpoints del agente filtran por `agencia_id`? (no hay `Modelo.objects.all()` sin filtro)
- [ ] ¿Los endpoints del padre filtran por `padre_tutor` del usuario autenticado?
- [ ] ¿El campo `notas_internas` de `Inscripcion` está ausente en serializers del padre/alumno?
- [ ] ¿Los tokens JWT se almacenan en cookies `httpOnly`? (no hay `localStorage.setItem`)
- [ ] ¿Los archivos subidos se validan en el gateway (primera línea) **y** en el backend (segunda línea)?
- [ ] ¿El tamaño máximo de archivo es 10 MB (`10_485_760 bytes`) en ambas capas?
- [ ] ¿La extensión Y el MIME type del archivo son validados en el backend?
- [ ] ¿Existen permisos por rol en los endpoints (no hay acceso cruzado entre roles)?
- [ ] ¿Las contraseñas se hashean con bcrypt (`set_password()`)? (nunca en texto plano)
- [ ] ¿El login está bloqueado si `email_verificado=False`?
- [ ] ¿Los refresh tokens se validan contra la allowlist de Redis?

---

## 3. Rendimiento

- [ ] ¿Hay `select_related()` en relaciones ForeignKey que se acceden en el serializer?
- [ ] ¿Hay `prefetch_related()` en relaciones ManyToMany o reverse FK que se iteran?
- [ ] ¿No hay consultas dentro de bucles (problema N+1)?
- [ ] ¿Los listados tienen paginación implementada?
- [ ] ¿Las tareas pesadas (emails masivos, generación de PDFs) se ejecutan en Celery y no bloquean el request?
- [ ] ¿Los índices requeridos por `DATABASE.md` están declarados en el modelo?
- [ ] ¿`saldo_pendiente` es una propiedad Python? (nunca una columna de BD, nunca calculada en el template)
- [ ] ¿Las animaciones de Framer Motion usan `LazyMotion` + `domAnimation`? (no se importa `motion` completo)

---

## 4. Código Duplicado

- [ ] ¿Existe lógica similar ya implementada en otro módulo que podría reutilizarse?
- [ ] ¿Los serializers, permisos y viewsets siguen el patrón establecido en módulos anteriores?
- [ ] ¿Los componentes UI reutilizan `<Badge>`, `<ProgressBar>`, `<FileUploader>`, `<AlertCard>` existentes?
- [ ] ¿Se extrajo lógica común a helpers/utils solo si hay más de dos usos concretos?

---

## 5. Correctitud y Bugs

- [ ] ¿Las transiciones de estado son válidas? (borrador → activo → cerrado → archivado; nunca retroceso)
- [ ] ¿La creación de `Viaje` dispara automáticamente la creación de `Itinerario` vacío?
- [ ] ¿La combinación `(alumno_id, viaje_id)` es UNIQUE en `Inscripcion`?
- [ ] ¿El importe de `Pago` y `Cuota` tiene constraint `> 0` en la BD?
- [ ] ¿`fecha_regreso > fecha_salida` tiene constraint en la BD (no solo validación)?
- [ ] ¿`LogAuditoria` se crea mediante signal (no llamada directa en el endpoint)?
- [ ] ¿Las tareas Celery tienen cache key de idempotencia en Redis?
- [ ] ¿El reordenamiento de actividades usa `PATCH /actividades/reordenar/` (nunca PATCHes individuales)?
- [ ] ¿Solo los pagos con `estado='verificado'` se suman al cálculo de `saldo_pendiente`?
- [ ] ¿`LogAuditoria` no tiene operaciones UPDATE ni DELETE en ningún flujo?
- [ ] ¿Los casos de error están cubiertos (cupo agotado, alumno ya inscrito, archivo inválido)?
- [ ] ¿Los códigos HTTP de respuesta coinciden con los definidos en `API.md`?

---

## 6. Naming y Consistencia

- [ ] ¿Los nombres de modelos Django son en PascalCase y en español según `DATABASE.md`?
- [ ] ¿Los campos de los modelos usan snake_case consistente con el esquema?
- [ ] ¿Las URLs de API siguen exactamente el patrón de `API.md`?
- [ ] ¿Los nombres de componentes React son en PascalCase?
- [ ] ¿Las variables y funciones JS/TS usan camelCase?
- [ ] ¿Los nombres de archivos en Next.js siguen la convención de App Router (`page.tsx`, `layout.tsx`, `loading.tsx`)?
- [ ] ¿Los nombres de tasks Celery son descriptivos y en snake_case?
- [ ] ¿Las enumeraciones de Django usan `TextChoices` según las definidas en `DATABASE.md`?

---

## 6.1 Model Field Consistency

- [ ] ¿Los nombres de campos usados en `get_or_create(defaults=...)` coinciden exactamente con los nombres de campos del modelo?
- [ ] ¿Los `Serializer.Meta.fields` referencian nombres de campos que existen en el modelo?
- [ ] ¿Los campos de alergias (o listas similares) no están duplicados 3+ veces en el mismo archivo?

## 6.2 API Client (Frontend)

- [ ] ¿Las llamadas a `fetchApi` verifican correctamente la respuesta? (`if (!res.ok)` en lugar de `if (!res)`)
- [ ] ¿Los errores HTTP (ApiError) se capturan y manejan explícitamente?
- [ ] ¿No hay `console.log` en componentes de producción?

---

## 7. Lint y Tipado

### Frontend (TypeScript + ESLint)
- [ ] `npx tsc --noEmit` → sin errores
- [ ] `npx eslint .` → sin errores ni warnings
- [ ] ¿Todos los props de componentes tienen tipos explícitos (no `any`)?
- [ ] ¿Las respuestas de la API tienen tipos definidos (interfaces o types)?
- [ ] ¿No hay `@ts-ignore` o `@ts-expect-error` sin justificación documentada?

### Backend (Python + flake8/ruff)
- [ ] `python manage.py check` → sin errores ni warnings
- [ ] `flake8 .` o `ruff check .` → sin errores
- [ ] ¿Los tipos de retorno de funciones importantes están anotados?
- [ ] ¿No hay imports no utilizados?

---

## 8. Tests

- [ ] ¿Se añadieron tests para la lógica de negocio nueva (reglas de dominio, cálculos, validaciones)?
- [ ] ¿Los tests de endpoints cubren los casos de error además del happy path?
- [ ] ¿Los tests de signals verifican que los efectos secundarios se disparan correctamente?
- [ ] ¿Los tests de tareas Celery verifican la idempotencia (segunda ejecución no duplica efectos)?
- [ ] ¿Los tests existentes siguen pasando? (sin regresiones)

---

## 9. Documentación

- [ ] ¿Se actualizó `TASKS.md` marcando la tarea como `Done`?
- [ ] ¿Si la implementación difiere del plan, se notificó al usuario y se propuso actualizar el documento correspondiente?
- [ ] ¿Las funciones con lógica no obvia tienen un comentario que explica el POR QUÉ (no el QUÉ)?
- [ ] ¿No se añadieron comentarios que describen lo que el código ya comunica por sí mismo?

---

## 10. Compatibilidad con el Resto del Proyecto

- [ ] ¿El nuevo código es compatible con la versión de Django 4.2+?
- [ ] ¿El nuevo código es compatible con Next.js 16.2.6 (App Router)?
- [ ] ¿El nuevo código usa TailwindCSS 4 (`@theme {}`) y no `tailwind.config.js`?
- [ ] ¿Las migraciones se generan sin conflictos con migraciones existentes?
- [ ] ¿Los nuevos endpoints están registrados en el router del gateway?
- [ ] ¿Los nuevos permisos DRF son consistentes con el sistema de roles existente (`padre`, `agente`, `alumno`, `mecenas`)?
- [ ] ¿El nuevo código en el frontend funciona correctamente en mobile (375px de ancho mínimo)?
- [ ] ¿Las alertas y notificaciones nuevas incluyen deep-link a la pantalla de acción? (nunca texto genérico sin CTA)

---

## Resultado de la revisión

Al finalizar esta lista, el agente debe concluir con uno de estos resultados:

### ✅ Aprobado — La tarea cumple el DoD

```
CODE REVIEW: APROBADO
Todos los puntos verificados. Sin hallazgos críticos.
[Lista de puntos menores si los hay, como sugerencias no bloqueantes]
```

### ⚠️ Aprobado con observaciones — La tarea cumple el DoD pero hay mejoras recomendadas

```
CODE REVIEW: APROBADO CON OBSERVACIONES
La tarea cumple los criterios mínimos.
Observaciones no bloqueantes:
- [Observación 1]
- [Observación 2]
```

### ❌ Rechazado — La tarea NO cumple el DoD

```
CODE REVIEW: RECHAZADO
La tarea no puede marcarse como Done. Motivos:
- [Punto fallido 1 con descripción]
- [Punto fallido 2 con descripción]
Acciones requeridas antes de continuar:
- [Acción 1]
- [Acción 2]
```
