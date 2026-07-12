from django.contrib import admin
from .models import DocumentoEntregado


@admin.register(DocumentoEntregado)
class DocumentoEntregadoAdmin(admin.ModelAdmin):
    list_display = ['id', 'inscripcion', 'documento_requerido', 'estado', 'uploaded_at']
    list_filter = ['estado']
    search_fields = ['inscripcion__alumno__nombre', 'nombre_archivo']
    readonly_fields = ['id', 'nombre_archivo', 'tamano_bytes', 'uploaded_at']
