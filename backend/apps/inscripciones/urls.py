from django.urls import path
from .views import InscripcionListCreateView, InscripcionRetrieveView, InscripcionItinerarioView, InscripcionPlanPagoView, InscripcionDocumentosView, InscripcionMecenasView, InscripcionHotelesView, InscripcionHotelPreferenciaView, InscripcionRoommatesView, MisAlumnosView

urlpatterns = [
    path('mis-alumnos/', MisAlumnosView.as_view(), name='mis-alumnos'),
    path('', InscripcionListCreateView.as_view(), name='inscripcion-list-create'),
    path('<uuid:pk>/', InscripcionRetrieveView.as_view(), name='inscripcion-detail'),
    path('<uuid:pk>/itinerario/', InscripcionItinerarioView.as_view(), name='inscripcion-itinerario'),
    path('<uuid:pk>/plan-pago/', InscripcionPlanPagoView.as_view(), name='inscripcion-plan-pago'),
    path('<uuid:pk>/documentos/', InscripcionDocumentosView.as_view(), name='inscripcion-documentos'),
    path('<uuid:pk>/mecenas/', InscripcionMecenasView.as_view(), name='inscripcion-mecenas'),
    path('<uuid:pk>/hoteles/', InscripcionHotelesView.as_view(), name='inscripcion-hoteles'),
    path('<uuid:pk>/hoteles/<uuid:hotel_id>/preferencia/', InscripcionHotelPreferenciaView.as_view(), name='inscripcion-hotel-preferencia'),
    path('<uuid:pk>/hoteles/<uuid:hotel_id>/roommates/', InscripcionRoommatesView.as_view(), name='inscripcion-hotel-roommates'),
]
