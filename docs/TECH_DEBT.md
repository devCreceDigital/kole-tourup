# TECH_DEBT.md — Registro de Deuda Técnica

> Última actualización: 2026-07-12 (Code Review & Fix)

> Solo registra deuda. No resuelve. Cada entrada requiere aprobación antes de ser trabajada.
>
> **Estados:** `Activa` | `En revisión` | `Resuelta`
> **Prioridades:** `Alta` | `Media` | `Baja`

---

## TD-001 — Sin archivos de test automatizados para TASK-008 a TASK-011

**ID:** TD-001  
**Estado:** Activa  
**Prioridad:** Alta  
**Detectado en:** TASK-012 (2026-06-28)

**Descripción:**  
Las tareas TASK-008 (registro), TASK-009 (verificación), TASK-010 (login) y TASK-011
(refresh/logout) documentan tests en sus notas ("7 tests — todos pasan", "9 tests — todos pasan",
etc.), pero no existen archivos `.py` de tests en el repositorio para el módulo
`apps.autenticacion`. La validación fue manual o en sesión interactiva y no quedó persistida.

**Impacto:**  
- Cualquier refactorización del módulo de autenticación puede romper funcionalidad sin detección.
- El total de tests automatizados del módulo es 0 (TASK-008→011) + 13 (TASK-012).
- Cobertura de CI nula en el flujo crítico de login/registro/JWT.

**Prioridad:** Alta — la autenticación es el flujo más crítico del sistema.

**Tarea sugerida:**  
Crear `backend/apps/autenticacion/tests/` con:
- `test_registro.py` (7 casos)
- `test_verificacion.py` (7 casos)
- `test_login.py` (9 casos)
- `test_refresh_logout.py` (11 casos)

---

## TD-002 — JWTAuthentication no lee cookies (requiere Gateway para funcionar en producción)

**ID:** TD-002  
**Estado:** Parcialmente Resuelta  
**Prioridad:** Media  
**Detectado en:** TASK-012 (2026-06-28)  
**Actualizado en:** TASK-015 (2026-06-28)

**Descripción:**  
El `DEFAULT_AUTHENTICATION_CLASSES` usa `JWTAuthentication` de simplejwt, que lee el token
del header `Authorization: Bearer <token>`. Sin embargo, los tokens se almacenan en cookies
`httpOnly` (DEC-002). Con TASK-015 el Gateway ya convierte la cookie en header antes de
enviar al backend.

La deuda restante es en **desarrollo local sin Gateway activo**: los tests de endpoints
autenticados deben usar `force_authenticate()` porque no pueden emular el Gateway.

**Impacto:**  
- Los tests no ejercen el camino real de autenticación (cookie → Gateway → header → Django).
- En desarrollo sin Gateway, los endpoints autenticados son inaccesibles via navegador/curl.

**Prioridad:** Media — con TASK-015 el flujo de producción funciona end-to-end.

**Tarea sugerida:**  
Implementar `CookieJWTAuthentication(JWTAuthentication)` que lea `access_token` de cookies
como fallback cuando no hay header `Authorization`. Activar como clase adicional en
`DEFAULT_AUTHENTICATION_CLASSES`. Permite desarrollo y tests sin Gateway.

---

## TD-003 — Archivos de logo huérfanos al actualizar con PATCH

**ID:** TD-003  
**Estado:** Activa  
**Prioridad:** Baja  
**Detectado en:** TASK-012 (2026-06-28)

**Descripción:**  
Cuando se hace PATCH de `logo` con un nuevo archivo, el archivo anterior queda en storage
(local o S3) sin referencia en la BD. Django no elimina automáticamente archivos de
`ImageField` al actualizarse o borrarse. Con el tiempo esto genera archivos huérfanos
que consumen storage.

**Impacto:**  
- Bajo en Fase 1 (solo un tenant, logo cambia raramente).
- Aumenta en Fase 2+ con múltiples agencias.

**Prioridad:** Baja — no afecta funcionalidad.

