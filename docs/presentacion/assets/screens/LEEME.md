# Capturas de Reciclamigo para la presentación

Generadas el 31/10/2026 con `docs/presentacion/capturas/capturar.mjs` (Playwright, Chromium, `deviceScaleFactor` 2) contra el servidor de desarrollo en `http://localhost:3100`. Solo lectura: no se envió ningún formulario, no se reservó ni confirmó nada, no se corrió el seed ni `/demo/reset`. Entradas con los botones de cuenta demo de `/entrar` (las sesiones solo viven en memoria).

Para repetir todo: `node docs/presentacion/capturas/capturar.mjs` (o solo algunas: `node docs/presentacion/capturas/capturar.mjs m-mapa d-plan`).

Tamaños en píxeles reales. Móvil = ventana de 390x844 (PNG de 780 de ancho); escritorio = ventana de 1440 (PNG de 2880 de ancho). Los recortes terminan entre filas para que no quede ninguna fila cortada.

## Móvil

| Archivo | Píxeles | Qué muestra | Observaciones |
|---|---|---|---|
| `m-publicar.png` | 780x1688 | `/comercio/publicar` como Comedor La Ceiba, formulario relleno sin enviar: PET elegido y 90 lb. | Desplazada 112 px para que el campo de libras salga completo. El día (mañana) y la franja 9:00 a 11:00 son los valores por defecto y quedan debajo; no se ven. Venta es la modalidad por defecto. No se agregaron fotos. |
| `m-mis-lotes.png` | 780x1688 | `/comercio`, sección "Mis lotes", desplazada al título. 3 lotes activos publicados (LDPE 10 lb, HDPE 50 lb, PP 301.5 lb) y el primer lote confirmado. | La última tarjeta visible queda cortada por el borde de la pantalla (scroll natural). No hay lotes reservados en el seed para este comercio: todos están "Esperando reciclador". |
| `m-mapa.png` | 780x1688 | `/reciclador` como Don José: "13 lotes publicados a 3 km", círculo de 3 km, pines de colores por plástico, teselas de OpenStreetMap cargadas. | Sin la tarjeta de bienvenida "No tienes que descargar nada" (se marcó como vista en el navegador de la captura). La etiqueta "Tu ubicación" tapa parcialmente dos pines. Solo se ve el mapa y los filtros empiezan abajo. |
| `m-lote.png` | 780x1688 | Ficha del lote abierta desde el mapa (`/reciclador?lote=<id>`): HDPE 222.1 lb de Cafetería La Santaneca, a 585 m, foto, "$0.08/lb de referencia, $17.77 sugerido", reputación, insignias y botón "Reservar y abrir WhatsApp" (NO se pulsó). | La "foto" es una ilustración del seed (`/seed/hdpe.svg`), no una foto real. La ventana de retiro dice "jue 29 oct 9:00–11:00", que ya pasó (ver "Datos del seed"). `/lote/[id]` es otra pantalla (el enlace de WhatsApp) y no tiene foto ni botón de reservar; por eso se usó la ficha del mapa. |
| `m-retiros.png` | 780x1688 | `/reciclador/retiros` como Don José: "Por recoger" (LDPE 130 lb, Hotel Colonial del Parque, "Esperando que el comercio registre la entrega") y "Confirmados en los últimos 30 días". | FALTA el estado "Listos para confirmar": el seed no tiene ningún retiro en ese estado, así que no se puede mostrar sin escribir en la base. |
| `m-comprobante.png` | 780x2894 | `/comprobantes/RCA-2026-248674` (página completa): PET 140.7 lb (63.8 kg), 127.6 kg de CO₂, Comedor La Ceiba y Don José, venta a $0.09/lb, total $12.66, QR. | El QR y el texto de verificación apuntan a `http://localhost:3000/comprobantes/...` (ver "Cosas raras"). La cifra grande "140.7 lb (1.4 qq)" se parte en dos líneas en móvil. |

## Escritorio

