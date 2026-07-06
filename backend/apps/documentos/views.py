from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
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


from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from apps.viajes.permissions import EsAgente
from apps.auditoria.models import LogAuditoria


class DocumentoValidarRechazarView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]

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
        return Response(DocumentoEntregadoDetalleSerializer(doc).data)


class DocumentoEntregadoDeleteView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            doc = DocumentoEntregado.objects.select_related(
                'inscripcion__padre_tutor__usuario'
            ).get(pk=pk)
        except DocumentoEntregado.DoesNotExist:
            raise NotFound('Documento no encontrado.')

        if request.user.rol == 'padre':
            if doc.inscripcion.padre_tutor.usuario != request.user:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()

        if doc.estado != 'pendiente':
            raise ValidationError(
                {'estado': 'Solo se puede eliminar un documento que aun esta en revision.'}
            )

        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

