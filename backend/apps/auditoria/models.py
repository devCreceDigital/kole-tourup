from django.db import models
from django.conf import settings
import uuid


class LogAuditoria(models.Model):
    """
    Log inmutable de auditoría. Solo permite INSERT.
    Override save() para bloquear UPDATE y delete() para lanzar excepción.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='auditoria_logs',
        help_text="Usuario que realizó la acción"
    )
    accion = models.CharField(max_length=100, help_text="PAGO_REGISTRADO, PAGO_ACTUALIZADO, DOCUMENTO_VALIDADO, etc.")
    modelo = models.CharField(max_length=100, help_text="Nombre del modelo afectado")
    objeto_id = models.UUIDField(null=True, blank=True, help_text="ID del objeto afectado")
    valor_anterior = models.JSONField(null=True, blank=True, help_text="Estado previo (snapshot)")
    valor_nuevo = models.JSONField(null=True, blank=True, help_text="Estado posterior (snapshot)")
    ip = models.GenericIPAddressField(null=True, blank=True, help_text="IP del request")
    timestamp = models.DateTimeField(auto_now_add=True, help_text="Cuándo ocurrió la acción")

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['usuario', 'timestamp']),
            models.Index(fields=['modelo', 'objeto_id']),
            models.Index(fields=['accion', 'timestamp']),
        ]
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"

    def __str__(self):
        return f"{self.timestamp} - {self.accion} - {self.modelo} ({self.objeto_id})"

    def save(self, *args, **kwargs):
        """
        Bloquea UPDATE: solo permite INSERT (cuando self._state.adding es True).
        """
        if not self._state.adding:
            raise PermissionError("LogAuditoria es inmutable: no se permite UPDATE.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Bloquea DELETE: lanza excepción.
        """
        raise PermissionError("LogAuditoria es inmutable: no se permite DELETE.")