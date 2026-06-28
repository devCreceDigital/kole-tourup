from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from django.db import IntegrityError
from apps.autenticacion.models import PadreTutor
from .models import Inscripcion
from .serializers import InscripcionCreateSerializer, InscripcionDetalleSerializer


def _get_padre_tutor(user):
    try:
        return PadreTutor.objects.get(usuario=user)
    except PadreTutor.DoesNotExist:
        raise PermissionDenied('Solo padres/tutores pueden inscribir alumnos.')


class InscripcionListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        padre_tutor = _get_padre_tutor(request.user)
        inscripciones = Inscripcion.objects.filter(padre_tutor=padre_tutor).select_related('alumno', 'viaje')
        serializer = InscripcionDetalleSerializer(inscripciones, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        padre_tutor = _get_padre_tutor(request.user)
        serializer = InscripcionCreateSerializer(
            data=request.data,
            context={'padre_tutor': padre_tutor, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        try:
            inscripcion = serializer.save()
        except IntegrityError:
            return Response(
                {'alumno': 'Este alumno ya esta inscrito en este viaje.'},
                status=status.HTTP_409_CONFLICT
            )
        detalle = InscripcionDetalleSerializer(inscripcion, context={'request': request})
        return Response(detalle.data, status=status.HTTP_201_CREATED)


class InscripcionRetrieveView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            inscripcion = Inscripcion.objects.select_related('alumno', 'viaje').get(pk=pk)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        if request.user.rol == 'padre':
            padre_tutor = _get_padre_tutor(request.user)
            if inscripcion.padre_tutor != padre_tutor:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()
        serializer = InscripcionDetalleSerializer(inscripcion, context={'request': request})
        return Response(serializer.data)
