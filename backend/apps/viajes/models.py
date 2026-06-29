import uuid
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _


class EstadoViaje(models.TextChoices):
    BORRADOR = "borrador", _("Borrador")
    ACTIVO = "activo", _("Activo")
    CERRADO = "cerrado", _("Cerrado")
    ARCHIVADO = "archivado", _("Archivado")


class TipoActividad(models.TextChoices):
    VUELO = "vuelo", _("Vuelo / Traslado aÃ©reo")
    BUS = "bus", _("Transporte terrestre")
    HOTEL = "hotel", _("Alojamiento / Check-in")
    COMIDA = "comida", _("Comidas (Desayuno, Almuerzo, Cena)")
    EXCURSION = "excursion", _("ExcursiÃ³n / Tour")
    LIBRE = "libre", _("Tiempo libre")
    OTRO = "otro", _("Otra actividad")


class Viaje(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agencia = models.ForeignKey(
        "agencias.Agencia",
        on_delete=models.CASCADE,
        related_name="viajes"
    )
    nombre = models.CharField(max_length=300)
    destino = models.CharField(max_length=200)
    fecha_salida = models.DateField()
    fecha_regreso = models.DateField()
    descripcion = models.TextField(blank=True, default="")
    cupo_maximo = models.PositiveIntegerField()
    precio_total = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(
        max_length=20,
        choices=EstadoViaje.choices,
        default=EstadoViaje.BORRADOR
    )
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    codigo = models.CharField(max_length=20, unique=True, blank=True)
    imagen = models.ImageField(
        upload_to="viajes/portadas/", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["agencia", "estado"]),
            models.Index(fields=["fecha_salida"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(fecha_regreso__gt=F("fecha_salida")),
                name="viaje_fecha_regreso_mayor_salida",
                violation_error_message=_(
                    "La fecha de regreso debe ser posterior a la fecha de salida."  # noqa: E501
                )
            )
        ]
        ordering = ["-fecha_salida"]

    def __str__(self):
        return f"{self.nombre} ({self.destino})"

    @property
    def duracion_dias(self):
        if self.fecha_regreso and self.fecha_salida:
            return (self.fecha_regreso - self.fecha_salida).days
        return 0


class PlanPago(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viaje = models.OneToOneField(
        Viaje,
        on_delete=models.CASCADE,
        related_name="plan_pago"
    )
    descripcion = models.CharField(max_length=300, blank=True, default="")
    total_cuotas = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Plan de pago - {self.viaje.nombre}"

    @property
    def tiene_pagos_verificados(self):
        """
        Verifica si el plan de pagos posee pagos con estado 'verificado'.
        Actualmente retorna False hasta que se implemente la app Pagos.
        """
        # TODO: Implementar validaciÃ³n real cuando exista la app Pagos (TASK-036)  # noqa: E501
        # return self.cuotas.filter(pagos__estado='verificado').exists()
        return False


class Cuota(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan_pago = models.ForeignKey(
        PlanPago,
        on_delete=models.CASCADE,
        related_name="cuotas"
    )
    numero_cuota = models.PositiveIntegerField()
    descripcion = models.CharField(max_length=200, blank=True, default="")
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_vencimiento = models.DateField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(importe__gt=0),
                name="cuota_importe_positivo",
                violation_error_message=_(
                    "El importe de la cuota debe ser mayor que 0."
                )
            ),
            models.UniqueConstraint(
                fields=["plan_pago", "numero_cuota"],
                name="unique_cuota_por_plan"
            )
        ]
        ordering = ["numero_cuota"]

    def __str__(self):
        return f"Cuota {self.numero_cuota} - {self.plan_pago.viaje.nombre}"


class Itinerario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viaje = models.OneToOneField(
        Viaje,
        on_delete=models.CASCADE,
        related_name="itinerario"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Itinerario - {self.viaje.nombre}"


class EtapaItinerario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    itinerario = models.ForeignKey(
        Itinerario,
        on_delete=models.CASCADE,
        related_name="etapas"
    )
    dia_numero = models.PositiveIntegerField()
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default="")
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    codigo = models.CharField(max_length=20, unique=True, blank=True)
    imagen = models.ImageField(
        upload_to="itinerarios/etapas/", null=True, blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["itinerario", "dia_numero"],
                name="unique_etapa_por_itinerario"
            )
        ]
        ordering = ["dia_numero"]

    def __str__(self):
        return f"DÃ­a {self.dia_numero} - {self.titulo}"


