from django.urls import path
from .views import InscripcionListCreateView, InscripcionRetrieveView

urlpatterns = [
    path('', InscripcionListCreateView.as_view(), name='inscripcion-list-create'),
    path('<uuid:pk>/', InscripcionRetrieveView.as_view(), name='inscripcion-detail'),
]
