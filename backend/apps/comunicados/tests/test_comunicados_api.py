from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.autenticacion.models import Usuario
from apps.agencias.models import Agencia
from apps.viajes.models import Viaje
from apps.comunicados.models import Comunicado


class ComunicadoAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.agencia = Agencia.objects.create(
            nombre='Test Agencia', email_contacto='agencia@test.com'
        )

        self.agente = Usuario.objects.create_user(
            email='agente@test.com', password='pass123',
            nombre='Agente', rol='agente', agencia=self.agencia
        )

        self.agente2 = Usuario.objects.create_user(
            email='agente2@test.com', password='pass123',
            nombre='Agente2', rol='agente'
        )

        self.padre = Usuario.objects.create_user(
            email='padre@test.com', password='pass123',
            nombre='Padre', rol='padre'
        )

        self.viaje = Viaje.objects.create(
            nombre='Viaje Test', destino='Lima', agencia=self.agencia,
            estado='activo', precio_total=1000.00, cupo_maximo=10,
            fecha_salida='2026-08-01', fecha_regreso='2026-08-10',
        )

        self.url = f'/api/v1/viajes/{self.viaje.id}/comunicados/'

    def test_list_comunicados(self):
        Comunicado.objects.create(
            viaje=self.viaje, autor=self.agente,
            titulo='Comunicado 1', cuerpo='Cuerpo 1'
        )
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_comunicado(self):
        self.client.force_authenticate(user=self.agente)
        data = {'titulo': 'Nuevo', 'cuerpo': 'Contenido del comunicado'}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['titulo'], 'Nuevo')
        self.assertEqual(response.data['enviado_email'], False)

    def test_create_otra_agencia_404(self):
        self.client.force_authenticate(user=self.agente2)
        data = {'titulo': 'Nuevo', 'cuerpo': 'Contenido'}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_otra_agencia_404(self):
        self.client.force_authenticate(user=self.agente2)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requiere_agente(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_autenticado(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
