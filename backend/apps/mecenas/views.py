from datetime import date
from django.db.models import Count, Sum
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from apps.viajes.permissions import EsAgente
from apps.inscripciones.models import Alumno, Inscripcion
from .models import Mecenas, MecenasInscripcion
from .serializers import MecenasSerializer, MecenasInscripcionSerializer, CampaniaPublicaSerializer


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


class CampaniaPublicaView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = CampaniaPublicaSerializer

    def get(self, request, alumno_id):
        try:
            alumno = Alumno.objects.get(pk=alumno_id)
        except Alumno.DoesNotExist:
            raise NotFound('Alumno no encontrado.')

        inscripcion = Inscripcion.objects.filter(
            alumno=alumno,
            estado__in=['pendiente', 'confirmado']
        ).select_related('viaje').first()
        if not inscripcion:
            raise NotFound('Inscripción activa no encontrada para este alumno.')

        agregaciones = MecenasInscripcion.objects.filter(
            inscripcion=inscripcion
        ).aggregate(
            apoyos=Count('id'),
            recaudado=Sum('monto_pagado'),
            meta=Sum('monto_comprometido')
        )

        viaje = inscripcion.viaje
        dias_restantes = (viaje.fecha_salida - date.today()).days if viaje.fecha_salida else 0

        data = {
            'alumno_id': alumno.id,
            'alumno_nombre': alumno.nombre,
            'apellidos': alumno.apellidos,
            'viaje_nombre': viaje.nombre,
            'destino': viaje.destino,
            'fecha_salida': viaje.fecha_salida,
            'dias_restantes': max(dias_restantes, 0),
            'apoyos': agregaciones['apoyos'] or 0,
            'recaudado': agregaciones['recaudado'] or 0,
            'meta': agregaciones['meta'] or float(viaje.precio_total),
        }
        serializer = self.get_serializer(data)
        return Response(serializer.data)