**Tarea sugerida:**  
Añadir signal `pre_save` en `Agencia` que elimine el logo anterior del storage cuando
`logo` cambia. Alternativa: task Celery periódica que audite archivos huérfanos en S3.

---

## TD-004 — Errores E501 en migración autogenerada `agencias/migrations/0001_initial.py`

**ID:** TD-004  
**Estado:** Activa  
**Prioridad:** Baja  
**Detectado en:** TASK-012 (2026-06-28)

**Descripción:**  
Flake8 reporta 7 errores E501 (líneas > 100 caracteres) en
`backend/apps/agencias/migrations/0001_initial.py`. El archivo fue generado automáticamente
por Django (`makemigrations`) y nunca formateado.

**Impacto:**  
- Flake8 sobre toda la carpeta `apps/agencias/` falla con exit code 1.
- Los 5 archivos de TASK-012 tienen 0 errores. El ruido es del archivo preexistente.

**Prioridad:** Baja — no afecta funcionalidad ni seguridad.

**Tarea sugerida:**  
Añadir `per-file-ignores = migrations/*:E501` al `.flake8` del proyecto. Esta es la
práctica estándar en proyectos Django para ignorar errores de lint en migraciones
autogeneradas.

---

## TD-005 — Sin linter configurado en el Gateway (JavaScript)

**ID:** TD-005  
**Estado:** Activa  
**Prioridad:** Media  
**Detectado en:** TASK-013 (2026-06-28)

**Descripción:**  
El módulo `gateway/` no tiene ESLint ni Biome configurados. El código JavaScript del
Gateway no pasa por ninguna verificación de estilo o calidad automática. En Python se usa
flake8; en JavaScript no hay equivalente configurado.

**Impacto:**  
- Errores de estilo (variables no usadas, comparaciones débiles `==`, `console.log` olvidados)
  pueden llegar al repositorio sin detección.
- En TASK-014+ el Gateway crece en complejidad; la ausencia de linter aumenta el riesgo de
  errores sutiles.

**Prioridad:** Media — el Gateway es código crítico de seguridad (CORS, auth, rate limiting).

**Tarea sugerida:**  
Añadir ESLint con configuración mínima (`eslint:recommended`) y script `"lint": "eslint ."` en
`gateway/package.json`. Alternativa: Biome (más rápido, sin dependencias de plugins). Configurar
en CI junto con `npm test`.

---

## TD-006 — Tests de auth no verifican el ciclo completo cookie→Django→respuesta

**ID:** TD-006  
**Estado:** Activa  
**Prioridad:** Baja  
**Detectado en:** TASK-015 (2026-06-28)

**Descripción:**  
Los tests de `auth.test.js` verifican que el middleware inyecta el header `Authorization`
correctamente en `req.headers`, pero no hay un test de integración end-to-end que confirme
que ese header llega al backend Django y Django lo acepta como JWT válido.

Esto requeriría un test E2E con Docker (Gateway + Django + Redis en red), que está fuera
del alcance de los tests unitarios/integración actuales.

**Impacto:**  
- Bajo: el middleware auth es correcto y simple. El riesgo de regresión es mínimo.
- La validación del JWT sigue siendo responsabilidad exclusiva de Django (arquitectura correcta).

**Prioridad:** Baja — acceptable en Fase 1. Los tests actuales dan cobertura suficiente.

**Tarea sugerida:**  
Añadir suite de tests E2E (ej: con `docker compose run` y un script de smoke tests) que
verifique el flujo completo: login → cookie → Gateway → Django → respuesta autenticada.
Sugerido para TASK-017+ (cuando el proxy Django esté implementado).

---

### TD-007: Fragmentación de Routing en Viajes (Alumnos)
**Estado:** Activa
**Prioridad:** Media
**Detectado en:** TASK-028 (2026-06-28)

**Descripción:**
lumnos_urls.py rompe ligeramente la uniformidad del dominio REST, al crear un sub-router paralelo en vez de anidarlo bajo /viajes/alumnos/ o /viajes/{viaje_id}/alumnos/.

**Impacto:**
- Deuda arquitectónica de coherencia REST. Podría causar fragmentación y pérdida de trazabilidad si otros módulos transversales hacen lo mismo.

