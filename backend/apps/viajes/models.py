import uuid
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _
from apps.colegios.models import Colegio


class EstadoViaje(models.TextChoices):
    BORRADOR = "borrador", _("Borrador")
    ACTIVO = "activo", _("Activo")
    CERRADO = "cerrado", _("Cerrado")
    ARCHIVADO = "archivado", _("Archivado")


class TipoActividad(models.TextChoices):
    VUELO = "vuelo", _("Vuelo / Traslado aéreo")
    BUS = "bus", _("Transporte terrestre")
    HOTEL = "hotel", _("Alojamiento / Check-in")
    COMIDA = "comida", _("Comidas (Desayuno, Almuerzo, Cena)")
    EXCURSION = "excursion", _("Excursión / Tour")
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
    colegio = models.CharField(max_length=200, blank=True, default="")
    colegio_ref = models.ForeignKey(
        Colegio,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="viajes"
    )
    nivel_educativo = models.CharField(max_length=50, blank=True, default="")
    grado = models.CharField(max_length=50, blank=True, default="")
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

    TRANSICIONES_VALIDAS = {
        EstadoViaje.BORRADOR: [EstadoViaje.ACTIVO],
        EstadoViaje.ACTIVO: [EstadoViaje.CERRADO],
        EstadoViaje.CERRADO: [EstadoViaje.ARCHIVADO],
        EstadoViaje.ARCHIVADO: [],
    }

    def cambiar_estado(self, nuevo_estado, usuario=None, ip=None):
        if self.estado == nuevo_estado:
            return
        permitidos = self.TRANSICIONES_VALIDAS.get(self.estado, [])
        if nuevo_estado not in permitidos:
            from django.core.exceptions import ValidationError
            raise ValidationError(
                f"No se puede cambiar de '{self.estado}' a '{nuevo_estado}'. "
                f"Transiciones válidas: {', '.join(f'{k} → {v}' for k, v in self.TRANSICIONES_VALIDAS.items() if v)}"
            )
        estado_anterior = self.estado
        self.estado = nuevo_estado
        self.save(update_fields=['estado', 'updated_at'])
        self._auditar_cambio_estado(estado_anterior, nuevo_estado, usuario, ip)

    def _auditar_cambio_estado(self, estado_anterior, nuevo_estado, usuario, ip):
        from apps.auditoria.models import LogAuditoria
        LogAuditoria.objects.create(
            usuario=usuario,
            accion='VIAJE_CAMBIO_ESTADO',
            modelo='Viaje',
            objeto_id=self.id,
            valor_anterior={'estado': estado_anterior},
            valor_nuevo={'estado': nuevo_estado},
            ip=ip,
        )

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
        return self.cuotas.filter(pagos__estado='verificado').exists()


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
        return f"Día {self.dia_numero} - {self.titulo}"


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
    numero_vuelo = models.CharField(max_length=20, blank=True, default='')
    aerolinea = models.CharField(max_length=100, blank=True, default='')
    origen = models.CharField(max_length=100, blank=True, default='')
    destino = models.CharField(max_length=100, blank=True, default='')
    terminal = models.CharField(max_length=50, blank=True, default='')
    puerta_embarque = models.CharField(max_length=20, blank=True, default='')
    hora_llegada = models.TimeField(null=True, blank=True)
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
    telefono = models.CharField(max_length=30, blank=True, default="")
    latitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
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

    # Preparado para futura relación con Grupo si el diseño lo requiere,
    # aunque normalmente la relación Alumno-Grupo pasa por Inscripcion.
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


class Complemento(models.Model):
    class TipoComplemento(models.TextChoices):
        SEGURO = 'seguro', 'Seguro'
        MENU = 'menu', 'Menú especial'
        ACTIVIDAD_OPCIONAL = 'actividad_opcional', 'Actividad opcional'
        EXTRA = 'extra', 'Extra'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(
        max_length=30,
        choices=TipoComplemento.choices,
    )
    descripcion = models.TextField(blank=True, default="")
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Complemento'
        verbose_name_plural = 'Complementos'

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"


class ComplementoViaje(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viaje = models.ForeignKey(
        Viaje,
        on_delete=models.CASCADE,
        related_name="complementos"
    )
    complemento = models.ForeignKey(
        Complemento,
        on_delete=models.CASCADE,
    )
    precio = models.DecimalField(max_digits=8, decimal_places=2)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [('viaje', 'complemento')]
        verbose_name = 'Complemento por viaje'
        verbose_name_plural = 'Complementos por viaje'

    def __str__(self):
        return f"{self.complemento.nombre} — S/{self.precio}"


class ComplementoContratado(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inscripcion = models.ForeignKey(
        'inscripciones.Inscripcion',
        on_delete=models.CASCADE,
        related_name="complementos_contratados"
    )
    complemento_viaje = models.ForeignKey(
        ComplementoViaje,
        on_delete=models.CASCADE,
    )
    cantidad = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Complemento contratado'
        verbose_name_plural = 'Complementos contratados'

    def __str__(self):
        return f"{self.complemento_viaje.complemento.nombre} x{self.cantidad}"


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


@receiver(pre_save, sender=Hotel)
def generar_slug_codigo_hotel(sender, instance, **kwargs):
    if not instance.slug:
        base = slugify(instance.nombre)[:80]
        slug = base
        n = 1
        while Hotel.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base}-{n}"
            n += 1
        instance.slug = slug
    if not instance.codigo:
        instance.codigo = str(instance.id)[:8].upper()


@receiver(pre_save, sender=EtapaItinerario)
def generar_slug_codigo_etapa(sender, instance, **kwargs):
    if not instance.slug:
        base = slugify(instance.titulo)[:80]
        slug = base
        n = 1
        while EtapaItinerario.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base}-{n}"
            n += 1
        instance.slug = slug
    if not instance.codigo:
        instance.codigo = str(instance.id)[:8].upper()
