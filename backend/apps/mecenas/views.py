from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from apps.viajes.permissions import EsAgente
from apps.inscripciones.models import Inscripcion
from .models import Mecenas, MecenasInscripcion
from .serializers import MecenasSerializer, MecenasInscripcionSerializer


class MecenasAlumnosView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            mecenas = Mecenas.objects.get(pk=pk)
        except Mecenas.DoesNotExist:
            raise NotFound('Mecenas no encontrado.')
        inscripciones = MecenasInscripcion.objects.filter(mecenas=mecenas).select_related('inscripcion__alumno', 'inscripcion__viaje')
        serializer = MecenasInscripcionSerializer(inscripciones, many=True)
        return Response(serializer.data)


class AsignarMecenasView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]

    def post(self, request, inscripcion_id):
        try:
            inscripcion = Inscripcion.objects.get(pk=inscripcion_id)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        serializer = MecenasInscripcionSerializer(data={**request.data, 'inscripcion': str(inscripcion_id)})
        serializer.is_valid(raise_exception=True)
        mecenas_id = serializer.validated_data.pop('mecenas_id')
        try:
            mecenas = Mecenas.objects.get(pk=mecenas_id)
        except Mecenas.DoesNotExist:
            raise NotFound('Mecenas no encontrado.')
        serializer.validated_data.pop('inscripcion', None)
        mi = MecenasInscripcion.objects.create(mecenas=mecenas, inscripcion=inscripcion, **serializer.validated_data)
        return Response(MecenasInscripcionSerializer(mi).data, status=status.HTTP_201_CREATED)