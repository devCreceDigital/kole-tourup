from django.contrib import admin
from .models import Conversacion, Mensaje


class MensajeInline(admin.TabularInline):
    model = Mensaje
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['remitente', 'contenido', 'estado', 'created_at']
    ordering = ['created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversacion)
class ConversacionAdmin(admin.ModelAdmin):
    list_display = ['id', 'inscripcion', 'created_at']
    search_fields = ['inscripcion__alumno__nombre', 'inscripcion__viaje__nombre']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [MensajeInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(inscripcion__viaje__agencia=request.user.agencia)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'inscripcion' and not request.user.is_superuser:
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(
                viaje__agencia=request.user.agencia
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
