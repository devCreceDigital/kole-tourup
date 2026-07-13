from django.db import transaction, IntegrityError
from rest_framework import serializers
from .models import (
    Viaje, Cuota, PlanPago, Alumno, ItinerarioViaje, EtapaItinerarioViaje, Actividad, Hotel, Grupo, DocumentoRequerido, EstadoViaje,
    ComplementoViaje, ComplementoContratado,
)
from apps.colegios.models import Colegio
from datetime import date


class ColegioRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Colegio
        fields = ['id', 'nombre', 'departamento', 'provincia', 'distrito']


class GrupoPublicoSerializer(serializers.ModelSerializer):
    alumnos_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Grupo
        fields = ['id', 'nombre', 'descripcion', 'capacidad', 'alumnos_count']


class ViajeSerializer(serializers.ModelSerializer):
    inscripciones_count = serializers.SerializerMethodField()
    colegio_ref = ColegioRefSerializer(read_only=True)
    grupos = GrupoPublicoSerializer(many=True, read_only=True)
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Viaje
        fields = [
            'id', 'agencia', 'nombre', 'destino', 'fecha_salida',
            'fecha_regreso', 'descripcion', 'cupo_maximo',
            'precio_total', 'estado', 'imagen', 'imagen_url', 'duracion_dias',
            'slug', 'codigo', 'colegio', 'colegio_ref', 'nivel_educativo', 'grado',
            'inscripciones_count', 'grupos',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'agencia', 'estado', 'created_at', 'updated_at']  # noqa: E501

    def get_inscripciones_count(self, obj):
        return obj.inscripciones.count()

    def get_imagen_url(self, obj):
        """
        URL relativa de la imagen de portada. Se devuelve relativa para que
        el frontend la resuelva contra el host del gateway (producción) o
        Django (desarrollo), evitando fugas del hostname interno del backend.
        """
        if obj.imagen:
            return obj.imagen.url
        return None

    def validate_fecha_regreso(self, value):
        """
        BR-V-01: fecha_regreso debe ser estrictamente posterior a fecha_salida.
        Captura el invariante en el serializer para retornar 400 en lugar de
        dejar escapar el CheckConstraint de BD como 500 (ver TD-021).
        """
        fecha_salida = self._get_fecha_salida()
        if fecha_salida is not None and value <= fecha_salida:
            raise serializers.ValidationError(
                "La fecha de regreso debe ser posterior a la fecha de salida."
            )
        return value

    def validate_fecha_salida(self, value):
        """
        Permite validar el invariante cuando solo se actualiza fecha_salida
        (PATCH parcial) manteniendo coherencia con fecha_regreso existente.
        """
        self._pending_fecha_salida = value
        fecha_regreso = self._get_fecha_regreso()
        if fecha_regreso is not None and fecha_regreso <= value:
            raise serializers.ValidationError(
                "La fecha de salida debe ser anterior a la fecha de regreso."
            )
        return value

    def validate(self, data):
        """
        Validación cruzada final: cubre el caso en que ambos campos vienen en
        el mismo payload, o fecha_salida se valida antes de fecha_regreso sin
        contexto del instance (POST).
        """
        fecha_salida = data.get('fecha_salida', self._get_fecha_salida())
        fecha_regreso = data.get('fecha_regreso', self._get_fecha_regreso())

        if fecha_salida is not None and fecha_regreso is not None \
                and fecha_regreso <= fecha_salida:
            raise serializers.ValidationError({
                "fecha_regreso": "La fecha de regreso debe ser posterior a la fecha de salida."
            })
        return data

    def _get_fecha_salida(self):
        """
        Resuelve fecha_salida considerando: payload (initial_data),
        instance (PATCH) o None.
        """
        if hasattr(self, '_pending_fecha_salida'):
            return self._pending_fecha_salida
        if 'fecha_salida' in self.initial_data:
            try:
                return self.fields['fecha_salida'].run_validation(
                    self.initial_data['fecha_salida']
                )
            except serializers.ValidationError:
                return None
        if self.instance is not None:
            return self.instance.fecha_salida
        return None

    def _get_fecha_regreso(self):
        """
        Resuelve fecha_regreso considerando: payload, instance (PATCH) o None.
        """
        if 'fecha_regreso' in self.initial_data:
            try:
                return self.fields['fecha_regreso'].run_validation(
                    self.initial_data['fecha_regreso']
                )
            except serializers.ValidationError:
                return None
        if self.instance is not None:
            return self.instance.fecha_regreso
        return None


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
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = EtapaItinerarioViaje
        fields = ['id', 'dia_numero', 'titulo', 'descripcion', 'imagen', 'imagen_url']
        read_only_fields = ['id']

    def get_imagen_url(self, obj):
        if obj.imagen:
            return obj.imagen.url
        return None

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
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = EtapaItinerarioViaje
        fields = ['id', 'dia_numero', 'titulo', 'descripcion', 'imagen', 'imagen_url', 'actividades']
        read_only_fields = ['id']

    def get_imagen_url(self, obj):
        if obj.imagen:
            return obj.imagen.url
        return None


class ItinerarioSerializer(serializers.ModelSerializer):
    etapas = EtapaConActividadesSerializer(many=True, read_only=True)

    class Meta:
        model = ItinerarioViaje
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
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = ['id', 'nombre', 'descripcion', 'tasa_turistica', 'fianza',
                  'web_url', 'maps_url', 'imagen', 'imagen_url', 'telefono', 'latitud', 'longitud']
        read_only_fields = ['id']

    def get_imagen_url(self, obj):
        if obj.imagen:
            return obj.imagen.url
        return None


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


class ViajeCambioEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=EstadoViaje.choices)

    def validate_estado(self, value):
        viaje = self.context['viaje']
        permitidos = Viaje.TRANSICIONES_VALIDAS.get(viaje.estado, [])
        if value not in permitidos:
            raise serializers.ValidationError(
                f"No se puede cambiar de '{viaje.estado}' a '{value}'."
            )
        return value

    def save(self, **kwargs):
        viaje = self.context['viaje']
        nuevo_estado = self.validated_data['estado']
        usuario = self.context['request'].user
        ip = self.context['request'].META.get('REMOTE_ADDR')
        viaje.cambiar_estado(nuevo_estado, usuario=usuario, ip=ip)
        return viaje


class DocumentoRequeridoSerializer(serializers.ModelSerializer):
    formatos_lista = serializers.ReadOnlyField()

    class Meta:
        model = DocumentoRequerido
        fields = ['id', 'nombre', 'descripcion', 'obligatorio',
                  'formatos_permitidos', 'formatos_lista']
        read_only_fields = ['id']
