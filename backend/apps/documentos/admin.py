from django.contrib import admin
from .models import DocumentoEntregado


@admin.register(DocumentoEntregado)
class DocumentoEntregadoAdmin(admin.ModelAdmin):
    list_display = ['id', 'inscripcion', 'documento_requerido', 'estado', 'uploaded_at']
    list_filter = ['estado', 'inscripcion__viaje__agencia']
    search_fields = ['inscripcion__alumno__nombre', 'nombre_archivo']
    readonly_fields = ['id', 'nombre_archivo', 'tamano_bytes', 'uploaded_at']

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
            if db_field.name == 'documento_requerido':
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    viaje__agencia=request.user.agencia
                )
            if db_field.name == 'validado_por':
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
