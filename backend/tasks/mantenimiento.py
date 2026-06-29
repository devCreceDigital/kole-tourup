from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from datetime import date, timedelta
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def marcar_cuotas_vencidas(self):
    from apps.viajes.models import Cuota
    from apps.notificaciones.models import Notificacion
    from apps.inscripciones.models import Inscripcion
    hoy = date.today()
    enviados = 0
    cuotas_vencidas = Cuota.objects.filter(
        fecha_vencimiento__lt=hoy
    ).select_related('plan_pago__viaje')
    for cuota in cuotas_vencidas:
        viaje = cuota.plan_pago.viaje
        inscripciones = Inscripcion.objects.filter(
            viaje=viaje,
            estado__in=['pendiente', 'confirmado']
        ).select_related('padre_tutor__usuario')
        for inscripcion in inscripciones:
            if inscripcion.pagos.filter(estado='verificado', cuota=cuota).exists():
                continue
            tutor = inscripcion.padre_tutor.usuario
            cache_key = 'cuota_vencida:' + str(cuota.id) + ':' + str(tutor.id) + ':' + str(hoy)
            if cache.get(cache_key):
                continue
            Notificacion.objects.create(
                usuario=tutor,
                tipo='pago_vencido',
                titulo='Cuota vencida',
                mensaje='Tu cuota del viaje ' + viaje.nombre + ' vencio el ' + str(cuota.fecha_vencimiento),
                referencia_id=cuota.id,
                referencia_tipo='Cuota'
            )
            cache.set(cache_key, True, timeout=86400)
            enviados += 1
    return 'OK: ' + str(enviados) + ' notificaciones creadas'


@shared_task(bind=True, max_retries=3)
def archivar_viajes_finalizados(self):
    from apps.viajes.models import Viaje
    dias = getattr(settings, 'DOCS_ARCHIVE_DAYS_AFTER_RETURN', 7)
    fecha_limite = date.today() - timedelta(days=dias)
    actualizados = Viaje.objects.filter(
        fecha_regreso__lte=fecha_limite,
        estado='activo'
    ).update(estado='archivado')
    return 'OK: ' + str(actualizados) + ' viajes archivados'