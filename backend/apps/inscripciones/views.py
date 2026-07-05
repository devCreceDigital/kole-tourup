from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from apps.viajes.models import Itinerario
from apps.viajes.serializers import ItinerarioSerializer
from apps.viajes.models import PlanPago
from datetime import date
from apps.documentos.models import DocumentoEntregado
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

class InscripcionItinerarioView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ItinerarioSerializer

    def get(self, request, pk):
        try:
            inscripcion = Inscripcion.objects.select_related('viaje').get(pk=pk)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        if request.user.rol == 'padre':
            padre_tutor = _get_padre_tutor(request.user)
            if inscripcion.padre_tutor != padre_tutor:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()
        itinerario = get_object_or_404(
            Itinerario.objects.prefetch_related('etapas', 'etapas__actividades'),
            viaje=inscripcion.viaje,
        )
        return Response(self.get_serializer(itinerario).data)


class InscripcionPlanPagoView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            inscripcion = Inscripcion.objects.select_related('viaje').get(pk=pk)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        if request.user.rol == 'padre':
            padre_tutor = _get_padre_tutor(request.user)
            if inscripcion.padre_tutor != padre_tutor:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()

        plan_pago = get_object_or_404(
            PlanPago.objects.prefetch_related('cuotas'),
            viaje=inscripcion.viaje,
        )

        pagos_de_inscripcion = {
            p.cuota_id: p for p in inscripcion.pagos.filter(cuota__isnull=False)
        }

        hoy = date.today()
        cuotas_data = []
        for cuota in plan_pago.cuotas.all().order_by('numero_cuota'):
            pago = pagos_de_inscripcion.get(cuota.id)
            if pago and pago.estado == 'verificado':
                estado = 'pagado'
            elif pago and pago.estado == 'pendiente':
                estado = 'en_revision'
            elif cuota.fecha_vencimiento < hoy:
                estado = 'vencido'
            else:
                estado = 'pendiente'
            cuotas_data.append({
                'id': str(cuota.id),
                'numero_cuota': cuota.numero_cuota,
                'descripcion': cuota.descripcion,
                'importe': str(cuota.importe),
                'fecha_vencimiento': cuota.fecha_vencimiento.isoformat(),
                'estado': estado,
                'pago_id': str(pago.id) if pago else None,
            })

        return Response({
            'id': str(plan_pago.id),
            'descripcion': plan_pago.descripcion,
            'total_cuotas': plan_pago.total_cuotas,
            'cuotas': cuotas_data,
        })


class MisAlumnosView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        padre_tutor = _get_padre_tutor(request.user)
        alumnos = padre_tutor.alumnos.all()
        data = []
        for a in alumnos:
            data.append({
                'id': str(a.id),
                'nombre': a.nombre,
                'apellidos': a.apellidos,
                'dni': a.dni,
                'fecha_nacimiento': a.fecha_nacimiento.isoformat() if a.fecha_nacimiento else None,
                'genero': a.genero,
                'colegio': a.colegio,
                'departamento': a.departamento,
                'nivel_educativo': a.nivel_educativo,
                'grado': a.grado,
                'telefono_emergencia': a.telefono_emergencia,
                'necesidades_especiales': a.necesidades_especiales,
                'nombre_tutor_legal': a.nombre_tutor_legal,
                'alergeno_gluten': a.alergeno_gluten,
                'alergeno_crustaceos': a.alergeno_crustaceos,
                'alergeno_huevos': a.alergeno_huevos,
                'alergeno_pescado': a.alergeno_pescado,
                'alergeno_cacahuetes': a.alergeno_cacahuetes,
                'alergeno_soja': a.alergeno_soja,
                'alergeno_lacteos': a.alergeno_lacteos,
                'alergeno_frutos_cascara': a.alergeno_frutos_cascara,
                'alergeno_apio': a.alergeno_apio,
                'alergeno_mostaza': a.alergeno_mostaza,
                'alergeno_sesamo': a.alergeno_sesamo,
                'alergeno_sulfitos': a.alergeno_sulfitos,
                'alergeno_altramuces': a.alergeno_altramuces,
                'alergeno_moluscos': a.alergeno_moluscos,
            })
        return Response(data)


class InscripcionDocumentosView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            inscripcion = Inscripcion.objects.select_related('viaje').get(pk=pk)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        if request.user.rol == 'padre':
            padre_tutor = _get_padre_tutor(request.user)
            if inscripcion.padre_tutor != padre_tutor:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()

        requeridos = inscripcion.viaje.documentos_requeridos.all()

        entregados_por_requerido = {
            d.documento_requerido_id: d
            for d in DocumentoEntregado.objects.filter(inscripcion=inscripcion)
        }

        documentos_data = []
        for req in requeridos:
            entrega = entregados_por_requerido.get(req.id)
            if entrega:
                estado = entrega.estado
            else:
                estado = 'no_subido'
            documentos_data.append({
                'id': str(req.id),
                'nombre': req.nombre,
                'descripcion': req.descripcion,
                'obligatorio': req.obligatorio,
                'formatos_permitidos': req.formatos_lista,
                'estado': estado,
                'entrega_id': str(entrega.id) if entrega else None,
                'nombre_archivo': entrega.nombre_archivo if entrega else None,
                'motivo_rechazo': entrega.motivo_rechazo if (entrega and entrega.estado == 'rechazado') else None,
            })

        total = len(documentos_data)
        validados = sum(1 for d in documentos_data if d['estado'] == 'validado')

        return Response({
            'total_requeridos': total,
            'total_validados': validados,
            'documentos': documentos_data,
        })
