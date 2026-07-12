from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.autenticacion.models import Usuario
from .models import Notificacion, PreferenciasNotificacion


class NotificacionAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.agencia_user = Usuario.objects.create_user(
            email='agente@test.com', password='pass123',
            nombre='Agente', rol='agente'
        )

        self.padre = Usuario.objects.create_user(
            email='padre@test.com', password='pass123',
            nombre='Padre', rol='padre'
        )

        self.notificacion = Notificacion.objects.create(
            usuario=self.padre, tipo='comunicado',
            titulo='Test', mensaje='Mensaje de prueba',
        )

        self.url = '/api/v1/notificaciones/'

    def test_list_notificaciones(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_solo_no_leidas(self):
        Notificacion.objects.create(
            usuario=self.padre, tipo='recordatorio',
            titulo='Leida', mensaje='Ya leida', leida=True,
        )
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url + '?leida=false')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_no_ve_otro_usuario(self):
        self.client.force_authenticate(user=self.agencia_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_marcar_leida(self):
        self.client.force_authenticate(user=self.padre)
        url = f'{self.url}{self.notificacion.id}/'
        response = self.client.patch(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['leida'])

    def test_marcar_todas(self):
        Notificacion.objects.create(
            usuario=self.padre, tipo='recordatorio',
            titulo='Otra', mensaje='No leida',
        )
        self.client.force_authenticate(user=self.padre)
        response = self.client.post(self.url + 'marcar-todas/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notificacion.objects.filter(usuario=self.padre, leida=False).count(), 0)

    def test_preferencias_get(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url + 'preferencias/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['canal_preferido'], 'email')

    def test_preferencias_patch(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.patch(
            self.url + 'preferencias/',
            {'canal_preferido': 'ninguno'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['canal_preferido'], 'ninguno')

    def test_no_autenticado(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
