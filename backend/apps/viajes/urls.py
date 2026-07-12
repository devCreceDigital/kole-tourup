from django.urls import path
from .views import (
    ViajePublicoListView,
    ViajePublicoDetailView,
    DocumentoRequeridoListCreateView,
    DocumentoRequeridoRetrieveUpdateDestroyView,
    ViajeListCreateView,
    ViajeRetrieveUpdateView,
    ViajeCambiarEstadoView,
    PlanPagoRetrieveUpdateCreateView,
    ItinerarioRetrieveView,
    EtapaListCreateView,
    EtapaRetrieveUpdateDestroyView,
    ActividadListCreateView,
    ActividadRetrieveUpdateDestroyView,
    ActividadBulkReordenarView,
    HotelListCreateView,
    HotelRetrieveUpdateDestroyView,
    GrupoListCreateView,
    GrupoRetrieveUpdateDestroyView,
    GrupoAsignarAlumnosView,
)


urlpatterns = [
    path('', ViajeListCreateView.as_view(), name='viaje-list-create'),
    path('<uuid:pk>/', ViajeRetrieveUpdateView.as_view(), name='viaje-detail'),
    path('<uuid:pk>/cambiar-estado/', ViajeCambiarEstadoView.as_view(), name='viaje-cambiar-estado'),
    path('<uuid:viaje_id>/plan-pago/', PlanPagoRetrieveUpdateCreateView.as_view(), name='viaje-plan-pago'),  # noqa: E501

    # Itinerario (TASK-028)
    path('<uuid:viaje_id>/itinerario/', ItinerarioRetrieveView.as_view(), name='viaje-itinerario'),  # noqa: E501
    path('<uuid:viaje_id>/etapas/', EtapaListCreateView.as_view(), name='viaje-etapas'),
    path('<uuid:viaje_id>/etapas/<uuid:etapa_id>/', EtapaRetrieveUpdateDestroyView.as_view(), name='viaje-etapa-detail'),  # noqa: E501
    # reordenar/ debe ir ANTES de <uuid:actividad_id>/ para evitar conflicto de matching
    path('<uuid:viaje_id>/etapas/<uuid:etapa_id>/actividades/reordenar/', ActividadBulkReordenarView.as_view(), name='viaje-actividades-reordenar'),  # noqa: E501
    path('<uuid:viaje_id>/etapas/<uuid:etapa_id>/actividades/', ActividadListCreateView.as_view(), name='viaje-actividades'),  # noqa: E501
    path('<uuid:viaje_id>/etapas/<uuid:etapa_id>/actividades/<uuid:actividad_id>/', ActividadRetrieveUpdateDestroyView.as_view(), name='viaje-actividad-detail'),  # noqa: E501

    # Hoteles (TASK-029)
    path('<uuid:viaje_id>/hoteles/', HotelListCreateView.as_view(), name='viaje-hoteles'),
    path('<uuid:viaje_id>/hoteles/<uuid:hotel_id>/', HotelRetrieveUpdateDestroyView.as_view(), name='viaje-hotel-detail'),  # noqa: E501

    # Documentos requeridos (TASK-030)
    path('<uuid:viaje_id>/documentos-requeridos/', DocumentoRequeridoListCreateView.as_view(), name='viaje-documentos-requeridos'),  # noqa: E501
    path('<uuid:viaje_id>/documentos-requeridos/<uuid:documento_id>/', DocumentoRequeridoRetrieveUpdateDestroyView.as_view(), name='viaje-documento-requerido-detail'),  # noqa: E501
    # Grupos y asignación de alumnos (TASK-029)
    path('<uuid:viaje_id>/grupos/', GrupoListCreateView.as_view(), name='viaje-grupos'),
    path('<uuid:viaje_id>/grupos/<uuid:grupo_id>/', GrupoRetrieveUpdateDestroyView.as_view(), name='viaje-grupo-detail'),  # noqa: E501
    path('<uuid:viaje_id>/grupos/<uuid:grupo_id>/alumnos/', GrupoAsignarAlumnosView.as_view(), name='viaje-grupo-alumnos'),  # noqa: E501
    # Endpoints públicos (sin autenticación)
    path('publico/', ViajePublicoListView.as_view(), name='viajes-publico-list'),
    path('publico/<slug:slug>/', ViajePublicoDetailView.as_view(), name='viajes-publico-detail'),
]