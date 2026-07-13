from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from apps.auditoria.models import LogAuditoria
from .models import Pago


@receiver(post_save, sender=Pago)
def pago_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    LogAuditoria.objects.create(
        usuario=instance.registrado_por,
        accion='PAGO_REGISTRADO',
        modelo='Pago',
        objeto_id=instance.id,
        valor_nuevo={'estado': instance.estado, 'importe': str(instance.importe)},
    )
    agente_email = instance.inscripcion.viaje.agencia.email_contacto
    viaje = instance.inscripcion.viaje
    send_mail(
        subject='Nuevo pago pendiente - ' + viaje.nombre,
        message='Nuevo pago de S/ ' + str(instance.importe) + ' registrado para ' + viaje.nombre,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[agente_email],
        fail_silently=True,
    )
