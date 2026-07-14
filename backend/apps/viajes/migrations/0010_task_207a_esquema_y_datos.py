# TASK-207 — Migración A: esquema + backfill + repunte de Actividad.etapa
#
# Crea los modelos nuevos (ItinerarioPlantilla, ItinerarioViaje,
# EtapaPlantilla, EtapaItinerarioViaje) y backfilla los datos existentes
# de Itinerario/EtapaItinerario viejos. Repunta Actividad.etapa a
# EtapaItinerarioViaje (preservando el accessor canónico "etapa").
#
# NO elimina las tablas viejas — eso lo hace la migración B (0011) después
# de validar la app y la suite completa. Esto da una ventana de rollback
# sin tener que reconstruir el esquema viejo a mano.
#
# Backfill usa 100% apps.get_model (no imports directos de modelos
# actuales), y .create() por etapa para que el signal pre_save regenere
# slug/codigo únicos (BR-ITI-04).
#
# Cardinalidad confirmada (2026-07-13): ItinerarioViaje.viaje = OneToOneField,
# related_name="itinerario" preservado — el accessor viaje.itinerario sigue
# devolviendo un objeto único, no un Manager.

from django.db import migrations, models
import django.db.models.deletion
import uuid


def backfill_actividades(apps, schema_editor):
    """
    Convierte cada Itinerario viejo en una ItinerarioPlantilla + una
    ItinerarioViaje asociada al viaje original, duplica las etapas viejas
    en dos ramas (maestra y aplicada) y repunta cada Actividad a la
    EtapaItinerarioViaje correspondiente.

    slug/codigo viejos NO se conservan — se regeneran manualmente aquí
    (replicando el algoritmo del signal pre_save *_generar_slug_codigo_etapa_*)
    porque los signals no se disparan sobre modelos históricos obtenidos
    via apps.get_model. Garantiza unicidad por instancia (BR-ITI-04).
    """
    from django.db import transaction
    from django.utils.text import slugify

    Viaje                = apps.get_model("viajes", "Viaje")
    ItinerarioOLD        = apps.get_model("viajes", "Itinerario")
    EtapaItinerarioOLD   = apps.get_model("viajes", "EtapaItinerario")
    Actividad            = apps.get_model("viajes", "Actividad")
    ItinerarioPlantilla  = apps.get_model("viajes", "ItinerarioPlantilla")
    ItinerarioViaje      = apps.get_model("viajes", "ItinerarioViaje")
    EtapaPlantilla       = apps.get_model("viajes", "EtapaPlantilla")
    EtapaItinerarioViaje = apps.get_model("viajes", "EtapaItinerarioViaje")

    def _slug_unico(model_cls, base, exclude_pk=None):
        slug = base
        n = 1
        qs = model_cls.objects.filter(slug=slug)
        if exclude_pk is not None:
            qs = qs.exclude(pk=exclude_pk)
        while qs.exists():
            slug = f"{base}-{n}"
            n += 1
            qs = qs.filter(slug=slug)
            if exclude_pk is not None:
                qs = qs.exclude(pk=exclude_pk)
        return slug

    def _poblar_slug_codigo_etapa(instance, model_cls):
        """Réplica del signal pre_save (que no se dispara en migraciones)."""
        if not instance.slug:
            base = slugify(instance.titulo)[:80]
            instance.slug = _slug_unico(model_cls, base, instance.pk)
        if not instance.codigo:
            instance.codigo = str(instance.id)[:8].upper()

    # Pre-cargar mapa viaje_id -> (fecha_salida, fecha_regreso) para
    # calcular dias_totales manualmente (duracion_dias es property de
    # Viaje, no un campo — los models históricos de migración no lo
    # tienen; se calcula a partir de los campos persistidos).
    viaje_fechas = {
        v.pk: (v.fecha_salida, v.fecha_regreso)
        for v in Viaje.objects.all().only("id", "fecha_salida", "fecha_regreso")
    }

    with transaction.atomic():
        # 1) Itinerario viejo → ItinerarioPlantilla + ItinerarioViaje
        iti_map = {}  # {itinerario_viejo_pk: {"plantilla": p, "iti_viaje": iv}}
        for old in ItinerarioOLD.objects.all().select_related("viaje").iterator():
            salida, regreso = viaje_fechas.get(old.viaje_id, (None, None))
            dias = (regreso - salida).days if (salida and regreso) else None
            plantilla = ItinerarioPlantilla.objects.create(
                nombre=f"Plantilla — {old.viaje.nombre}",
                destinos=old.viaje.destino or "",
                dias_totales=dias if (dias and dias > 0) else None,
            )
            iti_viaje = ItinerarioViaje.objects.create(
                viaje=old.viaje,
                plantilla_origen=plantilla,
            )
            iti_map[old.pk] = {"plantilla": plantilla, "iti_viaje": iti_viaje}

        # 2) EtapaItinerario vieja → EtapaPlantilla + EtapaItinerarioViaje
        #    slug/codigo se generan manualmente (réplica del signal pre_save),
        #    para garantizar unicidad por instancia en cada tabla nueva.
        #    slug/codigo de la etapa vieja NO se conservan.
        etapa_map = {}  # {etapa_vieja_pk: etapa_itinerario_viaje}
        for old_etapa in (
            EtapaItinerarioOLD.objects.all()
            .order_by("itinerario_id", "dia_numero")
            .iterator()
        ):
            parent = iti_map[old_etapa.itinerario_id]

            ep = EtapaPlantilla(
                itinerario=parent["plantilla"],
                dia_numero=old_etapa.dia_numero,
                titulo=old_etapa.titulo,
                descripcion=old_etapa.descripcion,
            )
            _poblar_slug_codigo_etapa(ep, EtapaPlantilla)
            ep.save()

            ev = EtapaItinerarioViaje(
                itinerario=parent["iti_viaje"],
                dia_numero=old_etapa.dia_numero,
                titulo=old_etapa.titulo,
                descripcion=old_etapa.descripcion,
            )
            _poblar_slug_codigo_etapa(ev, EtapaItinerarioViaje)
            ev.save()
            etapa_map[old_etapa.pk] = ev

        # 3) Actividad: etapa_id vieja → etapa_nueva_id (la nueva FK
        #    "etapa_nueva" fue agregada por AddField previo en esta misma
        #    migración). Los demás campos de Actividad no se tocan.
        for act in Actividad.objects.all().only("id", "etapa_id").iterator():
            act.etapa_nueva = etapa_map[act.etapa_id]
            act.save(update_fields=["etapa_nueva"])


