"""
apps/mecenas/tests/test_admin_multitenancy.py — Tests de regresión multi-tenancy.

TASK-106 / auditoria_admin.md — Cubre:
  M7: MecenasInscripcion admin FK `inscripcion` sin filtrar.

DoD: estos tests FALLEN si se revierte el fix.
"""

import datetime

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import PadreTutor, RolUsuario, Usuario
from apps.inscripciones.models import Alumno, Inscripcion
from apps.viajes.models import Viaje
from apps.mecenas.models import Mecenas, MecenasInscripcion

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
    request = RequestFactory().get("/admin/mecenas/mecenasinscripcion/")
    request.user = agente
    return request


class MecenasInscripcionAdminMultitenancyTests(TestCase):
    def setUp(self):
        self.agencia_1 = _agencia("totem-m1")
        self.agencia_2 = _agencia("totem-m2")
        self.agente_2 = _agente(self.agencia_2, "magente2@test.com")

        # Datos de agencia_1 (que agente_2 NO debe ver).
        viaje_1 = _viaje(self.agencia_1, "Viaje Agencia 1")
        padre_1 = Usuario.objects.create_user(
            email="mpadre1@test.com",
            password="Pass1234!",
            nombre="Padre",
            apellidos="Uno",
            rol=RolUsuario.PADRE,
            agencia=self.agencia_1,
        )
        tutor_1 = PadreTutor.objects.create(usuario=padre_1)
        alumno_1 = Alumno.objects.create(
            nombre="Juan", apellidos="Perez", dni="11111111",
            fecha_nacimiento=datetime.date(2010, 5, 15),
        )
        alumno_1.tutores.add(tutor_1)
        self.inscripcion_1 = Inscripcion.objects.create(
            alumno=alumno_1, viaje=viaje_1, padre_tutor=tutor_1,
            precio_final=1000.00, estado="pendiente",
        )
        self.mecenas_1 = Mecenas.objects.create(
            nombre="Mecenas 1", email="mecenas1@test.com"
        )
        # Una inscripción de mecenas existente (para verificar get_queryset).
        self.mecenas_inscripcion_1 = MecenasInscripcion.objects.create(
            mecenas=self.mecenas_1,
            inscripcion=self.inscripcion_1,
            monto_comprometido=500.00,
        )

        self.admin = admin.site._registry[MecenasInscripcion]

    def test_M7_agente_no_ve_mecenas_inscripcion_de_otra_agencia_en_lista(self):
        qs = self.admin.get_queryset(_request(self.agente_2))
        self.assertNotIn(self.mecenas_inscripcion_1, list(qs))

    def test_M7_fk_inscripcion_dropdown_excluye_inscripcion_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["inscripcion"].queryset
        self.assertNotIn(self.inscripcion_1, list(qs))