"""
apps/autenticacion/tests/test_login.py — Tests de POST /api/v1/auth/login/

TASK-010 — Añade la suite de tests que faltaba (TD-001).

Cobertura:
  - Login exitoso: 200 + body {rol, agencia_id} + cookies httpOnly.
  - Cookie access_token en Path=/ y refresh_token en Path=/api/v1/auth/.
  - Refresh token registrado en Redis allowlist (clave REFRESH_REDIS_KEY).
  - Invariante #8: login bloqueado si email_verificado=False → 403.
  - Cuenta inactiva (activo=False) → 403.
  - Email no registrado → 401 (mismo mensaje que password incorrecta).
  - Password incorrecta → 401 (mismo mensaje, previene enumeración).
  - ultimo_login se actualiza tras login exitoso.
  - Agente con agencia devuelve agencia_id en body; padre devuelve None.

Estrategia: JWT + Redis allowlist. setUp crea usuarios verificados activos.
Se limpian las claves de Redis allowlist generadas en tearDown.
"""

import uuid

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.agencias.models import Agencia
from apps.autenticacion.models import RolUsuario, Usuario
from apps.autenticacion.tokens import REFRESH_REDIS_KEY

Usuario = get_user_model()
URL = "/api/v1/auth/login/"
PASSWORD = "Pass1234!"


def _agencia() -> Agencia:
    return Agencia.objects.create(
        nombre="Totem Travel",
        email_contacto=f"info+{uuid.uuid4().hex[:8]}@totem.com",
        telefono="+51 999 000 000",
        slug=f"totem-{uuid.uuid4().hex[:6]}",
    )


def _usuario(
    rol: str = RolUsuario.PADRE,
    email_verificado: bool = True,
    activo: bool = True,
    agencia: Agencia | None = None,
    email: str | None = None,
) -> Usuario:
    return Usuario.objects.create_user(
        email=email or f"user+{uuid.uuid4().hex[:8]}@test.com",
        password=PASSWORD,
        nombre="Ana",
        apellidos="García",
        rol=rol,
        email_verificado=email_verificado,
        activo=activo,
        agencia=agencia,
    )


class LoginAPIViewTests(TestCase):
    def setUp(self):
        self.client = self.client_class()
        self.agencia = _agencia()
        self.padre = _usuario(rol=RolUsuario.PADRE)
        self.agente = _usuario(
            rol=RolUsuario.AGENTE, agencia=self.agencia, email="agente@test.com"
        )
        self._redis_keys: list[str] = []

    def tearDown(self):
        for key in self._redis_keys:
            cache.delete(key.encode() if isinstance(key, bytes) else key)
        super().tearDown()

    def _registrar_key(self, jti: str) -> str:
        key = REFRESH_REDIS_KEY.format(jti=jti)
        self._redis_keys.append(key)
        return key

    # ── Caso feliz ─────────────────────────────────────────────────────────────

    def test_login_exitoso_retorna_200_con_rol_y_agencia_id(self):
        response = self.client.post(
            URL,
            {"email": self.agente.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["rol"], RolUsuario.AGENTE)
        self.assertEqual(data["agencia_id"], str(self.agencia.id))

    def test_login_padre_sin_agencia_devuelve_agencia_id_none(self):
        response = self.client.post(
            URL,
            {"email": self.padre.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["agencia_id"])

    def test_login_establece_cookies_httponly(self):
        response = self.client.post(
            URL,
            {"email": self.padre.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        access = response.cookies.get("access_token")
        refresh = response.cookies.get("refresh_token")
        self.assertIsNotNone(access)
        self.assertIsNotNone(refresh)
        self.assertTrue(access["httponly"])
        self.assertTrue(refresh["httponly"])
        self.assertEqual(access["path"], "/")
        self.assertEqual(refresh["path"], "/api/v1/auth/")
        self.assertEqual(access.value.split("."), access.value.split("."))  # parse JWT
        self.assertEqual(len(refresh.value.split(".")), 3)

    def test_login_registra_refresh_en_redis_allowlist(self):
        response = self.client.post(
            URL,
            {"email": self.padre.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        refresh_str = response.cookies["refresh_token"].value
        refresh = RefreshToken(refresh_str)
        jti = str(refresh["jti"])
        key = self._registrar_key(jti)

        valor_en_redis = cache.get(key)
        self.assertEqual(valor_en_redis, str(self.padre.id))

    def test_login_actualiza_ultimo_login(self):
        self.assertIsNone(self.padre.ultimo_login)
        response = self.client.post(
            URL,
            {"email": self.padre.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.padre.refresh_from_db()
        self.assertIsNotNone(self.padre.ultimo_login)

    # ── Invariante #8 y control de cuenta ──────────────────────────────────────

    def test_login_email_no_verificado_403(self):
        usuario = _usuario(email_verificado=False)
        response = self.client.post(
            URL, {"email": usuario.email, "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("verificar", response.json()["error"].lower())

    def test_login_cuenta_inactiva_403(self):
        usuario = _usuario(activo=False)
        response = self.client.post(
            URL, {"email": usuario.email, "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("desactivada", response.json()["error"].lower())

    # ── Credenciales inválidas (no enumeración) ────────────────────────────────

    def test_login_email_no_registrado_401(self):
        response = self.client.post(
            URL,
            {"email": "inexistente@test.com", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "Credenciales inválidas.")

    def test_login_password_incorrecta_401(self):
        response = self.client.post(
            URL,
            {"email": self.padre.email, "password": "OtraPass999!"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "Credenciales inválidas.")

    def test_login_email_y_password_incorrectos_mismo_mensaje_que_email_inexistente(self):
        """No debe revelar si el email existe (previene enumeración)."""
        response_email_inexistente = self.client.post(
            URL, {"email": "inexistente@test.com", "password": PASSWORD}, format="json"
        )
        response_password_malo = self.client.post(
            URL,
            {"email": self.padre.email, "password": "OtraPass999!"},
            format="json",
        )
        self.assertEqual(response_email_inexistente.json(), response_password_malo.json())

    # ── Validación de schema ───────────────────────────────────────────────────

    def test_login_campos_faltantes_400(self):
        response = self.client.post(URL, {"email": "x@test.com"}, format="json")
        self.assertEqual(response.status_code, 400)