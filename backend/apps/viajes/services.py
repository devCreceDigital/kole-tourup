from django.db import transaction

from .models import ItinerarioViaje, EtapaItinerarioViaje


def aplicar_plantilla_a_viaje(viaje, plantilla):
    """
    Copia las etapas maestras de una ItinerarioPlantilla a la ItinerarioViaje
    del viaje (DEC-012, TASK-207). Copia-al-aplicar: la instancia aplicada
    queda editable de forma independiente de la plantilla maestra y de otros
    viajes que usen la misma plantilla.

    Idempotente por reemplazo: limpia las etapas actuales de la instancia
    aplicada y copia las etapas maestras de la plantilla.

    Usa .create() por etapa (no bulk_create) para que el signal pre_save
    regenere slug/codigo únicos por instancia (BR-ITI-04) — dos viajes que
    compartan plantilla no duplican slugs.
    """
    with transaction.atomic():
        iti, _ = ItinerarioViaje.objects.get_or_create(viaje=viaje)
        iti.plantilla_origen = plantilla
        iti.save(update_fields=["plantilla_origen", "updated_at"])
        iti.etapas.all().delete()
        for ep in plantilla.etapas.all().order_by("dia_numero"):
            EtapaItinerarioViaje.objects.create(
                itinerario=iti,
                dia_numero=ep.dia_numero,
                titulo=ep.titulo,
                descripcion=ep.descripcion,
            )
        return iti