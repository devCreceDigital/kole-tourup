from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Viaje, ItinerarioViaje, ComplementoContratado


@receiver(post_save, sender=Viaje)
def create_itinerario_for_viaje(sender, instance, created, **kwargs):
    """
    Crea un ItinerarioViaje (instancia aplicada) automáticamente cuando se
    crea un nuevo Viaje (DEC-012, TASK-207).

    Compatibilidad con API/seed/tests actuales: el comportamiento de
    auto-crear una instancia vacía al crear el viaje se mantiene. El wizard
    de creación de viaje (TASK-204) introducirá el selector de plantilla
    y llamará a aplicar_plantilla_a_viaje() (services.py) para poblar
    o reemplazar las etapas de esta instancia.

    Usa get_or_create para asegurar la idempotencia y evitar violaciones
    de la restricción OneToOne.
    """
    if created:
        ItinerarioViaje.objects.get_or_create(viaje=instance)


@receiver(post_save, sender=ComplementoContratado)
def complemento_contratado_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    from apps.inscripciones.models import Inscripcion
    incremento = instance.complemento_viaje.precio * instance.cantidad
    Inscripcion.objects.filter(pk=instance.inscripcion_id).update(
        precio_final=F('precio_final') + incremento
    )


# ⚠️ Limitación conocida (TASK-102):
# - Edición de ComplementoContratado (cambiar cantidad): no ajusta precio_final.
#   Actualmente no hay endpoint que lo permita (solo CREATE vía serializers).
# - Borrado de ComplementoContratado: no reduce precio_final.
#   Si en el futuro se implementa DELETE, debe agregarse un signal pre_delete
#   que reste el monto correspondiente.