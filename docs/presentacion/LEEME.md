# Presentación de Reciclamigo · DINAMICA FEST 2026

Archivos para llevar el día del evento:

- `Reciclamigo_DINAMICA_FEST_2026.pptx`: la presentación editable (18 láminas, 16:9, con notas del orador).
- `Reciclamigo_DINAMICA_FEST_2026.pdf`: respaldo exacto por si el equipo del evento no tiene las mismas fuentes. Llévalo en una USB junto al `.pptx`.

## De dónde salen los datos

Todas las cifras salen del plan de negocios y de marketing v2 (`Reciclamigo_plan_de_negocios_y_plan_de_mkt_v2.docx`). No se usó el borrador anterior (`Presentacion_RECICLAMIGO_UNICAES_DINAMICA.pptx`): tenía planes de US$9.99, US$25 y US$60, una inversión de US$6,400 y metas del anteproyecto viejo. Lo que el plan v2 no respalda (por ejemplo "8,000+ empleos" o el cofinanciamiento del BCIE, KfW y la UE) se dejó fuera.

El plan habla en kilos y toneladas; la app, en libras. Las láminas de negocio usan toneladas y las capturas muestran lo que muestra la app.

## Marca

Colores del manual de marca: `#0b4633`, `#cdf07b`, `#cdecb2`, `#6e9862`. La tipografía oficial es Karst, que no viene con Office: las láminas usan Arial y Calibri, y Impact para las cifras grandes (parecida al titular condensado de la portada del manual). Si instalas Karst, cambia `headFontFace` y `bodyFontFace` en `build/construir.mjs`.

El logo vectorizado (`assets/brand/marca.svg`) sale del logo oficial. La app lo usa en `src/components/brand/` y en el ícono de la PWA.

## Regenerar la presentación

Requiere Node 20 o superior, Python 3 con `pillow`, `numpy` y `pymupdf`, y PowerPoint (solo para exportar el PDF y revisar).

```bash
cd docs/presentacion/build
npm install
python -I preparar_marca.py      # variantes del logo y del arte halftone
python -I preparar_marcos.py     # marcos de teléfono y navegador para las capturas
node construir.mjs               # escribe el .pptx
```

Para exportar el PDF y una imagen por lámina (en `revision/`):

```powershell
powershell -File build/exportar.ps1 -Pptx Reciclamigo_DINAMICA_FEST_2026.pptx -OutDir revision -Pdf Reciclamigo_DINAMICA_FEST_2026.pdf
```

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `assets/brand` | Logo original, marca vectorizada y arte halftone de la portada del manual |
| `assets/marca` | Variantes de color de la marca (generadas) |
| `assets/ilustraciones` | Ilustraciones en SVG y PNG |
| `assets/screens` | Capturas de la app (ver `LEEME.md` dentro) |
| `assets/marcos` | Capturas con marco de teléfono o navegador (generadas) |
| `capturas` | Script de Playwright que toma las capturas |
| `build` | Generador de la presentación |
