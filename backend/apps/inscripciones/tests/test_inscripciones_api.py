from django.test import TestCase
from apps.agencias.models import Agencia
from apps.viajes.models import Viaje
from apps.autenticacion.models import Usuario, PadreTutor
from apps.inscripciones.models import Alumno, Inscripcion
from apps.inscripciones.serializers import InscripcionCreateSerializer

class InscripcionWizardTestCase(TestCase):
    def setUp(self):
        self.agencia = Agencia.objects.create(
            nombre="Totem Travel Test",
            email_contacto="contacto@totemtest.com",
            slug="totem-test"
        )
        self.viaje = Viaje.objects.create(
            agencia=self.agencia,
            nombre="Viaje Escolar Cusco",
            destino="Cusco",
            fecha_salida="2026-10-10",
            fecha_regreso="2026-10-15",
            cupo_maximo=10,
            precio_total=1200.00,
            estado="activo",
            colegio="Colegio San Agustin",
            nivel_educativo="secundaria",
            grado="5to"
        )
        self.user = Usuario.objects.create_user(
            email="padre@test.com",
            password="password123",
            nombre="Carlos",
            apellidos="Abarca",
            rol="padre",
            agencia=self.agencia
        )
        self.padre_tutor = PadreTutor.objects.create(
            usuario=self.user,
            dni="12345678",
            relacion_alumno="padre"
        )

    def test_create_inscripcion_with_wizard_fields(self):
        payload = {
            "viaje_id": str(self.viaje.id),
            "alumno": {
                "nombre": "Juan",
                "apellidos": "Abarca",
                "dni": "87654321",
                "fecha_nacimiento": "2012-05-15",
                "genero": "masculino",
                "colegio": "Colegio San Agustin",
                "departamento": "Lima",
                "nivel_educativo": "secundaria",
                "grado": "5to",
                "necesidades_especiales": "Ninguna",
                "nombre_tutor_legal": "Carlos Abarca",
                "telefono_emergencia": "999888777",
                "alergeno_gluten": True,
                "alergeno_crustaceos": False,
                "alergeno_huevos": True,
                "alergeno_pescado": False
            }
        }
        
        serializer = InscripcionCreateSerializer(
            data=payload,
            context={"padre_tutor": self.padre_tutor}
        )
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
        inscripcion = serializer.save()
        
        # Verify Alumno fields
        alumno = inscripcion.alumno
        self.assertEqual(alumno.nombre, "Juan")
        self.assertEqual(alumno.genero, "masculino")
        self.assertEqual(alumno.colegio, "Colegio San Agustin")
        self.assertEqual(alumno.departamento, "Lima")
        self.assertEqual(alumno.nivel_educativo, "secundaria")
        self.assertEqual(alumno.grado, "5to")
        self.assertTrue(alumno.alergeno_gluten)
        self.assertFalse(alumno.alergeno_crustaceos)
        self.assertTrue(alumno.alergeno_huevos)
        
        # Verify Inscripcion fields
        self.assertEqual(inscripcion.genero, "masculino")
        self.assertEqual(inscripcion.colegio, "Colegio San Agustin")
        self.assertEqual(inscripcion.departamento, "Lima")
        self.assertEqual(inscripcion.nivel_educativo, "secundaria")
        self.assertEqual(inscripcion.grado, "5to")
        self.assertTrue(inscripcion.alergeno_gluten)
        self.assertFalse(inscripcion.alergeno_crustaceos)
        self.assertTrue(inscripcion.alergeno_huevos)
