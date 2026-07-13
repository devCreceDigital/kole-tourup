"""
apps/documentos/tests/test_admin_multitenancy.py — Tests de regresión multi-tenancy.

TASK-106 / auditoria_admin.md — Cubre:
  M3: DocumentoEntregado admin sin get_queryset ni filtro FK
      (inscripcion, documento_requerido, validado_por).

DoD: estos tests FALLEN si se revierte el fix.
"""

import datetime

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from apps.agencias.models import Agencia
from apps.autenticacion.models import PadreTutor, RolUsuario, Usuario
from apps.inscripciones.models import Alumno, Inscripcion
from apps.viajes.models import DocumentoRequerido, Viaje
from apps.documentos.models import DocumentoEntregado

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
    request = RequestFactory().get("/admin/documentos/documentoentregado/")
    request.user = agente
    return request


class DocumentoEntregadoAdminMultitenancyTests(TestCase):
    def setUp(self):
        self.agencia_1 = _agencia("totem-d1")
        self.agencia_2 = _agencia("totem-d2")
        self.agente_1 = _agente(self.agencia_1, "dagente1@test.com")
        self.agente_2 = _agente(self.agencia_2, "dagente2@test.com")

        # Datos de agencia_1.
        self.viaje_1 = _viaje(self.agencia_1, "Viaje Agencia 1")
        self.doc_requerido_1 = DocumentoRequerido.objects.create(
            viaje=self.viaje_1, nombre="DNI"
        )
        padre_1 = Usuario.objects.create_user(
            email="dpadre1@test.com",
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
            alumno=alumno_1, viaje=self.viaje_1, padre_tutor=tutor_1,
            precio_final=1000.00, estado="pendiente",
        )

        self.admin = admin.site._registry[DocumentoEntregado]

    def test_M3_agente_no_ve_documentos_de_otra_agencia_en_lista(self):
        doc_1 = DocumentoEntregado.objects.create(
            inscripcion=self.inscripcion_1,
            documento_requerido=self.doc_requerido_1,
            nombre_archivo="dni.pdf",
            tamano_bytes=100,
        )
        qs = self.admin.get_queryset(_request(self.agente_2))
        self.assertNotIn(doc_1, list(qs))

    def test_M3_fk_inscripcion_dropdown_excluye_inscripcion_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["inscripcion"].queryset
        self.assertNotIn(self.inscripcion_1, list(qs))

    def test_M3_fk_documento_requerido_dropdown_excluye_doc_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["documento_requerido"].queryset
        self.assertNotIn(self.doc_requerido_1, list(qs))

    def test_M3_fk_validado_por_dropdown_excluye_usuario_de_otra_agencia(self):
        form_class = self.admin.get_form(_request(self.agente_2))
        qs = form_class().fields["validado_por"].queryset
        self.assertNotIn(self.agente_1, list(qs))