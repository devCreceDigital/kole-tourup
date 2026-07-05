from django.urls import path
from .views import InscripcionListCreateView, InscripcionRetrieveView, InscripcionItinerarioView, InscripcionPlanPagoView, InscripcionDocumentosView, MisAlumnosView

urlpatterns = [
    path('mis-alumnos/', MisAlumnosView.as_view(), name='mis-alumnos'),
    path('', InscripcionListCreateView.as_view(), name='inscripcion-list-create'),
    path('<uuid:pk>/', InscripcionRetrieveView.as_view(), name='inscripcion-detail'),
    path('<uuid:pk>/itinerario/', InscripcionItinerarioView.as_view(), name='inscripcion-itinerario'),
    path('<uuid:pk>/plan-pago/', InscripcionPlanPagoView.as_view(), name='inscripcion-plan-pago'),
    path('<uuid:pk>/documentos/', InscripcionDocumentosView.as_view(), name='inscripcion-documentos'),
]
