"""
apps/pagos/tests/test_admin_multitenancy.py — Tests de regresión multi-tenancy.

TASK-106 / auditoria_admin.md — Cubre:
  M1: Pago admin sin get_queryset ni formfield_for_foreignkey en 4 FK.
  M8: Pago admin `estado` en readonly (previene bypass de auditoría).

DoD: estos tests FALLEN si se revierte el fix correspondiente.

Estrategia: dos agencias + dos agentes. Se loguea como agente de agencia_2 y
se invoca directamente ModelAdmin.get_form(request).fields[<fk>].queryset para
verificar que los FK dropdowns excluyen los objetos de agencia_1, y que el
get_queryset de la lista también filtra.
"""

import datetime
import uuid

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import PadreTutor, RolUsuario, Usuario
from apps.inscripciones.models import Alumno, Inscripcion
from apps.viajes.models import Cuota, PlanPago, Viaje
from apps.pagos.models import Pago

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


def _padre(email: str, agencia: Agencia | None) -> tuple[Usuario, PadreTutor]:
    u = Usuario.objects.create_user(
        email=email,
        password="Pass1234!",
        nombre="Padre",
        apellidos="Test",
        rol=RolUsuario.PADRE,
        agencia=agencia,
    )
    return u, PadreTutor.objects.create(usuario=u)


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


def _alumno(dni: str) -> Alumno:
    return Alumno.objects.create(
        nombre="Juan",
        apellidos="Perez",
        dni=dni,
        fecha_nacimiento=datetime.date(2010, 5, 15),
    )


def _request(agente: Usuario):
    request = RequestFactory().get("/admin/pagos/pago/")
    request.user = agente
    return request


class PagoAdminMultitenancyTests(TestCase):
    def setUp(self):
        self.agencia_1 = _agencia("totem-1")
        self.agencia_2 = _agencia("totem-2")
        self.agente_1 = _agente(self.agencia_1, "agente1@test.com")
        self.agente_2 = _agente(self.agencia_2, "agente2@test.com")

        # Datos de agencia_1 (que agente_2 NO debe ver).
        self.viaje_1 = _viaje(self.agencia_1, "Viaje Agencia 1")
        self.plan_1 = PlanPago.objects.create(viaje=self.viaje_1, total_cuotas=1)
        self.cuota_1 = Cuota.objects.create(
            plan_pago=self.plan_1,
            numero_cuota=1,
            importe=500.00,
            fecha_vencimiento=datetime.date(2026, 9, 1),
        )
        self.padre_1, self.tutor_1 = _padre("padre1@test.com", self.agencia_1)
        self.alumno_1 = _alumno("11111111")
        self.alumno_1.tutores.add(self.tutor_1)
        self.inscripcion_1 = Inscripcion.objects.create(
            alumno=self.alumno_1,
            viaje=self.viaje_1,
            padre_tutor=self.tutor_1,
            precio_final=1000.00,
            estado="pendiente",
        )
        self.pago_1 = Pago.objects.create(
            inscripcion=self.inscripcion_1,
            cuota=self.cuota_1,
            importe=500.00,
            fecha_pago=datetime.date(2026, 6, 1),
            metodo_pago="transferencia",
            pagado_por=self.padre_1,
            registrado_por=self.agente_1,
            estado="pendiente",
        )

        self.admin = admin.site._registry[Pago]

    # ── M1 — lista + 4 FK filtrados por agencia ─────────────────────────────────

    def test_M1_agente_no_ve_pagos_de_otra_agencia_en_lista(self):
        request = _request(self.agente_2)
        qs = self.admin.get_queryset(request)
        self.assertNotIn(self.pago_1, list(qs))

    def test_M1_fk_inscripcion_dropdown_excluye_inscripcion_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["inscripcion"].queryset
        self.assertNotIn(self.inscripcion_1, list(qs))

    def test_M1_fk_cuota_dropdown_excluye_cuota_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["cuota"].queryset
        self.assertNotIn(self.cuota_1, list(qs))

    def test_M1_fk_pagado_por_y_registrado_por_excluyen_usuarios_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs_pagado = form_class().fields["pagado_por"].queryset
        qs_registrado = form_class().fields["registrado_por"].queryset
        self.assertNotIn(self.padre_1, list(qs_pagado))
        self.assertNotIn(self.agente_1, list(qs_registrado))

    # ── M8 — estado en readonly (previene bypass de auditoría) ─────────────────

    def test_M8_estado_es_readonly_en_pago_admin(self):
        """Si se remueve 'estado' de readonly_fields, un agente podría
        editar el estado desde el admin y saltarse la signal de auditoría
        (auditoria_admin.md M8 ↔ validacion_flujo_pago.md §6.1)."""
        readonly = self.admin.get_readonly_fields(_request(self.agente_2))
        self.assertIn("estado", readonly)