# CODE_REVIEW_CHECKLIST.md — Lista de Verificación Pre-Entrega (Estado Real)

> El agente ejecuta esta lista **antes de marcar cualquier tarea como Done**.
> Si algún punto falla, la tarea no está terminada.
> Última actualización: 2026-07-09 (incorporados checks de fetchApi, model field consistency, console.log)

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

## 2. Seguridad — Sin cambios

---

## 3. Rendimiento — Sin cambios

---

## 4. Código Duplicado

- [ ] ¿Existe lógica similar ya implementada en otro módulo que podría reutilizarse?
- [ ] ¿Los serializers, permisos y viewsets siguen el patrón establecido en módulos anteriores?
- [ ] ¿Los componentes UI reutilizan `<Badge>`, `<ProgressBar>`, `<FileUploader>`, `<AlertCard>` existentes?
- [ ] ¿Se extrajo lógica común a helpers/utils solo si hay más de dos usos concretos?
- [ ] ¿Los campos de alergias (o listas similares) no están duplicados 3+ veces en el mismo archivo?

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

## 6.1 Model Field Consistency (NUEVO)

- [ ] ¿Los nombres de campos usados en `get_or_create(defaults=...)` coinciden exactamente con los nombres de campos del modelo?
- [ ] ¿Los `Serializer.Meta.fields` referencian nombres de campos que existen en el modelo?
- [ ] ¿Los campos de alergias (o listas similares) no están duplicados 3+ veces en el mismo archivo?

## 6.2 API Client (Frontend) (NUEVO)

- [ ] ¿Las llamadas a `fetchApi` verifican correctamente la respuesta? (`if (!res.ok)` en lugar de `if (!res)`)
- [ ] ¿Los errores HTTP (ApiError) se capturan y manejan explícitamente?
- [ ] ¿No hay `console.log` en componentes de producción?

---

## 7. Lint y Tipado — Sin cambios

---

## 8. Tests — Sin cambios

---

## 9. Documentación — Sin cambios

---

## 10. Compatibilidad con el Resto del Proyecto — Sin cambios

---

## Resultado de la revisión

Al finalizar esta lista, el agente debe concluir con uno de estos resultados:

### ✅ Aprobado
```
CODE REVIEW: APROBADO
Todos los puntos verificados. Sin hallazgos críticos.
```

### ⚠️ Aprobado con observaciones
```
CODE REVIEW: APROBADO CON OBSERVACIONES
La tarea cumple los criterios mínimos.
Observaciones no bloqueantes:
- [Observación 1]
```

### ❌ Rechazado
```
CODE REVIEW: RECHAZADO
La tarea no puede marcarse como Done. Motivos:
- [Punto fallido 1]
Acciones requeridas:
- [Acción 1]
```
