from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Viaje, ItinerarioViaje, ItinerarioPlantilla, EtapaItinerarioViaje, EtapaPlantilla, Actividad,
    PlanPago, Cuota, Hotel, Grupo, Alumno, DocumentoRequerido,
    Complemento, ComplementoViaje, ComplementoContratado,
)
from apps.inscripciones.models import Inscripcion


class CuotaInline(admin.TabularInline):
    model = Cuota
    extra = 1
    fields = ['numero_cuota', 'descripcion', 'importe', 'fecha_vencimiento']


class ActividadInline(admin.TabularInline):
    model = Actividad
    extra = 0
    fields = ['orden', 'hora', 'titulo', 'descripcion', 'tipo']
    ordering = ['orden', 'hora']
    readonly_fields = ['orden']


class EtapaInline(admin.TabularInline):
    model = EtapaItinerarioViaje
    extra = 0
    fields = ['dia_numero', 'titulo', 'descripcion']
    ordering = ['dia_numero']
    show_change_link = True


class InscripcionInline(admin.TabularInline):
    model = Inscripcion
    extra = 0
    fields = ['alumno', 'estado', 'padre_tutor', 'porcentaje_pagado']
    readonly_fields = ['porcentaje_pagado']
    show_change_link = True
    ordering = ['-fecha_inscripcion']

    def has_add_permission(self, request, obj=None):
        return False


class ComplementoViajeInline(admin.TabularInline):
    model = ComplementoViaje
    extra = 1
    fields = ['complemento', 'precio', 'activo']


@admin.register(Viaje)
class ViajeAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'destino', 'estado', 'agencia', 'fecha_salida', 'fecha_regreso', 'cupo_maximo']
    list_filter = ['estado', 'agencia']
    search_fields = ['nombre', 'destino', 'codigo', 'slug']
    inlines = [InscripcionInline, ComplementoViajeInline]
    readonly_fields = ['id', 'slug', 'codigo', 'created_at', 'updated_at', 'vista_itinerario']
    fieldsets = [
        ('Información general', {
            'fields': ['nombre', 'destino', 'descripcion', 'estado', 'imagen']
        }),
        ('Fechas y cupo', {
            'fields': ['fecha_salida', 'fecha_regreso', 'cupo_maximo', 'precio_total']
        }),
        ('Itinerario completo', {
            'fields': ['vista_itinerario'],
        }),
        ('Colegio', {
            'fields': ['colegio_ref', 'colegio', 'nivel_educativo', 'grado'],
        }),
        ('Metadatos', {
            'fields': ['agencia', 'slug', 'codigo', 'id', 'created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]

    def vista_itinerario(self, obj):
        if not hasattr(obj, 'itinerario') or not obj.itinerario:
            return format_html('<p style="color:#9ca3af;font-style:italic;">— Este viaje no tiene un itinerario asignado aún. Las etapas se gestionan desde la sección de <strong>Etapas del Itinerario</strong> más abajo. —</p>')
        etapas = obj.itinerario.etapas.all()
        if not etapas:
            return format_html('<p style="color:#9ca3af;font-style:italic;">— El itinerario está vacío. Agrega etapas usando la sección de <strong>Etapas del Itinerario</strong> más abajo. —</p>')
        html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">'
        for etapa in etapas:
            html += f'<tr style="background:#f3f4f6;"><td colspan="3" style="padding:10px 12px;font-weight:700;border-bottom:1px solid #e5e7eb;color:#1f2937;">Día {etapa.dia_numero}: {etapa.titulo}</td></tr>'
            for act in etapa.actividades.all():
                badge = ''
                if act.tipo == 'vuelo':
                    badge = '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">✈ VUELO</span>'
                elif act.tipo == 'hotel':
                    badge = '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">🏨 HOTEL</span>'
                elif act.tipo == 'comida':
                    badge = '<span style="background:#fce4ec;color:#9a1f3b;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">🍽 COMIDA</span>'
                elif act.tipo == 'excursion':
                    badge = '<span style="background:#e0f2fe;color:#075985;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">🏛 EXCURSIÓN</span>'
                elif act.tipo == 'bus':
                    badge = '<span style="background:#f3e8ff;color:#6b21a8;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">🚌 TRASLADO</span>'
                else:
                    badge = f'<span style="background:#f3f4f6;color:#4b5563;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">{act.tipo}</span>'
                html += f'<tr style="border-bottom:1px solid #f9fafb;"><td style="padding:6px 12px 6px 24px;white-space:nowrap;color:#6b7280;width:70px;">{act.hora or "—"}</td><td style="padding:6px 8px;">{act.titulo}</td><td style="padding:6px 12px;text-align:right;">{badge}</td></tr>'
            if not etapa.actividades.exists():
                html += f'<tr style="border-bottom:1px solid #f9fafb;"><td style="padding:6px 24px;color:#9ca3af;font-style:italic;" colspan="3">— Sin actividades —</td></tr>'
        html += '</table>'
        return format_html(html)
    vista_itinerario.short_description = 'Vista previa del itinerario'
    def save_model(self, request, obj, form, change):
        if not change:
            obj.agencia = request.user.agencia
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'agencia':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    id=request.user.agencia_id
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ItinerarioViaje)
class ItinerarioViajeAdmin(admin.ModelAdmin):
    list_display = ['id', 'viaje', 'plantilla_origen', 'created_at', 'updated_at']
    readonly_fields = ['id', 'viaje', 'created_at', 'updated_at']
    inlines = [EtapaInline]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)


@admin.register(ItinerarioPlantilla)
class ItinerarioPlantillaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'destinos', 'dias_totales', 'created_at']
    search_fields = ['nombre', 'destinos']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(EtapaItinerarioViaje)
class EtapaItinerarioViajeAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'dia_numero', 'viaje', 'itinerario']
    list_filter = ['itinerario__viaje']
    search_fields = ['titulo', 'itinerario__viaje__nombre']
    fields = ['itinerario', 'dia_numero', 'titulo', 'descripcion', 'imagen']
    inlines = [ActividadInline]
    ordering = ['itinerario__viaje', 'dia_numero']

    def viaje(self, obj):
        return obj.itinerario.viaje.nombre
    viaje.short_description = 'Viaje'
    viaje.admin_order_field = 'itinerario__viaje__nombre'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs.select_related('itinerario__viaje')
        return qs.filter(itinerario__viaje__agencia=request.user.agencia).select_related('itinerario__viaje')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'itinerario' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                viaje__agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(EtapaPlantilla)
class EtapaPlantillaAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'dia_numero', 'itinerario']
    list_filter = ['itinerario']
    search_fields = ['titulo', 'itinerario__nombre']
    fields = ['itinerario', 'dia_numero', 'titulo', 'descripcion', 'imagen']
    ordering = ['itinerario', 'dia_numero']


@admin.register(Complemento)
class ComplementoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'activo', 'created_at']
    list_filter = ['tipo', 'activo']
    search_fields = ['nombre', 'descripcion']
    readonly_fields = ['id', 'created_at']


@admin.register(ComplementoViaje)
class ComplementoViajeAdmin(admin.ModelAdmin):
    list_display = ['complemento', 'viaje', 'precio', 'activo']
    list_filter = ['activo', 'viaje__agencia']
    search_fields = ['complemento__nombre', 'viaje__nombre']
    readonly_fields = ['id']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'viaje' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ComplementoContratado)
class ComplementoContratadoAdmin(admin.ModelAdmin):
    list_display = ['inscripcion', 'complemento_nombre', 'cantidad', 'created_at']
    list_filter = ['complemento_viaje__viaje__agencia']
    search_fields = ['inscripcion__alumno__nombre', 'complemento_viaje__complemento__nombre']
    readonly_fields = ['id', 'created_at']

    @admin.display(description='Complemento')
    def complemento_nombre(self, obj):
        return obj.complemento_viaje.complemento.nombre

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(complemento_viaje__viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'complemento_viaje' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                viaje__agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Actividad)
class ActividadAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'etapa', 'viaje', 'tipo', 'hora', 'orden']
    list_filter = ['tipo', 'etapa__itinerario__viaje']
    search_fields = ['titulo', 'descripcion']
    fields = ['etapa', 'hora', 'hora_llegada', 'titulo', 'descripcion', 'tipo',
              'numero_vuelo', 'aerolinea', 'origen', 'destino', 'terminal', 'puerta_embarque']
    readonly_fields = ['orden']
    ordering = ['etapa__itinerario__viaje', 'etapa__dia_numero', 'orden', 'hora']

    def viaje(self, obj):
        return obj.etapa.itinerario.viaje.nombre
    viaje.short_description = 'Viaje'
    viaje.admin_order_field = 'etapa__itinerario__viaje__nombre'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs.select_related('etapa__itinerario__viaje')
        return qs.filter(etapa__itinerario__viaje__agencia=request.user.agencia).select_related('etapa__itinerario__viaje')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'etapa':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    itinerario__viaje__agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(PlanPago)
class PlanPagoAdmin(admin.ModelAdmin):
    list_display = ['viaje', 'total_cuotas', 'created_at']
    readonly_fields = ['id', 'created_at']
    inlines = [CuotaInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'viaje':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Cuota)
class CuotaAdmin(admin.ModelAdmin):
    list_display = ['numero_cuota', 'plan_pago', 'viaje', 'importe', 'fecha_vencimiento']
    list_filter = ['plan_pago__viaje__agencia']
    search_fields = ['plan_pago__viaje__nombre', 'descripcion']
    readonly_fields = ['id']

    @admin.display(description='Viaje')
    def viaje(self, obj):
        return obj.plan_pago.viaje.nombre
    viaje.admin_order_field = 'plan_pago__viaje__nombre'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(plan_pago__viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'plan_pago' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                viaje__agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'viaje', 'telefono']
    search_fields = ['nombre', 'viaje__nombre']
    readonly_fields = ['id', 'slug', 'codigo']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'viaje':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'viaje', 'capacidad']
    search_fields = ['nombre', 'viaje__nombre']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'viaje':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Alumno)
class AlumnoAdmin(admin.ModelAdmin):
    list_display = ['nombre_completo', 'numero_documento', 'tipo_documento', 'agencia', 'activo']
    list_filter = ['activo', 'tipo_documento', 'agencia']
    search_fields = ['nombres', 'apellidos', 'numero_documento', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'agencia':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    id=request.user.agencia_id
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(DocumentoRequerido)
class DocumentoRequeridoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'viaje', 'obligatorio']
    list_filter = ['obligatorio']
    search_fields = ['nombre', 'viaje__nombre']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'viaje':
            if not request.user.is_superuser:
                kwargs['queryset'] = type(db_field.remote_field.model).objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
