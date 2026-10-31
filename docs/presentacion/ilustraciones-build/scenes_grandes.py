"""Escenas grandes: mapa-radios, carreton-reciclador, fabrica-resina, comercio-restaurante."""
from lib import *

AQUA = "#a9d6d0"   # rio (azul muy palido, distinto del azul PET)


# ---------------------------------------------------------------------------
# Base comun de las escenas de 1200x900: baldosa de verde medio con suelo
# ---------------------------------------------------------------------------
def tile(ground_top=690):
    b = [
        rect(60, 68, 1080, 780, mix(MG, INK, 0.24), 72),
        rect(60, 60, 1080, 780, MG, 72),
        circle(390, 390, 300, WHITE, 0.06),
        rect(150, 124, 170, 34, WHITE, 17, 0.13),
        rect(212, 172, 108, 28, WHITE, 14, 0.13),
        rect(850, 150, 210, 38, WHITE, 19, 0.13),
        rect(930, 200, 120, 28, WHITE, 14, 0.13),
        path(f"M60 {ground_top} H1140 V768 A72 72 0 0 1 1068 840 H132 A72 72 0 0 1 60 768 Z", mix(MG, INK, 0.17)),
        rect(60, ground_top, 1080, 12, WHITE, 0, 0.1),
    ]
    return b


def sack(cx, base, w, h, color):
    """Costal atado: cuerpo ancho con hombros, cuello fruncido y amarre."""
    hw = w / 2
    pts = [(cx - hw, base), (cx + hw, base), (cx + hw + 4, base - h * 0.5), (cx + hw * 0.86, base - h * 0.86),
           (cx - hw * 0.86, base - h * 0.86), (cx - hw - 4, base - h * 0.5)]
    parts = [rpoly(pts, [24, 24, 32, 16, 16, 32], color)]
    for k in (0.22, 0.42, 0.62):  # tejido: bandas gruesas muy suaves
        parts.append(rect(cx - hw + 10, base - h * k, w - 20, 9, INK, 4.5, 0.05))
    parts.append(rpoly([(cx + hw * 0.4, base - 6), (cx + hw - 4, base - 6), (cx + hw + 2, base - h * 0.5),
                        (cx + hw * 0.7, base - h * 0.84)], 16, INK, 0.1))
    parts.append(rpoly([(cx - w * 0.13, base - h * 0.82), (cx + w * 0.13, base - h * 0.82),
                        (cx + w * 0.25, base - h * 1.03), (cx - w * 0.25, base - h * 1.03)], 8, mix(color, INK, 0.1)))
    parts.append(rect(cx - w * 0.16, base - h * 0.9, w * 0.32, h * 0.055, mix(color, INK, 0.4), 4))
    parts.append(hi(cx - hw + 16, base - h * 0.72, 12, h * 0.3, None, 0.35))
    return "".join(parts)


def bale(x, y, w, h, color):
    """Bala de plastico prensado (x,y esquina sup-izq)."""
    return "".join([
        rect(x, y, w, h, color, 12),
        shade(x + w * 0.62, y, w * 0.38, h, 12, 0.1),
        rect(x + w * 0.24, y, 9, h, INK, 3, 0.22),
        rect(x + w * 0.66, y, 9, h, INK, 3, 0.22),
        hi(x + 10, y + 8, 22, 8, 4, 0.3),
    ])


