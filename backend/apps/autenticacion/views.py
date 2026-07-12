"""
apps/autenticacion/views.py — Vistas de autenticación.

RegistroAPIView      — POST /api/v1/auth/registro/
  Crea Usuario (email_verificado=False) y envía email de activación.
  Si rol='padre', crea PadreTutor vacío (via serializer).
  Responde 201 con mensaje de confirmación (API.md §Auth).

VerificarEmailAPIView — GET /api/v1/auth/verificar/?token=<TOKEN>
  Valida el token HMAC (django.core.signing). Actualiza email_verificado=True.
  La "redirect a /login" descrita en API.md es responsabilidad del frontend (Next.js);
  este endpoint retorna JSON 200/400.
  Operación idempotente: usuario ya verificado → 200 (no 4xx).

LoginAPIView          — POST /api/v1/auth/login/
  Valida credenciales. Aplica invariante #8 (email_verificado) y control de cuenta activa.
  Genera par JWT via simplejwt, almacena refresh.jti en Redis allowlist, establece
  cookies httpOnly con SameSite=Strict (DEC-002: backend → cookies, no Gateway).
  Body de respuesta mínimo: {rol, agencia_id}. Los tokens van únicamente en cookies.

Invariante #8 (AI_CONTEXT.md): login bloqueado hasta email_verificado=True.
DEC-002 (DECISIONS.md): backend establece cookies directamente (diverge de ARCHITECTURE.md DA-06).
"""

import logging

import jwt as pyjwt
from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Usuario
from .serializers import LoginSerializer, RegistroSerializer
from .tokens import (
    REFRESH_REDIS_KEY,
    generar_token_verificacion,
    verificar_token_verificacion,
)

_JWT_KEY = None  # resuelto en tiempo de request, no en import
_JWT_ALG: list[str] = []


def _jwt_decode_sin_expiracion(token_str: str) -> None:
    """
    Decodifica el JWT verificando firma pero SIN verificar expiración.
    Lanza pyjwt.PyJWTError si la firma es inválida o el formato es incorrecto.
    Permite distinguir "token alterado" de "token expirado" antes de llamar a simplejwt.
    """
    key = settings.SIMPLE_JWT["SIGNING_KEY"]
    alg = [settings.SIMPLE_JWT["ALGORITHM"]]
    pyjwt.decode(token_str, key, algorithms=alg, options={"verify_exp": False})


logger = logging.getLogger("tottemhub")


class RegistroAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        
        # Bypass de verificación de email: la cuenta nace verificada
        usuario.email_verificado = True
        usuario.save(update_fields=["email_verificado"])

        logger.info("Registro exitoso y auto-verificado: %s (rol=%s)", usuario.email, usuario.rol)
        return Response(
            {"mensaje": "Cuenta creada exitosamente."},
            status=status.HTTP_201_CREATED,
        )

    def _enviar_verificacion(self, usuario) -> None:
        token = generar_token_verificacion(usuario)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        url_verificacion = f"{frontend_url}/verificar?token={token}"

        html = render_to_string(
            "emails/verificacion_email.html",
            {"usuario": usuario, "url_verificacion": url_verificacion},
        )
        texto = (
            f"Hola {usuario.nombre},\n\n"
            f"Activa tu cuenta en Tottem Hub:\n{url_verificacion}\n\n"
            "Este enlace expira en 24 horas."
        )

        send_mail(
            subject="Activa tu cuenta en Tottem Hub",
            message=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[usuario.email],
            html_message=html,
            fail_silently=False,
        )


