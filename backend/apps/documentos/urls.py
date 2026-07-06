from django.urls import path
from .views import DocumentoEntregadoCreateView, DocumentoValidarRechazarView, DocumentoEntregadoDeleteView

urlpatterns = [
    path('', DocumentoEntregadoCreateView.as_view(), name='documento-list-create'),
    path('<uuid:pk>/', DocumentoValidarRechazarView.as_view(), name='documento-detail'),
    path('<uuid:pk>/eliminar/', DocumentoEntregadoDeleteView.as_view(), name='documento-delete'),
]
