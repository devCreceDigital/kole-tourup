from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from .models import Pago
from .serializers import PagoCreateSerializer, PagoDetalleSerializer


class PagoListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.rol == 'agente':
            pagos = Pago.objects.filter(inscripcion__viaje__agencia=request.user.agencia)
        else:
            pagos = Pago.objects.filter(pagado_por=request.user)
        serializer = PagoDetalleSerializer(pagos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PagoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            pagado_por=request.user,
            registrado_por=request.user,
            estado='pendiente'
        )
        return Response(PagoDetalleSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)


from apps.viajes.permissions import EsAgente
from apps.auditoria.models import LogAuditoria


class PagoVerificarRechazarView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]

    def _enviar_email_estado(self, pago):
        tutor = pago.inscripcion.padre_tutor.usuario
        contexto = {
            'nombre_tutor': tutor.nombre,
            'importe': str(pago.importe),
            'nombre_viaje': pago.inscripcion.viaje.nombre,
        }
        if pago.estado == 'verificado':
            html = render_to_string('emails/pago_verificado.html', contexto)
            subject = 'Pago verificado - ' + pago.inscripcion.viaje.nombre
        else:
            contexto['motivo'] = pago.notas or 'Sin motivo especificado.'
            html = render_to_string('emails/pago_rechazado.html', contexto)
            subject = 'Pago rechazado - ' + pago.inscripcion.viaje.nombre
        send_mail(
            subject=subject,
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[tutor.email],
            html_message=html,
            fail_silently=True,
        )

    def patch(self, request, pk):
        try:
            pago = Pago.objects.select_related(
                'inscripcion__padre_tutor__usuario', 'inscripcion__viaje'
            ).get(pk=pk)
        except Pago.DoesNotExist:
            raise NotFound('Pago no encontrado.')
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in ['verificado', 'rechazado']:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'estado': 'Debe ser verificado o rechazado.'})
        estado_anterior = pago.estado
        pago.estado = nuevo_estado
        if 'notas' in request.data:
            pago.notas = request.data['notas']
        pago.save()
        LogAuditoria.objects.create(
            usuario=request.user,
            accion='PAGO_ACTUALIZADO',
            modelo='Pago',
            objeto_id=pago.id,
            valor_anterior={'estado': estado_anterior},
            valor_nuevo={'estado': nuevo_estado},
            ip=request.META.get('REMOTE_ADDR')
        )
        self._enviar_email_estado(pago)
        return Response(PagoDetalleSerializer(pago).data)
