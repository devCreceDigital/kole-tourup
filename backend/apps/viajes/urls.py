from django.urls import path
from .views import ViajeListCreateView, ViajeRetrieveUpdateView


urlpatterns = [
    path('', ViajeListCreateView.as_view(), name='viaje-list-create'),
    path('<uuid:pk>/', ViajeRetrieveUpdateView.as_view(), name='viaje-detail'),
]