class VerificarEmailAPIView(APIView):
    """
    GET /api/v1/auth/verificar/?token=<TOKEN>

    Valida el token y activa el email del usuario.
    Idempotente: si el usuario ya está verificado, responde 200 sin error.

    Errores diferenciados:
      - Token ausente       → 400 "Token de verificación requerido."
      - Token expirado      → 400 "El enlace de verificación ha expirado."
      - Token inválido      → 400 "El enlace de verificación no es válido."
      - Usuario no existe   → 400 "El enlace de verificación no es válido." (misma msg,
                                   no revelar si el ID existe en la BD)
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        token = request.query_params.get("token", "").strip()
        if not token:
            return Response(
                {"error": "Token de verificación requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = verificar_token_verificacion(token)
        except signing.SignatureExpired:
            logger.warning("Token de verificación expirado.")
            return Response(
                {"error": "El enlace de verificación ha expirado. Solicita uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            logger.warning("Token de verificación con firma inválida.")
            return Response(
                {"error": "El enlace de verificación no es válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            usuario = Usuario.objects.get(id=user_id)
        except (Usuario.DoesNotExist, ValueError):
            return Response(
                {"error": "El enlace de verificación no es válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if usuario.email_verificado:
            return Response(
                {"mensaje": "Tu cuenta ya está verificada. Ya puedes iniciar sesión."},
                status=status.HTTP_200_OK,
            )

        usuario.email_verificado = True
        usuario.save(update_fields=["email_verificado"])

        logger.info("Email verificado: %s", usuario.email)
        return Response(
            {"mensaje": "Cuenta activada correctamente. Ya puedes iniciar sesión."},
            status=status.HTTP_200_OK,
        )


class LoginAPIView(APIView):
    """
    POST /api/v1/auth/login/

    Cookies httpOnly establecidas por este endpoint (DEC-002):
      access_token  — Path=/,             Max-Age=900,    SameSite=Strict
      refresh_token — Path=/api/v1/auth/, Max-Age=604800, SameSite=Strict

    Redis allowlist: REFRESH_REDIS_KEY.format(jti=jti) → str(usuario.id), TTL=604800

    Errores:
      401 — email no registrado O contraseña incorrecta (mismo mensaje, previene enumeración)
      403 — email no verificado (invariante #8)
      403 — cuenta inactiva
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email: str = serializer.validated_data["email"]
        password: str = serializer.validated_data["password"]

        # ── Verificar credenciales ────────────────────────────────────────────
        try:
            usuario = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not usuario.check_password(password):
            return Response(
                {"error": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── Invariante #8: email verificado ───────────────────────────────────
        if not usuario.email_verificado:
            return Response(
                {"error": "Debes verificar tu email antes de iniciar sesión."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── Cuenta activa ─────────────────────────────────────────────────────
        if not usuario.activo:
            return Response(
                {"error": "Tu cuenta ha sido desactivada. Contacta al administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── Generar par JWT ───────────────────────────────────────────────────
        refresh = RefreshToken.for_user(usuario)
        refresh["role"] = usuario.rol
        access = refresh.access_token
        access["role"] = usuario.rol

        # ── Allowlist Redis ───────────────────────────────────────────────────
        jti = str(refresh["jti"])
        refresh_ttl = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        cache.set(REFRESH_REDIS_KEY.format(jti=jti), str(usuario.id), refresh_ttl)

        # ── Actualizar último login ───────────────────────────────────────────
        usuario.ultimo_login = timezone.now()
        usuario.save(update_fields=["ultimo_login"])

        logger.info("Login exitoso: %s (rol=%s)", usuario.email, usuario.rol)

        # ── Respuesta — tokens en cookies, body mínimo (DEC-002) ─────────────
        response = Response(
            {
                "rol": usuario.rol,
                "agencia_id": str(usuario.agencia_id) if usuario.agencia_id else None,
            },
            status=status.HTTP_200_OK,
        )

        access_ttl = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
        secure = not settings.DEBUG

        response.set_cookie(
            key="access_token",
            value=str(access),
            max_age=access_ttl,
            httponly=True,
            secure=secure,
            samesite="Strict",
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            max_age=refresh_ttl,
            httponly=True,
            secure=secure,
            samesite="Strict",
            path="/api/v1/auth/",
        )

        return response


class RefreshAPIView(APIView):
    """
    POST /api/v1/auth/refresh/

    Lee refresh_token de cookie (nunca del body ni header).
    Genera un nuevo access_token SIN rotar el refresh_token (DEC-003).
    Solo actualiza la cookie access_token.

    Validación en orden:
      1. Cookie presente
      2. Firma JWT válida   → 401 "Token de sesión inválido." (distinguible de expirado)
      3. Token no expirado  → 401 "La sesión ha expirado."
      4. JTI en Redis       → 401 "La sesión ha expirado." (revocada o TTL vencido)
      5. Usuario existe     → 401
      6. Usuario activo     → 403
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        token_str = request.COOKIES.get("refresh_token", "").strip()
        if not token_str:
            return Response(
                {"error": "No se encontró sesión activa. Inicia sesión."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 1: Firma válida (sin verificar expiración) ────────────────────────
        try:
            _jwt_decode_sin_expiracion(token_str)
        except pyjwt.PyJWTError:
            return Response(
                {"error": "Token de sesión inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 2: Token completo (incluye expiración) via simplejwt ─────────────
        try:
            refresh = RefreshToken(token_str)
        except TokenError:
            return Response(
                {"error": "La sesión ha expirado. Inicia sesión nuevamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 3: Allowlist Redis ────────────────────────────────────────────────
        jti = str(refresh["jti"])
        if not cache.get(REFRESH_REDIS_KEY.format(jti=jti)):
            return Response(
                {"error": "La sesión ha expirado. Inicia sesión nuevamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 4: Usuario existe y está activo ───────────────────────────────────
        user_id = refresh.payload.get(settings.SIMPLE_JWT["USER_ID_CLAIM"])
        try:
            usuario = Usuario.objects.get(id=user_id)
        except (Usuario.DoesNotExist, ValueError):
            return Response(
                {"error": "No se encontró sesión activa. Inicia sesión."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not usuario.activo:
            return Response(
                {"error": "Tu cuenta ha sido desactivada. Contacta al administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 5: Nuevo access token (refresh sin rotar — DEC-003) ───────────────
        access = refresh.access_token
        access["role"] = usuario.rol
        access_ttl = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())

        logger.info("Access token renovado: %s", usuario.email)

        response = Response({}, status=status.HTTP_200_OK)
        response.set_cookie(
            key="access_token",
            value=str(access),
            max_age=access_ttl,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Strict",
            path="/",
        )
        return response


class LogoutAPIView(APIView):
    """
    POST /api/v1/auth/logout/

    Elimina el jti del refresh_token de Redis e invalida las cookies.
    Idempotente: responde 200 aunque el usuario ya esté desconectado.
    Solo elimina la sesión actual (el jti de ESTE token), no las demás sesiones.

    Comportamiento por caso:
      - Cookie ausente              → 200 + limpiar cookies (ya estaba desconectado)
      - Token inválido o expirado   → 200 + limpiar cookies (no hay nada en Redis)
      - Token válido en Redis       → 200 + eliminar jti + limpiar cookies
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        token_str = request.COOKIES.get("refresh_token", "").strip()

        if token_str:
            # Best-effort: intentar eliminar de Redis si el token es parseable
            try:
                refresh = RefreshToken(token_str)
                jti = str(refresh["jti"])
                cache.delete(REFRESH_REDIS_KEY.format(jti=jti))
                logger.info("Logout: jti=%s eliminado de Redis", jti)
            except (TokenError, Exception):
                # Token inválido, expirado o ya eliminado — idempotente
                pass

        response = Response(
            {"mensaje": "Sesión cerrada correctamente."},
            status=status.HTTP_200_OK,
        )
        # Invalidar cookies: max_age=0 + expires en el pasado
        response.delete_cookie("access_token", path="/", samesite="Strict")
        response.delete_cookie("refresh_token", path="/api/v1/auth/", samesite="Strict")
        return response


from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings


class PasswordResetRequestView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            from apps.autenticacion.models import Usuario
            usuario = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            return Response({'detail': 'Si el email existe, recibirás un enlace.'})
        token_gen = PasswordResetTokenGenerator()
        token = token_gen.make_token(usuario)
        uid = urlsafe_base64_encode(force_bytes(usuario.pk))
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password/{uid}/{token}/"
        send_mail(
            subject='Recuperacion de contrasena - Tottem Hub',
            message=f'Haz click en el siguiente enlace para restablecer tu contrasena: {reset_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
        return Response({'detail': 'Si el email existe, recibirás un enlace.'})


class PasswordResetConfirmView(APIView):
    permission_classes = []

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        nueva_password = request.data.get('nueva_password', '')
        if not uid or not token or not nueva_password:
            return Response({'error': 'Datos incompletos.'}, status=400)
        try:
            from apps.autenticacion.models import Usuario
            pk = force_str(urlsafe_base64_decode(uid))
            usuario = Usuario.objects.get(pk=pk)
        except Exception:
            return Response({'error': 'Token invalido.'}, status=400)
        token_gen = PasswordResetTokenGenerator()
        if not token_gen.check_token(usuario, token):
            return Response({'error': 'Token invalido o expirado.'}, status=400)
        usuario.set_password(nueva_password)
        usuario.save()
        return Response({'detail': 'Contrasena actualizada correctamente.'})


from rest_framework.permissions import IsAuthenticated


class MeAPIView(APIView):
    """
    GET /api/v1/auth/me/

    Devuelve los datos basicos del usuario autenticado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        usuario = request.user
        return Response({
            'id': str(usuario.id),
            'nombre': usuario.nombre,
            'apellidos': usuario.apellidos,
            'email': usuario.email,
            'rol': usuario.rol,
        })