| Archivo | Píxeles | Qué muestra | Observaciones |
|---|---|---|---|
| `d-plan.png` | 2880x1800 | `/comercio/plan`: tabla completa de 12 filas, Gratis vs Plan Trazabilidad ($14.99/mes). | Desplazada para que la tabla entera quepa; quedan fuera el estado del plan y el título. Se ve con la barra superior de la cuenta de Comedor La Ceiba. |
| `d-planes-publico.png` | 2880x3358 | `/planes` (pública, sin sesión), página completa: título, tabla, "Cómo se activa el plan" y "¿Eres reciclador?". | Es alta (1440x1679): no cabe en una ventana de 900. Recortar a gusto. |
| `d-reportes.png` | 2880x1730 | `/comercio/reportes`: título y lista de meses con "Descargar PDF" (octubre de 2026 "Mes en curso" hasta abril). | Recortada a 1440x865 para terminar entre filas; la lista real llega a 12 meses. |
| `d-impacto.png` | 2880x1554 | `/comercio`: plan activo, "Tu impacto" (2,633.8 lb (26.3 qq), 2.39 t de CO₂, $110.73, 8 entregas confirmadas) y la tarjeta "Comercio Circular" con QR. | Recortada a 1440x777, antes de "Mis lotes". La URL bajo la tarjeta dice `http://localhost:3000/circular/comedor-la-ceiba`. |
| `d-admin-planes.png` | 2880x1766 | `/admin/planes` como Equipo Reciclamigo: descripción del plan y las 3 primeras tarjetas (Comedor La Ceiba, Hotel Colonial del Parque, Supermercado La Cosecha, todos con Plan Trazabilidad activo). | Recortada a 1440x883. La lista real tiene 12 comercios (9 con plan gratis más abajo). El campo "Activo hasta" muestra 30/11/2026 mientras la etiqueta dice "activo hasta 28 sept 2027" (ver "Cosas raras"). |
| `d-admin-comisiones.png` | 2880x1800 | `/admin/comisiones?mes=2026-06`: resumen por comprador (Centro de Acopio Mejicanos, 1 entrega, $44.09, comisión 3 % = $1.32, cobrada) y detalle con comprobante RCA-2026-0C5A73. | `/admin/comisiones` sin parámetro (octubre de 2026) está vacío: "No hay comisiones en octubre de 2026". Septiembre y octubre no tienen datos; mayo a agosto tienen una compra cada mes (se eligió junio, la más representativa; agosto es la más reciente). Todas están "Cobrada": no hay ninguna "Pendiente" para mostrar. |
| `d-insignia.png` | 2880x2008 | `/circular/comedor-la-ceiba` (pública, sin sesión), página completa: insignia "Comercio Circular", 2,633.8 lb (26.3 qq), 2.39 t de CO₂, 8 entregas, última entrega 3 de octubre de 2026, QR. | El slug salió del enlace "Ver mi página" de `/comercio`. El QR y la dirección escrita apuntan a `http://localhost:3000/circular/comedor-la-ceiba`. |
| `d-portada.png` | 2880x1670 | `/` (pública): título, mapa de demostración y boleta de comprobante. | Recortada a 1440x835 justo antes del pie, por lo que la franja "Metas del piloto, primer año" no aparece. Queda bastante aire blanco bajo el contenido. |

## Reporte mensual en PDF

El PDF se descargó con la sesión del comercio (`/comercio/reportes/<mes>/pdf`, respuesta 200) y se guardó junto al script.

| Archivo | Píxeles | Qué muestra | Observaciones |
|---|---|---|---|
| `reporte-pdf.png` | 1400x1980 | Primera (y única) página del reporte de octubre de 2026 (`docs/presentacion/capturas/reporte-2026-10.pdf`): PET 614.7 lb (278.8 kg), 2 entregas, 557.6 kg de CO₂, lista de 2 comprobantes. | Página A4 completa: más de la mitad queda en blanco. Solo trae PET. |
| `reporte-pdf-recorte.png` | 1400x1038 | Igual, recortada al contenido (sin el vacío ni el pie). | Más práctica para una diapositiva. |
| `reporte-pdf-2026-06.png` | 1400x1980 | Reporte de junio de 2026 (`reporte-2026-06.pdf`): 3 plásticos (PET, HDPE, PS), 1,023.8 lb (464.4 kg), 3 entregas, 928.8 kg de CO₂. | Alternativa más rica visualmente (tres colores de plástico). Recomendada si se quiere mostrar "libras por tipo". |
| `reporte-pdf-2026-06-recorte.png` | 1400x1158 | Igual, recortada al contenido. | |

## Datos del seed que conviene saber

- Hoy es 31/10/2026 y las ventanas de retiro de los lotes publicados caen el 29 y 30 de octubre (algunas dicen "Hoy"). En `m-lote.png`, `m-retiros.png` y el listado del mapa se leen fechas ya vencidas. Conviene volver a correr el seed el día del evento y repetir las capturas de móvil.
- El comercio demo tiene 8 entregas confirmadas y 2,633.8 lb; las cifras de la pantalla, la insignia y el PDF cuadran entre sí (libras, kg y CO₂ con 2 kg por kg).
- Plan Trazabilidad del Comedor La Ceiba: activo hasta 28 sept 2027, por eso reportes, historial completo e insignia con QR se ven completos.

## Cosas raras en la app

- Los QR (comprobante, insignia, tarjeta de `/comercio`) y las direcciones escritas apuntan a `http://localhost:3000/...`. Es `NEXT_PUBLIC_SITE_URL` de `.env.local`. En una proyección el QR llevaría a localhost: hay que poner el dominio público en esa variable y repetir `m-comprobante`, `d-insignia` y `d-impacto`. Lo mismo ocurre con el enlace del mensaje de WhatsApp.
- `/admin/planes`: el campo "Activo hasta" de comercios con plan activo trae por defecto 30/11/2026 (hoy + 30 días, es la fecha sugerida para renovar), mientras la etiqueta de al lado dice "activo hasta 28 sept 2027". Se lee como una contradicción.
- El PDF escribe "CO2" y "kg de CO2" sin subíndice, mientras la app usa "CO₂".
- Sin errores ni avisos de consola, páginas con error ni respuestas HTTP 4xx/5xx durante las capturas.
