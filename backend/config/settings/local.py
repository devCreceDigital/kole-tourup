"""
config/settings/local.py — Overrides de desarrollo local.

Activa DEBUG, CORS permisivo para localhost y logging SQL.
NUNCA usar en producción.
"""

from .base import *  # noqa: F401, F403
from .base import LOGGING  # noqa: F811 — redeclared for mutation

# ─────────────────────────────────────────────────────────────────────────────
# DEBUG
# ─────────────────────────────────────────────────────────────────────────────

DEBUG = True

ALLOWED_HOSTS = ["*"]  # En local se acepta cualquier host

# ─────────────────────────────────────────────────────────────────────────────
# CORS — solo orígenes locales
# ─────────────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",   # Frontend Next.js en desarrollo
    "http://localhost:3001",   # Gateway en desarrollo
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING — mostrar queries SQL en desarrollo para detectar N+1
# ─────────────────────────────────────────────────────────────────────────────

LOGGING["loggers"]["django.db.backends"]["level"] = "DEBUG"  # type: ignore[index]
LOGGING["loggers"]["tottemhub"]["level"] = "DEBUG"           # type: ignore[index]

# ─────────────────────────────────────────────────────────────────────────────
# DJANGO DEBUG TOOLBAR (opcional — descomentar si se instala)
# ─────────────────────────────────────────────────────────────────────────────

# INSTALLED_APPS += ["debug_toolbar"]
# MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")
# INTERNAL_IPS = ["127.0.0.1"]


# Override de storage para desarrollo local: usar filesystem en vez de S3
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
