"""
apps/autenticacion/tests/test_verificacion.py — Tests de GET /api/v1/auth/verificar/

TASK-009 — Añade la suite de tests que faltaba (TD-001).

Cobertura:
  - Token ausente → 400 "Token de verificación requerido."
  - Token con firma inválida → 400 "no es válido."
  - Token válido de un usuario NO verificado → 200, marca email_verificado=True.
  - Idempotencia: token válido de usuario ya verificado → 200 (no error).
  - Token que referencia usuario inexistente → 400 "no es válido."
  - Token de un usuario no debe verificar a otro (no confunde IDs).

Estrategia: se generan tokens con generar_token_verificacion() directamente
(sin pasar por el endpoint de registro, que actualmente auto-verifica).
"""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.autenticacion.models import RolUsuario
from apps.autenticacion.tokens import generar_token_verificacion

Usuario = get_user_model()
URL = "/api/v1/auth/verificar/"


def _crear_usuario_no_verificado(email: str | None = None) -> Usuario:
    return Usuario.objects.create_user(
        email=email or f"tutor+{uuid.uuid4().hex[:8]}@test.com",
        password="Pass1234!",
        nombre="Ana",
        apellidos="García",
        rol=RolUsuario.PADRE,
        email_verificado=False,
    )


class VerificarEmailAPIViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario_no_verificado = _crear_usuario_no_verificado()

    # ── Errores ────────────────────────────────────────────────────────────────

    def test_verificar_sin_token_400(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Token de verificación requerido.")

    def test_verificar_token_vacio_400(self):
        response = self.client.get(URL, {"token": "   "})
        self.assertEqual(response.status_code, 400)

    def test_verificar_token_firma_invalida_400(self):
        response = self.client.get(URL, {"token": "esto-no-es-un-token-firmado"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("no es válido", response.json()["error"])

    def test_verificar_token_usuario_inexistente_400(self):
        # Token firmado correctamente pero con un UUID inexistente.
        from django.core import signing

        token = signing.dumps(str(uuid.uuid4()), salt="email-verificacion-tottemhub")
        response = self.client.get(URL, {"token": token})
        self.assertEqual(response.status_code, 400)
        self.assertIn("no es válido", response.json()["error"])

    # ── Caso feliz ─────────────────────────────────────────────────────────────

    def test_verificar_token_valido_marca_email_verificado_200(self):
        token = generar_token_verificacion(self.usuario_no_verificado)
        response = self.client.get(URL, {"token": token})

        self.assertEqual(response.status_code, 200)
        self.usuario_no_verificado.refresh_from_db()
        self.assertTrue(self.usuario_no_verificado.email_verificado)

    def test_verificar_idempotente_usuario_ya_verificado_200(self):
        self.usuario_no_verificado.email_verificado = True
        self.usuario_no_verificado.save(update_fields=["email_verificado"])

        token = generar_token_verificacion(self.usuario_no_verificado)
        response = self.client.get(URL, {"token": token})

        self.assertEqual(response.status_code, 200)
        self.assertIn("ya está verificada", response.json()["mensaje"])

    def test_verificar_token_de_usuario_a_no_verifica_a_usuario_b(self):
        usuario_b = _crear_usuario_no_verificado(
            email=f"b+{uuid.uuid4().hex[:8]}@test.com"
        )
        token_b = generar_token_verificacion(usuario_b)

        # Verificamos con token de B pero B sigue siendo B; aquí validamos que
        # A permanece NO verificado (no se verifica "a ciegas" otro usuario).
        response = self.client.get(URL, {"token": token_b})
        self.assertEqual(response.status_code, 200)

        self.usuario_no_verificado.refresh_from_db()
        self.assertFalse(self.usuario_no_verificado.email_verificado)
        usuario_b.refresh_from_db()
        self.assertTrue(usuario_b.email_verificado)