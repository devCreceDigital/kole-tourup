import uuid
from django.db import transaction
from rest_framework import serializers
from apps.autenticacion.models import PadreTutor
from apps.viajes.models import Viaje
from .models import Alumno, Inscripcion


class AlumnoInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    apellidos = serializers.CharField(max_length=150)
    fecha_nacimiento = serializers.DateField()
    dni = serializers.CharField(max_length=20)
    num_pasaporte = serializers.CharField(max_length=30, required=False, allow_blank=True)
    necesidades_especiales = serializers.CharField(required=False, allow_blank=True)
    nombre_tutor_legal = serializers.CharField(max_length=200)
    telefono_emergencia = serializers.CharField(max_length=20)


class InscripcionCreateSerializer(serializers.Serializer):
    viaje_id = serializers.UUIDField()
    alumno = AlumnoInputSerializer()

    def validate_viaje_id(self, value):
        try:
            return Viaje.objects.get(id=value)
        except Viaje.DoesNotExist:
            raise serializers.ValidationError('Viaje no encontrado.')

    def validate(self, data):
        viaje = data['viaje_id']
        if viaje.estado != 'activo':
            raise serializers.ValidationError('El viaje no esta activo.')
        inscritos = viaje.inscripciones.filter(estado__in=['pendiente', 'confirmado']).count()
        if inscritos >= viaje.cupo_maximo:
            raise serializers.ValidationError({'viaje_id': 'Sin cupo disponible.'})
        return data

    def create(self, validated_data):
        viaje = validated_data['viaje_id']
        alumno_data = validated_data['alumno']
        padre_tutor = self.context['padre_tutor']
        alumno, _ = Alumno.objects.get_or_create(
            dni=alumno_data['dni'],
            defaults={
                'nombre': alumno_data['nombre'],
                'apellidos': alumno_data['apellidos'],
                'fecha_nacimiento': alumno_data['fecha_nacimiento'],
                'num_pasaporte': alumno_data.get('num_pasaporte', ''),
                'necesidades_especiales': alumno_data.get('necesidades_especiales', ''),
                'nombre_tutor_legal': alumno_data['nombre_tutor_legal'],
                'telefono_emergencia': alumno_data['telefono_emergencia'],
            }
        )
        alumno.tutores.add(padre_tutor)
        if viaje.inscripciones.filter(alumno=alumno).exists():
            raise serializers.ValidationError({'alumno': 'Este alumno ya esta inscrito en este viaje.'})
        inscripcion = Inscripcion.objects.create(
            alumno=alumno,
            viaje=viaje,
            padre_tutor=padre_tutor,
            precio_final=viaje.precio_total,
            estado='pendiente'
        )
        return inscripcion


class ViajeResumenSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Viaje
        fields = ['id', 'nombre', 'destino', 'fecha_salida', 'fecha_regreso', 'imagen_url']

    def get_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.imagen and request:
            return request.build_absolute_uri(obj.imagen.url)
        return None


class AlumnoResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumno
        fields = ['nombre', 'apellidos']


class InscripcionDetalleSerializer(serializers.ModelSerializer):
    viaje = ViajeResumenSerializer(read_only=True)
    alumno = AlumnoResumenSerializer(read_only=True)
    saldo_pendiente = serializers.ReadOnlyField()
    total_pagado = serializers.ReadOnlyField()
    porcentaje_pagado = serializers.ReadOnlyField()
    pagos_resumen = serializers.SerializerMethodField()
    documentos_resumen = serializers.SerializerMethodField()
    hotel_asignado = serializers.SerializerMethodField()

    class Meta:
        model = Inscripcion
        fields = [
            'id', 'estado', 'precio_final', 'saldo_pendiente',
            'porcentaje_pagado', 'total_pagado', 'viaje', 'alumno',
            'pagos_resumen', 'documentos_resumen', 'hotel_asignado',
        ]

    def get_pagos_resumen(self, obj):
        plan = getattr(obj.viaje, 'plan_pago', None)
        total_cuotas = plan.total_cuotas if plan else 0
        cuotas_pagadas = obj.pagos.filter(estado='verificado').count()
        tiene_vencida = False
        return {'total_cuotas': total_cuotas, 'cuotas_pagadas': cuotas_pagadas, 'tiene_cuota_vencida': tiene_vencida}

    def get_documentos_resumen(self, obj):
        total_requeridos = obj.viaje.documentos_requeridos.count()
        return {'total_requeridos': total_requeridos, 'total_validados': 0, 'tiene_rechazado': False}

    def get_hotel_asignado(self, obj):
        hotel = obj.viaje.hoteles.first()
        if not hotel:
            return None
        return {'nombre': hotel.nombre, 'maps_url': hotel.maps_url}
