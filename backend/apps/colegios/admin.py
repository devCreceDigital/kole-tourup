from django.contrib import admin
from .models import Colegio


@admin.register(Colegio)
class ColegioAdmin(admin.ModelAdmin):
    list_display = ['codigo_modular', 'nombre', 'departamento', 'distrito', 'activo']
    list_filter = ['activo', 'departamento']
    search_fields = ['nombre', 'codigo_modular']
