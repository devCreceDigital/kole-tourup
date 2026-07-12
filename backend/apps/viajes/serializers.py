from django.db import transaction, IntegrityError
from rest_framework import serializers
from .models import (
    Viaje, Cuota, PlanPago, Alumno, Itinerario, EtapaItinerario, Actividad, Hotel, Grupo, DocumentoRequerido
)
from datetime import date


class ViajeSerializer(serializers.ModelSerializer):
    inscripciones_count = serializers.SerializerMethodField()

    class Meta:
        model = Viaje
        fields = [
            'id', 'agencia', 'nombre', 'destino', 'fecha_salida',
            'fecha_regreso', 'descripcion', 'cupo_maximo',
            'precio_total', 'estado', 'imagen', 'duracion_dias',
            'slug', 'codigo', 'colegio', 'nivel_educativo', 'grado',
            'inscripciones_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'agencia', 'estado', 'created_at', 'updated_at']  # noqa: E501

    def get_inscripciones_count(self, obj):
        return obj.inscripciones.count()

    def validate(self, data):
        """
        Validación a nivel de serializador.
        Previene 500 (IntegrityError) en BD validando las fechas
        de forma anticipada. Considera updates parciales (PATCH).
        """
        fecha_salida = data.get('fecha_salida', self.instance.fecha_salida if self.instance else None)  # noqa: E501
        fecha_regreso = data.get('fecha_regreso', self.instance.fecha_regreso if self.instance else None)  # noqa: E501

        if fecha_salida and fecha_regreso:
            if fecha_regreso <= fecha_salida:
                raise serializers.ValidationError({
                    "fecha_regreso": "La fecha de regreso debe ser posterior a la de salida."  # noqa: E501
                })
        return data


class CuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuota
        fields = ['id', 'numero_cuota', 'descripcion', 'importe', 'fecha_vencimiento']  # noqa: E501
        read_only_fields = ['id']

    def validate_importe(self, value):
        if value <= 0:
            raise serializers.ValidationError("El importe debe ser mayor a 0.")
        return value


class PlanPagoSerializer(serializers.ModelSerializer):
    cuotas = CuotaSerializer(many=True, allow_empty=False)

    class Meta:
        model = PlanPago
        fields = ['id', 'descripcion', 'total_cuotas', 'created_at', 'cuotas']
        read_only_fields = ['id', 'created_at']

    def validate_total_cuotas(self, value):
        if value <= 0:
            raise serializers.ValidationError("El total de cuotas debe ser mayor a 0.")  # noqa: E501
        return value

    def validate(self, data):
        cuotas = data.get('cuotas', [])

        if 'total_cuotas' in data and len(cuotas) != data['total_cuotas']:
            raise serializers.ValidationError({
                "cuotas": "La cantidad de cuotas enviadas debe coincidir con total_cuotas."  # noqa: E501
            })

        numeros = [c.get('numero_cuota') for c in cuotas if 'numero_cuota' in c]  # noqa: E501
        if len(numeros) != len(set(numeros)):
            raise serializers.ValidationError({
                "cuotas": "Existen números de cuota duplicados."
            })

        return data

    def create(self, validated_data):
        cuotas_data = validated_data.pop('cuotas', [])
        viaje = self.context['viaje']

        try:
            with transaction.atomic():
                plan_pago = PlanPago.objects.create(viaje=viaje, **validated_data)  # noqa: E501

                # Para evitar N+1 queries al insertar
                cuotas_a_crear = [
                    Cuota(plan_pago=plan_pago, **cuota_data)
                    for cuota_data in cuotas_data
                ]
                Cuota.objects.bulk_create(cuotas_a_crear)

                return plan_pago
        except IntegrityError:
            # Captura colisión si se intentó crear 2 planes al mismo tiempo
            # (OneToOneField viaje lanza error único)
            raise serializers.ValidationError(
                {"detail": "El viaje ya posee un plan de pagos."}
            )

    def update(self, instance, validated_data):
        if instance.tiene_pagos_verificados:
            raise serializers.ValidationError(
                {"detail": "No se puede modificar un plan de pagos que tiene pagos verificados."}  # noqa: E501
            )

        cuotas_data = validated_data.pop('cuotas', None)

        with transaction.atomic():
            instance.descripcion = validated_data.get('descripcion', instance.descripcion)  # noqa: E501
            instance.total_cuotas = validated_data.get('total_cuotas', instance.total_cuotas)  # noqa: E501
            instance.save()

            if cuotas_data is not None:
                # Sincronización inteligente: no borrar indiscriminadamente para preservar UUIDs  # noqa: E501
                numeros_payload = [c['numero_cuota'] for c in cuotas_data]

                # Eliminar cuotas que desaparecieron del payload
                instance.cuotas.exclude(numero_cuota__in=numeros_payload).delete()  # noqa: E501

                # Actualizar existentes o crear nuevas (Upsert)
                for cuota_data in cuotas_data:
                    numero = cuota_data.pop('numero_cuota')
                    Cuota.objects.update_or_create(
                        plan_pago=instance,
                        numero_cuota=numero,
                        defaults=cuota_data
                    )

        return instance


class AlumnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumno
        fields = [
            'id', 'agencia', 'nombres', 'apellidos', 'tipo_documento', 'numero_documento',  # noqa: E501
            'fecha_nacimiento', 'telefono', 'email', 'activo', 'grupos',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'agencia', 'created_at', 'updated_at']

    def validate_fecha_nacimiento(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de nacimiento no puede ser futura.")  # noqa: E501
        return value

    def validate_numero_documento(self, value):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'agencia'):
            return value

        agencia = request.user.agencia
        qs = Alumno.objects.filter(agencia=agencia, numero_documento=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "Ya existe un alumno con este número de documento en la agencia."  # noqa: E501
            )

        return value

    def create(self, validated_data):
        grupos = validated_data.pop('grupos', [])
        agencia = self.context['request'].user.agencia

        alumno = Alumno.objects.create(agencia=agencia, **validated_data)

        if grupos:
            alumno.grupos.set(grupos)

        return alumno


class EtapaItinerarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EtapaItinerario
        fields = ['id', 'dia_numero', 'titulo', 'descripcion', 'imagen']
        read_only_fields = ['id']

    def validate_dia_numero(self, value):
        if value < 1:
            raise serializers.ValidationError("El número de día debe ser mayor a 0.")
        return value


class ActividadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actividad
        fields = ['id', 'hora', 'hora_llegada', 'titulo', 'descripcion', 'tipo', 'orden', 'numero_vuelo', 'aerolinea', 'origen', 'destino', 'terminal', 'puerta_embarque']
        # orden solo modificable vía bulk reordenar (invariante TASK-028)
        read_only_fields = ['id', 'orden']


class EtapaConActividadesSerializer(serializers.ModelSerializer):
    actividades = ActividadSerializer(many=True, read_only=True)

    class Meta:
        model = EtapaItinerario
        fields = ['id', 'dia_numero', 'titulo', 'descripcion', 'imagen', 'actividades']
        read_only_fields = ['id']


class ItinerarioSerializer(serializers.ModelSerializer):
    etapas = EtapaConActividadesSerializer(many=True, read_only=True)

    class Meta:
        model = Itinerario
        fields = ['id', 'viaje', 'etapas', 'created_at', 'updated_at']
        read_only_fields = ['id', 'viaje', 'created_at', 'updated_at']


class OrdenActividadItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    orden = serializers.IntegerField(min_value=0)


class ReordenamientoActividadSerializer(serializers.Serializer):
    actividades = OrdenActividadItemSerializer(many=True, allow_empty=False)

    def validate_actividades(self, value):
        ids = [str(item['id']) for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Se enviaron IDs de actividades duplicados.")
        return value


class HotelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hotel
        fields = ['id', 'nombre', 'descripcion', 'tasa_turistica', 'fianza',
                  'web_url', 'maps_url', 'imagen', 'telefono', 'latitud', 'longitud']
        read_only_fields = ['id']


class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grupo
        fields = ['id', 'nombre', 'descripcion', 'capacidad', 'created_at']
        read_only_fields = ['id', 'created_at']


class AsignarAlumnosSerializer(serializers.Serializer):
    alumno_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )

    def validate_alumno_ids(self, value):
        ids = [str(v) for v in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Se enviaron IDs de alumnos duplicados.")
        return value


class DocumentoRequeridoSerializer(serializers.ModelSerializer):
    formatos_lista = serializers.ReadOnlyField()

    class Meta:
        model = DocumentoRequerido
        fields = ['id', 'nombre', 'descripcion', 'obligatorio',
                  'formatos_permitidos', 'formatos_lista']
        read_only_fields = ['id']
