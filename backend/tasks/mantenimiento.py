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
    hoy = date.today()

    cerrados = Viaje.objects.filter(
        fecha_regreso__lt=hoy,
        estado='activo'
    ).update(estado='cerrado')

    archivados = Viaje.objects.filter(
        fecha_regreso__lte=fecha_limite,
        estado='cerrado'
    ).update(estado='archivado')

    return f'OK: {cerrados} cerrados, {archivados} archivados'

@shared_task(bind=True, max_retries=3)
def alerta_docs_umbral(self):
    from apps.viajes.models import Viaje, DocumentoRequerido
    from apps.documentos.models import DocumentoEntregado
    from apps.notificaciones.models import Notificacion
    from apps.autenticacion.models import Usuario
    umbral = getattr(settings, 'DOC_INCOMPLETE_ALERT_THRESHOLD', 50)
    viajes = Viaje.objects.filter(estado='activo').prefetch_related('inscripciones', 'documentos_requeridos')
    for viaje in viajes:
        total_requeridos = viaje.documentos_requeridos.count()
        if total_requeridos == 0:
            continue
        inscripciones = viaje.inscripciones.filter(estado__in=['pendiente', 'confirmado'])
        total_esperados = total_requeridos * inscripciones.count()
        if total_esperados == 0:
            continue
        total_validados = DocumentoEntregado.objects.filter(
            inscripcion__in=inscripciones,
            documento_requerido__viaje=viaje,
            estado='validado'
        ).count()
        porcentaje_incompleto = round((1 - total_validados / total_esperados) * 100, 1)
        if porcentaje_incompleto < umbral:
            continue
        cache_key = 'alerta_docs:' + str(viaje.id) + ':' + str(date.today())
        if cache.get(cache_key):
            continue
        agentes = Usuario.objects.filter(agencia=viaje.agencia, rol='agente')
        for agente in agentes:
            Notificacion.objects.create(
                usuario=agente,
                tipo='recordatorio',
                titulo='Documentacion incompleta: ' + viaje.nombre,
                mensaje=str(porcentaje_incompleto) + '% de documentos pendientes en ' + viaje.nombre,
                referencia_id=viaje.id,
                referencia_tipo='Viaje'
            )
        cache.set(cache_key, True, timeout=86400)
    return 'OK'
