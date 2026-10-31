"""Rasteriza los SVG de ilustraciones a PNG transparente (2x) con PyMuPDF.

Uso (desde cualquier carpeta):
    python -I docs/presentacion/ilustraciones-build/render.py              # SVG -> PNG + hoja de contacto
    python -I docs/presentacion/ilustraciones-build/render.py --preview DIR  # ademas, vistas sobre blanco y verde oscuro en DIR
"""
import sys
from pathlib import Path

import fitz
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "assets" / "ilustraciones"
PNG_DIR = ROOT / "png"

NAMES = [
    "pila-plasticos", "paso-1-registro", "paso-2-publicar", "paso-3-alerta", "paso-4-retiro",
    "paso-5-confirmar", "mapa-radios", "carreton-reciclador", "fabrica-resina", "comercio-restaurante",
]
PAPER = (243, 244, 238, 255)
DARK = (11, 70, 51, 255)


def render_all(names=NAMES, scale=2):
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    for name in names:
        src = ROOT / f"{name}.svg"
        if not src.exists():
            print("falta", src)
            continue
        page = fitz.open(str(src))[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=True)
        out = PNG_DIR / f"{name}.png"
        pix.save(str(out))
        print("ok", out.name, pix.width, "x", pix.height)


def on_bg(im, color):
    bg = Image.new("RGBA", im.size, color)
    bg.alpha_composite(im)
    return bg.convert("RGB")


def previews(out_dir, names=NAMES):
    """Vista previa lado a lado: sobre blanco y sobre verde oscuro #0b4633."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in names:
        p = PNG_DIR / f"{name}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        im.thumbnail((900, 900), Image.LANCZOS)
        a, b = on_bg(im, (255, 255, 255, 255)), on_bg(im, DARK)
        w, h = im.size
        gap = 24
        sheet = Image.new("RGB", (w * 2 + gap, h), (128, 128, 128))
        sheet.paste(a, (0, 0))
        sheet.paste(b, (w + gap, 0))
        sheet.save(out_dir / f"{name}_prev.png")


def contact_sheet(names=NAMES):
    cols, cell_w, cell_h, pad = 4, 520, 420, 36
    rows = (len(names) + cols - 1) // cols
    W, H = cols * cell_w + (cols + 1) * pad, rows * (cell_h + 34) + (rows + 1) * pad
    sheet = Image.new("RGBA", (W, H), PAPER)
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
    except OSError:
        font = ImageFont.load_default()
    for i, name in enumerate(names):
        p = PNG_DIR / f"{name}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        im.thumbnail((cell_w, cell_h), Image.LANCZOS)
        r, c = divmod(i, cols)
        x0 = pad + c * (cell_w + pad)
        y0 = pad + r * (cell_h + 34 + pad)
        sheet.alpha_composite(im, (x0 + (cell_w - im.width) // 2, y0 + (cell_h - im.height) // 2))
        d.text((x0, y0 + cell_h + 6), name, fill=(15, 31, 23, 255), font=font)
    sheet.convert("RGB").save(ROOT / "hoja-de-contacto.png")
    print("ok hoja-de-contacto.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    render_all()
    contact_sheet()
    if "--preview" in args:
        previews(args[args.index("--preview") + 1])
