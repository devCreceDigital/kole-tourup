# TASK-207 — Migración B: cleanup de tablas viejas
#
# Elimina los modelos Itinerario y EtapaItinerario viejos (y sus tablas
# físicas), ya huérfanas tras el repunte de Actividad.etapa en la migración
# A (0010). Esta migración se aplica DESPUÉS de que la app + suite completa
# se validaron contra el estado post-A.
#
# Orden de operaciones:
#   1. RemoveField Actividad.etapa ya hecho en 0010 (etapa vieja eliminada).
#   2. Quitar los campos residuales Itinerario.viaje y EtapaItinerario.itinerario
#      (FKs) — Django los marca para eliminación al borrar el modelo, pero
#      hay que explicitarlo porque otras migraciones pueden referenciarlos.
#   3. DeleteModel EtapaItinerario (DROP TABLE viajes_etapaitinerario).
#   4. DeleteModel Itinerario (DROP TABLE viajes_itinerario).
#
# Si surge la necesidad de revertir (poco probable tras validar la app),
# se puede revertir esta migración con `migrate viajes 0010` — Django
# reconstruye las tablas vacías (sin datos). Para recuperar los DATOS
# originales hay que hacer pg_restore del dump previo a A.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('viajes', '0010_task_207a_esquema_y_datos'),
    ]

    operations = [
        # RemoveField explícito de las FKs que apuntaban desde los modelos
        # viejos hacia Viaje/Itinerario (Django no las inferred en algunos
        # casos al DeleteModel — explicit es mejor que implícito).
        migrations.RemoveField(
            model_name='etapaitinerario',
            name='itinerario',
        ),
        migrations.RemoveField(
            model_name='itinerario',
            name='viaje',
        ),
        migrations.DeleteModel(
            name='EtapaItinerario',
        ),
        migrations.DeleteModel(
            name='Itinerario',
        ),
    ]