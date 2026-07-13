"""
Management command — generar_imagenes_seed

Genera imágenes placeholder (PNG) para todos los Viajes, Etapas de
Itinerario y Hoteles que aún no tengan `imagen` asignada.

Las imágenes se generan con Pillow (determinísticas a partir del nombre)
y se almacenan en MEDIA_ROOT respetando los `upload_to` de cada modelo:
    - Viaje.imagen           → viajes/portadas/
    - EtapaItinerario.imagen → itinerarios/etapas/
    - Hotel.imagen           → hoteles/

Es idempotente: solo genera para entidades con `imagen` vacío. Re-ejecutar
no sobreescribe imágenes subidas manualmente por el agente.

Uso:
    python manage.py generar_imagenes_seed
    python manage.py generar_imagenes_seed --force   # regenera todas
"""

import hashlib
import os
import textwrap

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.viajes.models import Viaje, EtapaItinerario, Hotel


# ─── Helpers de generación visual ────────────────────────────────────────────

# Paleta de pares de colores (degradado de izquierda a derecha).
# El par se elige determinísticamente a partir de un hash del texto.
PALETA_GRADIENTES = [
    ((30, 60, 120), (120, 200, 220)),    # azul → cian
    ((120, 40, 80), (240, 160, 100)),    # magenta → naranja
    ((20, 80, 60), (140, 220, 160)),     # verde oscuro → verde claro
    ((80, 30, 120), (220, 120, 200)),    # púrpura → rosa
    ((120, 70, 20), (240, 200, 100)),    # ocre → dorado
    ((30, 60, 100), (90, 180, 240)),     # marino → cielo
    ((100, 30, 30), (220, 130, 90)),     # granate → terracota
    ((30, 100, 80), (180, 230, 200)),    # esmeralda → menta
]


def _seed_index(texto, mod):
    """Índice determinístico en [0, mod) a partir del hash del texto."""
    h = hashlib.md5(texto.lower().encode("utf-8")).hexdigest()
    return int(h[:8], 16) % mod


def _cargar_fuente(size):
    """
    Carga una fuente TrueType si está disponible; si no, usa la fuente
    por defecto de Pillow (soporta `size` desde Pillow 10.1).
    """
    try:
        from PIL import ImageFont
        # Intentar primero con una TTF embebida en reportlab (siempre presente)
        candidatos = [
            "/usr/local/lib/python3.12/site-packages/reportlab/fonts/VeraBd.ttf",
            "/usr/local/lib/python3.12/site-packages/reportlab/fonts/Vera.ttf",
        ]
        for path in candidatos:
            if os.path.exists(path):
                return ImageFont.truetype(path, size=size)
        # Pillow >= 10.1 soporta size en load_default
        return ImageFont.load_default(size=size)
    except Exception:
        try:
            from PIL import ImageFont
            return ImageFont.load_default()
        except Exception:
            return None


def _degradado_horizontal(draw, ancho, alto, color_a, color_b):
    """Pinta un degradado horizontal en la imagen mediante bandas."""
    for x in range(ancho):
        t = x / max(ancho - 1, 1)
        r = int(color_a[0] + (color_b[0] - color_a[0]) * t)
        g = int(color_a[1] + (color_b[1] - color_a[1]) * t)
        b = int(color_a[2] + (color_b[2] - color_a[2]) * t)
        draw.line([(x, 0), (x, alto - 1)], fill=(r, g, b))


def _texto_centrado(draw, ancho, alto, lineas, fuente, color=(255, 255, 255)):
    """Dibuja una lista de líneas centradas vertical y horizontalmente."""
    alturas = []
    for linea in lineas:
        try:
            bbox = draw.textbbox((0, 0), linea, font=fuente)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
        except Exception:
            w, h = draw.textlength(linea, font=fuente), 10
        alturas.append((linea, w, h))
    total_h = sum(h for _, _, h in alturas) + 10 * (len(alturas) - 1)
    y = (alto - total_h) // 2
    for linea, w, h in alturas:
        x = (ancho - w) // 2
        # Sombra ligera para legibilidad
        draw.text((x + 2, y + 2), linea, fill=(0, 0, 0, 160), font=fuente)
        draw.text((x, y), linea, fill=color, font=fuente)
        y += h + 10


def _wrap_titulo(texto, max_chars):
    """Envuelve el título en líneas cortas para que quepan en la imagen."""
    if not texto:
        return [""]
    return textwrap.wrap(texto, width=max_chars) or [""]


