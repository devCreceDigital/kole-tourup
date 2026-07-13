"""
apps/notificaciones/tests/test_admin_multitenancy.py — Tests de regresión multi-tenancy.

TASK-106 / auditoria_admin.md — Cubre:
  M4: Notificacion admin sin get_queryset (lista expone notificaciones de
      usuarios de cualquier agencia).

DoD: estos tests FALLEN si se revierte el fix.
"""

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import RolUsuario, Usuario
from apps.notificaciones.models import Notificacion, PreferenciasNotificacion

Usuario = get_user_model()


def _agencia(slug: str) -> Agencia:
    return Agencia.objects.create(
        nombre=f"Agencia {slug}",
        email_contacto=f"info+{slug}@totem.com",
        slug=slug,
    )


def _agente(agencia: Agencia, email: str) -> Usuario:
    return Usuario.objects.create_user(
        email=email,
        password="Pass1234!",
        nombre="Agente",
        apellidos="Test",
        rol=RolUsuario.AGENTE,
        agencia=agencia,
        email_verificado=True,
        is_staff=True,
    )


def _padre(agencia: Agencia, email: str) -> Usuario:
    return Usuario.objects.create_user(
        email=email,
        password="Pass1234!",
        nombre="Padre",
        apellidos="Test",
        rol=RolUsuario.PADRE,
        agencia=agencia,
    )


def _request(agente: Usuario):
    request = RequestFactory().get("/admin/notificaciones/notificacion/")
    request.user = agente
    return request


class NotificacionAdminMultitenancyTests(TestCase):
    def setUp(self):
        self.agencia_1 = _agencia("totem-n1")
        self.agencia_2 = _agencia("totem-n2")
        self.agente_2 = _agente(self.agencia_2, "nagente2@test.com")
        self.padre_1 = _padre(self.agencia_1, "npadre1@test.com")
        self.padre_2 = _padre(self.agencia_2, "npadre2@test.com")

        self.notif_1 = Notificacion.objects.create(
            usuario=self.padre_1, tipo="recordatorio",
            titulo="Recordatorio agencia 1", mensaje="m1",
        )
        self.notif_2 = Notificacion.objects.create(
            usuario=self.padre_2, tipo="recordatorio",
            titulo="Recordatorio agencia 2", mensaje="m2",
        )

        self.admin_notif = admin.site._registry[Notificacion]
        self.admin_pref = admin.site._registry[PreferenciasNotificacion]

    def test_M4_agente_no_ve_notificaciones_de_usuarios_de_otra_agencia(self):
        qs = self.admin_notif.get_queryset(_request(self.agente_2))
        ids = list(qs.values_list("id", flat=True))
        self.assertNotIn(self.notif_1.id, ids)
        self.assertIn(self.notif_2.id, ids)

    def test_M4_preferencias_tambien_filtra_por_agencia(self):
        """La auditoría M4 afecta también PreferenciasNotificacion (mismo admin)."""
        from apps.notificaciones.models import PreferenciasNotificacion

        padre_1 = Usuario.objects.get(email="npadre1@test.com")
        padre_2 = Usuario.objects.get(email="npadre2@test.com")
        pref_1 = PreferenciasNotificacion.objects.create(usuario=padre_1)
        pref_2 = PreferenciasNotificacion.objects.create(usuario=padre_2)

        qs = self.admin_pref.get_queryset(_request(self.agente_2))
        ids = list(qs.values_list("id", flat=True))
        self.assertNotIn(pref_1.id, ids)
        self.assertIn(pref_2.id, ids)

    def test_agente_no_ve_objetos_de_otra_agencia_en_dropdown(self):
        # crear 2 agencias, 2 agentes, verificar que el queryset del FK
        # en el admin de agente_2 no incluye objetos de agencia_1
        form_class = self.admin_notif.get_form(_request(self.agente_2))
        qs = form_class().fields["usuario"].queryset
        usuarios_ids = list(qs.values_list("id", flat=True))
        # padre de agente_1 (agencia_1) NO debe aparecer en el dropdown
        self.assertNotIn(self.padre_1.id, usuarios_ids)
        # padre de agente_2 (agencia_2) sí debe aparecer
        self.assertIn(self.padre_2.id, usuarios_ids)