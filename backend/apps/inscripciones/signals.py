from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import Inscripcion


@receiver(post_save, sender=Inscripcion)
def enviar_email_bienvenida(sender, instance, created, **kwargs):
    if not created:
        return
    tutor = instance.padre_tutor.usuario
    alumno = instance.alumno
    viaje = instance.viaje
    contexto = {
        'nombre_tutor': tutor.nombre,
        'nombre_alumno': alumno.nombre + ' ' + alumno.apellidos,
        'nombre_viaje': viaje.nombre,
        'precio_final': str(instance.precio_final),
    }
    html = render_to_string('emails/bienvenida_inscripcion.html', contexto)
    texto = 'Inscripcion de ' + alumno.nombre + ' al viaje ' + viaje.nombre + ' registrada exitosamente.'
    send_mail(
        subject='Bienvenida a Tottem Hub - Inscripcion registrada',
        message=texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[tutor.email],
        html_message=html,
        fail_silently=True,
    )
