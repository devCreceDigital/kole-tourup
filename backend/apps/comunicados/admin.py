from django.contrib import admin
from .models import Comunicado


@admin.register(Comunicado)
class ComunicadoAdmin(admin.ModelAdmin):
    list_display = ['id', 'titulo', 'viaje', 'autor', 'enviado_email', 'fecha_publicacion']
    list_filter = ['enviado_email']
    search_fields = ['titulo', 'viaje__nombre']
    readonly_fields = ['id', 'fecha_publicacion']
