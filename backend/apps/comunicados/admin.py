from django.contrib import admin
from .models import Comunicado


@admin.register(Comunicado)
class ComunicadoAdmin(admin.ModelAdmin):
    list_display = ['id', 'titulo', 'viaje', 'autor', 'enviado_email', 'fecha_publicacion']
    list_filter = ['enviado_email', 'viaje__agencia']
    search_fields = ['titulo', 'viaje__nombre']
    readonly_fields = ['id', 'fecha_publicacion']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser:
            if db_field.name == 'viaje':
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    agencia=request.user.agencia
                )
            if db_field.name == 'autor':
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
