"""
apps/comunicados/tests/test_admin_multitenancy.py — Tests de regresión multi-tenancy.

TASK-106 / auditoria_admin.md — Cubre:
  M2: Comunicado admin sin get_queryset ni filtro FK (viaje, autor).

DoD: estos tests FALLEN si se revierte el fix.
"""

import datetime
import uuid

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import RolUsuario, Usuario
from apps.viajes.models import Viaje
from apps.comunicados.models import Comunicado

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


def _viaje(agencia: Agencia, nombre: str) -> Viaje:
    return Viaje.objects.create(
        agencia=agencia,
        nombre=nombre,
        destino="Cusco",
        fecha_salida=datetime.date(2026, 10, 1),
        fecha_regreso=datetime.date(2026, 10, 10),
        cupo_maximo=10,
        precio_total=1000.00,
        estado="activo",
    )


def _request(agente: Usuario):
    request = RequestFactory().get("/admin/comunicados/comunicado/")
    request.user = agente
    return request


class ComunicadoAdminMultitenancyTests(TestCase):
    def setUp(self):
        self.agencia_1 = _agencia("totem-c1")
        self.agencia_2 = _agencia("totem-c2")
        self.agente_1 = _agente(self.agencia_1, "cagente1@test.com")
        self.agente_2 = _agente(self.agencia_2, "cagente2@test.com")

        # Objetos de agencia_1 que agente_2 NO debe ver.
        self.viaje_1 = _viaje(self.agencia_1, "Viaje Agencia 1")
        self.comunicado_1 = Comunicado.objects.create(
            viaje=self.viaje_1,
            autor=self.agente_1,
            titulo="Comunicado 1",
            cuerpo="Cuerpo comunicado 1",
        )

        self.admin = admin.site._registry[Comunicado]

    def test_M2_agente_no_ve_comunicados_de_otra_agencia_en_lista(self):
        qs = self.admin.get_queryset(_request(self.agente_2))
        self.assertNotIn(self.comunicado_1, list(qs))

    def test_M2_fk_viaje_dropdown_excluye_viaje_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["viaje"].queryset
        self.assertNotIn(self.viaje_1, list(qs))

    def test_M2_fk_autor_dropdown_excluye_usuario_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["autor"].queryset
        self.assertNotIn(self.agente_1, list(qs))