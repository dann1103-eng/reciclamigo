"""Variantes de la marca para la presentación (PNG con transparencia).

Parte de los activos ya extraídos en assets/brand: marca.svg (bolsa vectorizada),
logo-original.jpg (logo oficial) y basurero-halftone.png (arte de la portada del manual).
Ejecutar con: python -I preparar_marca.py
"""
import os

import fitz
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(AQUI, "..", "assets", "brand")
SALIDA = os.path.join(AQUI, "..", "assets", "marca")
os.makedirs(SALIDA, exist_ok=True)

COLORES = {
    "verde": "#0b4633",
    "claro": "#cdecb2",
    "lima": "#cdf07b",
    "blanca": "#ffffff",
    "medio": "#6e9862",
}


def marca_png(nombre, color, alto=900):
    svg = open(os.path.join(BRAND, "marca.svg"), encoding="utf-8").read().replace("#000000", color)
    tmp = os.path.join(SALIDA, "_tmp.svg")
    open(tmp, "w", encoding="utf-8").write(svg)
    page = fitz.open(tmp)[0]
    zoom = alto / page.rect.height
    page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True).save(os.path.join(SALIDA, nombre))
    os.remove(tmp)


for clave in ("verde", "claro", "lima", "blanca"):
    marca_png("marca-%s.png" % clave, COLORES[clave])


def tinte(img, hex_color, opacidad=1.0):
    r, g, b = (int(hex_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    a = np.array(img.convert("RGBA"))
    a[..., 0], a[..., 1], a[..., 2] = r, g, b
    a[..., 3] = (a[..., 3] * opacidad).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


# Arte halftone del basurero en varios tonos
basurero = Image.open(os.path.join(BRAND, "basurero-halftone.png")).convert("RGBA")
for clave in ("claro", "medio", "verde", "lima"):
    tinte(basurero, COLORES[clave]).save(os.path.join(SALIDA, "basurero-%s.png" % clave))

# Nombre "RECICLAMIGO" del logo oficial (letras finas) sobre transparencia
logo = Image.open(os.path.join(BRAND, "logo-original.jpg")).convert("RGB")
caja = logo.crop((140, 770, 940, 890))
arr = np.asarray(caja).astype(float)
fondo = np.array([11, 70, 51], float)
lima = np.array([205, 240, 123], float)
d = lima - fondo
t = np.clip(((arr - fondo) @ d) / (d @ d), 0, 1)
t[t < 0.06] = 0
alfa = (t * 255).astype(np.uint8)
mascara = Image.fromarray(alfa, "L")
bbox = mascara.point(lambda v: 255 if v > 20 else 0).getbbox()
for clave in ("lima", "verde", "blanca", "claro"):
    r, g, b = (int(COLORES[clave].lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    out = np.zeros(arr.shape[:2] + (4,), np.uint8)
    out[..., 0], out[..., 1], out[..., 2], out[..., 3] = r, g, b, alfa
    Image.fromarray(out, "RGBA").crop(bbox).save(os.path.join(SALIDA, "nombre-%s.png" % clave))

print("listo:", sorted(os.listdir(SALIDA)))