**Tarea sugerida:**
Consolidar el routing bajo /api/v1/viajes/alumnos/ o similar en el futuro, modificando las rutas y tests correspondientes.

---

### TD-008: Relación M2M prematura (Alumnos-Grupos) y falta de prefetch
**Estado:** Activa
**Prioridad:** Baja
**Detectado en:** TASK-028 (2026-06-28)

**Descripción:**
La relación M2M entre Alumno y Grupo se introdujo anticipadamente. Aunque es funcional, podría implicar acoplamiento innecesario y requerir reestructuración en la TASK-033. Además, falta prefetch_related('grupos') en las vistas AlumnoListCreateView y AlumnoRetrieveUpdateView para optimizar consultas futuras.

**Impacto:**
- Performance: Puede haber queries N+1 si se listan los grupos en el serializer sin el prefetch.
- Diseño: Puede requerir ajustes cuando se aborde la lógica completa de Inscripciones y Grupos.

**Tarea sugerida:**
Añadir prefetch_related('grupos') cuando los grupos se empiecen a serializar y revisar la estructura M2M en TASK-033.

---

### TD-009: `InscripcionCreateSerializer` usa `nombre` en lugar de `nombres` (model field mismatch)

**ID:** TD-009  
**Estado:** Resuelta — Falso positivo  
**Prioridad:** Alta (original) → N/A  
**Detectado en:** Code Review (2026-07-09)  
**Actualizado en:** 2026-07-12 (Code Review)

**Descripción:**
El `InscripcionCreateSerializer` importa `Alumno` desde `apps.inscripciones.models`, donde el campo se llama `nombre` (singular). El reporte original asumió erróneamente que importaba desde `apps.viajes.models`, donde el campo se llama `nombres` (plural). El código es correcto y funcional.

**Resolución:**
Se determinó que es un falso positivo. El serializer usa el modelo correcto (`inscripciones.Alumno`) que tiene el campo `nombre`.

---

### TD-010: `fetchApi` response handling inconsistente con `FormularioPago`

**ID:** TD-010  
**Estado:** Resuelta  
**Prioridad:** Alta (original) → N/A  
**Detectado en:** Code Review (2026-07-09)  
**Actualizado en:** 2026-07-12 (Code Review)

**Descripción:**
El `FormularioPago.tsx` tenía un `const res = await fetchApi(...)` seguido de `if (!res) throw`, que era código muerto mal implementado. `fetchApi` ya lanza `ApiError` en respuestas no-OK, por lo que el `if (!res)` nunca se ejecutaba en errores reales y solo causaba falsos negativos en respuestas 204 exitosas.

**Resolución:**
Se eliminó la variable `res` y la comprobación `if (!res)`, dejando solo `await fetchApi(...)` envuelto en el `try/catch` existente que captura `ApiError` correctamente.

---

### TD-011: `console.log` de depuración en producción (`PagarSection`)

**ID:** TD-011  
**Estado:** Resuelta  
**Prioridad:** Baja (original) → N/A  
**Detectado en:** Code Review (2026-07-09)  
**Actualizado en:** 2026-07-12 (Code Review)

**Descripción:**
El componente `frontend/components/padre/PagarSection.tsx` tenía tres llamadas `console.log` utilizadas para depuración durante el desarrollo del fix de hidratación.

**Resolución:**
Se eliminaron las tres llamadas `console.log` del componente. El archivo actual no contiene ninguna sentencia `console.log`.

---

### TD-012: Repetición masiva de campos de alergias (14 campos × múltiples lugares)

**ID:** TD-012  
**Estado:** Parcialmente Resuelta  
**Prioridad:** Media  
**Detectado en:** Code Review (2026-07-09)  
**Actualizado en:** 2026-07-12 (Code Review)

**Descripción:**
Los 14 campos booleanos de alergias (`alergeno_gluten`, `alergeno_crustaceos`, etc.) se repiten en múltiples lugares del código.

