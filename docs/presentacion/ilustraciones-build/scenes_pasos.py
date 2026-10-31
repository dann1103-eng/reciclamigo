"""Iconos de los 5 pasos (600x600) sobre disco comun de verde medio."""
from lib import *

PIN_D = ("M{cx} {tip} C{a} {b} {c} {d} {c} {cy} A{R} {R} 0 0 1 {e} {cy} "
         "C{e} {d} {f} {b} {cx} {tip} Z")


def big_pin_d(cx, cy, R, tip):
    return PIN_D.format(cx=cx, tip=tip, a=cx - 40, b=tip - 80, c=cx - R, d=cy + 88, cy=cy, R=R, e=cx + R, f=cx + 40)


def paso_1_registro():
    b = disc_bg()
    cx, cy, R, tip = 300, 250, 132, 492
    b.append(ground_shadow(cx, tip + 2, 100, 17, 0.24))
    d = big_pin_d(cx, cy, R, tip)
    b.append(g(path(d, mix(LIME, INK, 0.16)), 0, 0))
    b.append(g(path(d, LIME), -9, -6))
    b.append(hi(cx - 112, cy - 70, 16, 70, None, 0.42))
    # disco interior
    b.append(circle(cx - 9, cy - 6, 92, DG))
    s = []
    # toldo a franjas
    s.append(rect(-50, -44, 100, 38, LIME, 10))
    s.append(rect(-25, -44, 25, 38, WHITE))
    s.append(rect(25, -44, 25, 38, WHITE, 10))
    s.append(rect(25, -44, 12, 38, WHITE))
    for i, x in enumerate((-37.5, -12.5, 12.5, 37.5)):
        s.append(circle(x, -6, 12.5, LIME if i % 2 == 0 else WHITE))
    # fachada
    s.append(rect(-40, 14, 80, 56, LIME, 8))
    s.append(rect(-28, 28, 24, 24, DG, 6))
    s.append(rect(8, 28, 22, 42, DG, 6))
    b.append(g(s, cx - 9, cy - 14, 0, 1.12))
    # check
    b.append(circle(cx + 106, cy + 112, 56, LIME))
    b.append(circle(cx + 106, cy + 112, 46, DG))
    b.append(check(cx + 106, cy + 114, 58, LIME, 16))
    return svg(600, 600, b)


def paso_2_publicar():
    b = disc_bg()
    b.append(ground_shadow(262, 492, 160, 17, 0.24))
    # segunda botella asomando por detras de la caja
    b.append(bottle(330, 440, 1.0, 9, PET))
    # caja tipo cajon (baja, para que se vean las botellas)
    b.append(rect(112, 372, 282, 118, LIME, 24))
    b.append(shade(112, 456, 282, 34, 24, 0.12))
    b.append(shade(320, 372, 74, 118, 24, 0.09))
    b.append(rect(100, 356, 306, 40, mix(LIME, WHITE, 0.5), 20))
    b.append(rect(218, 412, 80, 20, DG, 10))
    # botella PET principal (delante)
    b.append(bottle(178, 496, 1.14, -6, PET))
    # camara
    cam = [
        rect(-72, -46, 144, 100, DG, 26),
        rect(-44, -66, 52, 30, DG, 12),
        circle(0, 4, 40, LIME),
        circle(0, 4, 27, DG),
        circle(0, 4, 12, mix(LIME, WHITE, 0.3)),
        circle(-8, -4, 5, WHITE, 0.85),
        circle(48, -24, 10, LIME),
    ]
    b.append(g(cam, 430, 176, 8, 1.0))
    # etiqueta con balanza colgando de la caja
    b.append(stroke("M380 392 C396 358 430 352 446 376", WHITE, 7))
    tag = [
        rect(-54, -2, 108, 134, WHITE, 24),
        shade(10, -2, 44, 134, 24, 0.08),
        circle(0, 24, 10, DG),
        rect(-5, 50, 10, 54, DG, 5),
        rect(-24, 98, 48, 13, DG, 6.5),
        rect(-38, 54, 76, 10, DG, 5),
        rpoly([(-47, 88), (-23, 88), (-29, 72), (-41, 72)], 3, DG),
        rpoly([(23, 88), (47, 88), (41, 72), (29, 72)], 3, DG),
    ]
    b.append(g(tag, 452, 376, 12, 0.98))
    return svg(600, 600, b)


