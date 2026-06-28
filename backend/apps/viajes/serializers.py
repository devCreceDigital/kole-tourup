from rest_framework import serializers
from .models import Viaje


class ViajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Viaje
        fields = [
            'id', 'agencia', 'nombre', 'destino',
            'fecha_salida', 'fecha_regreso', 'descripcion',
            'cupo_maximo', 'precio_total', 'estado',
            'imagen', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'agencia', 'created_at', 'updated_at']

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
