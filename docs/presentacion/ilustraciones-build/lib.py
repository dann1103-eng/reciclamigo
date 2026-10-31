"""Primitivas y componentes compartidos del sistema de ilustraciones de Reciclamigo.

Solo emite path, rect, circle, ellipse, polygon, g (con transform) y atributos que
PyMuPDF rasteriza bien: fill, fill-opacity, stroke, stroke-width, linecap/linejoin, opacity.
No usa degradados, filtros, mascaras, clipPath, <use>, <style> ni dasharray.
"""
import math

# ---- Paleta -------------------------------------------------------------
DG = "#0b4633"      # verde oscuro de marca
LIME = "#cdf07b"    # lima
LG = "#cdecb2"      # verde claro
MG = "#6e9862"      # verde medio
PAPER = "#f3f4ee"
INK = "#0f1f17"
WHITE = "#ffffff"
# Colores fijos por polimero
PET = "#2f6fde"
HDPE = "#e8833a"
LDPE = "#8e63ce"
PP = "#d6457a"
PS = "#c9a227"
AMBER = "#f2b036"   # solo acento minimo


def n(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def _attrs(**k):
    out = []
    for key, v in k.items():
        if v is None:
            continue
        key = key.rstrip("_").replace("_", "-")
        out.append(f'{key}="{v if isinstance(v, str) else n(v)}"')
    return " ".join(out)


def mix(c1, c2, t):
    """Mezcla c1 con c2 (t=0 -> c1, t=1 -> c2)."""
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(a[i] + (b[i] - a[i]) * t):02x}" for i in range(3))


# ---- Primitivas ---------------------------------------------------------
def rect(x, y, w, h, fill, r=0, op=None):
    return f'<rect {_attrs(x=x, y=y, width=w, height=h, rx=r or None, fill=fill, fill_opacity=op)}/>'


def circle(cx, cy, r, fill, op=None):
    return f'<circle {_attrs(cx=cx, cy=cy, r=r, fill=fill, fill_opacity=op)}/>'


def ring(cx, cy, r, color, sw, op=None):
    return f'<circle {_attrs(cx=cx, cy=cy, r=r, fill="none", stroke=color, stroke_width=sw, opacity=op)}/>'


def ellipse(cx, cy, rx, ry, fill, op=None):
    return f'<ellipse {_attrs(cx=cx, cy=cy, rx=rx, ry=ry, fill=fill, fill_opacity=op)}/>'


def path(d, fill=None, op=None, rule=None):
    return f'<path {_attrs(d=d, fill=fill, fill_opacity=op, fill_rule=rule)}/>'


def stroke(d, color, sw, op=None, cap="round", join="round"):
    return (f'<path {_attrs(d=d, fill="none", stroke=color, stroke_width=sw, stroke_linecap=cap, stroke_linejoin=join, opacity=op)}/>')


def poly(pts, fill, op=None):
    p = " ".join(f"{n(x)},{n(y)}" for x, y in pts)
    return f'<polygon {_attrs(points=p, fill=fill, fill_opacity=op)}/>'


def g(children, x=0, y=0, rot=0, s=1, ox=0, oy=0):
    """Grupo con translate(x,y) rotate(rot) scale(s). (ox,oy) mueve el origen local."""
    t = []
    if x or y:
        t.append(f"translate({n(x)} {n(y)})")
    if rot:
        t.append(f"rotate({n(rot)})")
    if s != 1:
        t.append(f"scale({n(s)})")
    if ox or oy:
        t.append(f"translate({n(-ox)} {n(-oy)})")
    inner = "".join(children) if isinstance(children, (list, tuple)) else children
    if not t:
        return f"<g>{inner}</g>"
    return f'<g transform="{" ".join(t)}">{inner}</g>'


def rpoly_d(pts, r):
    """Poligono con esquinas redondeadas (curvas Q con el vertice como control)."""
    nn = len(pts)
    rs = r if isinstance(r, (list, tuple)) else [r] * nn
    d = ""
    for i in range(nn):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % nn]
        v1 = (p0[0] - p1[0], p0[1] - p1[1])
        v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        rr = min(rs[i], l1 / 2, l2 / 2)
        a = (p1[0] + v1[0] / l1 * rr, p1[1] + v1[1] / l1 * rr)
        b = (p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr)
        d += ("M" if i == 0 else "L") + f"{n(a[0])} {n(a[1])}"
        d += f"Q{n(p1[0])} {n(p1[1])} {n(b[0])} {n(b[1])}"
    return d + "Z"


