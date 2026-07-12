from unittest.mock import patch, PropertyMock
from apps.viajes.models import PlanPago, Cuota, Alumno, EtapaItinerario, Actividad, Hotel, Grupo
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


class PlanPagoEndpointTests(APITestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(nombre="Ag1", slug="ag1", email_contacto="a@a.com")  # noqa: E501
        self.agencia2 = Agencia.objects.create(nombre="Ag2", slug="ag2", email_contacto="b@b.com")  # noqa: E501
        self.agente = Usuario.objects.create_user(
            email="agente@a.com", password="pwd", rol=RolUsuario.AGENTE, agencia=self.agencia, email_verificado=True  # noqa: E501
        )
        self.padre = Usuario.objects.create_user(
            email="padre@a.com", password="pwd", rol=RolUsuario.PADRE, email_verificado=True  # noqa: E501
        )
        self.viaje = Viaje.objects.create(
            agencia=self.agencia, nombre="V1", destino="D1",
            fecha_salida=timezone.now().date(), fecha_regreso=timezone.now().date() + timedelta(days=1),  # noqa: E501
            cupo_maximo=10, precio_total=100
        )
        self.viaje_ajeno = Viaje.objects.create(
            agencia=self.agencia2, nombre="V2", destino="D2",
            fecha_salida=timezone.now().date(), fecha_regreso=timezone.now().date() + timedelta(days=1),  # noqa: E501
            cupo_maximo=10, precio_total=100
        )
        self.url = reverse('viaje-plan-pago', kwargs={'viaje_id': self.viaje.id})  # noqa: E501
        self.url_ajeno = reverse('viaje-plan-pago', kwargs={'viaje_id': self.viaje_ajeno.id})  # noqa: E501

    def test_post_crear_plan(self):
        self.client.force_authenticate(user=self.agente)
        data = {
            "descripcion": "Plan inicial",
            "total_cuotas": 2,
            "cuotas": [
                {"numero_cuota": 1, "descripcion": "Reserva", "importe": 50, "fecha_vencimiento": "2026-08-01"},  # noqa: E501
                {"numero_cuota": 2, "descripcion": "Saldo", "importe": 50, "fecha_vencimiento": "2026-09-01"}  # noqa: E501
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PlanPago.objects.count(), 1)
        self.assertEqual(Cuota.objects.count(), 2)

    def test_post_viaje_ajeno_da_404(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self.url_ajeno, {"total_cuotas": 1, "cuotas": []}, format='json')  # noqa: E501
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_duplicado_bloqueado(self):
        self.client.force_authenticate(user=self.agente)
        PlanPago.objects.create(viaje=self.viaje, total_cuotas=1)
        response = self.client.post(self.url, {"total_cuotas": 1, "cuotas": []}, format='json')  # noqa: E501
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_cuotas_invalidas(self):
        self.client.force_authenticate(user=self.agente)
        data = {
            "total_cuotas": 2,
            "cuotas": [
                {"numero_cuota": 1, "importe": 0, "fecha_vencimiento": "2026-08-01"},  # noqa: E501
                {"numero_cuota": 1, "importe": 50, "fecha_vencimiento": "2026-09-01"}  # noqa: E501
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_plan_pago(self):
        self.client.force_authenticate(user=self.agente)
        plan = PlanPago.objects.create(viaje=self.viaje, total_cuotas=1, descripcion="P1")  # noqa: E501
        Cuota.objects.create(plan_pago=plan, numero_cuota=1, importe=100, fecha_vencimiento="2026-08-01")  # noqa: E501
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['descripcion'], "P1")
        self.assertEqual(len(response.data['cuotas']), 1)

    def test_patch_plan_pago(self):
        self.client.force_authenticate(user=self.agente)
        plan = PlanPago.objects.create(viaje=self.viaje, total_cuotas=1)
        Cuota.objects.create(plan_pago=plan, numero_cuota=1, importe=100, fecha_vencimiento="2026-08-01")  # noqa: E501

        data = {
            "descripcion": "Actualizado",
            "total_cuotas": 1,
            "cuotas": [
                {"numero_cuota": 1, "descripcion": "Reserva actual", "importe": 150, "fecha_vencimiento": "2026-08-01"}  # noqa: E501
            ]
        }
        response = self.client.patch(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.descripcion, "Actualizado")
        self.assertEqual(plan.cuotas.first().importe, 150)

    @patch('apps.viajes.models.PlanPago.tiene_pagos_verificados', new_callable=PropertyMock)  # noqa: E501
    def test_patch_bloqueado_pagos_verificados(self, mock_tiene_pagos):
        mock_tiene_pagos.return_value = True
        self.client.force_authenticate(user=self.agente)
        plan = PlanPago.objects.create(viaje=self.viaje, total_cuotas=1)
        response = self.client.patch(self.url, {"descripcion": "No debería pasar"}, format='json')  # noqa: E501
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        plan.refresh_from_db()
        self.assertNotEqual(plan.descripcion, "No debería pasar")

    def test_permisos(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('apps.viajes.views.PlanPago.objects.filter')
    def test_post_concurrencia_integrity_error(self, mock_filter):
        mock_filter.return_value.exists.return_value = False
        PlanPago.objects.create(viaje=self.viaje, total_cuotas=1)

        self.client.force_authenticate(user=self.agente)
        data = {
            "total_cuotas": 1,
            "cuotas": [
                {"numero_cuota": 1, "descripcion": "Única", "importe": 50, "fecha_vencimiento": "2026-08-01"}  # noqa: E501
            ]
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PlanPago.objects.count(), 1)

    @patch('apps.viajes.serializers.Cuota.objects.bulk_create')
    def test_post_rollback_atomicidad(self, mock_bulk_create):
        mock_bulk_create.side_effect = Exception("Falla simulada en base de datos")  # noqa: E501
        self.client.force_authenticate(user=self.agente)
        data = {
            "total_cuotas": 1,
            "cuotas": [
                {"numero_cuota": 1, "descripcion": "Reserva", "importe": 50, "fecha_vencimiento": "2026-08-01"}  # noqa: E501
            ]
        }
        with self.assertRaises(Exception):
            self.client.post(self.url, data, format='json')

        self.assertEqual(PlanPago.objects.count(), 0)

    def test_patch_conserva_uuid_upsert_elimina(self):
        self.client.force_authenticate(user=self.agente)
        plan = PlanPago.objects.create(viaje=self.viaje, total_cuotas=2)
        cuota1 = Cuota.objects.create(plan_pago=plan, numero_cuota=1, importe=100, fecha_vencimiento="2026-08-01")  # noqa: E501
        cuota2 = Cuota.objects.create(plan_pago=plan, numero_cuota=2, importe=100, fecha_vencimiento="2026-09-01")  # noqa: E501

        cuota1_id = str(cuota1.id)

        data = {
            "total_cuotas": 2,
            "cuotas": [
                {"numero_cuota": 1, "descripcion": "Reserva actualizada", "importe": 150, "fecha_vencimiento": "2026-08-01"},  # noqa: E501
                {"numero_cuota": 3, "descripcion": "Cuota nueva", "importe": 50, "fecha_vencimiento": "2026-10-01"}  # noqa: E501
            ]
        }
        response = self.client.patch(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Cuota.objects.filter(id=cuota2.id).exists())
        self.assertTrue(Cuota.objects.filter(numero_cuota=3).exists())
        self.assertTrue(Cuota.objects.filter(id=cuota1_id).exists())
        self.assertEqual(plan.cuotas.count(), 2)


class AlumnoEndpointTests(APITestCase):
    def setUp(self):
        self.agencia1 = Agencia.objects.create(nombre="Ag1", slug="ag1", email_contacto="a@a.com")  # noqa: E501
        self.agencia2 = Agencia.objects.create(nombre="Ag2", slug="ag2", email_contacto="b@b.com")  # noqa: E501

        self.agente1 = Usuario.objects.create_user(
            email="agente1@a.com", password="pwd", rol=RolUsuario.AGENTE, agencia=self.agencia1, email_verificado=True  # noqa: E501
        )
        self.agente2 = Usuario.objects.create_user(
            email="agente2@a.com", password="pwd", rol=RolUsuario.AGENTE, agencia=self.agencia2, email_verificado=True  # noqa: E501
        )
        self.padre = Usuario.objects.create_user(
            email="padre@a.com", password="pwd", rol=RolUsuario.PADRE, email_verificado=True  # noqa: E501
        )
        self.url = '/api/v1/alumnos/'

    def test_creacion_alumno_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        data = {
            "nombres": "Juan",
            "apellidos": "Pérez",
            "tipo_documento": "DNI",
            "numero_documento": "12345678",
            "fecha_nacimiento": "2010-01-01"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Alumno.objects.count(), 1)
        self.assertEqual(Alumno.objects.first().agencia, self.agencia1)

    def test_duplicado_documento_misma_agencia(self):
        self.client.force_authenticate(user=self.agente1)
        Alumno.objects.create(agencia=self.agencia1, nombres="A", apellidos="B", numero_documento="111", fecha_nacimiento="2010-01-01")  # noqa: E501
        data = {
            "nombres": "C", "apellidos": "D", "numero_documento": "111", "fecha_nacimiento": "2010-01-01"  # noqa: E501
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicado_documento_diferente_agencia(self):
        self.client.force_authenticate(user=self.agente1)
        # Agencia 2 tiene el documento "111"
        Alumno.objects.create(agencia=self.agencia2, nombres="A", apellidos="B", numero_documento="111", fecha_nacimiento="2010-01-01")  # noqa: E501
        data = {
            "nombres": "C", "apellidos": "D", "numero_documento": "111", "fecha_nacimiento": "2010-01-01"  # noqa: E501
        }
        # Agencia 1 debe poder crearlo
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_aislamiento_multi_tenant_y_listado(self):
        Alumno.objects.create(agencia=self.agencia1, nombres="A1", apellidos="B", numero_documento="1", fecha_nacimiento="2010-01-01")  # noqa: E501
        Alumno.objects.create(agencia=self.agencia2, nombres="A2", apellidos="B", numero_documento="2", fecha_nacimiento="2010-01-01")  # noqa: E501

        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            data_list = response.data['results']
        else:
            data_list = response.data

        self.assertEqual(len(data_list), 1)
        self.assertEqual(data_list[0]['nombres'], "A1")

        # Test 404 para ajeno
        ajeno_id = Alumno.objects.get(numero_documento="2").id
        response_detail = self.client.get(f'{self.url}{ajeno_id}/')
        self.assertEqual(response_detail.status_code, status.HTTP_404_NOT_FOUND)  # noqa: E501

    def test_patch_parcial(self):
        self.client.force_authenticate(user=self.agente1)
        alumno = Alumno.objects.create(agencia=self.agencia1, nombres="A", apellidos="B", numero_documento="123", fecha_nacimiento="2010-01-01")  # noqa: E501
        response = self.client.patch(f'{self.url}{alumno.id}/', {"nombres": "Modificado"}, format='json')  # noqa: E501
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alumno.refresh_from_db()
        self.assertEqual(alumno.nombres, "Modificado")
        self.assertEqual(alumno.apellidos, "B")

    def test_acceso_sin_permisos(self):
        # Padre
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Anon
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_validacion_fecha_futura(self):
        self.client.force_authenticate(user=self.agente1)
        data = {
            "nombres": "Juan",
            "apellidos": "Pérez",
            "numero_documento": "12345678",
            "fecha_nacimiento": "2100-01-01"  # Futura
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_nacimiento', response.data)


# ─── TASK-028: API Itinerario ─────────────────────────────────────────────────

class ItinerarioBaseTestCase(APITestCase):
    """Fixture compartido para todos los tests de itinerario."""

    def setUp(self):
        self.agencia1 = Agencia.objects.create(
            nombre="Ag1", slug="ag1", email_contacto="a@a.com"
        )
        self.agencia2 = Agencia.objects.create(
            nombre="Ag2", slug="ag2", email_contacto="b@b.com"
        )
        self.agente1 = Usuario.objects.create_user(
            email="ag1@a.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia1, email_verificado=True
        )
        self.agente2 = Usuario.objects.create_user(
            email="ag2@a.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia2, email_verificado=True
        )
        self.padre = Usuario.objects.create_user(
            email="padre@a.com", password="pwd", rol=RolUsuario.PADRE,
            email_verificado=True
        )
        today = timezone.now().date()
        self.viaje = Viaje.objects.create(
            agencia=self.agencia1, nombre="V1", destino="D1",
            fecha_salida=today, fecha_regreso=today + timedelta(days=3),
            cupo_maximo=10, precio_total=100
        )
        # signal auto-crea el Itinerario al crear el Viaje
        self.itinerario = self.viaje.itinerario
        self.viaje_ajeno = Viaje.objects.create(
            agencia=self.agencia2, nombre="V2", destino="D2",
            fecha_salida=today, fecha_regreso=today + timedelta(days=1),
            cupo_maximo=10, precio_total=100
        )

    def url_itinerario(self, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/itinerario/'

    def url_etapas(self, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/etapas/'

    def url_etapa(self, etapa_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/etapas/{etapa_id}/'

    def url_actividades(self, etapa_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/etapas/{etapa_id}/actividades/'

    def url_actividad(self, etapa_id, actividad_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/etapas/{etapa_id}/actividades/{actividad_id}/'

    def url_reordenar(self, etapa_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/etapas/{etapa_id}/actividades/reordenar/'

    def crear_etapa(self, dia_numero=1, titulo="Día 1"):
        return EtapaItinerario.objects.create(
            itinerario=self.itinerario, dia_numero=dia_numero, titulo=titulo
        )

    def crear_actividad(self, etapa, titulo="Actividad", orden=0):
        return Actividad.objects.create(etapa=etapa, titulo=titulo, orden=orden)


class ItinerarioRetrieveTests(ItinerarioBaseTestCase):

    def test_get_itinerario_vacio(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_itinerario())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['etapas'], [])

    def test_get_itinerario_con_etapas_y_actividades(self):
        etapa = self.crear_etapa(dia_numero=1, titulo="Madrid")
        self.crear_actividad(etapa, titulo="Vuelo", orden=1)
        self.crear_actividad(etapa, titulo="Hotel", orden=2)

        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_itinerario())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['etapas']), 1)
        self.assertEqual(len(response.data['etapas'][0]['actividades']), 2)

    def test_get_itinerario_viaje_ajeno_404(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_itinerario(self.viaje_ajeno.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_itinerario_permisos(self):
        self.client.force_authenticate(user=self.padre)
        r = self.client.get(self.url_itinerario())
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.get(self.url_itinerario())
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class EtapaListCreateTests(ItinerarioBaseTestCase):

    def test_post_etapa_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_etapas(), {"dia_numero": 1, "titulo": "Día 1"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EtapaItinerario.objects.count(), 1)
        self.assertEqual(EtapaItinerario.objects.first().itinerario, self.itinerario)

    def test_get_etapas_lista(self):
        self.crear_etapa(1, "Día 1")
        self.crear_etapa(2, "Día 2")
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_etapas())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_post_etapa_dia_duplicado_400(self):
        self.crear_etapa(dia_numero=1)
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_etapas(), {"dia_numero": 1, "titulo": "Duplicado"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dia_numero', response.data)

    def test_post_etapa_dia_cero_400(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_etapas(), {"dia_numero": 0, "titulo": "Día 0"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_etapa_viaje_ajeno_404(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_etapas(self.viaje_ajeno.id),
            {"dia_numero": 1, "titulo": "Intento"},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(EtapaItinerario.objects.count(), 0)

    def test_post_etapa_permisos(self):
        self.client.force_authenticate(user=self.padre)
        r = self.client.post(self.url_etapas(), {"dia_numero": 1, "titulo": "X"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.post(self.url_etapas(), {"dia_numero": 1, "titulo": "X"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class EtapaDetailTests(ItinerarioBaseTestCase):

    def setUp(self):
        super().setUp()
        self.etapa = self.crear_etapa(dia_numero=1, titulo="Día 1")

    def test_get_etapa_detalle(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_etapa(self.etapa.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['titulo'], "Día 1")

    def test_patch_etapa(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.patch(
            self.url_etapa(self.etapa.id), {"titulo": "Actualizado"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.etapa.refresh_from_db()
        self.assertEqual(self.etapa.titulo, "Actualizado")

    def test_delete_etapa_cascada_actividades(self):
        act = self.crear_actividad(self.etapa)
        self.client.force_authenticate(user=self.agente1)
        response = self.client.delete(self.url_etapa(self.etapa.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EtapaItinerario.objects.filter(id=self.etapa.id).exists())
        self.assertFalse(Actividad.objects.filter(id=act.id).exists())

    def test_operaciones_etapa_ajena_404(self):
        etapa_ajena = EtapaItinerario.objects.create(
            itinerario=self.viaje_ajeno.itinerario, dia_numero=1, titulo="Ajena"
        )
        self.client.force_authenticate(user=self.agente1)
        self.assertEqual(
            self.client.get(self.url_etapa(etapa_ajena.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.patch(self.url_etapa(etapa_ajena.id), {}, format='json').status_code,
            status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(self.url_etapa(etapa_ajena.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )


class ActividadListCreateTests(ItinerarioBaseTestCase):

    def setUp(self):
        super().setUp()
        self.etapa = self.crear_etapa(dia_numero=1)

    def test_post_actividad_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        data = {"titulo": "Vuelo a Madrid", "tipo": "vuelo"}
        response = self.client.post(self.url_actividades(self.etapa.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Actividad.objects.count(), 1)
        self.assertEqual(Actividad.objects.first().etapa, self.etapa)

    def test_get_actividades_lista(self):
        self.crear_actividad(self.etapa, "A1", orden=1)
        self.crear_actividad(self.etapa, "A2", orden=2)
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_actividades(self.etapa.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_post_actividad_etapa_ajena_404(self):
        etapa_ajena = EtapaItinerario.objects.create(
            itinerario=self.viaje_ajeno.itinerario, dia_numero=1, titulo="Ajena"
        )
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_actividades(etapa_ajena.id),
            {"titulo": "Hack"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Actividad.objects.count(), 0)

    def test_post_actividad_permisos(self):
        self.client.force_authenticate(user=self.padre)
        r = self.client.post(self.url_actividades(self.etapa.id), {"titulo": "X"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.post(self.url_actividades(self.etapa.id), {"titulo": "X"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class ActividadDetailTests(ItinerarioBaseTestCase):

    def setUp(self):
        super().setUp()
        self.etapa = self.crear_etapa(dia_numero=1)
        self.actividad = self.crear_actividad(self.etapa, "Vuelo", orden=5)

    def test_get_actividad_detalle(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_actividad(self.etapa.id, self.actividad.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['titulo'], "Vuelo")

    def test_patch_actividad(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.patch(
            self.url_actividad(self.etapa.id, self.actividad.id),
            {"titulo": "Vuelo BIO-MAD"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.actividad.refresh_from_db()
        self.assertEqual(self.actividad.titulo, "Vuelo BIO-MAD")

    def test_patch_orden_ignorado_invariante(self):
        """PATCH individual no debe modificar orden (solo bulk reordenar)."""
        self.client.force_authenticate(user=self.agente1)
        self.client.patch(
            self.url_actividad(self.etapa.id, self.actividad.id),
            {"orden": 99}, format='json'
        )
        self.actividad.refresh_from_db()
        self.assertEqual(self.actividad.orden, 5)

    def test_delete_actividad(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.delete(self.url_actividad(self.etapa.id, self.actividad.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Actividad.objects.filter(id=self.actividad.id).exists())

    def test_operaciones_actividad_ajena_404(self):
        etapa_ajena = EtapaItinerario.objects.create(
            itinerario=self.viaje_ajeno.itinerario, dia_numero=1, titulo="Ajena"
        )
        act_ajena = Actividad.objects.create(etapa=etapa_ajena, titulo="Acto ajeno")
        self.client.force_authenticate(user=self.agente1)
        self.assertEqual(
            self.client.get(self.url_actividad(self.etapa.id, act_ajena.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(self.url_actividad(self.etapa.id, act_ajena.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )


class ActividadBulkReordenarTests(ItinerarioBaseTestCase):

    def setUp(self):
        super().setUp()
        self.etapa = self.crear_etapa(dia_numero=1)
        self.act1 = self.crear_actividad(self.etapa, "A1", orden=1)
        self.act2 = self.crear_actividad(self.etapa, "A2", orden=2)
        self.act3 = self.crear_actividad(self.etapa, "A3", orden=3)

    def test_reordenar_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        data = {
            "actividades": [
                {"id": str(self.act1.id), "orden": 3},
                {"id": str(self.act2.id), "orden": 1},
                {"id": str(self.act3.id), "orden": 2},
            ]
        }
        response = self.client.patch(self.url_reordenar(self.etapa.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.act1.refresh_from_db()
        self.act2.refresh_from_db()
        self.act3.refresh_from_db()
        self.assertEqual(self.act1.orden, 3)
        self.assertEqual(self.act2.orden, 1)
        self.assertEqual(self.act3.orden, 2)

    def test_reordenar_parcial(self):
        """Permite reordenar solo un subconjunto de actividades."""
        self.client.force_authenticate(user=self.agente1)
        data = {"actividades": [{"id": str(self.act1.id), "orden": 99}]}
        response = self.client.patch(self.url_reordenar(self.etapa.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.act1.refresh_from_db()
        self.assertEqual(self.act1.orden, 99)

    def test_reordenar_id_invalido_400(self):
        """ID de actividad que no pertenece a esta etapa → 400."""
        etapa2 = self.crear_etapa(dia_numero=2)
        act_otra_etapa = self.crear_actividad(etapa2, "B1")
        self.client.force_authenticate(user=self.agente1)
        data = {"actividades": [{"id": str(act_otra_etapa.id), "orden": 0}]}
        response = self.client.patch(self.url_reordenar(self.etapa.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reordenar_id_duplicado_400(self):
        """El mismo ID dos veces en el payload → 400."""
        self.client.force_authenticate(user=self.agente1)
        data = {
            "actividades": [
                {"id": str(self.act1.id), "orden": 1},
                {"id": str(self.act1.id), "orden": 2},
            ]
        }
        response = self.client.patch(self.url_reordenar(self.etapa.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reordenar_payload_vacio_400(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.patch(
            self.url_reordenar(self.etapa.id), {"actividades": []}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reordenar_viaje_ajeno_404(self):
        etapa_ajena = EtapaItinerario.objects.create(
            itinerario=self.viaje_ajeno.itinerario, dia_numero=1, titulo="Ajena"
        )
        act = Actividad.objects.create(etapa=etapa_ajena, titulo="X")
        self.client.force_authenticate(user=self.agente1)
        data = {"actividades": [{"id": str(act.id), "orden": 0}]}
        response = self.client.patch(
            self.url_reordenar(etapa_ajena.id, self.viaje_ajeno.id), data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reordenar_permisos(self):
        data = {"actividades": [{"id": str(self.act1.id), "orden": 0}]}
        self.client.force_authenticate(user=self.padre)
        r = self.client.patch(self.url_reordenar(self.etapa.id), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.patch(self.url_reordenar(self.etapa.id), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── TASK-029: API Hoteles + Grupos + Asignación de Alumnos ──────────────────

class HotelGrupoBaseTestCase(APITestCase):
    """Fixture compartido para tests de hoteles y grupos."""

    def setUp(self):
        self.agencia1 = Agencia.objects.create(
            nombre="AgHG1", slug="ag-hg-1", email_contacto="hg1@a.com"
        )
        self.agencia2 = Agencia.objects.create(
            nombre="AgHG2", slug="ag-hg-2", email_contacto="hg2@a.com"
        )
        self.agente1 = Usuario.objects.create_user(
            email="agenthg1@a.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia1, email_verificado=True
        )
        self.padre = Usuario.objects.create_user(
            email="padrehg@a.com", password="pwd", rol=RolUsuario.PADRE,
            email_verificado=True
        )
        today = timezone.now().date()
        self.viaje = Viaje.objects.create(
            agencia=self.agencia1, nombre="VHG1", destino="D1",
            fecha_salida=today, fecha_regreso=today + timedelta(days=3),
            cupo_maximo=10, precio_total=100
        )
        self.viaje_ajeno = Viaje.objects.create(
            agencia=self.agencia2, nombre="VHG2", destino="D2",
            fecha_salida=today, fecha_regreso=today + timedelta(days=1),
            cupo_maximo=10, precio_total=100
        )

    def url_hoteles(self, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/hoteles/'

    def url_hotel(self, hotel_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/hoteles/{hotel_id}/'

    def url_grupos(self, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/grupos/'

    def url_grupo(self, grupo_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/grupos/{grupo_id}/'

    def url_asignar(self, grupo_id, viaje_id=None):
        vid = viaje_id or self.viaje.id
        return f'/api/v1/viajes/{vid}/grupos/{grupo_id}/alumnos/'

    def crear_hotel(self, nombre="Hotel Test"):
        return Hotel.objects.create(viaje=self.viaje, nombre=nombre)

    def crear_grupo(self, nombre="Grupo A", capacidad=None):
        return Grupo.objects.create(viaje=self.viaje, nombre=nombre, capacidad=capacidad)

    def crear_alumno(self, agencia=None, doc="12345678"):
        ag = agencia or self.agencia1
        return Alumno.objects.create(
            agencia=ag, nombres="Juan", apellidos="Pérez",
            numero_documento=doc, fecha_nacimiento="2000-01-01",
        )


class HotelListCreateTests(HotelGrupoBaseTestCase):

    def test_post_hotel_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        data = {"nombre": "Hotel Sol", "descripcion": "Desc", "web_url": ""}
        response = self.client.post(self.url_hoteles(), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Hotel.objects.count(), 1)
        self.assertEqual(Hotel.objects.first().viaje, self.viaje)

    def test_get_hoteles_lista(self):
        self.crear_hotel("H1")
        self.crear_hotel("H2")
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_hoteles())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_post_hotel_viaje_ajeno_404(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_hoteles(self.viaje_ajeno.id), {"nombre": "Hack"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Hotel.objects.count(), 0)

    def test_post_hotel_permisos(self):
        self.client.force_authenticate(user=self.padre)
        r = self.client.post(self.url_hoteles(), {"nombre": "H"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.post(self.url_hoteles(), {"nombre": "H"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class HotelDetailTests(HotelGrupoBaseTestCase):

    def setUp(self):
        super().setUp()
        self.hotel = self.crear_hotel("Gran Hotel")

    def test_get_hotel_detalle(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_hotel(self.hotel.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], "Gran Hotel")

    def test_patch_hotel(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.patch(
            self.url_hotel(self.hotel.id), {"nombre": "Hotel Actualizado"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.hotel.refresh_from_db()
        self.assertEqual(self.hotel.nombre, "Hotel Actualizado")

    def test_delete_hotel(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.delete(self.url_hotel(self.hotel.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Hotel.objects.filter(id=self.hotel.id).exists())

    def test_operaciones_hotel_ajeno_404(self):
        hotel_ajeno = Hotel.objects.create(viaje=self.viaje_ajeno, nombre="Ajeno")
        self.client.force_authenticate(user=self.agente1)
        self.assertEqual(
            self.client.get(self.url_hotel(hotel_ajeno.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(self.url_hotel(hotel_ajeno.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )


class GrupoListCreateTests(HotelGrupoBaseTestCase):

    def test_post_grupo_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        data = {"nombre": "Grupo A", "capacidad": 25}
        response = self.client.post(self.url_grupos(), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Grupo.objects.count(), 1)
        self.assertEqual(Grupo.objects.first().viaje, self.viaje)

    def test_get_grupos_lista(self):
        self.crear_grupo("G1")
        self.crear_grupo("G2")
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_grupos())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_post_grupo_nombre_duplicado_400(self):
        self.crear_grupo("Grupo A")
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_grupos(), {"nombre": "Grupo A"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nombre', response.data)

    def test_post_grupo_viaje_ajeno_404(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.post(
            self.url_grupos(self.viaje_ajeno.id), {"nombre": "Hack"}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_grupo_permisos(self):
        self.client.force_authenticate(user=self.padre)
        r = self.client.post(self.url_grupos(), {"nombre": "G"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.post(self.url_grupos(), {"nombre": "G"}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class GrupoDetailTests(HotelGrupoBaseTestCase):

    def setUp(self):
        super().setUp()
        self.grupo = self.crear_grupo("Grupo A", capacidad=10)

    def test_get_grupo_detalle(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.get(self.url_grupo(self.grupo.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], "Grupo A")
        self.assertEqual(response.data['capacidad'], 10)

    def test_patch_grupo(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.patch(
            self.url_grupo(self.grupo.id), {"capacidad": 20}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.grupo.refresh_from_db()
        self.assertEqual(self.grupo.capacidad, 20)

    def test_delete_grupo(self):
        self.client.force_authenticate(user=self.agente1)
        response = self.client.delete(self.url_grupo(self.grupo.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Grupo.objects.filter(id=self.grupo.id).exists())

    def test_operaciones_grupo_ajeno_404(self):
        grupo_ajeno = Grupo.objects.create(viaje=self.viaje_ajeno, nombre="Ajeno")
        self.client.force_authenticate(user=self.agente1)
        self.assertEqual(
            self.client.get(self.url_grupo(grupo_ajeno.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(self.url_grupo(grupo_ajeno.id)).status_code,
            status.HTTP_404_NOT_FOUND
        )


class GrupoAsignarAlumnosTests(HotelGrupoBaseTestCase):

    def setUp(self):
        super().setUp()
        self.grupo = self.crear_grupo("Grupo A", capacidad=3)
        self.alumno1 = self.crear_alumno(doc="DOC001")
        self.alumno2 = self.crear_alumno(doc="DOC002")
        self.alumno3 = self.crear_alumno(doc="DOC003")

    def test_asignar_alumnos_exitoso(self):
        self.client.force_authenticate(user=self.agente1)
        data = {"alumno_ids": [str(self.alumno1.id), str(self.alumno2.id)]}
        response = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['asignados'], 2)
        self.assertEqual(response.data['total_en_grupo'], 2)
        self.assertEqual(self.grupo.alumnos.count(), 2)

    def test_asignar_alumno_otra_agencia_400(self):
        alumno_ajeno = self.crear_alumno(agencia=self.agencia2, doc="EXT999")
        self.client.force_authenticate(user=self.agente1)
        data = {"alumno_ids": [str(alumno_ajeno.id)]}
        response = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('alumno_ids', response.data)
        self.assertEqual(self.grupo.alumnos.count(), 0)

    def test_capacidad_excedida_400(self):
        self.client.force_authenticate(user=self.agente1)
        data = {
            "alumno_ids": [
                str(self.alumno1.id), str(self.alumno2.id), str(self.alumno3.id),
                str(self.crear_alumno(doc="DOC004").id),
            ]
        }
        response = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('alumno_ids', response.data)
        self.assertEqual(self.grupo.alumnos.count(), 0)

    def test_ids_duplicados_400(self):
        self.client.force_authenticate(user=self.agente1)
        data = {"alumno_ids": [str(self.alumno1.id), str(self.alumno1.id)]}
        response = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_asignar_idempotente_no_excede_capacidad(self):
        """Reasignar un alumno ya en el grupo no consume capacidad extra."""
        self.grupo.alumnos.add(self.alumno1)
        self.client.force_authenticate(user=self.agente1)
        # alumno1 ya está; añadir alumno1 + alumno2 = solo 1 nuevo → capacidad 3, OK
        data = {"alumno_ids": [str(self.alumno1.id), str(self.alumno2.id)]}
        response = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.grupo.alumnos.count(), 2)

    def test_asignar_viaje_ajeno_404(self):
        self.client.force_authenticate(user=self.agente1)
        grupo_ajeno = Grupo.objects.create(viaje=self.viaje_ajeno, nombre="Ajeno")
        data = {"alumno_ids": [str(self.alumno1.id)]}
        response = self.client.post(
            self.url_asignar(grupo_ajeno.id, self.viaje_ajeno.id), data, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_asignar_permisos(self):
        data = {"alumno_ids": [str(self.alumno1.id)]}
        self.client.force_authenticate(user=self.padre)
        r = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        r = self.client.post(self.url_asignar(self.grupo.id), data, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Tests DocumentoRequerido (TASK-030) ───────────────────────────────

class DocumentoRequeridoEndpointTests(APITestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(
            nombre="Agencia Test", slug="agencia-test", email_contacto="a@test.com"
        )
        self.agente = Usuario.objects.create_user(
            email="agente@test.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia, email_verificado=True
        )
        self.padre = Usuario.objects.create_user(
            email="padre@test.com", password="pwd", rol=RolUsuario.PADRE,
            email_verificado=True
        )
        self.viaje = Viaje.objects.create(
            agencia=self.agencia,
            nombre="Viaje Test",
            destino="Destino",
            fecha_salida=timezone.now().date() + timedelta(days=30),
            fecha_regreso=timezone.now().date() + timedelta(days=35),
            cupo_maximo=20,
            precio_total=500.00,
            estado=EstadoViaje.ACTIVO,
        )

    def _url_list(self, viaje_id):
        return reverse('viaje-documentos-requeridos', kwargs={'viaje_id': viaje_id})

    def _url_detail(self, viaje_id, documento_id):
        return reverse('viaje-documento-requerido-detail', kwargs={'viaje_id': viaje_id, 'documento_id': documento_id})

    def test_get_autenticado_ok(self):
        """GET accesible por cualquier autenticado (incluyendo agente de su agencia)."""
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self._url_list(self.viaje.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_get_sin_auth_401(self):
        response = self.client.get(self._url_list(self.viaje.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_solo_agente(self):
        """POST solo permitido para agente."""
        self.client.force_authenticate(user=self.padre)
        response = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'DNI', 'obligatorio': True, 'formatos_permitidos': 'pdf,jpg'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_agente_crea_documento(self):
        """Agente puede crear documento requerido."""
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'DNI Alumno',
            'descripcion': 'Documento de identidad',
            'obligatorio': True,
            'formatos_permitidos': 'pdf,jpg,png'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'DNI Alumno')
        self.assertTrue(response.data['obligatorio'])
        self.assertIn('formatos_lista', response.data)
        self.assertEqual(response.data['formatos_lista'], ['pdf', 'jpg', 'png'])

    def test_patch_solo_agente(self):
        """PATCH solo permitido para agente."""
        # Crear documento como agente
        self.client.force_authenticate(user=self.agente)
        create_resp = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'Original', 'obligatorio': True, 'formatos_permitidos': 'pdf'
        })
        doc_id = create_resp.data['id']

        # Intentar PATCH como padre
        self.client.force_authenticate(user=self.padre)
        response = self.client.patch(self._url_detail(self.viaje.id, doc_id), {'nombre': 'Modificado'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_agente_actualiza(self):
        """Agente puede actualizar parcialmente."""
        self.client.force_authenticate(user=self.agente)
        create_resp = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'Original', 'obligatorio': True, 'formatos_permitidos': 'pdf'
        })
        doc_id = create_resp.data['id']

        response = self.client.patch(self._url_detail(self.viaje.id, doc_id), {
            'nombre': 'Actualizado', 'obligatorio': False
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Actualizado')
        self.assertFalse(response.data['obligatorio'])

    def test_delete_solo_agente(self):
        """DELETE solo permitido para agente."""
        self.client.force_authenticate(user=self.agente)
        create_resp = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'Para Borrar', 'obligatorio': True, 'formatos_permitidos': 'pdf'
        })
        doc_id = create_resp.data['id']

        # Padre no puede borrar
        self.client.force_authenticate(user=self.padre)
        response = self.client.delete(self._url_detail(self.viaje.id, doc_id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Agente sí puede borrar
        self.client.force_authenticate(user=self.agente)
        response = self.client.delete(self._url_detail(self.viaje.id, doc_id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_get_detail_autenticado(self):
        """GET detail accesible por autenticado (agente de la misma agencia)."""
        self.client.force_authenticate(user=self.agente)
        create_resp = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'DNI', 'obligatorio': True, 'formatos_permitidos': 'pdf'
        })
        doc_id = create_resp.data['id']

        response = self.client.get(self._url_detail(self.viaje.id, doc_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'DNI')

    def test_viaje_ajeno_404(self):
        """Acceso a documento de viaje de otra agencia da 404."""
        otra_agencia = Agencia.objects.create(
            nombre="Otra", slug="otra", email_contacto="otra@test.com"
        )
        agente_otro = Usuario.objects.create_user(
            email="otro@test.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=otra_agencia, email_verificado=True
        )
        viaje_ajeno = Viaje.objects.create(
            agencia=otra_agencia, nombre="Ajeno", destino="X",
            fecha_salida=timezone.now().date() + timedelta(days=10),
            fecha_regreso=timezone.now().date() + timedelta(days=15),
            cupo_maximo=10, precio_total=100, estado=EstadoViaje.ACTIVO
        )

        # Crear documento con agente ajeno
        self.client.force_authenticate(user=agente_otro)
        create_resp = self.client.post(self._url_list(viaje_ajeno.id), {
            'nombre': 'Doc Ajeno', 'obligatorio': True, 'formatos_permitidos': 'pdf'
        })
        doc_id = create_resp.data['id']

        # Nuestro agente intenta acceder
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self._url_detail(viaje_ajeno.id, doc_id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_formatos_lista_serializado(self):
        """formatos_permitidos se serializa como lista."""
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url_list(self.viaje.id), {
            'nombre': 'Doc', 'obligatorio': True, 'formatos_permitidos': 'pdf, jpg, png'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['formatos_lista'], ['pdf', 'jpg', 'png'])


class ViajeEstadoTransicionTests(APITestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(
            nombre="Agencia Test", slug="agencia-test", email_contacto="a@a.com"
        )
        self.agente = Usuario.objects.create_user(
            email="agente@test.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=self.agencia, email_verificado=True
        )
        self.padre = Usuario.objects.create_user(
            email="padre@test.com", password="pwd", rol=RolUsuario.PADRE,
            email_verificado=True
        )
        self.today = timezone.now().date()

    def _crear_viaje(self, estado=EstadoViaje.BORRADOR):
        return Viaje.objects.create(
            agencia=self.agencia, nombre="Viaje Test", destino="Destino",
            fecha_salida=self.today, fecha_regreso=self.today + timedelta(days=5),
            cupo_maximo=10, precio_total=100, estado=estado
        )

    def _url(self, viaje_id):
        return reverse('viaje-cambiar-estado', kwargs={'pk': viaje_id})

    # --- Transiciones válidas ---

    def test_borrador_a_activo(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'activo'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.ACTIVO)

    def test_activo_a_cerrado(self):
        viaje = self._crear_viaje(EstadoViaje.ACTIVO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'cerrado'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.CERRADO)

    def test_cerrado_a_archivado(self):
        viaje = self._crear_viaje(EstadoViaje.CERRADO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'archivado'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.ARCHIVADO)

    # --- Transiciones inválidas (backtracking) ---

    def test_activo_no_vuelve_a_borrador(self):
        viaje = self._crear_viaje(EstadoViaje.ACTIVO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'borrador'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.ACTIVO)

    def test_cerrado_no_vuelve_a_activo(self):
        viaje = self._crear_viaje(EstadoViaje.CERRADO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'activo'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.CERRADO)

    def test_archivado_no_cambia(self):
        viaje = self._crear_viaje(EstadoViaje.ARCHIVADO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'cerrado'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.ARCHIVADO)

    def test_archivado_no_vuelve_a_activo(self):
        viaje = self._crear_viaje(EstadoViaje.ARCHIVADO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'activo'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Transiciones salteadas ---

    def test_borrador_no_salta_a_cerrado(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'cerrado'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_borrador_no_salta_a_archivado(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'archivado'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activo_no_salta_a_archivado(self):
        viaje = self._crear_viaje(EstadoViaje.ACTIVO)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'archivado'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Permisos ---

    def test_cambio_estado_sin_login_401(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        response = self.client.post(self._url(viaje.id), {'estado': 'activo'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cambio_estado_padre_403(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        self.client.force_authenticate(user=self.padre)
        response = self.client.post(self._url(viaje.id), {'estado': 'activo'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cambio_estado_viaje_ajeno_404(self):
        otra_agencia = Agencia.objects.create(
            nombre="Otra", slug="otra", email_contacto="otra@test.com"
        )
        agente_otro = Usuario.objects.create_user(
            email="otro@test.com", password="pwd", rol=RolUsuario.AGENTE,
            agencia=otra_agencia, email_verificado=True
        )
        viaje_ajeno = Viaje.objects.create(
            agencia=otra_agencia, nombre="Ajeno", destino="X",
            fecha_salida=self.today, fecha_regreso=self.today + timedelta(days=5),
            cupo_maximo=10, precio_total=100, estado=EstadoViaje.BORRADOR
        )
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje_ajeno.id), {'estado': 'activo'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_estado_invalido_400(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        self.client.force_authenticate(user=self.agente)
        response = self.client.post(self._url(viaje.id), {'estado': 'inexistente'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Modelo: método cambiar_estado directamente ---

    def test_cambiar_estado_modelo_valido(self):
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        viaje.cambiar_estado(EstadoViaje.ACTIVO, usuario=self.agente)
        viaje.refresh_from_db()
        self.assertEqual(viaje.estado, EstadoViaje.ACTIVO)

    def test_cambiar_estado_modelo_invalido(self):
        viaje = self._crear_viaje(EstadoViaje.ACTIVO)
        with self.assertRaises(Exception):
            viaje.cambiar_estado(EstadoViaje.BORRADOR)

    def test_cambiar_estado_modelo_mismo_estado(self):
        """Cambiar al mismo estado no debe fallar."""
        viaje = self._crear_viaje(EstadoViaje.BORRADOR)
        viaje.cambiar_estado(EstadoViaje.BORRADOR)
        self.assertEqual(viaje.estado, EstadoViaje.BORRADOR)
