import django.utils.text
from django.db import migrations, models


def generar_slugs(apps, schema_editor):
    Viaje = apps.get_model('viajes', 'Viaje')
    for viaje in Viaje.objects.all():
        base = django.utils.text.slugify(viaje.nombre)[:80]
        slug = base
        n = 1
        while Viaje.objects.filter(slug=slug).exclude(id=viaje.id).exists():
            slug = f"{base}-{n}"
            n += 1
        viaje.slug = slug
        viaje.codigo = str(viaje.id)[:8].upper()
        viaje.save()


class Migration(migrations.Migration):
    dependencies = [
        ('viajes', '0004_alumno_alumno_unique_documento_por_agencia'),
    ]
    operations = [
        migrations.AddField(model_name='viaje', name='slug', field=models.SlugField(blank=True, max_length=100, unique=True, default='')),
        migrations.AddField(model_name='viaje', name='codigo', field=models.CharField(blank=True, max_length=20, unique=True, default='')),
        migrations.RunPython(generar_slugs, migrations.RunPython.noop),
    ]