def rpoly(pts, r, fill, op=None):
    return path(rpoly_d(pts, r), fill, op)


def rrect_d(x, y, w, h, r):
    """Rectangulo redondeado como path (para huecos con evenodd)."""
    r = min(r, w / 2, h / 2)
    return (f"M{n(x + r)} {n(y)} H{n(x + w - r)} Q{n(x + w)} {n(y)} {n(x + w)} {n(y + r)} V{n(y + h - r)} "
            f"Q{n(x + w)} {n(y + h)} {n(x + w - r)} {n(y + h)} H{n(x + r)} Q{n(x)} {n(y + h)} {n(x)} {n(y + h - r)} "
            f"V{n(y + r)} Q{n(x)} {n(y)} {n(x + r)} {n(y)} Z")


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
            + "\n".join(body) + "\n</svg>\n")


# ---- Tonos de volumen ---------------------------------------------------
def shade(x, y, w, h, r=0, op=0.16):
    return rect(x, y, w, h, INK, r, op)


def hi(x, y, w, h, r=None, op=0.28):
    return rect(x, y, w, h, WHITE, (min(w, h) / 2 if r is None else r), op)


def ground_shadow(cx, cy, rx, ry=None, op=0.2):
    return ellipse(cx, cy, rx, ry if ry is not None else rx * 0.18, INK, op)


# ---- Envases por polimero (ancla: centro de la base, y negativo hacia arriba) ----
def bottle(x, y, s=1, rot=0, color=PET, label=WHITE):
    cap = mix(color, INK, 0.38)
    body = ("M-32 -16 Q-32 0 -16 0 L16 0 Q32 0 32 -16 L32 -112 C32 -142 15 -146 15 -166 "
            "L15 -172 L-15 -172 L-15 -166 C-15 -146 -32 -142 -32 -112 Z")
    p = [
        path(body, color),
        rect(-32, -98, 64, 44, label, 0, 0.93),
        circle(0, -76, 11, color),
        shade(-32, -46, 64, 9, 0, 0.15),
        shade(-32, -30, 64, 9, 0, 0.15),
        shade(20, -112, 12, 96, 0, 0.12),
        hi(-25, -134, 8, 28),
        rect(-20, -180, 40, 11, mix(color, INK, 0.2), 5),
        rect(-17, -202, 34, 27, cap, 8),
        hi(-12, -197, 5, 14, 2.5, 0.22),
    ]
    return g(p, x, y, rot, s)


def jug(x, y, s=1, rot=0, color=HDPE, label=WHITE):
    """Bidon HDPE: cuerpo ancho, asa integrada con hueco y boca descentrada."""
    cap = mix(color, INK, 0.38)
    handle = rrect_d(8, -180, 62, 70, 22) + " " + rrect_d(26, -162, 26, 32, 12)
    p = [
        path(handle, color, rule="evenodd"),
        rect(-58, -134, 116, 134, color, 30),
        rect(-48, -162, 40, 36, color, 12),
        rect(-53, -188, 50, 30, cap, 10),
        hi(-46, -184, 6, 14, 3, 0.22),
        rect(-58, -98, 116, 52, label, 0, 0.93),
        circle(0, -72, 13, color),
        shade(-58, -34, 116, 9, 0, 0.15),
        shade(36, -112, 22, 80, 0, 0.12),
        shade(46, -178, 22, 66, 11, 0.1),
        hi(-47, -122, 9, 22),
    ]
    return g(p, x, y, rot, s)


def tub(x, y, s=1, rot=0, color=PP, label=WHITE):
    lid = mix(color, WHITE, 0.38)
    top = -100
    body = rpoly_d([(-60, top), (60, top), (48, 0), (-48, 0)], 12)
    p = [
        path(body, color),
        poly([(-58.1, -84), (58.1, -84), (52.1, -34), (-52.1, -34)], label, 0.93),
        circle(0, -59, 12, color),
        poly([(-50.6, -22), (50.6, -22), (49.4, -12), (-49.4, -12)], INK, 0.15),
        poly([(37, -92), (57, -92), (46, -8), (40, -8)], INK, 0.11),
        rect(-68, -124, 136, 30, lid, 15),
        shade(36, -112, 32, 18, 9, 0.1),
        hi(-56, -116, 30, 8, 4, 0.35),
    ]
    return g(p, x, y, rot, s)


