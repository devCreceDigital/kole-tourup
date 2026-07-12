from rest_framework import serializers
from .models import Comunicado


class ComunicadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comunicado
        fields = ['id', 'viaje', 'autor', 'titulo', 'cuerpo', 'enviado_email', 'fecha_publicacion']
        read_only_fields = ['id', 'viaje', 'autor', 'enviado_email', 'fecha_publicacion']
