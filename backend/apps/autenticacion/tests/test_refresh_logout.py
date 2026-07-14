"""
apps/autenticacion/tests/test_refresh_logout.py — Tests de:
  POST /api/v1/auth/refresh/   (TASK-011)
  POST /api/v1/auth/logout/    (TASK-011)

Cobertura:
  Refresh:
    - Sin cookie refresh_token → 401 "No se encontró sesión activa."
    - Token con firma inválida → 401 "Token de sesión inválido."
    - Token válido + jti en Redis → 200 y nueva cookie access_token.
    - jti no presente en Redis (revocado) → 401 "La sesión ha expirado."
    - Usuario inactivo tras emitir el token → 403.

  Logout:
    - Sin cookie → 200 idempotente (la sesión ya estaba cerrada).
    - Con cookie válida → 200 + elimina jti de Redis + limpia cookies.

  Integración:
    - Tras logout, un refresh con el mismo token falla (jti ya no está en Redis).

Estrategia: se hace login previo para obtener un refresh_token real y se copia
la cookie en self.client para los tests de refresh y logout.
"""

import uuid

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.autenticacion.models import RolUsuario, Usuario
from apps.autenticacion.tokens import REFRESH_REDIS_KEY

Usuario = get_user_model()
LOGIN_URL = "/api/v1/auth/login/"
REFRESH_URL = "/api/v1/auth/refresh/"
LOGOUT_URL = "/api/v1/auth/logout/"
PASSWORD = "Pass1234!"


def _usuario(email: str | None = None) -> Usuario:
    return Usuario.objects.create_user(
        email=email or f"user+{uuid.uuid4().hex[:8]}@test.com",
        password=PASSWORD,
        nombre="Ana",
        apellidos="García",
        rol=RolUsuario.PADRE,
        email_verificado=True,
        activo=True,
    )


class RefreshLogoutTests(TestCase):
    def setUp(self):
        self.client = self.client_class()
        self.usuario = _usuario()
        # Login real para obtener un refresh_token válido + jti en Redis.
        resp = self.client.post(
            LOGIN_URL,
            {"email": self.usuario.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, "Setup: el login inicial debe funcionar.")
        self.refresh_token = resp.cookies["refresh_token"].value
        self._keys_to_clean: list[str] = [self._key_for_refresh(self.refresh_token)]

    def tearDown(self):
        for key in self._keys_to_clean:
            cache.delete(key)
        super().tearDown()

    def _key_for_refresh(self, refresh_str: str) -> str:
        jti = str(RefreshToken(refresh_str)["jti"])
        return REFRESH_REDIS_KEY.format(jti=jti)


class RefreshAPIViewTests(RefreshLogoutTests):
    def test_refresh_sin_cookie_401(self):
        # Limpiar cookies del client (setUp dejó la cookie tras login).
        self.client.cookies.clear()
        response = self.client.post(REFRESH_URL, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertIn("sesión activa", response.json()["error"].lower())

    def test_refresh_token_firma_invalida_401(self):
        self.client.cookies.clear()
        self.client.cookies["refresh_token"] = "aaa.bbb.ccc"
        response = self.client.post(REFRESH_URL, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "Token de sesión inválido.")

    def test_refresh_token_valido_renueva_access_cookie_200(self):
        # Cookie de login presente desde el setUp.
        response = self.client.post(REFRESH_URL, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.cookies)
        self.assertEqual(response.cookies["access_token"]["path"], "/")

    def test_refresh_jti_no_en_redis_401(self):
        # Revocar el refresh eliminando su jti de Redis antes de invocar refresh.
        cache.delete(self._key_for_refresh(self.refresh_token))
        response = self.client.post(REFRESH_URL, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertIn("expirado", response.json()["error"].lower())

    def test_refresh_usuario_inactivo_despues_de_emitir_403(self):
        self.usuario.activo = False
        self.usuario.save(update_fields=["activo"])
        response = self.client.post(REFRESH_URL, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertIn("desactivada", response.json()["error"].lower())


class LogoutAPIViewTests(RefreshLogoutTests):
    def test_logout_sin_cookie_200_idempotente(self):
        self.client.cookies.clear()
        response = self.client.post(LOGOUT_URL, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Sesión cerrada", response.json()["mensaje"])

    def test_logout_elimina_jti_de_redis(self):
        # Antes: el jti está en Redis (el login lo dejó).
        self.assertEqual(
            cache.get(self._key_for_refresh(self.refresh_token)),
            str(self.usuario.id),
        )

        response = self.client.post(LOGOUT_URL, format="json")
        self.assertEqual(response.status_code, 200)

        # Después: el jti ya no está en Redis.
        self.assertIsNone(cache.get(self._key_for_refresh(self.refresh_token)))

    def test_logout_limpia_cookies(self):
        response = self.client.post(LOGOUT_URL, format="json")
        self.assertEqual(response.status_code, 200)

        # delete_cookie pone max_age=0 / expires en pasado.
        access = response.cookies.get("access_token")
        refresh = response.cookies.get("refresh_token")
        self.assertIsNotNone(access)
        self.assertIsNotNone(refresh)
        self.assertEqual(access["max-age"], 0)
        self.assertEqual(refresh["max-age"], 0)

    def test_tras_logout_refresh_falla_por_jti_ausente(self):
        logout_response = self.client.post(LOGOUT_URL, format="json")
        self.assertEqual(logout_response.status_code, 200)

        # delete_cookie en la response elimina la cookie del APIClient, así que
        # la reponemos explícitamente para simular un cliente que reenvía el
        # refresh_token (caso de rogue client / cookie persistida).
        self.client.cookies["refresh_token"] = self.refresh_token
        refresh_response = self.client.post(REFRESH_URL, format="json")
        self.assertEqual(refresh_response.status_code, 401)
        self.assertIn("expirado", refresh_response.json()["error"].lower())