def generar_png_viaje(nombre, destino):
    """Genera un PNG 1200x600 para la portada de un Viaje."""
    from PIL import Image, ImageDraw

    ancho, alto = 1200, 600
    img = Image.new("RGB", (ancho, alto), (30, 60, 120))
    draw = ImageDraw.Draw(img)

    idx = _seed_index(f"{nombre}|{destino}", len(PALETA_GRADIENTES))
    color_a, color_b = PALETA_GRADIENTES[idx]
    _degradado_horizontal(draw, ancho, alto, color_a, color_b)

    # Vignette inferior para mejorar contraste
    overlay = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(alto):
        alpha = int(120 * (y / alto) ** 2)
        od.line([(0, y), (ancho, y)], fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    fuente_titulo = _cargar_fuente(64)
    fuente_sub = _cargar_fuente(36)
    _texto_centrado(
        draw, ancho, alto,
        [
            *_wrap_titulo(nombre or "Viaje", 28),
            "",
            destino or "",
        ],
        fuente_titulo,
    )
    if destino and fuente_sub:
        # subtítulo ya está incluido como línea vacía + texto; reusar
        pass

    return img, "viajes/portadas"


def generar_png_etapa(dia_numero, titulo, descripcion=""):
    """Genera un PNG 800x500 para una Etapa de itinerario."""
    from PIL import Image, ImageDraw

    ancho, alto = 800, 500
    img = Image.new("RGB", (ancho, alto), (30, 80, 100))
    draw = ImageDraw.Draw(img)

    idx = _seed_index(f"etapa|{dia_numero}|{titulo}", len(PALETA_GRADIENTES))
    color_a, color_b = PALETA_GRADIENTES[idx]
    _degradado_horizontal(draw, ancho, alto, color_a, color_b)

    fuente_big = _cargar_fuente(80)
    fuente_titulo = _cargar_fuente(40)
    fuente_desc = _cargar_fuente(24)

    # Día N (grande, arriba)
    dia_texto = f"Día {dia_numero}"
    try:
        bbox = draw.textbbox((0, 0), dia_texto, font=fuente_big)
        w = bbox[2] - bbox[0]
    except Exception:
        w = draw.textlength(dia_texto, font=fuente_big)
    draw.text(((ancho - w) // 2 + 2, 62), dia_texto, fill=(0, 0, 0, 160), font=fuente_big)
    draw.text(((ancho - w) // 2, 60), dia_texto, fill=(255, 255, 255), font=fuente_big)

    # Título (centro)
    titulo_lineas = _wrap_titulo(titulo or "", 32)
    _texto_centrado(draw, ancho, alto + 80, titulo_lineas, fuente_titulo)

    # Descripción (pie, truncada)
    if descripcion:
        desc_corta = textwrap.wrap(descripcion, width=60)[:2]
        y = alto - 30 - len(desc_corta) * 26
        for linea in desc_corta:
            try:
                bbox = draw.textbbox((0, 0), linea, font=fuente_desc)
                w = bbox[2] - bbox[0]
            except Exception:
                w = draw.textlength(linea, font=fuente_desc)
            draw.text(((ancho - w) // 2 + 1, y + 1), linea, fill=(0, 0, 0, 140), font=fuente_desc)
            draw.text(((ancho - w) // 2, y), linea, fill=(240, 240, 240), font=fuente_desc)
            y += 26

    return img, "itinerarios/etapas"


def generar_png_hotel(nombre, descripcion=""):
    """Genera un PNG 800x500 para un Hotel."""
    from PIL import Image, ImageDraw

    ancho, alto = 800, 500
    img = Image.new("RGB", (ancho, alto), (60, 40, 30))
    draw = ImageDraw.Draw(img)

    idx = _seed_index(f"hotel|{nombre}", len(PALETA_GRADIENTES))
    color_a, color_b = PALETA_GRADIENTES[idx]
    _degradado_horizontal(draw, ancho, alto, color_a, color_b)

    fuente_big = _cargar_fuente(56)
    fuente_desc = _cargar_fuente(26)

    # Icono 🏨 simulado con texto (la fuente por defecto no soporta emoji,
    # pero las TTF embebidas de Pillow/reportlab sí renderizan texto ASCII).
    _texto_centrado(
        draw, ancho, alto - 40,
        [*_wrap_titulo(nombre or "Hotel", 28)],
        fuente_big,
    )

    if descripcion:
        desc_corta = textwrap.wrap(descripcion, width=50)[:2]
        y = alto - 30 - len(desc_corta) * 28
        for linea in desc_corta:
            try:
                bbox = draw.textbbox((0, 0), linea, font=fuente_desc)
                w = bbox[2] - bbox[0]
            except Exception:
                w = draw.textlength(linea, font=fuente_desc)
            draw.text(((ancho - w) // 2 + 1, y + 1), linea, fill=(0, 0, 0, 140), font=fuente_desc)
            draw.text(((ancho - w) // 2, y), linea, fill=(240, 240, 240), font=fuente_desc)
            y += 28

    return img, "hoteles"


# ─── Command ─────────────────────────────────────────────────────────────────


class Command(BaseCommand):
    help = (
        "Genera imágenes placeholder (PNG) para todos los Viajes, Etapas "
        "de Itinerario y Hoteles sin imagen. Idempotente."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenera incluso las imágenes ya existentes (sobreescribe).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo reporta qué se generaría, sin escribir archivos.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        dry_run = options["dry_run"]

        if not settings.MEDIA_ROOT:
            raise CommandError("MEDIA_ROOT no está configurado.")

        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

        stats = {"viajes": 0, "etapas": 0, "hoteles": 0, "skipped": 0}

        with transaction.atomic():
            stats["viajes"] += self._procesar_viajes(force, dry_run, stats)
            stats["etapas"] += self._procesar_etapas(force, dry_run, stats)
            stats["hoteles"] += self._procesar_hoteles(force, dry_run, stats)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Generación de imágenes completada "
            f"(viajes={stats['viajes']}, etapas={stats['etapas']}, "
            f"hoteles={stats['hoteles']}, omitidos={stats['skipped']})"
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING("⚠ --dry-run: no se escribieron archivos."))

    # ─── Procesadores por modelo ────────────────────────────────────────────

    def _procesar_viajes(self, force, dry_run, stats):
        qs = Viaje.objects.all()
        n = 0
        for v in qs:
            if v.imagen and not force:
                self._log_skip("Viaje", v.nombre)
                stats["skipped"] += 1
                continue
            img, subdir = generar_png_viaje(v.nombre, v.destino)
            nombre_archivo = f"{v.slug or v.id}.png"
            self._asignar(v, img, subdir, nombre_archivo, dry_run)
            self._log_ok("Viaje", v.nombre, nombre_archivo)
            n += 1
        return n

    def _procesar_etapas(self, force, dry_run, stats):
        qs = EtapaItinerario.objects.select_related("itinerario__viaje").all()
        n = 0
        for e in qs:
            if e.imagen and not force:
                self._log_skip("Etapa", f"Día {e.dia_numero} - {e.titulo}")
                stats["skipped"] += 1
                continue
            img, subdir = generar_png_etapa(e.dia_numero, e.titulo, e.descripcion)
            nombre_archivo = f"{e.slug or e.id}.png"
            self._asignar(e, img, subdir, nombre_archivo, dry_run)
            self._log_ok("Etapa", f"Día {e.dia_numero} - {e.titulo}", nombre_archivo)
            n += 1
        return n

    def _procesar_hoteles(self, force, dry_run, stats):
        qs = Hotel.objects.all()
        n = 0
        for h in qs:
            if h.imagen and not force:
                self._log_skip("Hotel", h.nombre)
                stats["skipped"] += 1
                continue
            img, subdir = generar_png_hotel(h.nombre, h.descripcion)
            nombre_archivo = f"{h.slug or h.id}.png"
            self._asignar(h, img, subdir, nombre_archivo, dry_run)
            self._log_ok("Hotel", h.nombre, nombre_archivo)
            n += 1
        return n

    # ─── Utilidades ─────────────────────────────────────────────────────────

    def _asignar(self, instance, img, subdir, nombre_archivo, dry_run):
        """
        Persiste el PNG al storage y lo asigna al campo `imagen`.

        Importante: `ImageField.save(name, content)` ya aplica el `upload_to`
        definido en el modelo (ej: 'viajes/portadas/'), por lo que `name` debe
        ser SOLO el nombre del archivo, sin el subdirectorio.
        """
        if dry_run:
            return
        from io import BytesIO

        # Limpiar imagen previa si --force
        if instance.imagen:
            try:
                instance.imagen.delete(save=False)
            except Exception:
                pass

        buffer = BytesIO()
        img.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)

        instance.imagen.save(nombre_archivo, File(buffer), save=True)

    def _log_ok(self, tipo, nombre, archivo):
        self.stdout.write(f"  ✓ {tipo}: {nombre} → {archivo}")

    def _log_skip(self, tipo, nombre):
        self.stdout.write(f"  · {tipo}: {nombre} (ya tiene imagen, omitido)")