def paso_3_alerta():
    b = disc_bg()
    cx = cy = 300
    for r, op in ((250, 0.1), (172, 0.14), (96, 0.2)):
        b.append(circle(cx, cy, r, WHITE, op))
    for r, op in ((250, 0.55), (172, 0.7), (96, 0.9)):
        b.append(ring(cx, cy, r, WHITE, 11, op))
    bell = []
    bell.append(circle(0, -118, 20, LIME))
    body = ("M-118 70 C-90 62 -76 44 -74 4 C-72 -62 -42 -112 0 -112 C42 -112 72 -62 74 4 "
            "C76 44 90 62 118 70 Z")
    bell.append(path(body, LIME))
    bell.append(path("M22 -108 C54 -96 72 -56 74 4 C76 44 90 62 118 70 L22 70 Z", INK, 0.13))
    bell.append(hi(-58, -70, 14, 76, None, 0.42))
    bell.append(rect(-126, 58, 252, 36, mix(LIME, INK, 0.1), 18))
    bell.append(circle(0, 114, 26, DG))
    b.append(g(bell, cx, cy - 6, 0, 1))
    # pin pequeno sobre el anillo de 3 km
    b.append(pin(446, 236, 74, 104, HDPE))
    return svg(600, 600, b)


def paso_4_retiro():
    b = disc_bg()
    # globo de chat con cola integrada
    b.append(rpoly([(196, 214), (172, 306), (276, 236)], 12, LIME))
    b.append(rect(138, 70, 324, 190, LIME, 64))
    b.append(shade(340, 70, 122, 190, 64, 0.08))
    b.append(hi(166, 92, 14, 54, None, 0.42))
    # auricular: arco grueso con dos bocinas
    ph = [
        stroke("M-53.7 -37.3 A84 84 0 0 0 22.7 53.7", DG, 30),
        g(rect(-30, -21, 60, 42, DG, 15), -52, -48, 5),
        g(rect(-21, -30, 42, 60, DG, 15), 34, 54, 5),
    ]
    b.append(g(ph, 314, 150, 0, 1))
    # check pequeno
    b.append(circle(428, 240, 40, DG))
    b.append(check(428, 242, 44, LIME, 13))
    # triciclo de carga
    b.append(ground_shadow(300, 514, 168, 13, 0.22))
    t = []
    t.append(stroke("M-150 78 L-120 6", WHITE, 14))
    t.append(stroke("M-120 6 L-104 -22 L-150 -22", WHITE, 13))
    t.append(stroke("M-120 6 L-14 66 L60 66", WHITE, 13))
    t.append(stroke("M-14 66 L-8 20", WHITE, 12))
    t.append(rect(-34, 8, 54, 16, DG, 8))
    # caja de carga
    t.append(rect(30, -8, 160, 84, DG, 16))
    t.append(shade(140, -8, 50, 84, 16, 0.13))
    t.append(rect(24, -20, 172, 26, LIME, 13))
    # costal y botella
    t.append(rpoly([(58, -18), (150, -18), (160, -60), (142, -88), (66, -88), (48, -60)], 18, LG))
    t.append(rpoly([(150, -34), (158, -58), (140, -84), (124, -84)], 12, INK, 0.1))
    t.append(rect(84, -102, 40, 20, mix(LG, INK, 0.14), 10))
    t.append(rect(88, -92, 32, 8, mix(LG, INK, 0.4), 4))
    t.append(bottle(176, -14, 0.5, 18, PET))
    t.append(wheel(-150, 78, 50))
    t.append(wheel(104, 82, 56))
    b.append(g(t, 304, 402, 0, 1.0))
    return svg(600, 600, b)


def paso_5_confirmar():
    b = disc_bg()
    # argolla y cuerpo de la bascula
    b.append(ring(300, 54, 22, WHITE, 11))
    b.append(stroke("M300 74 L300 106", WHITE, 12))
    b.append(rect(208, 100, 184, 148, DG, 38))
    b.append(shade(318, 100, 74, 148, 38, 0.18))
    b.append(rect(230, 122, 140, 66, LIME, 18))
    b.append(rect(248, 142, 86, 26, DG, 13))
    b.append(circle(350, 155, 9, DG))
    for x in (262, 300, 338):
        b.append(circle(x, 214, 12, LIME))
    # gancho y asa
    b.append(stroke("M300 248 L300 336", WHITE, 12))
    b.append(stroke("M256 412 C254 334 346 334 344 412", LG, 17))
    b.append(ring(300, 352, 19, WHITE, 11))
    # bolsa tipo tote (eco del logotipo): cuerpo ancho y bajo
    b.append(ground_shadow(296, 546, 104, 11, 0.2))
    bag = [(190, 404), (410, 404), (406, 538), (194, 538)]
    b.append(rpoly(bag, [14, 14, 36, 36], LG))
    b.append(rpoly([(338, 404), (410, 404), (406, 538), (346, 538)], [10, 10, 30, 14], INK, 0.08))
    b.append(rect(192, 452, 216, 26, mix(LG, MG, 0.5), 0))
    b.append(shade(204, 508, 192, 30, 16, 0.07))
    # botella al frente
    b.append(bottle(266, 548, 1.0, 38, PET))
    # sello
    b.append(seal(436, 470, 64))
    return svg(600, 600, b)
