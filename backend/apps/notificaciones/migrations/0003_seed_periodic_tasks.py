from django.db import migrations


def seed_periodic_tasks(apps, schema_editor):
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')

    daily_midnight, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='2',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        timezone='America/Lima',
    )
    daily_3am, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='3',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        timezone='America/Lima',
    )
    daily_4am, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='4',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        timezone='America/Lima',
    )
    daily_9am, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='9',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        timezone='America/Lima',
    )

    tasks = [
        {
            'name': 'Marcar cuotas vencidas',
            'task': 'tasks.mantenimiento.marcar_cuotas_vencidas',
            'schedule': daily_midnight,
            'description': 'Marca cuotas con fecha_vencimiento < hoy sin pago verificado y notifica al tutor',
        },
        {
            'name': 'Alerta umbral documentos',
            'task': 'tasks.mantenimiento.alerta_docs_umbral',
            'schedule': daily_3am,
            'description': 'Alerta al agente si % documentacion incompleta supera umbral configurable',
        },
        {
            'name': 'Archivar viajes finalizados',
            'task': 'tasks.mantenimiento.archivar_viajes_finalizados',
            'schedule': daily_4am,
            'description': 'Archiva viajes X dias post fecha_regreso',
        },
        {
            'name': 'Recordatorios de pago',
            'task': 'tasks.recordatorios.verificar_cuotas_por_vencer',
            'schedule': daily_9am,
            'description': 'Recordatorios con cadencia 30/15/7/3/0 dias antes del vencimiento (sujeto a horario 9-20h)',
        },
    ]

    for t in tasks:
        PeriodicTask.objects.get_or_create(
            name=t['name'],
            defaults={
                'task': t['task'],
                'crontab': t['schedule'],
                'enabled': True,
                'description': t['description'],
            },
        )


def remove_periodic_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(
        name__in=[
            'Marcar cuotas vencidas',
            'Alerta umbral documentos',
            'Archivar viajes finalizados',
            'Recordatorios de pago',
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('notificaciones', '0002_preferenciasnotificacion'),
        ('django_celery_beat', '0019_alter_periodictasks_options'),
    ]

    operations = [
        migrations.RunPython(seed_periodic_tasks, remove_periodic_tasks),
    ]
