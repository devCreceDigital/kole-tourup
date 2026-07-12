from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from apps.viajes.permissions import EsAgente
from apps.auditoria.models import LogAuditoria
from .models import DocumentoEntregado
from .serializers import DocumentoEntregadoCreateSerializer, DocumentoEntregadoDetalleSerializer


class DocumentoEntregadoCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = DocumentoEntregadoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save()
        return Response(DocumentoEntregadoDetalleSerializer(doc).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        estado = request.query_params.get('estado')
        viaje_id = request.query_params.get('viaje_id')
        qs = DocumentoEntregado.objects.select_related('inscripcion', 'documento_requerido')
        if estado:
            qs = qs.filter(estado=estado)
        if viaje_id:
            qs = qs.filter(inscripcion__viaje_id=viaje_id)
        if request.user.rol == 'padre':
            qs = qs.filter(inscripcion__padre_tutor__usuario=request.user)
        serializer = DocumentoEntregadoDetalleSerializer(qs, many=True)
        return Response(serializer.data)


class DocumentoValidarRechazarView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]

    def _enviar_email_estado(self, doc):
        tutor = doc.inscripcion.padre_tutor.usuario
        contexto = {
            'nombre_tutor': tutor.nombre,
            'nombre_documento': doc.documento_requerido.nombre,
            'nombre_viaje': doc.inscripcion.viaje.nombre,
        }
        if doc.estado == 'validado':
            html = render_to_string('emails/documento_validado.html', contexto)
            subject = 'Documento validado - ' + doc.inscripcion.viaje.nombre
        else:
            contexto['motivo'] = doc.motivo_rechazo or 'Sin motivo especificado.'
            html = render_to_string('emails/documento_rechazado.html', contexto)
            subject = 'Documento rechazado - ' + doc.inscripcion.viaje.nombre
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
            doc = DocumentoEntregado.objects.select_related(
                'inscripcion__padre_tutor__usuario', 'documento_requerido'
            ).get(pk=pk)
        except DocumentoEntregado.DoesNotExist:
            raise NotFound('Documento no encontrado.')
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in ['validado', 'rechazado']:
            raise ValidationError({'estado': 'Debe ser validado o rechazado.'})
        estado_anterior = doc.estado
        doc.estado = nuevo_estado
        if nuevo_estado == 'validado':
            doc.validado_por = request.user
            doc.fecha_validacion = timezone.now()
            doc.motivo_rechazo = ''
        elif nuevo_estado == 'rechazado':
            motivo = request.data.get('motivo_rechazo', '')
            if not motivo:
                raise ValidationError({'motivo_rechazo': 'El motivo de rechazo es requerido.'})
            doc.motivo_rechazo = motivo
        doc.save()
        LogAuditoria.objects.create(
            usuario=request.user,
            accion='DOCUMENTO_' + nuevo_estado.upper(),
            modelo='DocumentoEntregado',
            objeto_id=doc.id,
            valor_anterior={'estado': estado_anterior},
            valor_nuevo={'estado': nuevo_estado},
            ip=request.META.get('REMOTE_ADDR')
        )
        self._enviar_email_estado(doc)
        return Response(DocumentoEntregadoDetalleSerializer(doc).data)
