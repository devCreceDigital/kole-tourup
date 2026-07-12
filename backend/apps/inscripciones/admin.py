from django.contrib import admin
from .models import (
    Inscripcion, InscripcionHotelPreferencia, InscripcionRoommateSolicitud,
    Alumno as InscripcionAlumno,
)
from apps.viajes.models import ComplementoContratado


class InscripcionHotelPreferenciaInline(admin.TabularInline):
    model = InscripcionHotelPreferencia
    extra = 0
    readonly_fields = ['created_at']

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'hotel' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                viaje__agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class InscripcionRoommateSolicitudInline(admin.TabularInline):
    model = InscripcionRoommateSolicitud
    extra = 0
    readonly_fields = ['created_at']

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'hotel' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                viaje__agencia=request.user.agencia
            )
        if db_field.name == 'alumno_solicitado' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                inscripciones__viaje__agencia=request.user.agencia
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ComplementoContratadoInline(admin.TabularInline):
    model = ComplementoContratado
    extra = 0
    fields = ['complemento_viaje', 'cantidad']
    readonly_fields = ['complemento_viaje']
    ordering = ['-created_at']

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Inscripcion)
class InscripcionAdmin(admin.ModelAdmin):
    list_display = ['alumno', 'viaje', 'estado', 'padre_tutor', 'porcentaje_pagado', 'acceso_alumno_habilitado']
    list_filter = ['estado', 'acceso_alumno_habilitado', 'viaje__agencia']
    search_fields = ['alumno__nombre', 'alumno__apellidos', 'viaje__nombre']
    readonly_fields = ['id', 'porcentaje_pagado', 'created_at', 'updated_at']
    inlines = [InscripcionHotelPreferenciaInline, InscripcionRoommateSolicitudInline, ComplementoContratadoInline]
    fieldsets = [
        ('Datos', {'fields': ['alumno', 'viaje', 'padre_tutor', 'estado', 'acceso_alumno_habilitado']}),
        ('Metricas', {'fields': ['porcentaje_pagado'], 'classes': ['collapse']}),
        ('Metadatos', {'fields': ['id', 'created_at', 'updated_at'], 'classes': ['collapse']}),
    ]

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
        if db_field.name == 'padre_tutor' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                usuario__agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(InscripcionAlumno)
class InscripcionAlumnoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'apellidos', 'dni', 'colegio', 'created_at']
    search_fields = ['nombre', 'apellidos', 'dni']
    readonly_fields = ['id', 'created_at']
    list_filter = ['colegio']
