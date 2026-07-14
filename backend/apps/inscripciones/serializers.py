import uuid
from django.db import transaction
from rest_framework import serializers
from apps.autenticacion.models import PadreTutor
from apps.viajes.models import Viaje
from .models import Alumno, Inscripcion


CAMPOS_ALERGENOS = [
    'alergeno_gluten', 'alergeno_crustaceos', 'alergeno_huevos', 'alergeno_pescado',
    'alergeno_cacahuetes', 'alergeno_soja', 'alergeno_lacteos', 'alergeno_frutos_cascara',
    'alergeno_apio', 'alergeno_mostaza', 'alergeno_sesamo', 'alergeno_sulfitos',
    'alergeno_altramuces', 'alergeno_moluscos',
]

ETIQUETAS_ALERGENOS = {
    'alergeno_gluten': 'Gluten',
    'alergeno_crustaceos': 'Crustáceos',
    'alergeno_huevos': 'Huevos',
    'alergeno_pescado': 'Pescado',
    'alergeno_cacahuetes': 'Cacahuetes',
    'alergeno_soja': 'Soja',
    'alergeno_lacteos': 'Lácteos',
    'alergeno_frutos_cascara': 'Frutos de cáscara',
    'alergeno_apio': 'Apio',
    'alergeno_mostaza': 'Mostaza',
    'alergeno_sesamo': 'Sésamo',
    'alergeno_sulfitos': 'Sulfitos',
    'alergeno_altramuces': 'Altramuces',
    'alergeno_moluscos': 'Moluscos',
}

class AlumnoInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    apellidos = serializers.CharField(max_length=150)
    fecha_nacimiento = serializers.DateField()
    dni = serializers.CharField(max_length=20)
    num_pasaporte = serializers.CharField(max_length=30, required=False, allow_blank=True)
    necesidades_especiales = serializers.CharField(required=False, allow_blank=True)
    nombre_tutor_legal = serializers.CharField(max_length=200, required=False, allow_blank=True)
    telefono_emergencia = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    genero = serializers.CharField(max_length=20, required=False, allow_blank=True)
    colegio = serializers.CharField(max_length=200, required=False, allow_blank=True)
    departamento = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nivel_educativo = serializers.CharField(max_length=20, required=False, allow_blank=True)
    grado = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in CAMPOS_ALERGENOS:
            self.fields[campo] = serializers.BooleanField(default=False)


class InscripcionCreateSerializer(serializers.Serializer):
    viaje_id = serializers.UUIDField()
    grupo_id = serializers.UUIDField(required=False, allow_null=True)
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
        grupo_id = validated_data.get('grupo_id')
        padre_tutor = self.context['padre_tutor']
        
        defaults_dict = {
            'nombre': alumno_data['nombre'],
            'apellidos': alumno_data['apellidos'],
            'fecha_nacimiento': alumno_data['fecha_nacimiento'],
            'num_pasaporte': alumno_data.get('num_pasaporte', ''),
            'necesidades_especiales': alumno_data.get('necesidades_especiales', ''),
            'nombre_tutor_legal': alumno_data.get('nombre_tutor_legal') or padre_tutor.usuario.nombre_completo,
            'telefono_emergencia': alumno_data['telefono_emergencia'],
            'genero': alumno_data.get('genero', ''),
            'colegio': alumno_data.get('colegio', ''),
            'departamento': alumno_data.get('departamento', ''),
            'nivel_educativo': alumno_data.get('nivel_educativo', ''),
            'grado': alumno_data.get('grado', ''),
        }
        for campo in CAMPOS_ALERGENOS:
            defaults_dict[campo] = alumno_data.get(campo, False)
        
        alumno, created = Alumno.objects.get_or_create(
            dni=alumno_data['dni'],
            defaults=defaults_dict
        )
        if not created:
            for key, val in defaults_dict.items():
                setattr(alumno, key, val)
            alumno.save()

        # Asignar grupo si se especificó
        if grupo_id:
            from apps.viajes.models import Grupo
            try:
                grupo = Grupo.objects.get(id=grupo_id, viaje=viaje)
            except Grupo.DoesNotExist:
                raise serializers.ValidationError({'grupo_id': 'Grupo no encontrado para este viaje.'})

            # Validar capacidad del grupo
            if grupo.capacidad is not None:
                inscritos_en_grupo = Alumno.objects.filter(grupo=grupo).count()
                if inscritos_en_grupo >= grupo.capacidad:
                    raise serializers.ValidationError({
                        'grupo_id': f'El grupo "{grupo.nombre}" está completo ({grupo.capacidad} plazas).'
                    })

            alumno.grupo = grupo
            alumno.save(update_fields=['grupo'])
            
        alumno.tutores.add(padre_tutor)
        if viaje.inscripciones.filter(alumno=alumno).exists():
            raise serializers.ValidationError({'alumno': 'Este alumno ya esta inscrito en este viaje.'})
            
        inscripcion_kwargs = {
            'alumno': alumno,
            'viaje': viaje,
            'padre_tutor': padre_tutor,
            'precio_final': viaje.precio_total,
            'estado': 'pre_inscrito',
            'genero': alumno_data.get('genero', ''),
            'colegio': alumno_data.get('colegio', ''),
            'departamento': alumno_data.get('departamento', ''),
            'nivel_educativo': alumno_data.get('nivel_educativo', ''),
            'grado': alumno_data.get('grado', ''),
        }
        for campo in CAMPOS_ALERGENOS:
            inscripcion_kwargs[campo] = alumno_data.get(campo, False)
        inscripcion = Inscripcion.objects.create(**inscripcion_kwargs)
        return inscripcion


class ViajeResumenSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Viaje
        fields = ['id', 'nombre', 'destino', 'fecha_salida', 'fecha_regreso', 'imagen_url']

    def get_imagen_url(self, obj):
        # URL relativa para que el frontend la resuelva contra el host
        # del gateway (producción) o Django (desarrollo).
        if obj.imagen:
            return obj.imagen.url
        return None


class AlumnoResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumno
        fields = ['id', 'nombre', 'apellidos']


class AlumnoDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumno
        fields = [
            'id', 'nombre', 'apellidos', 'dni', 'fecha_nacimiento',
            'genero', 'colegio', 'nombre_tutor_legal', 'telefono_emergencia',
            'necesidades_especiales',
        ]


class InscripcionDetalleSerializer(serializers.ModelSerializer):
    viaje = ViajeResumenSerializer(read_only=True)
    alumno = AlumnoDetalleSerializer(read_only=True)
    saldo_pendiente = serializers.ReadOnlyField()
    total_pagado = serializers.ReadOnlyField()
    porcentaje_pagado = serializers.ReadOnlyField()
    pagos_resumen = serializers.SerializerMethodField()
    documentos_resumen = serializers.SerializerMethodField()
    hotel_asignado = serializers.SerializerMethodField()
    alergias = serializers.SerializerMethodField()
    padre_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Inscripcion
        fields = [
            'id', 'estado', 'precio_final', 'saldo_pendiente',
            'porcentaje_pagado', 'total_pagado', 'viaje', 'alumno',
            'pagos_resumen', 'documentos_resumen', 'hotel_asignado',
            'colegio', 'nivel_educativo', 'grado', 'alergias', 'padre_nombre'
        ]

    def get_padre_nombre(self, obj):
        usuario = getattr(obj.padre_tutor, 'usuario', None)
        if not usuario:
            return None
        return usuario.nombre

    def get_pagos_resumen(self, obj):
        from datetime import date
        plan = getattr(obj.viaje, 'plan_pago', None)
        total_cuotas = plan.total_cuotas if plan else 0
        cuotas_pagadas = obj.pagos.filter(estado='verificado').count()
        tiene_vencida = False
        if plan:
            hoy = date.today()
            fecha_inscripcion = obj.fecha_inscripcion.date()
            cuotas_pagadas_ids = set(
                obj.pagos.filter(estado='verificado', cuota__isnull=False).values_list('cuota_id', flat=True)
            )
            for cuota in plan.cuotas.all():
                if cuota.id in cuotas_pagadas_ids:
                    continue
                if cuota.fecha_vencimiento < hoy and cuota.fecha_vencimiento >= fecha_inscripcion:
                    tiene_vencida = True
                    break
        return {'total_cuotas': total_cuotas, 'cuotas_pagadas': cuotas_pagadas, 'tiene_cuota_vencida': tiene_vencida}

    def get_documentos_resumen(self, obj):
        from apps.documentos.models import DocumentoEntregado
        requeridos = obj.viaje.documentos_requeridos.all()
        total_requeridos = requeridos.count()
        entregados = DocumentoEntregado.objects.filter(inscripcion=obj)
        total_validados = entregados.filter(estado='validado').count()
        tiene_rechazado = entregados.filter(estado='rechazado').exists()
        return {
            'total_requeridos': total_requeridos,
            'total_validados': total_validados,
            'tiene_rechazado': tiene_rechazado,
        }

    def get_hotel_asignado(self, obj):
        hotel = obj.hotel_asignado
        if not hotel:
            return None
        return {'nombre': hotel.nombre, 'maps_url': hotel.maps_url}

    def get_alergias(self, obj):
        alergias_list = [
            etiqueta for campo, etiqueta in ETIQUETAS_ALERGENOS.items()
            if getattr(obj, campo)
        ]
        if not alergias_list:
            return ['sin especificar']
        return alergias_list
