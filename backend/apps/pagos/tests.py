import io
import tempfile
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from apps.autenticacion.models import Usuario
from apps.agencias.models import Agencia
from apps.viajes.models import Viaje
from apps.inscripciones.models import Alumno, Inscripcion
from .models import Pago

TEMP_MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class PagoAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.agencia = Agencia.objects.create(
            nombre='Test Agencia', email_contacto='agencia@test.com'
        )

        self.agente = Usuario.objects.create_user(
            email='agente@test.com', password='pass123',
            nombre='Agente', rol='agente', agencia=self.agencia
        )

        self.padre = Usuario.objects.create_user(
            email='padre@test.com', password='pass123',
            nombre='Padre', rol='padre'
        )

        self.padre2 = Usuario.objects.create_user(
            email='padre2@test.com', password='pass123',
            nombre='Padre2', rol='padre'
        )

        from apps.autenticacion.models import PadreTutor
        self.tutor = PadreTutor.objects.create(usuario=self.padre)
        self.tutor2 = PadreTutor.objects.create(usuario=self.padre2)

        self.viaje = Viaje.objects.create(
            nombre='Viaje Test', destino='Lima', agencia=self.agencia,
            estado='activo', precio_total=1000.00, cupo_maximo=10,
            fecha_salida='2026-08-01', fecha_regreso='2026-08-10',
        )

        self.alumno = Alumno.objects.create(
            nombre='Juan', apellidos='Perez', dni='12345678',
            fecha_nacimiento='2010-05-15',
        )
        self.alumno.tutores.add(self.tutor)

        self.inscripcion = Inscripcion.objects.create(
            alumno=self.alumno, viaje=self.viaje, padre_tutor=self.tutor,
            precio_final=1000.00, estado='pendiente',
        )

        self.alumno2 = Alumno.objects.create(
            nombre='Maria', apellidos='Lopez', dni='87654321',
            fecha_nacimiento='2011-03-20',
        )
        self.alumno2.tutores.add(self.tutor2)

        self.inscripcion2 = Inscripcion.objects.create(
            alumno=self.alumno2, viaje=self.viaje, padre_tutor=self.tutor2,
            precio_final=500.00, estado='pendiente',
        )

        self.pago_pendiente = Pago.objects.create(
            inscripcion=self.inscripcion, importe=500.00,
            fecha_pago='2026-06-01', metodo_pago='transferencia',
            pagado_por=self.padre, registrado_por=self.padre,
            estado='pendiente',
        )

        self.pago_verificado = Pago.objects.create(
            inscripcion=self.inscripcion, importe=300.00,
            fecha_pago='2026-05-01', metodo_pago='efectivo',
            pagado_por=self.padre, registrado_por=self.agente,
            estado='verificado',
        )

        self.list_url = '/api/v1/pagos/'

    def _crear_pdf_valido(self):
        return SimpleUploadedFile(
            'comprobante.pdf',
            b'%PDF-1.4 fake pdf content',
            content_type='application/pdf'
        )

    def test_list_pagos_padre(self):
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_pagos_agente(self):
        self.client.force_authenticate(user=self.agente)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_pagos_padre_no_ve_otros(self):
        self.client.force_authenticate(user=self.padre2)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_pago(self):
        self.client.force_authenticate(user=self.padre)
        data = {
            'inscripcion': str(self.inscripcion.id),
            'importe': 200.00,
            'fecha_pago': '2026-07-01',
            'metodo_pago': 'transferencia',
            'comprobante': self._crear_pdf_valido(),
        }
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'pendiente')
        self.assertEqual(str(response.data['pagado_por']), str(self.padre.id))

    def test_create_pago_importe_invalido(self):
        self.client.force_authenticate(user=self.padre)
        data = {
            'inscripcion': str(self.inscripcion.id),
            'importe': 0,
            'fecha_pago': '2026-07-01',
            'metodo_pago': 'transferencia',
        }
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_pago_archivo_invalido(self):
        self.client.force_authenticate(user=self.padre)
        data = {
            'inscripcion': str(self.inscripcion.id),
            'importe': 200.00,
            'fecha_pago': '2026-07-01',
            'metodo_pago': 'transferencia',
            'comprobante': SimpleUploadedFile('malo.exe', b'falso', content_type='application/x-msdownload'),
        }
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verificar_pago(self):
        self.client.force_authenticate(user=self.agente)
        url = f'{self.list_url}{self.pago_pendiente.id}/'
        response = self.client.patch(url, {'estado': 'verificado'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'verificado')

    def test_rechazar_pago(self):
        self.client.force_authenticate(user=self.agente)
        url = f'{self.list_url}{self.pago_pendiente.id}/'
        response = self.client.patch(url, {'estado': 'rechazado', 'notas': 'Comprobante ilegible'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'rechazado')

    def test_patch_estado_invalido(self):
        self.client.force_authenticate(user=self.agente)
        url = f'{self.list_url}{self.pago_pendiente.id}/'
        response = self.client.patch(url, {'estado': 'pendiente'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_requiere_agente(self):
        self.client.force_authenticate(user=self.padre)
        url = f'{self.list_url}{self.pago_pendiente.id}/'
        response = self.client.patch(url, {'estado': 'verificado'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_autenticado(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PagoAdminTest(TestCase):
    def test_estado_en_readonly_fields(self):
        from django.contrib.admin.sites import AdminSite
        from apps.pagos.admin import PagoAdmin
        from apps.pagos.models import Pago
        model_admin = PagoAdmin(Pago, AdminSite())
        self.assertIn(
            'estado', model_admin.readonly_fields,
            'estado debe estar en readonly_fields para forzar cambios solo por PATCH API'
        )
