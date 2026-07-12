from rest_framework import serializers
from .models import Mecenas, MecenasInscripcion
from apps.inscripciones.models import Alumno, Inscripcion
from apps.viajes.models import Viaje


class MecenasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mecenas
        fields = ['id', 'nombre', 'email', 'telefono', 'created_at']
        read_only_fields = ['id', 'created_at']


class MecenasInscripcionSerializer(serializers.ModelSerializer):
    mecenas = MecenasSerializer(read_only=True)
    mecenas_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = MecenasInscripcion
        fields = ['id', 'mecenas', 'mecenas_id', 'inscripcion', 'monto_comprometido', 'monto_pagado', 'notas', 'created_at']
        read_only_fields = ['id', 'created_at']


class CampaniaPublicaSerializer(serializers.Serializer):
    alumno_id = serializers.UUIDField(read_only=True)
    alumno_nombre = serializers.CharField(read_only=True)
    apellidos = serializers.CharField(read_only=True)
    viaje_nombre = serializers.CharField(read_only=True)
    destino = serializers.CharField(read_only=True)
    fecha_salida = serializers.DateField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)
    apoyos = serializers.IntegerField(read_only=True)
    recaudado = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    meta = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)