from django.contrib import admin
from .models import Mecenas, MecenasInscripcion


@admin.register(Mecenas)
class MecenasAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'email', 'telefono', 'created_at']
    search_fields = ['nombre', 'email']
    readonly_fields = ['id', 'created_at']


@admin.register(MecenasInscripcion)
class MecenasInscripcionAdmin(admin.ModelAdmin):
    list_display = ['mecenas', 'inscripcion', 'monto_comprometido', 'monto_pagado', 'created_at']
    search_fields = ['mecenas__nombre', 'inscripcion__alumno__nombre']
    readonly_fields = ['id', 'created_at']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(inscripcion__viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser:
            if db_field.name == 'inscripcion':
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    viaje__agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
