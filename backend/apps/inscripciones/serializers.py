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
    nombre_tutor_legal = serializers.CharField(max_length=200, required=False, allow_blank=True)
    telefono_emergencia = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    genero = serializers.CharField(max_length=20, required=False, allow_blank=True)
    colegio = serializers.CharField(max_length=200, required=False, allow_blank=True)
    departamento = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nivel_educativo = serializers.CharField(max_length=20, required=False, allow_blank=True)
    grado = serializers.CharField(max_length=10, required=False, allow_blank=True)
    alergeno_gluten = serializers.BooleanField(default=False)
    alergeno_crustaceos = serializers.BooleanField(default=False)
    alergeno_huevos = serializers.BooleanField(default=False)
    alergeno_pescado = serializers.BooleanField(default=False)
    alergeno_cacahuetes = serializers.BooleanField(default=False)
    alergeno_soja = serializers.BooleanField(default=False)
    alergeno_lacteos = serializers.BooleanField(default=False)
    alergeno_frutos_cascara = serializers.BooleanField(default=False)
    alergeno_apio = serializers.BooleanField(default=False)
    alergeno_mostaza = serializers.BooleanField(default=False)
    alergeno_sesamo = serializers.BooleanField(default=False)
    alergeno_sulfitos = serializers.BooleanField(default=False)
    alergeno_altramuces = serializers.BooleanField(default=False)
    alergeno_moluscos = serializers.BooleanField(default=False)


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
        if viaje.estado != 'publicado':
            raise serializers.ValidationError('El viaje no esta activo.')
        inscritos = viaje.inscripciones.filter(estado__in=['pendiente', 'confirmado']).count()
        if inscritos >= viaje.cupo_maximo:
            raise serializers.ValidationError({'viaje_id': 'Sin cupo disponible.'})
        return data

    def create(self, validated_data):
        viaje = validated_data['viaje_id']
        alumno_data = validated_data['alumno']
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
            'alergeno_gluten': alumno_data.get('alergeno_gluten', False),
            'alergeno_crustaceos': alumno_data.get('alergeno_crustaceos', False),
            'alergeno_huevos': alumno_data.get('alergeno_huevos', False),
            'alergeno_pescado': alumno_data.get('alergeno_pescado', False),
            'alergeno_cacahuetes': alumno_data.get('alergeno_cacahuetes', False),
            'alergeno_soja': alumno_data.get('alergeno_soja', False),
            'alergeno_lacteos': alumno_data.get('alergeno_lacteos', False),
            'alergeno_frutos_cascara': alumno_data.get('alergeno_frutos_cascara', False),
            'alergeno_apio': alumno_data.get('alergeno_apio', False),
            'alergeno_mostaza': alumno_data.get('alergeno_mostaza', False),
            'alergeno_sesamo': alumno_data.get('alergeno_sesamo', False),
            'alergeno_sulfitos': alumno_data.get('alergeno_sulfitos', False),
            'alergeno_altramuces': alumno_data.get('alergeno_altramuces', False),
            'alergeno_moluscos': alumno_data.get('alergeno_moluscos', False),
        }
        
        alumno, created = Alumno.objects.get_or_create(
            dni=alumno_data['dni'],
            defaults=defaults_dict
        )
        if not created:
            for key, val in defaults_dict.items():
                setattr(alumno, key, val)
            alumno.save()
            
        alumno.tutores.add(padre_tutor)
        if viaje.inscripciones.filter(alumno=alumno).exists():
            raise serializers.ValidationError({'alumno': 'Este alumno ya esta inscrito en este viaje.'})
            
        inscripcion = Inscripcion.objects.create(
            alumno=alumno,
            viaje=viaje,
            padre_tutor=padre_tutor,
            precio_final=viaje.precio_total,
            estado='pre_inscrito',
            genero=alumno_data.get('genero', ''),
            colegio=alumno_data.get('colegio', ''),
            departamento=alumno_data.get('departamento', ''),
            nivel_educativo=alumno_data.get('nivel_educativo', ''),
            grado=alumno_data.get('grado', ''),
            alergeno_gluten=alumno_data.get('alergeno_gluten', False),
            alergeno_crustaceos=alumno_data.get('alergeno_crustaceos', False),
            alergeno_huevos=alumno_data.get('alergeno_huevos', False),
            alergeno_pescado=alumno_data.get('alergeno_pescado', False),
            alergeno_cacahuetes=alumno_data.get('alergeno_cacahuetes', False),
            alergeno_soja=alumno_data.get('alergeno_soja', False),
            alergeno_lacteos=alumno_data.get('alergeno_lacteos', False),
            alergeno_frutos_cascara=alumno_data.get('alergeno_frutos_cascara', False),
            alergeno_apio=alumno_data.get('alergeno_apio', False),
            alergeno_mostaza=alumno_data.get('alergeno_mostaza', False),
            alergeno_sesamo=alumno_data.get('alergeno_sesamo', False),
            alergeno_sulfitos=alumno_data.get('alergeno_sulfitos', False),
            alergeno_altramuces=alumno_data.get('alergeno_altramuces', False),
            alergeno_moluscos=alumno_data.get('alergeno_moluscos', False),
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
        alergias_list = []
        if obj.alergeno_gluten: alergias_list.append('Gluten')
        if obj.alergeno_crustaceos: alergias_list.append('Crustáceos')
        if obj.alergeno_huevos: alergias_list.append('Huevos')
        if obj.alergeno_pescado: alergias_list.append('Pescado')
        if obj.alergeno_cacahuetes: alergias_list.append('Cacahuetes')
        if obj.alergeno_soja: alergias_list.append('Soja')
        if obj.alergeno_lacteos: alergias_list.append('Lácteos')
        if obj.alergeno_frutos_cascara: alergias_list.append('Frutos de cáscara')
        if obj.alergeno_apio: alergias_list.append('Apio')
        if obj.alergeno_mostaza: alergias_list.append('Mostaza')
        if obj.alergeno_sesamo: alergias_list.append('Sésamo')
        if obj.alergeno_sulfitos: alergias_list.append('Sulfitos')
        if obj.alergeno_altramuces: alergias_list.append('Altramuces')
        if obj.alergeno_moluscos: alergias_list.append('Moluscos')
        
        if not alergias_list:
            return ['sin especificar']
        return alergias_list
