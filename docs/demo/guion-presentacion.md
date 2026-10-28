# Guion de la presentación: Reciclamigo

Demo en vivo para el jurado del Reto DINAMICA Express 2026. Una sola pantalla que cambia de rol. **Objetivo: menos de 5 minutos.**

URL: https://reciclamigo.vercel.app

## El día anterior

- [ ] Abrir la app y entrar con una cuenta demo. Supabase gratis se pausa tras 7 días sin uso; si está pausado, se reactiva desde el panel de Supabase.
- [ ] Confirmar que las 8 migraciones `20261028*` están aplicadas: `npm run db:status` debe decir `0 pendientes`.
- [ ] Guardar como marcador la página de reinicio: `https://reciclamigo.vercel.app/demo?token=<DEMO_RESET_TOKEN>`. El token está en `.env.local`; **no lo escribas en ningún documento ni chat público**.
- [ ] Ensayo completo con el guion de abajo, en la misma laptop y el mismo navegador de la presentación. Así el mapa de Santa Ana queda en caché.
- [ ] Grabar un video de respaldo del guion completo en producción.
- [ ] Probar la app con el hotspot del celular.
- [ ] Tener a mano un celular con cámara, para escanear el QR del comprobante. Si se va a mostrar el aviso push, abrir la app instalada en ese celular y activar los avisos antes.
- [ ] Reservar abre WhatsApp en otra pestaña (en la laptop, WhatsApp Web). Tenerlo listo o cerrar la pestaña al volver.

## 15 minutos antes

- [ ] Abrir el marcador de reinicio y pulsar **Reiniciar demo**. Debe decir "Demo reiniciado: 22 cuentas, 80 lotes y 60 retiros completados".
- [ ] Abrir `https://reciclamigo.vercel.app` en una sola pestaña, a pantalla completa (F11), con el zoom del navegador al 100 %.
- [ ] Silenciar notificaciones de la laptop.

## Guion

| # | Pantalla | Qué hacer | Qué decir (una idea) | Tiempo |
|---|---|---|---|---|
| 0 | Portada | Mostrar la portada. | "El plástico de un restaurante tiene comprador cerca; hoy termina en el vertedero." | 15 s |
| 1 | Entrar → **Comercio** | Comedor La Ceiba → **Publicar lote**: PET, 90 lb, una foto, mañana 9:00 a 11:00, venta → **Publicar lote**. | "Publicar un lote toma menos de un minuto, desde el celular. Todo en libras, como se compra aquí." | 50 s |
| 2 | **Reciclador** (selector de arriba) | Mostrar el mapa a 3 km. Cambiar a 1 km y 5 km. Tocar el lote de 90 lb del Comedor La Ceiba. Mostrar la ficha (foto, precio de referencia, reputación). **Reservar y abrir WhatsApp**: se abre el chat con el mensaje listo (código del lote, plástico, libras y enlace). | "Don José ve lo que hay cerca y reserva. El mensaje ya va escrito; la conversación pasa en WhatsApp." | 60 s |
| 3 | **Comercio** | En "Mis lotes": "Don José reservó tu lote…" → **Registrar entrega**: 95 lb → **Registrar**. | "El comercio anota lo que pesó de verdad. Todavía no cuenta: falta que el reciclador lo acepte." | 25 s |
| 4 | **Reciclador** → **Mis retiros** | "Listos para confirmar": **Corregir** → 94 lb → **Confirmar con mis datos** (o **Aceptar 95 lb**). Leer el resumen de libras y CO₂. | "Los dos confirman el peso. Solo una entrega confirmada genera comprobante, puntos y reputación." | 35 s |
| 5 | **Ver comprobante** | Mostrar el comprobante y escanear el QR con el celular. | "Cualquiera lo verifica con el QR. Documenta la entrega; no es un permiso ni lo emite una autoridad." | 30 s |
| 6 | Calificar | 5 estrellas (opcional, si sobra tiempo). | "Reputación para los dos lados." | 10 s |
| 7 | **Comercio** → **Plan** | Mostrar la tabla Gratis vs Plan Trazabilidad. | "Vender siempre es gratis. El plan es para quien necesita documentar lo que recicla." | 25 s |
| 8 | **Comercio** → **Reportes** | Descargar el reporte de trazabilidad del mes (PDF). Mostrar la insignia "Comercio Circular" con su QR. | "Su reporte sale solo, con libras, kg entre paréntesis y CO₂ evitado." | 30 s |
| 9 | Selector → **Administración** | **Planes**: el administrador activa y desactiva el plan a mano. **Comisiones**: resumen del mes por comprador de volumen. | "Sin pasarela de pago por ahora: el equipo activa el plan. La comisión solo se calcula y se registra." | 30 s |
| 10 | Portada | Volver al inicio y mostrar las metas del piloto. | "Casi 400 mil libras y 35 recicladores formalizados en el primer año." | 15 s |

Si el tiempo aprieta, salta los pasos 6, 8 y 9.

## Plan B

| Si pasa esto | Haz esto |
|---|---|
| El internet del lugar falla | Hotspot del celular. Si tampoco hay, el video de respaldo. |
| Sale "No se pudo cambiar de cuenta" | Esperar dos segundos y volver a tocar. El aviso no rompe la página. |
| Una pantalla dice "Algo falló al cargar esta pantalla" | **Reintentar**; si sigue, **Volver a entrar**. |
| Los datos se ven raros (alguien usó la URL pública) | Marcador de reinicio → **Reiniciar demo** → volver a entrar. |
| La app no responde en absoluto | Supabase puede estar en pausa: el video de respaldo, y reactivarlo después. |
| Al reservar no se abre WhatsApp | El navegador bloqueó la ventana: en **Mis retiros** está el botón "Contactar por WhatsApp" con el mismo mensaje. |

## Preguntas probables del jurado

- **¿Procesan pagos?** Hoy se registra el método (efectivo con comprobante, transferencia, Chivo Wallet). Integrar pagos es la siguiente fase. El Plan Trazabilidad también lo activa el equipo a mano.
- **¿Cuánto cobran?** Vender es gratis para comercios y recicladores. El Plan Trazabilidad cuesta $14.99 al mes y es solo para comercios que necesitan documentar lo que reciclan. Los compradores de volumen pagan una comisión del 3 % sobre sus compras confirmadas; los recicladores de base, 0 %.
- **¿Y los recicladores sin smartphone?** No necesitan descargar nada: entran desde un enlace o un QR y coordinan por WhatsApp, que ya usan. Recibir avisos de lotes cercanos pide un teléfono con navegador; sin eso, igual ven los lotes en el mapa.
- **¿El comprobante tiene validez legal?** No: documenta las entregas registradas en Reciclamigo y puede respaldar la gestión de residuos de la empresa. No es un permiso ni un documento emitido por una autoridad.
- **¿Los datos son reales?** Son de ejemplo: nombres ficticios con ubicaciones realistas en Santa Ana y San Salvador.
- **¿Qué ve la alcaldía?** Solo totales y mapas agregados. No ve teléfonos, direcciones ni puede operar.
- **¿Cuánto cuesta mantenerlo?** Solo Vercel y Supabase. Los avisos usan Web Push estándar, sin servicio de pago.