# ---------------------------------------------------------------------------
# 7. mapa-radios (1400x900)
# ---------------------------------------------------------------------------
def mapa_radios():
    b = []
    b.append(rect(52, 66, 1300, 820, INK, 62, 0.16))
    b.append(rect(40, 40, 1320, 820, MG, 62))
    L, T, Rr, B = 60, 60, 1340, 840
    b.append(rect(L, T, Rr - L, B - T, LG, 46))

    xs = [(190, 26), (350, 26), (530, 44), (700, 44), (865, 26), (1140, 26), (1250, 26)]
    ys = [(200, 26), (330, 44), (450, 44), (580, 26), (700, 26), (775, 26)]
    # manzanas: celdas entre calles
    gx = [(L, 0)] + xs + [(Rr, 0)]
    gy = [(T, 0)] + ys + [(B, 0)]
    block = mix(LG, MG, 0.32)
    alt = mix(LG, MG, 0.22)
    for i in range(len(gx) - 1):
        for j in range(len(gy) - 1):
            x0 = gx[i][0] + gx[i][1] / 2 + 14
            x1 = gx[i + 1][0] - gx[i + 1][1] / 2 - 14
            y0 = gy[j][0] + gy[j][1] / 2 + 14
            y1 = gy[j + 1][0] - gy[j + 1][1] / 2 - 14
            if i == 0:
                x0 = L + 34
            if i == len(gx) - 2:
                x1 = Rr - 34
            if j == 0:
                y0 = T + 34
            if j == len(gy) - 2:
                y1 = B - 34
            if x1 - x0 < 30 or y1 - y0 < 30:
                continue
            b.append(rect(x0, y0, x1 - x0, y1 - y0, block if (i + j) % 2 == 0 else alt, 16))
    # parque (celda inferior izquierda del centro) con arboles redondos
    px0, py0, px1, py1 = 204, 465, 336, 566
    b.append(rect(px0 - 2, py0 - 2, px1 - px0 + 4, py1 - py0 + 4, mix(MG, WHITE, 0.2), 16))
    for tx, ty, tr in ((236, 495, 20), (284, 510, 24), (316, 484, 17), (250, 542, 17), (306, 544, 19)):
        b.append(circle(tx, ty, tr, mix(MG, DG, 0.35)))
        b.append(circle(tx - 5, ty - 5, tr * 0.45, WHITE, 0.14))
    # rio que baja de arriba a abajo
    river = "M1000 60 C1000 180 958 300 1000 440 C1042 580 1000 700 1000 840"
    b.append(stroke(river, mix(AQUA, MG, 0.18), 82, None, "butt"))
    b.append(stroke(river, AQUA, 66, None, "butt"))
    # calles (bandas claras)
    for x, w in xs:
        b.append(rect(x - w / 2, T, w, B - T, PAPER))
    for y, w in ys:
        b.append(rect(L, y - w / 2, Rr - L, w, PAPER))
    # anillos de 1, 3 y 5 km alrededor del comercio
    cx, cy = 700, 450
    for r, f in ((366, 0.14), (220, 0.14), (73, 0.16)):
        b.append(circle(cx, cy, r, WHITE, f))
    for r, o in ((366, 0.6), (220, 0.7), (73, 0.85)):
        b.append(ring(cx, cy, r, DG, 10, o))
    # pines con colores de polimero (punta en x,y), de atras hacia adelante
    pins = [
        (560, 205, PS), (960, 305, HDPE), (690, 335, HDPE), (500, 385, LDPE), (775, 400, PET),
        (350, 450, PET), (880, 475, PP), (825, 610, LDPE), (1015, 655, PP), (440, 665, HDPE),
    ]
    pins.sort(key=lambda p: p[1])
    # reciclador (circulo) y comercio (cuadrado)
    rx, ry = 565, 585
    b.append(circle(cx, cy, 44, WHITE, 0.45))
    for px, py, col in pins:
        b.append(pin(px, py, 60, 88, col))
    b.append(ground_shadow(rx, ry + 44, 50, 9, 0.22))
    b.append(circle(rx, ry, 47, WHITE))
    b.append(circle(rx, ry, 38, DG))
    b.append(g(bottle(0, 0, 0.25, 28, LIME, DG), rx - 1, ry + 22))
    # comercio
    b.append(ground_shadow(cx, cy + 58, 62, 10, 0.22))
    b.append(rect(cx - 52, cy - 52, 104, 104, WHITE, 28))
    b.append(rect(cx - 42, cy - 42, 84, 84, DG, 20))
    s_ = [rect(-19, -17, 38, 11, LIME, 4), rect(-15, -3, 30, 22, LIME, 4), rect(-4, 5, 9, 14, DG, 2)]
    b.append(g(s_, cx, cy - 2, 0, 1.3))
    return svg(1400, 900, b)


# ---------------------------------------------------------------------------
# 8. carreton-reciclador (1200x900)
# ---------------------------------------------------------------------------
def carreton_reciclador():
    b = tile()
    b.append(ground_shadow(590, 790, 500, 16, 0.22))
    FW, RW = (255, 690), (880, 690)
    R = 94
    # estacas traseras del cajon
    b.append(stroke("M548 612 L548 300", LIME, 16))
    b.append(stroke("M1040 612 L1040 300", LIME, 16))
    # rueda trasera
    b.append(wheel(RW[0], RW[1], R))
    # carga: sacos y botellas (de atras hacia adelante)
    # saco abierto con botellas arriba
    b.append(bottle(742, 318, 0.86, -18, PET))
    b.append(bottle(796, 322, 0.94, 4, PET))
    b.append(bottle(850, 320, 0.82, 20, PET))
    b.append(sack(796, 336, 190, 118, LDPE))
    # fila media
    b.append(sack(700, 460, 150, 150, mix(LG, WHITE, 0.5)))
    b.append(sack(885, 460, 150, 150, LIME))
    # fila base
    b.append(sack(625, 580, 170, 170, LIME))
    b.append(sack(795, 580, 170, 170, mix(LG, WHITE, 0.5)))
    b.append(sack(965, 580, 170, 170, LG))
    # tablero frontal y piso del cajon
    b.append(rect(530, 540, 530, 76, DG, 16))
    b.append(shade(900, 540, 160, 76, 16, 0.14))
    b.append(rect(520, 604, 550, 40, mix(DG, INK, 0.12), 18))
    b.append(rect(548, 560, 480, 10, LIME, 5, 0.9))
    # cuadro y direccion
    b.append(stroke("M255 690 L318 506", LIME, 20))
    b.append(stroke("M318 506 L304 440 Q300 422 276 422 L238 422", LIME, 17))
    b.append(circle(236, 422, 13, DG))
    b.append(stroke("M318 506 L520 606", LIME, 20))
    # asiento y pedal
    b.append(stroke("M452 572 L444 512", LIME, 15))
    b.append(rect(402, 490, 100, 28, DG, 14))
    # rueda delantera al frente
    b.append(wheel(FW[0], FW[1], R))
    return svg(1200, 900, b)


