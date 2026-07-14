from datetime import date, timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Crea datos de prueba para Tottem Hub'

    def handle(self, *args, **kwargs):
        from apps.agencias.models import Agencia
        from apps.autenticacion.models import Usuario
        from apps.colegios.models import Colegio
        from apps.viajes.models import Viaje, PlanPago, Cuota, Hotel

        self.stdout.write('Creando datos de prueba...')

        # 1. Agencia
        agencia, _ = Agencia.objects.get_or_create(
            nombre='Tottem Travel',
            defaults={
                'email_contacto': 'contacto@tottemtravel.com',
                'telefono': '999888777',
                'slug': 'tottem-travel',
            }
        )
        self.stdout.write(f'  ✓ Agencia: {agencia.nombre}')

        # 2. Usuario agente
        agente, created = Usuario.objects.get_or_create(
            email='agente@tottemtravel.com',
            defaults={
                'nombre': 'Carlos',
                'apellidos': 'Mendoza',
                'rol': 'agente',
                'agencia': agencia,
                'email_verificado': True,
                'activo': True,
                'is_staff': False,
            }
        )
        if created:
            agente.set_password('Agente1234!')
            agente.save()
        self.stdout.write(f'  ✓ Agente: {agente.email}')

        # 3. Usuario padre
        padre, created = Usuario.objects.get_or_create(
            email='padre@test.com',
            defaults={
                'nombre': 'María',
                'apellidos': 'González',
                'rol': 'padre',
                'email_verificado': True,
                'activo': True,
            }
        )
        if created:
            padre.set_password('Padre1234!')
            padre.save()
        self.stdout.write(f'  ✓ Padre: {padre.email}')

        # 4. Colegio
        colegio, _ = Colegio.objects.get_or_create(
            nombre='IE San Agustín',
            defaults={
                'departamento': 'Lima',
                'distrito': 'San Isidro',
            }
        )
        self.stdout.write(f'  ✓ Colegio: {colegio.nombre}')

        # 5. Viaje — Cusco Mágico 2026
        viaje, created = Viaje.objects.get_or_create(
            nombre='Cusco Mágico 2026',
            defaults={
                'agencia': agencia,
                'destino': 'Cusco, Peru',
                'fecha_salida': date(2026, 9, 15),
                'fecha_regreso': date(2026, 9, 20),
                'cupo_maximo': 40,
                'precio_total': 1200,
                'estado': 'publicado',
                'descripcion': 'Viaje escolar a la ciudad imperial del Cusco. Incluye Machu Picchu, Valle Sagrado y City Tour.',
                'nivel_educativo': 'secundaria',
                'grado': '5to',
                'colegio': 'IE San Agustín',
            }
        )
        self.stdout.write(f'  ✓ Viaje: {viaje.nombre} (slug: {viaje.slug})')

        # 5a. Plan de pago + Cuotas para Cusco
        with transaction.atomic():
            plan, plan_created = PlanPago.objects.get_or_create(
                viaje=viaje,
                defaults={
                    'descripcion': 'Plan de pago - Cusco Mágico 2026',
                    'total_cuotas': 3,
                }
            )
            if plan_created:
                importe_cuota = viaje.precio_total / 3
                for i in range(3):
                    Cuota.objects.create(
                        plan_pago=plan,
                        numero_cuota=i + 1,
                        descripcion=f'Cuota {i + 1}',
                        importe=importe_cuota,
                        fecha_vencimiento=date(2026, 7, 15) + timedelta(days=30 * i),
                    )
                self.stdout.write(f'  ✓ Plan de pago: {plan.total_cuotas} cuotas')

        # 5b. Hoteles para Cusco
        hoteles_cusco = [
            {
                'nombre': 'Hotel Monasterio',
                'descripcion': 'Hotel boutique en el centro histórico de Cusco, antiguo monasterio colonial.',
                'web_url': 'https://hotelmonasterio.com',
                'maps_url': 'https://maps.google.com/?q=Hotel+Monasterio+Cusco',
            },
            {
                'nombre': 'San Agustín El Dorado',
                'descripcion': 'Hotel céntrico con vistas espectaculares a la ciudad. Piscina y restaurante incluidos.',
                'web_url': 'https://eldorado.sanagustin.com.pe',
                'maps_url': 'https://maps.google.com/?q=San+Agustin+El+Dorado+Cusco',
            },
            {
                'nombre': 'Eco Inn Cusco',
                'descripcion': 'Alojamiento sostenible cerca de la Plaza de Armas. Habitaciones modernas y confortables.',
                'web_url': 'https://ecoinncusco.com',
                'maps_url': 'https://maps.google.com/?q=Eco+Inn+Cusco',
            },
        ]
        for h_data in hoteles_cusco:
            hotel, hotel_created = Hotel.objects.get_or_create(
                viaje=viaje,
                nombre=h_data['nombre'],
                defaults=h_data,
            )
            if hotel_created:
                self.stdout.write(f'  ✓ Hotel: {hotel.nombre}')

        # 6. Viaje — Arequipa Aventura 2026
        viaje2, created = Viaje.objects.get_or_create(
            nombre='Arequipa Aventura 2026',
            defaults={
                'agencia': agencia,
                'destino': 'Arequipa, Peru',
                'fecha_salida': date(2026, 10, 10),
                'fecha_regreso': date(2026, 10, 14),
                'cupo_maximo': 30,
                'precio_total': 900,
                'estado': 'publicado',
                'descripcion': 'Descubre la Ciudad Blanca. Colca, volcanes y gastronomia arequipeña.',
                'nivel_educativo': 'secundaria',
                'grado': '4to',
                'colegio': 'IE San Agustín',
            }
        )
        self.stdout.write(f'  ✓ Viaje: {viaje2.nombre} (slug: {viaje2.slug})')

        # 6a. Plan de pago + Cuotas para Arequipa
        with transaction.atomic():
            plan2, plan2_created = PlanPago.objects.get_or_create(
                viaje=viaje2,
                defaults={
                    'descripcion': 'Plan de pago - Arequipa Aventura 2026',
                    'total_cuotas': 2,
                }
            )
            if plan2_created:
                importe_cuota2 = viaje2.precio_total / 2
                Cuota.objects.create(
                    plan_pago=plan2,
                    numero_cuota=1,
                    descripcion='Cuota 1',
                    importe=importe_cuota2,
                    fecha_vencimiento=date(2026, 8, 10),
                )
                Cuota.objects.create(
                    plan_pago=plan2,
                    numero_cuota=2,
                    descripcion='Cuota 2',
                    importe=importe_cuota2,
                    fecha_vencimiento=date(2026, 9, 10),
                )
                self.stdout.write(f'  ✓ Plan de pago: {plan2.total_cuotas} cuotas')

        # 6b. Hoteles para Arequipa
        hoteles_arequipa = [
            {
                'nombre': 'Hotel Libertador Arequipa',
                'descripcion': 'Hotel 5 estrellas frente a la Plaza de Armas. Arquitectura colonial restaurada.',
                'web_url': 'https://libertador.com.pe/arequipa',
                'maps_url': 'https://maps.google.com/?q=Hotel+Libertador+Arequipa',
            },
            {
                'nombre': 'Casa Andina Standard Arequipa',
                'descripcion': 'Hotel acogedor en el centro histórico. Piscina al aire libre y restaurante.',
                'web_url': 'https://casa-andina.com/arequipa',
                'maps_url': 'https://maps.google.com/?q=Casa+Andina+Arequipa',
            },
        ]
        for h_data in hoteles_arequipa:
            hotel, hotel_created = Hotel.objects.get_or_create(
                viaje=viaje2,
                nombre=h_data['nombre'],
                defaults=h_data,
            )
            if hotel_created:
                self.stdout.write(f'  ✓ Hotel: {hotel.nombre}')

        self.stdout.write(self.style.SUCCESS('\n✅ Seed data creado exitosamente!'))
        self.stdout.write('\nCredenciales:')
        self.stdout.write('  Agente:  agente@totemtravel.com / Agente1234!')
        self.stdout.write('  Padre:   padre@test.com / Padre1234!')
        self.stdout.write('  Admin:   admin@tottem.com / (la que creaste)')
        self.stdout.write(f'\nViajes publicados:')
        self.stdout.write(f'  /viajes/{viaje.slug}')
        self.stdout.write(f'  /viajes/{viaje2.slug}')

        # Genera imágenes placeholder para todos los viajes/etapas/hoteles
        # sin imagen (incluye los recién creados). Idempotente.
        self.stdout.write('\nGenerando imágenes placeholder...')
        call_command('generar_imagenes_seed')
