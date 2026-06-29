from django.contrib import admin
from django.urls import include
from django.http import JsonResponse
from django.urls import include, path

def health_check(request):
    return JsonResponse({"status": "ok", "service": "tottemhub-backend"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health_check"),
    path("api/v1/auth/", include("apps.autenticacion.urls")),
    path("api/v1/viajes/", include("apps.viajes.urls")),
    path("api/v1/alumnos/", include("apps.viajes.alumnos_urls")),
    path("api/v1/inscripciones/", include("apps.inscripciones.urls")),
    path("api/v1/pagos/", include("apps.pagos.urls")),
    path("api/v1/documentos/", include("apps.documentos.urls")),
    path("api/v1/viajes/", include("apps.comunicados.urls")),
    path("api/v1/notificaciones/", include("apps.notificaciones.urls")),
    path("api/v1/agencias/", include("apps.agencias.urls")),
    path("api/v1/mecenas/", include("apps.mecenas.urls")),
    path("api/v1/viajes/", include("apps.exportaciones.urls")),
    path("api/v1/colegios/", include("apps.colegios.urls")),
    path("api/v1/chat/", include("apps.chat.urls")),
]