# ---------------------------------------------------------------------------
# 9. fabrica-resina (1200x900)
# ---------------------------------------------------------------------------
def fabrica_resina():
    b = tile(690)
    base = 730
    # chimenea (detras del edificio)
    b.append(rect(1004, 240, 62, 260, LG, 10))
    for yy in (282, 330):
        b.append(rect(1004, yy, 62, 24, DG, 0))
    b.append(shade(1040, 240, 26, 260, 10, 0.12))
    b.append(rect(994, 226, 82, 24, DG, 12))
    for cxp, cyp, rr in ((1030, 196, 22), (1062, 154, 28), (1094, 118, 20)):
        b.append(circle(cxp, cyp, rr, WHITE, 0.55))
    # edificio principal
    b.append(rect(620, 470, 450, base - 470, LG, 14))
    b.append(shade(900, 470, 170, base - 470, 14, 0.1))
    teeth = [(620, 470), (620, 396), (770, 470), (770, 396), (920, 470), (920, 396), (1070, 470)]
    b.append(rpoly(teeth, 8, DG))
    for x0 in (620, 770, 920):
        b.append(rpoly([(x0 + 14, 420), (x0 + 14, 456), (x0 + 96, 456)], 5, LIME))
    b.append(rect(612, 458, 466, 20, mix(LG, WHITE, 0.35), 10))
    for i in range(3):
        b.append(rect(650 + i * 100, 520, 74, 66, DG, 14))
        b.append(rect(662 + i * 100, 532, 16, 20, LIME, 6, 0.9))
    b.append(rect(936, 560, 112, base - 560, DG, 10))
    for yy in (580, 610, 640, 670, 700):
        b.append(rect(944, yy, 96, 8, WHITE, 4, 0.18))
    # tolva sobre patas
    b.append(rect(425, 500, 16, base - 500, mix(LIME, INK, 0.1), 5))
    b.append(rect(559, 500, 16, base - 500, mix(LIME, INK, 0.1), 5))
    b.append(rpoly([(404, 326), (596, 326), (536, 470), (464, 470)], 14, LIME))
    b.append(rpoly([(512, 330), (596, 330), (536, 470), (506, 470)], 10, INK, 0.1))
    b.append(rect(392, 310, 216, 30, mix(LIME, WHITE, 0.4), 15))
    b.append(rect(488, 462, 24, 36, mix(LIME, INK, 0.3), 7))
    b.append(hi(424, 346, 12, 56, None, 0.4))
    # pellets cayendo
    pel = [(500, 522, 8), (509, 548, 7), (493, 570, 8), (505, 596, 7), (497, 618, 8), (512, 506, 6), (488, 540, 6)]
    for i, (px, py, pr) in enumerate(pel):
        b.append(circle(px, py, pr, PET if i % 2 == 0 else mix(PET, WHITE, 0.45)))
    # contenedor con pellets
    b.append(rpoly([(442, 626), (558, 626), (548, base), (452, base)], 10, LG))
    b.append(rect(436, 616, 128, 22, mix(LG, WHITE, 0.4), 11))
    b.append(shade(520, 626, 38, base - 626, 8, 0.1))
    b.append(rect(442, 676, 116, 14, DG, 5))
    rows = [(5, 604), (4, 590), (3, 576)]
    for k, (cnt, yy) in enumerate(rows):
        for q in range(cnt):
            xx = 500 + (q - (cnt - 1) / 2) * 20
            b.append(circle(xx, yy, 9, PET if (q + k) % 2 == 0 else mix(PET, WHITE, 0.45)))
    # camion llegando con balas (escalado para no pegarse al borde)
    b.append(ground_shadow(262, base + 18, 150, 11, 0.22))
    tr = [
        bale(78, 568, 92, 78, PET),
        bale(174, 568, 92, 78, HDPE),
        bale(126, 488, 92, 78, LDPE),
        rect(70, 640, 236, 28, DG, 10),
        rect(70, 660, 330, 24, mix(DG, INK, 0.1), 8),
        rect(300, 576, 100, 100, LIME, 22),
        shade(366, 576, 34, 100, 22, 0.12),
        rect(332, 594, 56, 40, DG, 10),
        hi(340, 602, 8, 22, None, 0.3),
        rect(394, 652, 14, 22, DG, 6),
    ]
    for wx in (130, 236, 352):
        tr.append(wheel(wx, 706, 34))
    b.append(g(tr, 400, 730, 0, 0.9, 400, 730))
    return svg(1200, 900, b)


