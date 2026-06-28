"""
config/urls.py â€” Enrutador raÃ­z de la API.

PatrÃ³n base: /api/v1/
Los routers de cada app se registran en sus respectivas TASK.
Health check disponible en TASK-004 para verificar que Django responde.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    """
    GET /health/ â€” Verifica que Django estÃ¡ corriendo.
    Devuelve 200 con estado del servidor.
    No verifica conexiones externas (DB, Redis) â€” eso lo hace /api/v1/health/.
    """
    return JsonResponse({"status": "ok", "service": "tottemhub-backend"})


urlpatterns = [
    # Admin de Django (solo en desarrollo; en producciÃ³n se puede deshabilitar)
    path("admin/", admin.site.urls),

    # Health check bÃ¡sico â€” accesible sin autenticaciÃ³n
    path("health/", health_check, name="health_check"),

    # API v1 â€” los namespaces de cada app se registran aquÃ­ a medida que se implementan:
    path("api/v1/auth/", include("apps.autenticacion.urls")),   # TASK-008
    path("api/v1/viajes/", include("apps.viajes.urls")),
    path("api/v1/alumnos/", include("apps.viajes.alumnos_urls")),
    path("api/v1/inscripciones/", include("apps.inscripciones.urls")),  # TASK-033
    # TASK-036+: path("api/v1/pagos/", include("apps.pagos.urls")),
    # TASK-040+: path("api/v1/documentos/", include("apps.documentos.urls")),
    # TASK-050+: path("api/v1/comunicados/", include("apps.comunicados.urls")),
    # TASK-058+: path("api/v1/notificaciones/", include("apps.notificaciones.urls")),
    path("api/v1/agencias/", include("apps.agencias.urls")),   # TASK-012
    # TASK-055+: path("api/v1/mecenas/", include("apps.mecenas.urls")),
]

