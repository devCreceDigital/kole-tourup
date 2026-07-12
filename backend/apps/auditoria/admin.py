from django.contrib import admin
from .models import LogAuditoria


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'accion', 'modelo', 'objeto_id', 'usuario', 'ip']
    list_filter = ['accion', 'modelo', 'timestamp']
    search_fields = ['objeto_id', 'usuario__email', 'ip']
    readonly_fields = [f.name for f in LogAuditoria._meta.fields]
    ordering = ['-timestamp']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False