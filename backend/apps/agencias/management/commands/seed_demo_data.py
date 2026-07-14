import random
from datetime import timedelta, date
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.agencias.models import Agencia
from apps.autenticacion.models import Usuario, RolUsuario, PadreTutor
from apps.viajes.models import Viaje, ItinerarioViaje, EtapaItinerarioViaje, Actividad, EstadoViaje, TipoActividad
from apps.inscripciones.models import Alumno, Inscripcion

class Command(BaseCommand):
    help = 'Genera datos semilla para Tottem Hub (Agencia, Viajes, Usuarios, Inscripciones)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Eliminando datos existentes de prueba...'))
        
        with transaction.atomic():
            # Limpiar datos para que sea idempotente
            from apps.pagos.models import Pago
            Pago.objects.filter(inscripcion__viaje__agencia__slug='agencia-tottem-demo').delete()
            Inscripcion.objects.filter(viaje__agencia__slug='agencia-tottem-demo').delete()
            Viaje.objects.filter(agencia__slug='agencia-tottem-demo').delete()
            Agencia.objects.filter(slug='agencia-tottem-demo').delete()
            Usuario.objects.filter(email='agente@tottem.com').delete()
            Usuario.objects.filter(email='padre@tottem.com').delete()
            Usuario.objects.filter(email='alumno@tottem.com').delete()
            
            self.stdout.write('Creando Agencia Demo...')
            agencia = Agencia.objects.create(
                nombre='Tottem Viajes Demo',
                slug='agencia-tottem-demo',
                email_contacto='contacto@tottemdemo.com',
                telefono='999888777',
                activa=True
            )

            self.stdout.write('Creando Usuarios...')
            # Agente
            agente = Usuario.objects.create_user(
                email='agente@tottem.com',
                password='password123',
                nombre='Agente',
                apellidos='Demo',
                rol=RolUsuario.AGENTE,
                agencia=agencia,
                email_verificado=True
            )

            # Padre
            padre = Usuario.objects.create_user(
                email='padre@tottem.com',
                password='password123',
                nombre='Carlos',
                apellidos='Gómez',
                rol=RolUsuario.PADRE,
                email_verificado=True
            )
            padre_tutor = PadreTutor.objects.create(
                usuario=padre,
                dni='12345678A',
                relacion_alumno='padre'
            )

            # Alumno Usuario
            alumno_user = Usuario.objects.create_user(
                email='alumno@tottem.com',
                password='password123',
                nombre='Martín',
                apellidos='Gómez',
                rol=RolUsuario.ALUMNO,
                email_verificado=True
            )

            # Perfil Alumno
            fecha_nac = date.today() - timedelta(days=365*16)
            alumno_perfil = Alumno.objects.create(
                usuario=alumno_user,
                nombre='Martín',
                apellidos='Gómez',
                dni='87654321B',
                fecha_nacimiento=fecha_nac,
                nombre_tutor_legal='Carlos Gómez',
                telefono_emergencia='+34 611 111 111'
            )
            alumno_perfil.tutores.add(padre_tutor)

            self.stdout.write('Creando Viaje de Fin de Curso...')
            fecha_salida = timezone.now().date() + timedelta(days=60)
            fecha_regreso = fecha_salida + timedelta(days=5)
            
            viaje = Viaje.objects.create(
                agencia=agencia,
                nombre='Viaje de Fin de Curso a Bariloche',
                destino='Bariloche, Argentina',
                fecha_salida=fecha_salida,
                fecha_regreso=fecha_regreso,
                descripcion='El mejor viaje de egresados, con todas las actividades incluidas y máxima seguridad.',
                cupo_maximo=50,
                precio_total=1500.00,
                estado=EstadoViaje.ACTIVO,
                colegio='Colegio San Agustin',
                nivel_educativo='Secundaria',
                grado='5to'
            )

            self.stdout.write('Creando Inscripcion...')
            inscripcion = Inscripcion.objects.create(
                alumno=alumno_perfil,
                viaje=viaje,
                padre_tutor=padre_tutor,
                estado='confirmado',
                precio_final=1500.00,
                colegio='Colegio San Agustin'
            )

            self.stdout.write('Creando Itinerario del Viaje...')
            itinerario = viaje.itinerario

            # Día 1
            etapa1 = EtapaItinerarioViaje.objects.create(
                itinerario=itinerario,
                dia_numero=1,
                titulo='Llegada a Bariloche y Bienvenida',
                descripcion='Recepción en el aeropuerto y traslado al hotel exclusivo.',
                codigo='DIA-1',
                slug='dia-1'
            )
            Actividad.objects.create(etapa=etapa1, titulo='Vuelo a Bariloche', tipo=TipoActividad.VUELO, orden=1)
            Actividad.objects.create(etapa=etapa1, titulo='Check-in Hotel', tipo=TipoActividad.HOTEL, orden=2)
            Actividad.objects.create(etapa=etapa1, titulo='Cena de Bienvenida', tipo=TipoActividad.COMIDA, orden=3)

            # Día 2
            etapa2 = EtapaItinerarioViaje.objects.create(
                itinerario=itinerario,
                dia_numero=2,
                titulo='Aventura en la Nieve',
                descripcion='Día completo en Cerro Catedral aprendiendo a esquiar.',
                codigo='DIA-2',
                slug='dia-2'
            )
            Actividad.objects.create(etapa=etapa2, titulo='Desayuno', tipo=TipoActividad.COMIDA, orden=1)
            Actividad.objects.create(etapa=etapa2, titulo='Clases de Ski en Cerro Catedral', tipo=TipoActividad.EXCURSION, orden=2)
            
            self.stdout.write(self.style.SUCCESS('==========================================='))
            self.stdout.write(self.style.SUCCESS('¡Seed Data generado correctamente!'))
            self.stdout.write(self.style.SUCCESS(f'Viaje creado: {viaje.nombre}'))
            self.stdout.write(self.style.SUCCESS(f'ID del Viaje para la URL del Wizard: {viaje.id}'))
            self.stdout.write(self.style.SUCCESS('Credenciales:'))
            self.stdout.write(self.style.SUCCESS('- agente@tottem.com / password123'))
            self.stdout.write(self.style.SUCCESS('- padre@tottem.com / password123'))
            self.stdout.write(self.style.SUCCESS('- alumno@tottem.com / password123'))
            self.stdout.write(self.style.SUCCESS('==========================================='))
