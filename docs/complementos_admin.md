# Gestión de Complementos — Django Admin

## ¿Qué son los complementos?

Son **adicionales opcionales** que la agencia ofrece por viaje, fuera del precio base:

- **Seguros** (cancelación, accidentes, equipaje)
- **Menús especiales** (celíaco, vegetariano, alergias)
- **Actividades opcionales** (excursión extra, taller, visita no incluida)
- **Extras** (camiseta del viaje, fotos, recuerdo, kit de viaje)

---

## Modelos

### 1. Complemento (Catálogo maestro)

```
Complemento
├── nombre       — ej. "Seguro Cancelación", "Menú Celíaco"
├── tipo         — seguro | menu | actividad_opcional | extra
├── descripcion  — texto explicativo para el padre
└── activo       — si está disponible globalmente
```

Se administra en: **Admin > Viajes > Complementos**

### 2. ComplementoViaje (Puente con precio)

Vincula un Complemento del catálogo a un Viaje específico con su precio.

```
ComplementoViaje
├── viaje         — FK → Viaje
├── complemento   — FK → Complemento
├── precio        — ej. S/35.00
└── activo        — si está disponible para este viaje
```

Se administra como **inline dentro del Viaje** (sección "Complementos por viaje") o directamente en **Admin > Viajes > Complementos por viaje**.

### 3. ComplementoContratado

Registra qué complementos contrató cada inscripción.

```
ComplementoContratado
├── inscripcion        — FK → Inscripcion
├── complemento_viaje  — FK → ComplementoViaje
└── cantidad           — ej. 2 (dos menús celíacos)
```

Visible como inline de **solo lectura** dentro de cada Inscripción en el admin.

---

## Flujo de trabajo para el agente

```
1. Catálogo: crear Complementos (Seguro Básico, Menú Vegano, etc.)
       ↓
2. Por viaje: activar ComplementoViaje con precio
   (en la pantalla de edición del Viaje, inline "Complementos por viaje")
       ↓
3. El padre ve los complementos disponibles al inscribirse
   (futuro — frontend pendiente)
       ↓
4. Admin consulta ComplementoContratado por inscripción
   (inline en Inscripción, sección "Complementos contratados")
```

---

## Admin — Resumen de pantallas

| Sección admin | Modelo | Qué hace |
|---|---|---|
| Viajes > Complementos | Complemento | CRUD del catálogo maestro |
| Viajes > Complementos por viaje | ComplementoViaje | Asigna precio y activa/desactiva por viaje |
| Viajes > Complementos contratados | ComplementoContratado | Consulta (solo lectura) qué contrató cada familia |
| Edición de Viaje (inline) | ComplementoViaje | Inline para gestionar complementos del viaje |
| Edición de Inscripción (inline) | ComplementoContratado | Inline (solo lectura) para ver lo contratado |
