"""
apps/inscripciones/tests/test_admin_multitenancy.py — Tests de regresión multi-tenancy.

TASK-106 / auditoria_admin.md — Cubre:
  M5: Inscripcion admin FK `padre_tutor` sin filtrar.
  M6: Inlines `InscripcionHotelPreferencia` (FK `hotel`) y
      `InscripcionRoommateSolicitud` (FK `alumno_solicitado`, `hotel`) sin filtrar.

DoD: estos tests FALLEN si se revierte el fix.
"""

import datetime

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import PadreTutor, RolUsuario, Usuario
from apps.viajes.models import Hotel, Viaje
from apps.inscripciones.admin import (
    InscripcionAdmin,
    InscripcionHotelPreferenciaInline,
    InscripcionRoommateSolicitudInline,
)
from apps.inscripciones.models import Alumno, Inscripcion

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


def _padre_tutor(agencia: Agencia, email: str) -> PadreTutor:
    u = Usuario.objects.create_user(
        email=email,
        password="Pass1234!",
        nombre="Padre",
        apellidos="Test",
        rol=RolUsuario.PADRE,
        agencia=agencia,
    )
    return PadreTutor.objects.create(usuario=u)


def _request(agente: Usuario, path="/admin/inscripciones/inscripcion/"):
    request = RequestFactory().get(path)
    request.user = agente
    return request


class InscripcionAdminMultitenancyTests(TestCase):
    def setUp(self):
        self.agencia_1 = _agencia("totem-i1")
        self.agencia_2 = _agencia("totem-i2")
        self.agente_2 = _agente(self.agencia_2, "iagente2@test.com")

        # Datos de agencia_1.
        self.viaje_1 = _viaje(self.agencia_1, "Viaje Agencia 1")
        self.hotel_1 = Hotel.objects.create(viaje=self.viaje_1, nombre="Hotel 1")
        self.tutor_1 = _padre_tutor(self.agencia_1, "itutor1@test.com")
        self.alumno_1 = Alumno.objects.create(
            nombre="Juan", apellidos="Perez", dni="11111111",
            fecha_nacimiento=datetime.date(2010, 5, 15),
        )
        self.alumno_1.tutores.add(self.tutor_1)
        self.inscripcion_1 = Inscripcion.objects.create(
            alumno=self.alumno_1, viaje=self.viaje_1, padre_tutor=self.tutor_1,
            precio_final=1000.00, estado="pendiente",
        )

        self.admin_obj = admin.site._registry[Inscripcion]

    def _inline(self, klass):
        """Instancia el inline sin pasar por el filtro de permisos de
        get_inline_instances (los agentes no tienen change_* permisos por
        defecto; el filtro de queryset se aplica igual)."""
        return klass(self.admin_obj.model, self.admin_obj.admin_site)

    # ── M5 — FK padre_tutor del form principal ─────────────────────────────────

    def test_M5_fk_padre_tutor_dropdown_excluye_tutor_de_otra_agencia(self):
        form_class = self.admin_obj.get_form(_request(self.agente_2))
        qs = form_class().fields["padre_tutor"].queryset
        self.assertNotIn(self.tutor_1, list(qs))

    # ── M6 — Inlines hotel y alumno_solicitado ─────────────────────────────────

    def test_M6_inline_hotel_preferencia_excluye_hotel_de_otra_agencia(self):
        inline = self._inline(InscripcionHotelPreferenciaInline)
        formset_class = inline.get_formset(_request(self.agente_2), obj=None)
        form_class = formset_class().form
        qs = form_class().fields["hotel"].queryset
        self.assertNotIn(self.hotel_1, list(qs))

    def test_M6_inline_roommate_alumno_solicitado_excluye_alumno_de_otra_agencia(self):
        inline = self._inline(InscripcionRoommateSolicitudInline)
        formset_class = inline.get_formset(_request(self.agente_2), obj=None)
        form_class = formset_class().form
        qs = form_class().fields["alumno_solicitado"].queryset
        self.assertNotIn(self.alumno_1, list(qs))

    def test_M6_inline_roommate_hotel_excluye_hotel_de_otra_agencia(self):
        inline = self._inline(InscripcionRoommateSolicitudInline)
        formset_class = inline.get_formset(_request(self.agente_2), obj=None)
        form_class = formset_class().form
        qs = form_class().fields["hotel"].queryset
        self.assertNotIn(self.hotel_1, list(qs))