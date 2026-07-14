"""
apps/autenticacion/tests/test_registro.py — Tests de POST /api/v1/auth/registro/

TASK-008 — Añade la suite de tests de autenticación que faltaba (TD-001).

Cobertura:
  - Registro de padre crea Usuario + PadreTutor vacío (D-09).
  - Registro de alumno crea Usuario sin PadreTutor.
  - Comportamiento actual de auto-verificación de email (la vista marca
    email_verificado=True tras el alta — ver RegistroAPIView.post).
  - Rol 'agente' rechazado en registro público (I-03).
  - Contraseña débil rechazada por AUTH_PASSWORD_VALIDATORS.
  - Email duplicado → 400.
  - Campos obligatorios ausentes → 400.
  - Payload sin rol usa el default del serializer (el campo no tiene default → 400).

Estrategia: el envío de email real no se testea (la vista actual no llama
_enviar_verificacion — ver TD-001 / comportamiento de la vista).
"""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.autenticacion.models import PadreTutor, RolUsuario

Usuario = get_user_model()
URL = "/api/v1/auth/registro/"
PASSWORD = "Pass1234!"


def _payload_padre() -> dict:
    return {
        "email": f"padre+{uuid.uuid4().hex[:8]}@test.com",
        "password": PASSWORD,
        "nombre": "Ana",
        "apellidos": "García",
        "rol": RolUsuario.PADRE,
        "telefono": "+51 999 000 111",
    }


class RegistroAPIViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    # ── Caso feliz ─────────────────────────────────────────────────────────────

    def test_registro_padre_crea_usuario_y_padretutor_201(self):
        payload = _payload_padre()
        response = self.client.post(URL, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"mensaje": "Cuenta creada exitosamente."})

        usuario = Usuario.objects.get(email=payload["email"])
        self.assertEqual(usuario.rol, RolUsuario.PADRE)
        self.assertTrue(usuario.check_password(PASSWORD))
        self.assertTrue(Usuario.objects.filter(id=usuario.id).exists())
        self.assertTrue(
            PadreTutor.objects.filter(usuario=usuario).exists(),
            "El registro de un padre debe crear PadreTutor vacío (D-09).",
        )
        padre_tutor = PadreTutor.objects.get(usuario=usuario)
        self.assertEqual(padre_tutor.relacion_alumno, "")
        self.assertEqual(padre_tutor.dni, "")

    def test_registro_alumno_no_crea_padretutor(self):
        payload = _payload_padre()
        payload["email"] = f"alumno+{uuid.uuid4().hex[:8]}@test.com"
        payload["rol"] = RolUsuario.ALUMNO
        response = self.client.post(URL, payload, format="json")

        self.assertEqual(response.status_code, 201)
        usuario = Usuario.objects.get(email=payload["email"])
        self.assertEqual(usuario.rol, RolUsuario.ALUMNO)
        self.assertFalse(PadreTutor.objects.filter(usuario=usuario).exists())

    def test_registro_auto_verifica_email_comportamiento_actual(self):
        """La Vista actual marca email_verificado=True tras el alta.

        DoD: este test documenta el comportamiento REAL. Si se reactiva el flujo
        de email con verificación manual, este test debe actualizarse.
        """
        payload = _payload_padre()
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 201)
        usuario = Usuario.objects.get(email=payload["email"])
        self.assertTrue(usuario.email_verificado)

    def test_registro_telefono_opcional_se_acepta_vacio(self):
        payload = _payload_padre()
        payload["telefono"] = ""
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 201)

    # ── Validaciones ───────────────────────────────────────────────────────────

    def test_registro_rol_agente_rechazado_400(self):
        """I-03: el rol 'agente' solo se crea desde el panel de administración."""
        payload = _payload_padre()
        payload["rol"] = RolUsuario.AGENTE
        response = self.client.post(URL, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("agente", str(response.json().get("rol", "")).lower())
        self.assertFalse(Usuario.objects.filter(email=payload["email"]).exists())

    def test_registro_password_debil_rechazada_400(self):
        payload = _payload_padre()
        payload["password"] = "1234"
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())
        self.assertFalse(Usuario.objects.filter(email=payload["email"]).exists())

    def test_registro_email_duplicado_400(self):
        payload = _payload_padre()
        Usuario.objects.create_user(
            email=payload["email"],
            password=PASSWORD,
            nombre="Otro",
            apellidos="Usuario",
            rol=RolUsuario.PADRE,
        )
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_registro_email_invalido_400(self):
        payload = _payload_padre()
        payload["email"] = "no-es-un-email"
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_registro_campos_obligatorios_faltantes_400(self):
        response = self.client.post(URL, {"email": "x@test.com"}, format="json")
        self.assertEqual(response.status_code, 400)
        for campo in ("password", "nombre", "apellidos", "rol"):
            self.assertIn(campo, response.json())

    def test_registro_rol_invalido_400(self):
        payload = _payload_padre()
        payload["rol"] = "superadmin"
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("rol", response.json())