def reverse_noop(apps, schema_editor):
    """
    No se puede restaurar el estado anterior sin dump externo. El rollback
    de esta migración debe acompañarse de pg_restore del dump previo a A
    (documentado en el playbook del commit).
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('viajes', '0009_complemento_viaje_colegio_ref_complementoviaje_and_more'),
    ]

    operations = [
        # ─── 1. Crear modelos nuevos ────────────────────────────────────────
        migrations.CreateModel(
            name='ItinerarioPlantilla',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('nombre', models.CharField(max_length=300)),
                ('destinos', models.CharField(blank=True, default='', max_length=300)),
                ('dias_totales', models.PositiveIntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Itinerario plantilla',
                'verbose_name_plural': 'Itinerarios plantilla',
                'ordering': ['nombre'],
            },
        ),
        migrations.CreateModel(
            name='ItinerarioViaje',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('viaje', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='itinerario', to='viajes.viaje')),
                ('plantilla_origen', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='instancias_aplicadas', to='viajes.itinerarioplantilla')),
            ],
        ),
        migrations.CreateModel(
            name='EtapaPlantilla',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('dia_numero', models.PositiveIntegerField()),
                ('titulo', models.CharField(max_length=200)),
                ('descripcion', models.TextField(blank=True, default='')),
                ('slug', models.SlugField(blank=True, max_length=100, unique=True)),
                ('codigo', models.CharField(blank=True, max_length=20, unique=True)),
                ('imagen', models.ImageField(blank=True, null=True, upload_to='itinerarios/plantillas/etapas/')),
                ('itinerario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='etapas', to='viajes.itinerarioplantilla')),
            ],
            options={
                'ordering': ['dia_numero'],
            },
        ),
        migrations.CreateModel(
            name='EtapaItinerarioViaje',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('dia_numero', models.PositiveIntegerField()),
                ('titulo', models.CharField(max_length=200)),
                ('descripcion', models.TextField(blank=True, default='')),
                ('slug', models.SlugField(blank=True, max_length=100, unique=True)),
                ('codigo', models.CharField(blank=True, max_length=20, unique=True)),
                ('imagen', models.ImageField(blank=True, null=True, upload_to='itinerarios/viajes/etapas/')),
                ('itinerario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='etapas', to='viajes.itinerarioviaje')),
            ],
            options={
                'ordering': ['dia_numero'],
            },
        ),

        # ─── 2. Agregar FK nueva a Actividad (nullable durante backfill) ───
        migrations.AddField(
            model_name='actividad',
            name='etapa_nueva',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='actividades',
                to='viajes.etapaitinerarioviaje',
            ),
        ),

        # ─── 3. Backfill: replicar datos y repuntar Actividad ──────────────
        migrations.RunPython(backfill_actividades, reverse_noop),

        # ─── 4. Tornar FK nueva NOT NULL tras el backfill ──────────────────
        migrations.AlterField(
            model_name='actividad',
            name='etapa_nueva',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='actividades',
                to='viajes.etapaitinerarioviaje',
            ),
        ),

        # ─── 5. Eliminar FK vieja (etapa → EtapaItinerario vieja) ───────────
        migrations.RemoveField(
            model_name='actividad',
            name='etapa',
        ),

        # ─── 6. Renombrar etapa_nueva → etapa (accessor canónico) ───────────
        #        El código (views/serializers/admin tests) usa Actividad.etapa
        #        apuntando a EtapaItinerarioViaje desde este punto.
        migrations.RenameField(
            model_name='actividad',
            old_name='etapa_nueva',
            new_name='etapa',
        ),

        # ─── 7. Constraints de unicidad por (itinerario, dia_numero) ───────
        #        Se agregan en A (no en B) para que la suite de tests, que
        #        aplica migraciones desde cero, las tenga disponibles desde
        #        migración 0010. Mismo patrón que la migración 0003
        #        (CreateModel Grupo + AddConstraint unique_grupo_por_viaje).
        migrations.AddConstraint(
            model_name='etapaplantilla',
            constraint=models.UniqueConstraint(
                fields=('itinerario', 'dia_numero'),
                name='unique_etapa_por_plantilla',
            ),
        ),
        migrations.AddConstraint(
            model_name='etapaitinerarioviaje',
            constraint=models.UniqueConstraint(
                fields=('itinerario', 'dia_numero'),
                name='unique_etapa_por_itinerario_viaje',
            ),
        ),

        # NOTA: No se eliminan Itinerario ni EtapaItinerario — eso lo hace
        # la migración B (0011_task_207b_cleanup_viejo) tras validar la
        # app + suite completa. Tablas viejas quedan huérfanas (sin FK
        # activa) como red de seguridad si hay que revertir A.
    ]