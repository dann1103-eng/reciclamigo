"""Marcos de teléfono y de navegador para las capturas de la app (PNG con transparencia).

Lee assets/screens/*.png y escribe assets/marcos/*.png.
Ejecutar con: python -I preparar_marcos.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
PANTALLAS = os.path.join(AQUI, "..", "assets", "screens")
SALIDA = os.path.join(AQUI, "..", "assets", "marcos")
os.makedirs(SALIDA, exist_ok=True)

TINTA = (15, 31, 23, 255)
SS = 4  # supersampling para bordes suaves


def mascara_redondeada(size, radio):
    w, h = size
    m = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), radius=radio * SS, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def telefono(origen, destino):
    img = Image.open(os.path.join(PANTALLAS, origen)).convert("RGBA")
    w, h = img.size
    bisel = round(w * 0.04)
    r_int = round(w * 0.115)
    r_ext = r_int + bisel
    lienzo = Image.new("RGBA", (w + 2 * bisel, h + 2 * bisel), (0, 0, 0, 0))
    marco = Image.new("RGBA", lienzo.size, TINTA)
    lienzo.paste(marco, (0, 0), mascara_redondeada(lienzo.size, r_ext))
    pantalla = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pantalla.paste(img, (0, 0), mascara_redondeada(img.size, r_int))
    lienzo.alpha_composite(pantalla, (bisel, bisel))
    # Cámara frontal: una pastilla pequeña sobre el borde superior
    d = ImageDraw.Draw(lienzo)
    pw, ph = round(w * 0.2), round(bisel * 0.9)
    cx = lienzo.width // 2
    d.rounded_rectangle((cx - pw // 2, bisel // 2 - ph // 2 + 2, cx + pw // 2, bisel // 2 + ph // 2 + 2), radius=ph // 2, fill=(40, 58, 49, 255))
    lienzo.save(os.path.join(SALIDA, destino))
    return lienzo.size


def navegador(origen, destino, url="reciclamigo.vercel.app", ancho_max=1800):
    img = Image.open(os.path.join(PANTALLAS, origen)).convert("RGBA")
    if img.width > ancho_max:
        img = img.resize((ancho_max, round(img.height * ancho_max / img.width)), Image.LANCZOS)
    w, h = img.size
    barra = round(w * 0.04)
    borde = max(2, round(w * 0.0016))
    radio = round(w * 0.014)
    lienzo = Image.new("RGBA", (w + 2 * borde, h + barra + 2 * borde), (0, 0, 0, 0))
    base = Image.new("RGBA", lienzo.size, (201, 207, 192, 255))
    lienzo.paste(base, (0, 0), mascara_redondeada(lienzo.size, radio + borde))
    interior = Image.new("RGBA", (w, h + barra), (255, 255, 255, 255))
    d = ImageDraw.Draw(interior)
    d.rectangle((0, 0, w, barra), fill=(233, 236, 228, 255))
    # tres puntos
    rp = barra * 0.17
    for i, color in enumerate(((236, 106, 94), (244, 191, 79), (97, 197, 84))):
        cx = barra * 0.55 + i * barra * 0.5
        d.ellipse((cx - rp, barra / 2 - rp, cx + rp, barra / 2 + rp), fill=color + (255,))
    # barra de direcciones
    px0, px1 = barra * 2.3, w * 0.62
    d.rounded_rectangle((px0, barra * 0.2, px1, barra * 0.8), radius=barra * 0.3, fill=(255, 255, 255, 255))
    try:
        fuente = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", round(barra * 0.34))
        d.text((px0 + barra * 0.4, barra / 2), url, fill=(59, 79, 68, 255), font=fuente, anchor="lm")
    except OSError:
        pass
    interior.paste(img, (0, barra))
    mascara = mascara_redondeada(interior.size, radio)
    lienzo.paste(interior, (borde, borde), mascara)
    lienzo.save(os.path.join(SALIDA, destino))
    return lienzo.size


def recorte(origen, destino, caja):
    img = Image.open(os.path.join(PANTALLAS, origen)).convert("RGBA").crop(caja)
    img.save(os.path.join(SALIDA, destino))
    return img.size


def hoja(origen, destino):
    img = Image.open(os.path.join(PANTALLAS, origen)).convert("RGBA")
    borde = 3
    lienzo = Image.new("RGBA", (img.width + 2 * borde, img.height + 2 * borde), (201, 207, 192, 255))
    lienzo.paste(img, (borde, borde))
    lienzo.save(os.path.join(SALIDA, destino))
    return lienzo.size


TRABAJOS = [
    ("telefono", "m-publicar.png", "phone-m-publicar.png"),
    ("telefono", "m-mapa.png", "phone-m-mapa.png"),
    ("telefono", "m-retiros.png", "phone-m-retiros.png"),
    ("telefono", "m-comprobante.png", "phone-m-comprobante.png"),
    ("telefono", "m-lote.png", "phone-m-lote.png"),
    ("telefono", "m-mis-lotes.png", "phone-m-mis-lotes.png"),
    ("navegador", "d-insignia.png", "desktop-d-insignia.png"),
    ("navegador", "d-alcaldia.png", "desktop-d-alcaldia.png"),
    ("navegador", "d-plan.png", "desktop-d-plan.png"),
    ("navegador", "d-reportes.png", "desktop-d-reportes.png"),
    ("navegador", "d-impacto.png", "desktop-d-impacto.png"),
    ("navegador", "d-admin-planes.png", "desktop-d-admin-planes.png"),
    ("hoja", "reporte-pdf-2026-06-recorte.png", "reporte-pdf.png"),
]
RECORTES = [
    ("d-insignia.png", "insignia-tarjeta.png", (800, 130, 2210, 2008)),
    ("d-comprobante.png", "comprobante-tarjeta.png", (640, 70, 2240, 2010)),
]

for origen, destino, caja in RECORTES:
    print("  ok", destino, recorte(origen, destino, caja))

for tipo, origen, destino in TRABAJOS:
    if not os.path.exists(os.path.join(PANTALLAS, origen)):
        print("  - falta", origen)
        continue
    tam = {"telefono": telefono, "navegador": navegador, "hoja": hoja}[tipo](origen, destino)
    print("  ok", destino, tam)
