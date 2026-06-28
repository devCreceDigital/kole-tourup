import uuid
from django.db import models


class LogAuditoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        'autenticacion.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_auditoria'
    )
    accion = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    objeto_id = models.UUIDField(null=True, blank=True)
    valor_anterior = models.JSONField(null=True, blank=True)
    valor_nuevo = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'

    def save(self, *args, **kwargs):
        if self.pk and LogAuditoria.objects.filter(pk=self.pk).exists():
            raise ValueError('LogAuditoria es inmutable: no se permite UPDATE.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('LogAuditoria es inmutable: no se permite DELETE.')

    def __str__(self):
        return str(self.accion) + ' | ' + str(self.modelo) + ' | ' + str(self.timestamp)