def cup(x, y, s=1, rot=0, color=PS, label=WHITE):
    rim = mix(color, WHITE, 0.38)
    body = rpoly_d([(-48, -110), (48, -110), (33, 0), (-33, 0)], 12)
    p = [
        path(body, color),
        poly([(-45, -88), (45, -88), (38.2, -38), (-38.2, -38)], label, 0.93),
        circle(0, -63, 11, color),
        poly([(-36, -24), (36, -24), (34.8, -12), (-34.8, -12)], INK, 0.15),
        poly([(30, -100), (46, -100), (32.5, -6), (26, -6)], INK, 0.11),
        rect(-56, -130, 112, 28, rim, 14),
        shade(30, -128, 26, 22, 11, 0.1),
        hi(-44, -122, 28, 8, 4, 0.35),
    ]
    return g(p, x, y, rot, s)


# ---- Piezas de interfaz --------------------------------------------------
def check(cx, cy, size, color, sw):
    pts = [(-0.46, 0.02), (-0.12, 0.36), (0.5, -0.34)]
    d = "M" + " L".join(f"{n(cx + px * size)} {n(cy + py * size)}" for px, py in pts)
    return stroke(d, color, sw)


def pin(cx, tip_y, w, h, color, dot=WHITE, dot_r=None, shadow=True):
    """Pin de mapa. (cx, tip_y) es la punta."""
    R = w / 2
    cy = tip_y - h + R
    D = tip_y - cy
    d = (f"M{n(cx)} {n(tip_y)} C{n(cx - 0.3 * R)} {n(tip_y - 0.38 * D)} {n(cx - R)} {n(cy + 0.62 * R)} {n(cx - R)} {n(cy)} "
         f"A{n(R)} {n(R)} 0 0 1 {n(cx + R)} {n(cy)} "
         f"C{n(cx + R)} {n(cy + 0.62 * R)} {n(cx + 0.3 * R)} {n(tip_y - 0.38 * D)} {n(cx)} {n(tip_y)} Z")
    parts = []
    if shadow:
        parts.append(ground_shadow(cx, tip_y, R * 0.8, R * 0.2, 0.22))
    parts.append(path(d, color))
    parts.append(hi(cx - R * 0.78, cy - R * 0.4, R * 0.2, R * 0.62, None, 0.28))
    parts.append(circle(cx, cy, dot_r if dot_r else R * 0.42, dot))
    return "".join(parts)


def disc_bg(cx=300, cy=300, r=286):
    """Base circular comun de los iconos de paso (verde medio con borde de volumen)."""
    return [circle(cx, cy, r, mix(MG, INK, 0.2)), circle(cx - 6, cy - 6, r - 7, MG),
            circle(cx - 6, cy - 6, r - 52, WHITE, 0.06)]


def seal(cx, cy, r, color=LIME, mark=DG, bumps=12):
    """Sello festoneado con check."""
    parts = []
    br = r * 0.26
    rr = r - br
    for i in range(bumps):
        a = 2 * math.pi * i / bumps
        parts.append(circle(cx + rr * math.cos(a), cy + rr * math.sin(a), br, color))
    parts.append(circle(cx, cy, rr + br * 0.2, color))
    parts.append(circle(cx, cy, r * 0.66, mix(color, INK, 0.08)))
    parts.append(check(cx, cy + r * 0.03, r * 0.62, mark, r * 0.2))
    return "".join(parts)


def wheel(cx, cy, r, hub=LIME, tire=INK, rim=None):
    rim = rim or mix(MG, WHITE, 0.55)
    return "".join([
        circle(cx, cy, r, tire),
        circle(cx, cy, r * 0.68, rim),
        circle(cx, cy, r * 0.5, mix(rim, INK, 0.14)),
        circle(cx, cy, r * 0.24, hub),
        hi(cx - r * 0.42, cy - r * 0.78, r * 0.12, r * 0.4, None, 0.2),
    ])
