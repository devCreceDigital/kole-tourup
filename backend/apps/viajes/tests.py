from datetime import timedelta
from django.db import transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import RolUsuario, Usuario
from apps.viajes.models import EstadoViaje, Itinerario, Viaje


class ViajeSignalTests(TestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(
            nombre="Agencia Test",
            slug="agencia-test",
            email_contacto="contacto@agenciatest.com",
            telefono="123456789",
        )
        self.today = timezone.now().date()
        self.tomorrow = self.today + timedelta(days=1)

    def create_viaje(self, suffix="1"):
        return Viaje.objects.create(
            agencia=self.agencia,
            nombre=f"Viaje {suffix}",
            destino=f"Destino {suffix}",
            fecha_salida=self.today,
            fecha_regreso=self.tomorrow,
            cupo_maximo=10,
            precio_total=100.00,
            estado=EstadoViaje.BORRADOR
        )

    def test_crear_viaje_crea_itinerario(self):
        viaje = self.create_viaje()
        self.assertTrue(Itinerario.objects.filter(viaje=viaje).exists())

    def test_solo_un_itinerario_por_viaje(self):
        viaje = self.create_viaje()
        count = Itinerario.objects.filter(viaje=viaje).count()
        self.assertEqual(count, 1)

    def test_guardar_nuevamente_no_crea_duplicado(self):
        viaje = self.create_viaje()
        itinerario_inicial_id = viaje.itinerario.id
        viaje.nombre = "Viaje Actualizado"
        viaje.save()
        count = Itinerario.objects.filter(viaje=viaje).count()
        self.assertEqual(count, 1)
        self.assertEqual(viaje.itinerario.id, itinerario_inicial_id)

    def test_crear_multiples_viajes(self):
        viajes = [self.create_viaje(str(i)) for i in range(5)]
        for viaje in viajes:
            self.assertEqual(Itinerario.objects.filter(viaje=viaje).count(), 1)
        self.assertEqual(Itinerario.objects.count(), 5)

    def test_signal_dentro_de_transaccion(self):
        with transaction.atomic():
            viaje = self.create_viaje("transaccion")
        self.assertTrue(Itinerario.objects.filter(viaje=viaje).exists())

    def test_no_consultas_innecesarias(self):
        viaje = self.create_viaje("q1")
        with self.assertNumQueries(1):
            viaje.nombre = "Modificado"
            viaje.save(update_fields=['nombre'])


class ViajeEndpointTests(APITestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(
            nombre="Agencia 1", slug="ag1", email_contacto="a@a.com"
        )
        self.agencia2 = Agencia.objects.create(
            nombre="Agencia 2", slug="ag2", email_contacto="b@b.com"
        )
        self.agente = Usuario.objects.create_user(
            email="agente@a.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia, email_verificado=True
        )
        self.agente2 = Usuario.objects.create_user(
            email="agente2@a.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia2, email_verificado=True
        )
        self.padre = Usuario.objects.create_user(
            email="padre@a.com", password="pwd", rol=RolUsuario.PADRE,
            email_verificado=True
        )
        self.alumno = Usuario.objects.create_user(
            email="alumno@a.com", password="pwd", rol=RolUsuario.ALUMNO,
            email_verificado=True
        )
        self.url = reverse('viaje-list-create')
        self.today = timezone.now().date()
        self.tomorrow = self.today + timedelta(days=1)

    def test_get_autenticado_agente(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_devuelve_solo_su_agencia_y_ordenado(self):
        Viaje.objects.create(
            agencia=self.agencia, nombre="V1", destino="D1",
            fecha_salida=self.today + timedelta(days=2),
            fecha_regreso=self.tomorrow + timedelta(days=2),
            cupo_maximo=10, precio_total=100
        )
        Viaje.objects.create(
            agencia=self.agencia, nombre="V2", destino="D2",
            fecha_salida=self.today, fecha_regreso=self.tomorrow,
            cupo_maximo=10, precio_total=100
        )
        Viaje.objects.create(
            agencia=self.agencia2, nombre="V3", destino="D3",
            fecha_salida=self.today, fecha_regreso=self.tomorrow,
            cupo_maximo=10, precio_total=100
        )
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.url)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['nombre'], "V2")
        self.assertEqual(results[1]['nombre'], "V1")

    def test_get_padre_y_alumno_403(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.alumno)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_sin_login_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_valido_201_y_crea_itinerario(self):
        self.client.force_authenticate(user=self.agente)
        data = {
            "nombre": "Nuevo Viaje",
            "destino": "Playa",
            "fecha_salida": self.today.isoformat(),
            "fecha_regreso": self.tomorrow.isoformat(),
            "cupo_maximo": 50,
            "precio_total": "500.00"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        viaje = Viaje.objects.get(id=response.data['id'])
        self.assertEqual(viaje.nombre, "Nuevo Viaje")
        self.assertEqual(viaje.agencia, self.agencia)
        self.assertTrue(Itinerario.objects.filter(viaje=viaje).exists())

    def test_post_ignora_agencia_e_id_cliente(self):
        self.client.force_authenticate(user=self.agente)
        fake_id = "00000000-0000-0000-0000-000000000000"
        data = {
            "id": fake_id,
            "agencia": self.agencia2.id,
            "nombre": "Trampa ID",
            "destino": "IDlandia",
            "fecha_salida": self.today.isoformat(),
            "fecha_regreso": self.tomorrow.isoformat(),
            "cupo_maximo": 10,
            "precio_total": "100.00"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(str(response.data['id']), fake_id)
        viaje = Viaje.objects.get(id=response.data['id'])
        self.assertEqual(viaje.agencia, self.agencia)

    def test_post_valida_fechas(self):
        self.client.force_authenticate(user=self.agente)
        data = {
            "nombre": "Fechas Malas",
            "destino": "Pasado",
            "fecha_salida": self.tomorrow.isoformat(),
            "fecha_regreso": self.today.isoformat(),
            "cupo_maximo": 10,
            "precio_total": "100.00"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_regreso', response.data)


class ViajeDetailEndpointTests(APITestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(
            nombre="Ag1", slug="ag1", email_contacto="a@a.com"
        )
        self.agencia2 = Agencia.objects.create(
            nombre="Ag2", slug="ag2", email_contacto="b@b.com"
        )
        self.agente = Usuario.objects.create_user(
            email="agente@a.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia, email_verificado=True
        )
        self.padre = Usuario.objects.create_user(
            email="padre@a.com", password="pwd", rol=RolUsuario.PADRE,
            email_verificado=True
        )
        self.today = timezone.now().date()
        self.tomorrow = self.today + timedelta(days=1)

        self.viaje_propio = Viaje.objects.create(
            agencia=self.agencia, nombre="V1", destino="D1",
            fecha_salida=self.today, fecha_regreso=self.tomorrow,
            cupo_maximo=10, precio_total=100
        )
        self.viaje_ajeno = Viaje.objects.create(
            agencia=self.agencia2, nombre="V2", destino="D2",
            fecha_salida=self.today, fecha_regreso=self.tomorrow,
            cupo_maximo=10, precio_total=100
        )
        self.url_propio = reverse(
            'viaje-detail', kwargs={'pk': self.viaje_propio.id}
        )
        self.url_ajeno = reverse(
            'viaje-detail', kwargs={'pk': self.viaje_ajeno.id}
        )
        self.url_404 = reverse('viaje-detail', kwargs={'pk': '00000000-0000-0000-0000-000000000000'})  # noqa: E501

    def test_get_detalle_propio(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.url_propio)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], "V1")

    def test_get_detalle_otra_agencia_da_404(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.url_ajeno)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_inexistente_da_404(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.url_404)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_padre_y_anonimo_sin_permisos(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url_propio)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.logout()
        response = self.client.get(self.url_propio)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_nombre(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.patch(self.url_propio, {"nombre": "V1 Update"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.viaje_propio.refresh_from_db()
        self.assertEqual(self.viaje_propio.nombre, "V1 Update")

    def test_patch_multiples_campos(self):
        self.client.force_authenticate(user=self.agente)
        data = {"nombre": "New", "destino": "New Dest", "cupo_maximo": 99}
        response = self.client.patch(self.url_propio, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.viaje_propio.refresh_from_db()
        self.assertEqual(self.viaje_propio.cupo_maximo, 99)

    def test_patch_fechas_invalidas(self):
        self.client.force_authenticate(user=self.agente)
        salida = (self.tomorrow + timedelta(days=2)).isoformat()
        data = {"fecha_salida": salida}
        response = self.client.patch(self.url_propio, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_ignora_agencia_e_id(self):
        self.client.force_authenticate(user=self.agente)
        fake_id = "00000000-0000-0000-0000-000000000000"
        data = {"id": fake_id, "agencia": self.agencia2.id}
        response = self.client.patch(self.url_propio, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(str(response.data['id']), fake_id)
        self.assertEqual(response.data['agencia'], self.agencia.id)

    def test_patch_otra_agencia_da_404(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.patch(self.url_ajeno, {"nombre": "Hack"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_permisos(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.patch(self.url_propio, {"nombre": "Hack"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.logout()
        response = self.client.patch(self.url_propio, {"nombre": "Hack"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_no_crea_nuevo_itinerario(self):
        self.client.force_authenticate(user=self.agente)
        itinerarios_antes = Itinerario.objects.count()
        self.client.patch(self.url_propio, {"nombre": "Trigger"})
        self.assertEqual(Itinerario.objects.count(), itinerarios_antes)
