from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import DocumentoEntregado


@receiver(pre_save, sender=DocumentoEntregado)
def documento_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_estado = None
        return
    try:
        old = sender.objects.only('estado').get(pk=instance.pk)
        instance._old_estado = old.estado
    except sender.DoesNotExist:
        instance._old_estado = None


@receiver(post_save, sender=DocumentoEntregado)
def documento_post_save(sender, instance, created, **kwargs):
    old_estado = getattr(instance, '_old_estado', None)
    if created or old_estado == instance.estado:
        return
    from apps.notificaciones.models import Notificacion
    tutor = instance.inscripcion.padre_tutor.usuario
    nombre_doc = instance.documento_requerido.nombre
    viaje = instance.inscripcion.viaje.nombre
    if instance.estado == 'validado':
        Notificacion.objects.create(
            usuario=tutor,
            tipo='doc_validado',
            titulo='Documento validado',
            mensaje=f'Tu documento "{nombre_doc}" para el viaje {viaje} ha sido validado.',
            referencia_id=instance.id,
            referencia_tipo='DocumentoEntregado',
        )
    elif instance.estado == 'rechazado':
        Notificacion.objects.create(
            usuario=tutor,
            tipo='doc_rechazado',
            titulo='Documento rechazado',
            mensaje=f'Tu documento "{nombre_doc}" para el viaje {viaje} fue rechazado: {instance.motivo_rechazo}',
            referencia_id=instance.id,
            referencia_tipo='DocumentoEntregado',
        )