**Progreso:**
- ✅ Constante `CAMPOS_ALERGENOS` creada en `serializers.py`
- ✅ `defaults_dict` refactorizado a bucle sobre `CAMPOS_ALERGENOS`
- ✅ `inscripcion_kwargs` refactorizado a bucle sobre `CAMPOS_ALERGENOS`
- ✅ `AlumnoInputSerializer`: campos generados dinámicamente vía `__init__`
- ✅ `get_alergias()`: refactorizado a list comprehension sobre `ETIQUETAS_ALERGENOS`
- ✅ `MisAlumnosView` en `views.py`: refactorizado a bucle sobre `CAMPOS_ALERGENOS`
- ⏳ `Alumno` model: los 14 campos `BooleanField` en `models.py` (requeriría migración)
- ⏳ `Inscripcion` model: los 14 campos `BooleanField` en `models.py` (requeriría migración)

**Impacto:**
- Medio: el riesgo de error humano al añadir/quitar alérgenos se redujo en las secciones refactorizadas, pero persiste en models, serializer fields y get_alergias.

**Prioridad:** Media — no afecta funcionalidad actual pero es fuente de bugs futuros.

**Tarea sugerida:**
- Refactorizar `AlumnoInputSerializer` para generar los campos dinámicamente
- Refactorizar `get_alergias()` para iterar sobre `CAMPOS_ALERGENOS`
- Considerar migrar los campos de alergias a un modelo relacionado (tabla separada) para eliminar completamente la duplicación a nivel de BD

---

### TD-013: `NavBackoffice` perdió elementos de navegación

**ID:** TD-013  
**Estado:** Resuelta  
**Prioridad:** Alta (original) → N/A  
**Detectado en:** Code Review (2026-07-09)  
**Actualizado en:** 2026-07-12 (Code Review)

**Descripción:**
El array `NAV_ITEMS` en `NavBackoffice.tsx` fue reducido a solo 2 entradas durante una refactorización, eliminando secciones enteras del backoffice.

**Resolución:**
Se restauraron los 8 ítems de navegación: Dashboard, Viajes, Inscripciones, Pagos, Documentos, Comunicados, Chat, Notificaciones. Nota: algunas rutas destino pueden no tener página implementada aún (ver PENDING.txt).

---

### TD-014: IP hardcodeada en `docker-compose.yml`

**ID:** TD-014  
**Estado:** Resuelta  
**Prioridad:** Alta (original) → N/A  
**Detectado en:** Code Review (2026-07-09)  
**Actualizado en:** 2026-07-12 (Code Review)

**Descripción:**
La IP `64.181.196.217` estaba hardcodeada en `CORS_ORIGINS` y `NEXT_PUBLIC_GATEWAY_URL` en `docker-compose.yml`.

**Resolución:**
Se reemplazaron los valores hardcodeados por variables de entorno con defaults seguros para localhost:
- `CORS_ORIGINS`: usa `${EXTERNAL_ORIGIN:-http://localhost:3000}`
- `NEXT_PUBLIC_GATEWAY_URL`: usa `${NEXT_PUBLIC_GATEWAY_URL:-http://localhost:3001}`

---

### TD-015: Filtro de viaje público cambiado de `'publicado'` a `'activo'`

**ID:** TD-015  
**Estado:** Activa  
**Prioridad:** Media  
**Detectado en:** Code Review (2026-07-09)

**Descripción:**
En `backend/apps/viajes/views.py:499,514`, los endpoints `ViajePublicoListView` y `ViajePublicoDetailView` cambiaron de filtrar por `estado='publicado'` a `estado='activo'`. Aunque esto alinea el filtro con las opciones reales del modelo (`EstadoViaje.choices` no incluye `'publicado'`), es un cambio de comportamiento en la API pública que no fue documentado en `API.md` ni `DATABASE.md`.

**Impacto:**
- Medio: cambia el comportamiento esperado de la API pública.
- Si algún cliente externo o frontend usaba `estado=publicado`, ahora falla.

**Prioridad:** Media — correcto en sí mismo pero no documentado.

**Tarea sugerida:**
Actualizar `API.md` y `DATABASE.md` para reflejar que los viajes públicos se filtran por `estado='activo'`.
