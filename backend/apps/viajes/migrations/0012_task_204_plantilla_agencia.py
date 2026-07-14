# Migración TASK-204: añade `agencia` (NOT NULL tras backfill) a
# `ItinerarioPlantilla` para cumplir BR-ITI-10 (multi-tenancy de plantillas).
#
# Backfill: cada plantilla existente (TASK-207) se asigna a la agencia del
# viaje que la originó, vía `instancias_aplicadas.first().viaje.agencia`.
# Trazabilidad garantizada 1:1 por el backfill de `0010_task_207a`.
#
# Salvaguarda: si alguna plantilla queda con agencia=null, abortar con
# excepción explícita (no pasar al AlterField null=False).
import uuid

from django.db import migrations, models


def _backfill_agencia(apps, schema_editor):
    ItinerarioPlantilla = apps.get_model("viajes", "ItinerarioPlantilla")
    Agencia = apps.get_model("agencias", "Agencia")

    plantillas_sin_agencia = []
    for plantilla in ItinerarioPlantilla.objects.all().iterator():
        # Trazabilidad 1:1 del backfill TASK-207: cada plantilla se creó con
        # exactamente un ItinerarioViaje origen.
        iti_viaje = (
            plantilla.instancias_aplicadas.select_related("viaje", "viaje__agencia").first()
        )
        if iti_viaje is None or iti_viaje.viaje_id is None:
            plantillas_sin_agencia.append(str(plantilla.pk))
            continue
        agencia = iti_viaje.viaje.agencia
        if agencia is None:
            plantillas_sin_agencia.append(str(plantilla.pk))
            continue
        plantilla.agencia = agencia
        plantilla.save(update_fields=["agencia"])

    if plantillas_sin_agencia:
        raise RuntimeError(
            "TASK-204 backfill: las siguientes ItinerarioPlantilla quedaron sin "
            f"agencia (revisar manualmente antes de null=False): {plantillas_sin_agencia}"
        )


def reverse_noop(apps, schema_editor):
    """
    No se puede restaurar el agencia_id asignado. El rollback de esta
    migración debe acompañarse de pg_restore del dump previo
    (documentado en el playbook del commit).
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('agencias', '0001_initial'),
        ('viajes', '0011_task_207b_cleanup_viejo'),
    ]

    operations = [
        # ─── 1. Añadir FK nullable ────────────────────────────────────────
        migrations.AddField(
            model_name='itinerarioplantilla',
            name='agencia',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='itinerarios_plantilla',
                to='agencias.agencia',
                null=True,
                verbose_name='Agencia',
            ),
        ),

        # ─── 2. Backfill: asignar agencia vía instancias_aplicadas ─────────
        migrations.RunPython(_backfill_agencia, reverse_noop),

        # ─── 3. Endurecer a NOT NULL ──────────────────────────────────────
        migrations.AlterField(
            model_name='itinerarioplantilla',
            name='agencia',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='itinerarios_plantilla',
                to='agencias.agencia',
                verbose_name='Agencia',
            ),
        ),
    ]