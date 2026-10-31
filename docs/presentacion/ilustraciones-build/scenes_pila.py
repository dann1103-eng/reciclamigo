"""pila-plasticos (1200x900): piramide suave de envases por polimero sobre una base."""
from lib import *

K = 1.12  # escala general de las piezas
KIND = {
    "B": dict(fn=bottle, color=PET, s=1.0 * K, w=70),
    "J": dict(fn=jug, color=HDPE, s=1.0 * K, w=138),
    "T": dict(fn=tub, color=PP, s=1.22 * K, w=168),
    "C": dict(fn=cup, color=PS, s=1.2 * K, w=150),
}


def build_row(spec, base_y, cx=600, gap=2, front=False):
    items = [KIND[k] for k in spec]
    total = sum(i["w"] for i in items) + gap * (len(items) - 1)
    x = cx - total / 2
    out, shadows = [], []
    for it in items:
        c = x + it["w"] / 2
        out.append(it["fn"](c, base_y, it["s"], 0, it["color"]))
        if front:
            shadows.append(ground_shadow(c, base_y + 2, it["w"] * 0.5, 7, 0.2))
        x += it["w"] + gap
    return shadows, out


def pila_plasticos():
    b = []
    b.append(circle(600, 440, 390, MG, 0.22))
    b.append(circle(600, 440, 280, WHITE, 0.05))
    # base: losa con cara frontal
    b.append(rect(86, 800, 1028, 72, mix(MG, INK, 0.3), 36))
    b.append(rect(86, 776, 1028, 72, MG, 36))
    b.append(hi(140, 792, 340, 10, None, 0.2))
    rows = [
        ("B", 380),
        ("JC", 486),
        ("TBJ", 592),
        ("CTBTC", 700),
        ("JBTCJBT", 808),
    ]
    for idx, (spec, y) in enumerate(rows):
        sh, items = build_row(spec, y, front=(idx == len(rows) - 1))
        b.extend(sh)
        b.extend(items)
    # moneda: el plastico clasificado vale
    coin = [
        circle(0, 0, 56, mix(AMBER, INK, 0.22)),
        circle(-3, -3, 53, AMBER),
        circle(-3, -3, 37, mix(AMBER, INK, 0.12)),
        circle(-3, -3, 33, AMBER),
        hi(-34, -38, 12, 32, None, 0.45),
    ]
    b.append(ground_shadow(1050, 836, 60, 9, 0.22))
    b.append(g(coin, 1050, 790, 0, 1))
    return svg(1200, 900, b)