class Actividad(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    etapa = models.ForeignKey(
        EtapaItinerario,
        on_delete=models.CASCADE,
        related_name="actividades"
    )
    hora = models.TimeField(null=True, blank=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default="")
    tipo = models.CharField(
        max_length=20,
        choices=TipoActividad.choices,
        null=True,
        blank=True
    )
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "hora"]

    def __str__(self):
        return f"{self.hora or ''} - {self.titulo}".strip()


class Grupo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viaje = models.ForeignKey(
        Viaje,
        on_delete=models.CASCADE,
        related_name="grupos"
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=300, blank=True, default="")
    capacidad = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["viaje", "nombre"],
                name="unique_grupo_por_viaje"
            )
        ]

    def __str__(self):
        return f"{self.nombre} - {self.viaje.nombre}"


class Hotel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viaje = models.ForeignKey(
        Viaje,
        on_delete=models.CASCADE,
        related_name="hoteles"
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default="")
    tasa_turistica = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    fianza = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    web_url = models.URLField(max_length=500, blank=True, default="")
    maps_url = models.URLField(max_length=500, blank=True, default="")
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    codigo = models.CharField(max_length=20, unique=True, blank=True)
    imagen = models.ImageField(upload_to="hoteles/", null=True, blank=True)

    def __str__(self):
        return self.nombre


class TipoDocumento(models.TextChoices):
    DNI = 'DNI', 'DNI'
    PASAPORTE = 'PASAPORTE', 'Pasaporte'
    OTRO = 'OTRO', 'Otro'


class Alumno(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agencia = models.ForeignKey(
        "agencias.Agencia",
        on_delete=models.CASCADE,
        related_name="alumnos"
    )
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=150)
    tipo_documento = models.CharField(
        max_length=20,
        choices=TipoDocumento.choices,
        default=TipoDocumento.DNI
    )
    numero_documento = models.CharField(max_length=50)
    fecha_nacimiento = models.DateField()
    telefono = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Preparado para futura relaciÃ³n con Grupo si el diseÃ±o lo requiere,
    # aunque normalmente la relaciÃ³n Alumno-Grupo pasa por Inscripcion.
    grupos = models.ManyToManyField(
        Grupo,
        blank=True,
        related_name="alumnos"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["agencia", "numero_documento"],
                name="unique_documento_por_agencia"
            )
        ]
        ordering = ["apellidos", "nombres"]

    def __str__(self):
        return f"{self.apellidos}, {self.nombres} ({self.numero_documento})"

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"


class DocumentoRequerido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viaje = models.ForeignKey(
        Viaje,
        on_delete=models.CASCADE,
        related_name="documentos_requeridos"
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default="")
    obligatorio = models.BooleanField(default=True)
    formatos_permitidos = models.CharField(
        max_length=100, default="pdf,jpg,png"
    )

    @property
    def formatos_lista(self):
        return [
            fmt.strip().lower()
            for fmt in self.formatos_permitidos.split(",")
            if fmt.strip()
        ]

    def __str__(self):
        return f"{self.nombre} ({self.viaje.nombre})"



from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.text import slugify


@receiver(pre_save, sender=Viaje)
def generar_slug_viaje(sender, instance, **kwargs):
    if not instance.slug:
        base = slugify(instance.nombre)[:80]
        slug = base
        n = 1
        while Viaje.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base}-{n}"
            n += 1
        instance.slug = slug
    if not instance.codigo:
        instance.codigo = str(instance.id)[:8].upper()
