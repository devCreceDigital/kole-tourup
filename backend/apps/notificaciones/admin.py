from django.contrib import admin
from .models import Notificacion, PreferenciasNotificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'tipo', 'titulo', 'leida', 'created_at']
    list_filter = ['tipo', 'leida']
    search_fields = ['usuario__email', 'titulo']
    readonly_fields = ['id', 'created_at']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(usuario__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == 'usuario':
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(PreferenciasNotificacion)
class PreferenciasNotificacionAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'canal_preferido', 'recibir_recordatorios', 'recibir_comunicados', 'recibir_alertas_docs']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(usuario__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == 'usuario':
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