# ---------------------------------------------------------------------------
# 10. comercio-restaurante (1200x900)
# ---------------------------------------------------------------------------
def comercio_restaurante():
    b = tile(690)
    base = 736
    b.append(rect(60, 728, 1080, 22, mix(MG, WHITE, 0.3), 0))
    # fachada
    b.append(rect(190, 276, 520, base - 276, LG, 22))
    b.append(shade(600, 276, 110, base - 276, 22, 0.08))
    b.append(rect(170, 252, 560, 42, mix(LG, WHITE, 0.45), 21))
    # rotulo en blanco con plato y cubiertos abstractos
    b.append(rect(330, 304, 240, 70, DG, 20))
    b.append(circle(450, 339, 24, LIME))
    b.append(circle(450, 339, 14, DG))
    b.append(rect(392, 322, 12, 34, LIME, 6))
    b.append(rect(496, 322, 12, 34, LIME, 6))
    # toldo a franjas con festones
    n_s = 8
    sw_top, sw_bot = 65, 70
    sh_poly, aw = [], []
    for i in range(n_s):
        tl, tr = 190 + i * sw_top, 190 + (i + 1) * sw_top
        bl, br = 170 + i * sw_bot, 170 + (i + 1) * sw_bot
        col = DG if i % 2 == 0 else WHITE
        aw.append(poly([(tl, 392), (tr, 392), (br, 452), (bl, 452)], col))
        aw.append(circle((bl + br) / 2, 452, 35, col))
    b.append(rect(176, 462, 548, 22, INK, 11, 0.12))
    b.extend(aw)
    b.append(rect(184, 384, 532, 12, mix(DG, INK, 0.2), 6))
    # ventana grande con lamparas y mesa
    b.append(rect(224, 510, 226, 176, mix(LG, WHITE, 0.45), 24))
    b.append(rect(236, 522, 202, 140, DG, 16))
    b.append(rect(236, 522, 202, 140, mix(DG, LIME, 0.1), 16))
    b.append(poly([(262, 522), (298, 522), (262, 662), (236, 662), (236, 640)], WHITE, 0.1))
    for lx in (282, 336, 390):
        b.append(rect(lx - 2, 522, 4, 30, LG, 2, 0.6))
        b.append(path(f"M{lx - 16} 568 A16 16 0 0 1 {lx + 16} 568 Z", LIME))
    b.append(rect(262, 612, 150, 12, mix(DG, LG, 0.4), 6))
    b.append(rect(332, 624, 10, 38, mix(DG, LG, 0.4), 4))
    b.append(rect(224, 676, 226, 16, mix(LG, WHITE, 0.45), 8))
    # puerta
    b.append(rect(494, 492, 154, base - 492, mix(LG, WHITE, 0.45), 20))
    b.append(rect(506, 504, 130, base - 504, DG, 14))
    b.append(rect(522, 520, 98, 120, mix(DG, LIME, 0.14), 10))
    b.append(poly([(540, 520), (566, 520), (532, 640), (522, 640), (522, 600)], WHITE, 0.12))
    b.append(rect(604, 662, 12, 50, LIME, 6))
    b.append(rect(480, base - 8, 182, 16, mix(LG, INK, 0.1), 8))
    # bote de reciclaje con botellas
    bx = 905
    b.append(ground_shadow(bx, base + 14, 100, 10, 0.22))
    b.append(bottle(bx - 44, 570, 0.8, -16, PET))
    b.append(bottle(bx + 8, 572, 0.88, 6, PET))
    b.append(jug(bx + 50, 574, 0.5, 14, HDPE))
    b.append(rpoly([(bx - 78, 560), (bx + 78, 560), (bx + 64, base), (bx - 64, base)], 14, DG))
    b.append(rpoly([(bx + 24, 566), (bx + 76, 566), (bx + 62, base - 6), (bx + 36, base - 6)], 8, INK, 0.14))
    b.append(rect(bx - 92, 538, 184, 40, LIME, 18))
    b.append(shade(bx + 30, 540, 60, 36, 16, 0.1))
    b.append(g(bottle(0, 0, 0.62, 0, LIME, DG), bx, base - 30))
    return svg(1200, 900, b)
