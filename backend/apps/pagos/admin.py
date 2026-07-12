from django.contrib import admin
from .models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['id', 'inscripcion', 'importe', 'estado', 'fecha_pago', 'metodo_pago']
    list_filter = ['estado', 'metodo_pago']
    search_fields = ['inscripcion__alumno__nombre', 'inscripcion__alumno__apellidos']
    readonly_fields = ['id', 'estado', 'created_at', 'updated_at']
