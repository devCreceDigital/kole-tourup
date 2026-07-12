import io
import tempfile
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from apps.autenticacion.models import Usuario
from apps.agencias.models import Agencia
from apps.viajes.models import Viaje, DocumentoRequerido
from apps.inscripciones.models import Alumno, Inscripcion
from .models import DocumentoEntregado

TEMP_MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class DocumentoEntregadoAPITestCase(TestCase):
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

        from apps.autenticacion.models import PadreTutor
        self.tutor = PadreTutor.objects.create(usuario=self.padre)

        self.viaje = Viaje.objects.create(
            nombre='Viaje Test', destino='Lima', agencia=self.agencia,
            estado='activo', precio_total=1000.00, cupo_maximo=10,
            fecha_salida='2026-08-01', fecha_regreso='2026-08-10',
        )

        self.doc_requerido = DocumentoRequerido.objects.create(
            viaje=self.viaje, nombre='DNI', obligatorio=True
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

        self.url = '/api/v1/documentos/'

    def _crear_pdf(self):
        return SimpleUploadedFile(
            'documento.pdf', b'%PDF-1.4 fake content',
            content_type='application/pdf'
        )

    def test_create_documento(self):
        self.client.force_authenticate(user=self.padre)
        data = {
            'inscripcion': str(self.inscripcion.id),
            'documento_requerido': str(self.doc_requerido.id),
            'archivo': self._crear_pdf(),
        }
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'pendiente')
        self.assertEqual(response.data['nombre_archivo'], 'documento.pdf')

    def test_create_documento_archivo_invalido(self):
        self.client.force_authenticate(user=self.padre)
        data = {
            'inscripcion': str(self.inscripcion.id),
            'documento_requerido': str(self.doc_requerido.id),
            'archivo': SimpleUploadedFile('malo.exe', b'falso', content_type='application/x-msdownload'),
        }
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_documentos_padre(self):
        DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion, documento_requerido=self.doc_requerido,
            archivo=self._crear_pdf(), nombre_archivo='doc.pdf', tamano_bytes=100,
        )
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_documentos_filtro_estado(self):
        DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion, documento_requerido=self.doc_requerido,
            archivo=self._crear_pdf(), nombre_archivo='doc.pdf', tamano_bytes=100,
            estado='validado',
        )
        self.client.force_authenticate(user=self.padre)
        response = self.client.get(self.url + '?estado=pendiente')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_validar_documento(self):
        doc = DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion, documento_requerido=self.doc_requerido,
            archivo=self._crear_pdf(), nombre_archivo='doc.pdf', tamano_bytes=100,
        )
        self.client.force_authenticate(user=self.agente)
        url = f'{self.url}{doc.id}/'
        response = self.client.patch(url, {'estado': 'validado'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'validado')
        self.assertIsNotNone(response.data['fecha_validacion'])

    def test_rechazar_documento(self):
        doc = DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion, documento_requerido=self.doc_requerido,
            archivo=self._crear_pdf(), nombre_archivo='doc.pdf', tamano_bytes=100,
        )
        self.client.force_authenticate(user=self.agente)
        url = f'{self.url}{doc.id}/'
        response = self.client.patch(
            url, {'estado': 'rechazado', 'motivo_rechazo': 'Ilegible'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'rechazado')
        self.assertEqual(response.data['motivo_rechazo'], 'Ilegible')

    def test_rechazar_sin_motivo_error(self):
        doc = DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion, documento_requerido=self.doc_requerido,
            archivo=self._crear_pdf(), nombre_archivo='doc.pdf', tamano_bytes=100,
        )
        self.client.force_authenticate(user=self.agente)
        url = f'{self.url}{doc.id}/'
        response = self.client.patch(url, {'estado': 'rechazado'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_requiere_agente(self):
        doc = DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion, documento_requerido=self.doc_requerido,
            archivo=self._crear_pdf(), nombre_archivo='doc.pdf', tamano_bytes=100,
        )
        self.client.force_authenticate(user=self.padre)
        url = f'{self.url}{doc.id}/'
        response = self.client.patch(url, {'estado': 'validado'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_autenticado(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
