"""Genera los SVG de ilustraciones en docs/presentacion/assets/ilustraciones/.

    python -I docs/presentacion/ilustraciones-build/build_svgs.py
    python -I docs/presentacion/ilustraciones-build/render.py --preview <dir>
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # -I no agrega la carpeta del script

OUT = HERE.parent / "assets" / "ilustraciones"

import scenes_grandes as G  # noqa: E402
import scenes_pasos as P  # noqa: E402
import scenes_pila as PL  # noqa: E402

SCENES = {
    "pila-plasticos": PL.pila_plasticos,
    "paso-1-registro": P.paso_1_registro,
    "paso-2-publicar": P.paso_2_publicar,
    "paso-3-alerta": P.paso_3_alerta,
    "paso-4-retiro": P.paso_4_retiro,
    "paso-5-confirmar": P.paso_5_confirmar,
}

SCENES.update({
    "mapa-radios": G.mapa_radios,
    "carreton-reciclador": G.carreton_reciclador,
    "fabrica-resina": G.fabrica_resina,
    "comercio-restaurante": G.comercio_restaurante,
})

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in SCENES.items():
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print("svg", name)
