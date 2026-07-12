"""
apps/autenticacion/urls.py â€” Rutas de autenticaciÃ³n.

Prefijo: /api/v1/auth/ (registrado en config/urls.py)

TASK-008: POST /registro/
TASK-009: GET  /verificar/
TASK-010: POST /login/
TASK-011: POST /refresh/
TASK-011: POST /logout/
"""

from django.urls import path

from .views import LoginAPIView, LogoutAPIView, RefreshAPIView, RegistroAPIView, VerificarEmailAPIView, PasswordResetRequestView, PasswordResetConfirmView, MeAPIView

app_name = "autenticacion"

urlpatterns = [
    path("registro/", RegistroAPIView.as_view(), name="registro"),
    path("verificar/", VerificarEmailAPIView.as_view(), name="verificar"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("refresh/", RefreshAPIView.as_view(), name="refresh"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("me/", MeAPIView.as_view(), name="me"),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]

