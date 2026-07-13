from django.contrib import admin
from .models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['id', 'inscripcion', 'cuota', 'importe', 'estado', 'fecha_pago', 'metodo_pago']
    list_filter = ['estado', 'metodo_pago', 'inscripcion__viaje__agencia']
    search_fields = ['inscripcion__alumno__nombre', 'inscripcion__alumno__apellidos']
    readonly_fields = ['id', 'estado', 'created_at', 'updated_at']

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
            if db_field.name == 'cuota':
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    plan_pago__viaje__agencia=request.user.agencia
                )
            if db_field.name in ('pagado_por', 'registrado_por'):
                kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                    agencia=request.user.agencia
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
