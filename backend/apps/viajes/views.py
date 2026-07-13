from django.db import transaction, IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, status
from rest_framework.exceptions import ValidationError as DRFValidationError, NotFound
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.http import Http404
from django.db.models import Prefetch, Count
from .models import Viaje, PlanPago, Alumno, ItinerarioViaje, EtapaItinerarioViaje, Actividad, Hotel, Grupo, DocumentoRequerido
from .serializers import (
    ViajeSerializer, PlanPagoSerializer, AlumnoSerializer,
    EtapaItinerarioSerializer, ActividadSerializer,
    ItinerarioSerializer, ReordenamientoActividadSerializer,
    HotelSerializer, GrupoSerializer, AsignarAlumnosSerializer, DocumentoRequeridoSerializer,
    ViajeCambioEstadoSerializer,
)
from .permissions import EsAgente


# ─── Helpers multi-tenant para itinerario ─────────────────────────────────────

def _get_viaje_o_404(viaje_id, agencia):
    try:
        return Viaje.objects.get(id=viaje_id, agencia=agencia)
    except Viaje.DoesNotExist:
        raise Http404


def _get_etapa_o_404(etapa_id, viaje):
    try:
        return EtapaItinerarioViaje.objects.get(id=etapa_id, itinerario__viaje=viaje)
    except EtapaItinerarioViaje.DoesNotExist:
        raise Http404


class ViajeListCreateView(generics.ListCreateAPIView):
    serializer_class = ViajeSerializer
    permission_classes = [IsAuthenticated, EsAgente]

    def get_queryset(self):
        """
        Retorna únicamente los viajes pertenecientes a la agencia del agente.
        Aplica select_related para evitar consultas N+1 con agencia.
        """
        return Viaje.objects.filter(
            agencia=self.request.user.agencia
        ).select_related('agencia').order_by('fecha_salida')

    def perform_create(self, serializer):
        """
        Inyecta la agencia del usuario autenticado de forma transparente.
        """
        serializer.save(agencia=self.request.user.agencia)


class ViajeRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    Endpoint para ver detalle y actualizar parcialmente un viaje.
    No permite DELETE ni acciones adicionales.
    """
    serializer_class = ViajeSerializer
    permission_classes = [IsAuthenticated, EsAgente]

    def get_queryset(self):
        """
        Filtro estricto multi-tenant: el viaje debe pertenecer
        a la agencia del agente. Si intenta acceder al viaje de otra
        agencia, DRF retornará 404 Not Found, blindando la existencia
        de recursos de otros tenants.
        """
        return Viaje.objects.filter(
            agencia=self.request.user.agencia
        ).select_related('agencia')


class ViajeCambiarEstadoView(generics.GenericAPIView):
    serializer_class = ViajeCambioEstadoSerializer
    permission_classes = [IsAuthenticated, EsAgente]

    def get_queryset(self):
        return Viaje.objects.filter(agencia=self.request.user.agencia)

    def get_object(self):
        return get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])

    def post(self, request, *args, **kwargs):
        viaje = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={'viaje': viaje, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            ViajeSerializer(viaje, context={'request': request}).data,
            status=status.HTTP_200_OK
        )


class PlanPagoRetrieveUpdateCreateView(
    generics.GenericAPIView,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.CreateModelMixin
):
    """
    Endpoint para ver, crear y actualizar el plan de pagos de un viaje.
    """
    serializer_class = PlanPagoSerializer
    permission_classes = [IsAuthenticated, EsAgente]

    def get_object(self):
        viaje_id = self.kwargs.get('viaje_id')
        try:
            viaje = Viaje.objects.get(id=viaje_id, agencia=self.request.user.agencia)  # noqa: E501
        except Viaje.DoesNotExist:
            raise Http404

        try:
            return PlanPago.objects.prefetch_related('cuotas').get(viaje=viaje)
        except PlanPago.DoesNotExist:
            raise Http404

    def get_serializer_context(self):
        context = super().get_serializer_context()
        viaje_id = self.kwargs.get('viaje_id')
        if viaje_id:
            try:
                viaje = Viaje.objects.get(id=viaje_id, agencia=self.request.user.agencia)  # noqa: E501
                context['viaje'] = viaje
            except Viaje.DoesNotExist:
                pass
        return context

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        viaje_id = self.kwargs.get('viaje_id')
        if not Viaje.objects.filter(id=viaje_id, agencia=self.request.user.agencia).exists():  # noqa: E501
            raise Http404

        if PlanPago.objects.filter(viaje_id=viaje_id).exists():
            return Response(
                {"detail": "El viaje ya posee un plan de pagos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class AlumnoListCreateView(generics.ListCreateAPIView):
    serializer_class = AlumnoSerializer
    permission_classes = [IsAuthenticated, EsAgente]

    def get_queryset(self):
        return Alumno.objects.filter(
            agencia=self.request.user.agencia
        ).select_related('agencia')


class AlumnoRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = AlumnoSerializer
    permission_classes = [IsAuthenticated, EsAgente]

    def get_queryset(self):
        return Alumno.objects.filter(
            agencia=self.request.user.agencia
        ).select_related('agencia')


# ─── Vistas de itinerario (TASK-028) ─────────────────────────────────────────

class ItinerarioRetrieveView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = ItinerarioSerializer

    def get(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        itinerario = get_object_or_404(
            ItinerarioViaje.objects.prefetch_related('etapas', 'etapas__actividades'),
            viaje=viaje,
        )
        return Response(self.get_serializer(itinerario).data)


class EtapaListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = EtapaItinerarioSerializer

    def _get_itinerario(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        return get_object_or_404(ItinerarioViaje, viaje=viaje)

    def get(self, request, viaje_id):
        etapas = self._get_itinerario().etapas.all()
        return Response(self.get_serializer(etapas, many=True).data)

    def post(self, request, viaje_id):
        itinerario = self._get_itinerario()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(itinerario=itinerario)
        except IntegrityError:
            raise DRFValidationError(
                {"dia_numero": "Ya existe una etapa con este número de día en el itinerario."}
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EtapaRetrieveUpdateDestroyView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = EtapaItinerarioSerializer

    def _get_etapa(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        return _get_etapa_o_404(self.kwargs['etapa_id'], viaje)

    def get(self, request, viaje_id, etapa_id):
        return Response(self.get_serializer(self._get_etapa()).data)

    def patch(self, request, viaje_id, etapa_id):
        etapa = self._get_etapa()
        serializer = self.get_serializer(etapa, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except IntegrityError:
            raise DRFValidationError(
                {"dia_numero": "Ya existe una etapa con este número de día en el itinerario."}
            )
        return Response(serializer.data)

    def delete(self, request, viaje_id, etapa_id):
        self._get_etapa().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActividadListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = ActividadSerializer

    def _get_etapa(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        return _get_etapa_o_404(self.kwargs['etapa_id'], viaje)

    def get(self, request, viaje_id, etapa_id):
        etapa = self._get_etapa()
        return Response(self.get_serializer(etapa.actividades.all(), many=True).data)

    def post(self, request, viaje_id, etapa_id):
        etapa = self._get_etapa()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etapa=etapa)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ActividadRetrieveUpdateDestroyView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = ActividadSerializer

    def _get_actividad(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        etapa = _get_etapa_o_404(self.kwargs['etapa_id'], viaje)
        return get_object_or_404(Actividad, id=self.kwargs['actividad_id'], etapa=etapa)

    def get(self, request, viaje_id, etapa_id, actividad_id):
        return Response(self.get_serializer(self._get_actividad()).data)

    def patch(self, request, viaje_id, etapa_id, actividad_id):
        actividad = self._get_actividad()
        serializer = self.get_serializer(actividad, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, viaje_id, etapa_id, actividad_id):
        self._get_actividad().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _get_hotel_o_404(hotel_id, viaje):
    try:
        return Hotel.objects.get(id=hotel_id, viaje=viaje)
    except Hotel.DoesNotExist:
        raise Http404


def _get_grupo_o_404(grupo_id, viaje):
    try:
        return Grupo.objects.get(id=grupo_id, viaje=viaje)
    except Grupo.DoesNotExist:
        raise Http404


class ActividadBulkReordenarView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = ReordenamientoActividadSerializer

    def patch(self, request, viaje_id, etapa_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        etapa = _get_etapa_o_404(etapa_id, viaje)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        actividades_data = serializer.validated_data['actividades']
        ids_payload = [str(item['id']) for item in actividades_data]

        actividades_map = {
            str(a.id): a
            for a in Actividad.objects.filter(etapa=etapa, id__in=ids_payload)
        }

        if len(actividades_map) != len(ids_payload):
            ids_invalidos = [uid for uid in ids_payload if uid not in actividades_map]
            raise DRFValidationError(
                {"actividades": f"IDs no pertenecen a esta etapa: {ids_invalidos}"}
            )

        with transaction.atomic():
            for item in actividades_data:
                actividades_map[str(item['id'])].orden = item['orden']
            Actividad.objects.bulk_update(list(actividades_map.values()), ['orden'])

        actividades = Actividad.objects.filter(etapa=etapa)
        return Response(ActividadSerializer(actividades, many=True).data)


# ─── Vistas de hoteles (TASK-029) ────────────────────────────────────────────

class HotelListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = HotelSerializer

    def get(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        return Response(self.get_serializer(viaje.hoteles.all(), many=True).data)

    def post(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(viaje=viaje)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HotelRetrieveUpdateDestroyView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = HotelSerializer

    def _get_hotel(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        return _get_hotel_o_404(self.kwargs['hotel_id'], viaje)

    def get(self, request, viaje_id, hotel_id):
        return Response(self.get_serializer(self._get_hotel()).data)

    def patch(self, request, viaje_id, hotel_id):
        hotel = self._get_hotel()
        serializer = self.get_serializer(hotel, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, viaje_id, hotel_id):
        self._get_hotel().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Vistas de grupos (TASK-029) ─────────────────────────────────────────────

class GrupoListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = GrupoSerializer

    def get(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        return Response(self.get_serializer(viaje.grupos.all(), many=True).data)

    def post(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(viaje=viaje)
        except IntegrityError:
            raise DRFValidationError(
                {"nombre": "Ya existe un grupo con este nombre en el viaje."}
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GrupoRetrieveUpdateDestroyView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = GrupoSerializer

    def _get_grupo(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        return _get_grupo_o_404(self.kwargs['grupo_id'], viaje)

    def get(self, request, viaje_id, grupo_id):
        return Response(self.get_serializer(self._get_grupo()).data)

    def patch(self, request, viaje_id, grupo_id):
        grupo = self._get_grupo()
        serializer = self.get_serializer(grupo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except IntegrityError:
            raise DRFValidationError(
                {"nombre": "Ya existe un grupo con este nombre en el viaje."}
            )
        return Response(serializer.data)

    def delete(self, request, viaje_id, grupo_id):
        self._get_grupo().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GrupoAsignarAlumnosView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, EsAgente]
    serializer_class = AsignarAlumnosSerializer

    def post(self, request, viaje_id, grupo_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        grupo = _get_grupo_o_404(grupo_id, viaje)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids_payload = [str(uid) for uid in serializer.validated_data['alumno_ids']]

        alumnos = list(
            Alumno.objects.filter(id__in=ids_payload, agencia=request.user.agencia)
        )
        if len(alumnos) != len(ids_payload):
            raise DRFValidationError(
                {"alumno_ids": "Algunos IDs no pertenecen a alumnos de esta agencia."}
            )

        if grupo.capacidad is not None:
            ids_ya = {str(uid) for uid in grupo.alumnos.values_list('id', flat=True)}
            ids_nuevos_count = len(set(ids_payload) - ids_ya)
            if grupo.alumnos.count() + ids_nuevos_count > grupo.capacidad:
                raise DRFValidationError(
                    {"alumno_ids": f"La asignación excede la capacidad del grupo ({grupo.capacidad})."}  # noqa: E501
                )

        grupo.alumnos.add(*alumnos)
        return Response(
            {"asignados": len(alumnos), "total_en_grupo": grupo.alumnos.count()},
            status=status.HTTP_200_OK,
        )


# ─── Vistas de documentos requeridos (TASK-030) ───────────────────────────────

def _get_documento_o_404(documento_id, viaje):
    try:
        return DocumentoRequerido.objects.get(id=documento_id, viaje=viaje)
    except DocumentoRequerido.DoesNotExist:
        raise NotFound("Documento requerido no encontrado.")


class DocumentoRequeridoListCreateView(generics.GenericAPIView):
    serializer_class = DocumentoRequeridoSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), EsAgente()]

    def get(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        return Response(self.get_serializer(viaje.documentos_requeridos.all(), many=True).data)

    def post(self, request, viaje_id):
        viaje = _get_viaje_o_404(viaje_id, request.user.agencia)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(viaje=viaje)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentoRequeridoRetrieveUpdateDestroyView(generics.GenericAPIView):
    serializer_class = DocumentoRequeridoSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), EsAgente()]

    def _get_documento(self):
        viaje = _get_viaje_o_404(self.kwargs['viaje_id'], self.request.user.agencia)
        return _get_documento_o_404(self.kwargs['documento_id'], viaje)

    def get(self, request, viaje_id, documento_id):
        return Response(self.get_serializer(self._get_documento()).data)

    def patch(self, request, viaje_id, documento_id):
        documento = self._get_documento()
        serializer = self.get_serializer(documento, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, viaje_id, documento_id):
        self._get_documento().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ViajePublicoListView(generics.ListAPIView):
    """Endpoint público para listar viajes publicados (sin autenticación)."""
    serializer_class = ViajeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Viaje.objects.filter(estado='activo').select_related('agencia').order_by('fecha_salida')
        slug = self.request.query_params.get('slug')
        if slug:
            qs = qs.filter(slug=slug)
        return qs


class ViajePublicoDetailView(generics.RetrieveAPIView):
    """Endpoint público para ver detalle de un viaje publicado (sin autenticación).
    Acepta tanto slug como UUID en la URL."""
    serializer_class = ViajeSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        return Viaje.objects.filter(estado='activo').select_related('agencia').prefetch_related(
            Prefetch('grupos', queryset=Grupo.objects.annotate(alumnos_count=Count('alumnos')))
        )

    def get_object(self):
        lookup_value = self.kwargs.get(self.lookup_url_kwarg)
        queryset = self.get_queryset()
        try:
            import uuid
            uuid.UUID(lookup_value)
            return get_object_or_404(queryset, id=lookup_value)
        except ValueError:
            return get_object_or_404(queryset, slug=lookup_value)
