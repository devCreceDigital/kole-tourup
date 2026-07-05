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


class InscripcionMecenasView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            inscripcion = Inscripcion.objects.select_related('viaje', 'alumno').get(pk=pk)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        if request.user.rol == 'padre':
            padre_tutor = _get_padre_tutor(request.user)
            if inscripcion.padre_tutor != padre_tutor:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()

        from apps.mecenas.models import MecenasInscripcion
        from apps.mecenas.serializers import MecenasInscripcionSerializer
        from datetime import date

        patrocinios = MecenasInscripcion.objects.filter(
            inscripcion=inscripcion
        ).select_related('mecenas')

        total_recaudado = sum(p.monto_pagado for p in patrocinios)
        meta = inscripcion.precio_final

        dias_restantes = None
        if inscripcion.viaje.fecha_salida:
            delta = (inscripcion.viaje.fecha_salida - date.today()).days
            dias_restantes = max(delta, 0)

        data = {
            'meta': meta,
            'recaudado': total_recaudado,
            'porcentaje': round(float(total_recaudado) / float(meta) * 100, 2) if meta else 0,
            'apoyos_count': patrocinios.count(),
            'dias_restantes': dias_restantes,
            'patrocinios': MecenasInscripcionSerializer(patrocinios, many=True).data,
        }
        return Response(data)


class InscripcionHotelesView(generics.GenericAPIView):
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

        from apps.viajes.serializers import HotelSerializer
        from .models import InscripcionHotelPreferencia, InscripcionRoommateSolicitud
        from .serializers import AlumnoResumenSerializer

        hoteles = inscripcion.viaje.hoteles.all()
        preferencias = {
            p.hotel_id: p
            for p in InscripcionHotelPreferencia.objects.filter(inscripcion=inscripcion)
        }
        roommates_por_hotel = {}
        for r in InscripcionRoommateSolicitud.objects.filter(inscripcion=inscripcion).select_related('alumno_solicitado'):
            roommates_por_hotel.setdefault(r.hotel_id, []).append(r)

        data = []
        for hotel in hoteles:
            pref = preferencias.get(hotel.id)
            roommates = roommates_por_hotel.get(hotel.id, [])
            data.append({
                'hotel': HotelSerializer(hotel).data,
                'preferencia': {
                    'tipo_habitacion': pref.tipo_habitacion if pref else None,
                    'tipo_cama': pref.tipo_cama if pref else None,
                    'planta': pref.planta if pref else None,
                    'necesidades_especiales': pref.necesidades_especiales if pref else '',
                    'estado': pref.estado if pref else None,
                } if pref else None,
                'roommates': [
                    {
                        'id': str(r.id),
                        'alumno': AlumnoResumenSerializer(r.alumno_solicitado).data,
                        'estado': r.estado,
                    }
                    for r in roommates
                ],
            })

        return Response(data)


class InscripcionHotelPreferenciaView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, hotel_id):
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

        from apps.viajes.models import Hotel
        from .models import InscripcionHotelPreferencia

        try:
            hotel = inscripcion.viaje.hoteles.get(pk=hotel_id)
        except Hotel.DoesNotExist:
            raise NotFound('Hotel no encontrado para este viaje.')

        campos_validos = ['tipo_habitacion', 'tipo_cama', 'planta', 'necesidades_especiales']
        valores = {k: v for k, v in request.data.items() if k in campos_validos}

        pref, created = InscripcionHotelPreferencia.objects.update_or_create(
            inscripcion=inscripcion, hotel=hotel,
            defaults={**valores, 'estado': 'pendiente'}
        )

        return Response({
            'tipo_habitacion': pref.tipo_habitacion,
            'tipo_cama': pref.tipo_cama,
            'planta': pref.planta,
            'necesidades_especiales': pref.necesidades_especiales,
            'estado': pref.estado,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class InscripcionRoommatesView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def _get_inscripcion_validada(self, request, pk):
        try:
            inscripcion = Inscripcion.objects.select_related('viaje', 'alumno').get(pk=pk)
        except Inscripcion.DoesNotExist:
            raise NotFound('Inscripcion no encontrada.')
        if request.user.rol == 'padre':
            padre_tutor = _get_padre_tutor(request.user)
            if inscripcion.padre_tutor != padre_tutor:
                raise PermissionDenied()
        elif request.user.rol not in ['agente']:
            raise PermissionDenied()
        return inscripcion

    def get(self, request, pk, hotel_id):
        """Lista alumnos sugeridos (otros inscritos al mismo viaje, mismo hotel) para pedir como roommate."""
        inscripcion = self._get_inscripcion_validada(request, pk)
        from apps.viajes.models import Hotel
        from .serializers import AlumnoResumenSerializer

        try:
            inscripcion.viaje.hoteles.get(pk=hotel_id)
        except Hotel.DoesNotExist:
            raise NotFound('Hotel no encontrado para este viaje.')

        otras_inscripciones = inscripcion.viaje.inscripciones.exclude(
            alumno=inscripcion.alumno
        ).select_related('alumno')

        alumnos = [i.alumno for i in otras_inscripciones]
        return Response(AlumnoResumenSerializer(alumnos, many=True).data)

    def post(self, request, pk, hotel_id):
        """Solicita a un alumno como companero de habitacion."""
        inscripcion = self._get_inscripcion_validada(request, pk)
        from apps.viajes.models import Hotel
        from .models import Alumno, InscripcionRoommateSolicitud
        from .serializers import AlumnoResumenSerializer

        try:
            hotel = inscripcion.viaje.hoteles.get(pk=hotel_id)
        except Hotel.DoesNotExist:
            raise NotFound('Hotel no encontrado para este viaje.')

        alumno_id = request.data.get('alumno_id')
        if not alumno_id:
            return Response({'alumno_id': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            alumno_solicitado = Alumno.objects.get(pk=alumno_id)
        except Alumno.DoesNotExist:
            raise NotFound('Alumno no encontrado.')

        if alumno_solicitado == inscripcion.alumno:
            return Response({'alumno_id': ['No puedes solicitarte a ti mismo.']}, status=status.HTTP_400_BAD_REQUEST)

        solicitud, created = InscripcionRoommateSolicitud.objects.get_or_create(
            inscripcion=inscripcion, alumno_solicitado=alumno_solicitado, hotel=hotel,
            defaults={'estado': 'pendiente'}
        )

        return Response({
            'id': str(solicitud.id),
            'alumno': AlumnoResumenSerializer(alumno_solicitado).data,
            'estado': solicitud.estado,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

