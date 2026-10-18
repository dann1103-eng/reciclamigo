# Guion de la presentación: Reciclamigo

Demo en vivo para el jurado del Reto DINAMICA Express 2026. Una sola pantalla que cambia de rol. **Objetivo: menos de 5 minutos.**

URL: https://reciclamigo.vercel.app

## El día anterior

- [ ] Abrir la app y entrar con una cuenta demo. Supabase gratis se pausa tras 7 días sin uso; si está pausado, se reactiva desde el panel de Supabase.
- [ ] Guardar como marcador la página de reinicio: `https://reciclamigo.vercel.app/demo?token=<DEMO_RESET_TOKEN>`. El token está en `.env.local`; **no lo escribas en ningún documento ni chat público**.
- [ ] Ensayo completo con el guion de abajo, en la misma laptop y el mismo navegador de la presentación. Así el mapa de Santa Ana queda en caché.
- [ ] Grabar un video de respaldo del guion completo en producción.
- [ ] Probar la app con el hotspot del celular.
- [ ] Tener a mano un celular con cámara, para escanear el QR del certificado.

## 15 minutos antes

- [ ] Abrir el marcador de reinicio y pulsar **Reiniciar demo**. Debe decir "Demo reiniciado: 21 cuentas, 80 lotes y 60 retiros completados".
- [ ] Abrir `https://reciclamigo.vercel.app` en una sola pestaña, a pantalla completa (F11), con el zoom del navegador al 100 %.
- [ ] Silenciar notificaciones de la laptop.

## Guion

| # | Pantalla | Qué hacer | Qué decir (una idea) | Tiempo |
|---|---|---|---|---|
| 0 | Portada | Mostrar la portada. | "El plástico de un restaurante tiene comprador a 3 km; hoy termina en el vertedero." | 15 s |
| 1 | Entrar → **Comercio** | Comedor La Ceiba → **Publicar lote**: PET, 40 kg, una foto, mañana 9:00 a 11:00, venta → **Publicar lote**. | "Publicar un lote toma menos de un minuto, desde el celular." | 50 s |
| 2 | **Reciclador** (selector de arriba) | Mostrar el mapa a 3 km. Cambiar a 1 km y 5 km. Tocar el lote de 40 kg del Comedor La Ceiba. Mostrar la ficha (foto, total sugerido, calificación). Mencionar **Contactar por WhatsApp**. **Reservar retiro**. | "Don José ve lo que hay cerca y reserva. Sin intermediarios y con precio transparente." | 60 s |
| 3 | **Comercio** | En "Mis lotes": "Don José reservó tu lote…" → **Marcar como entregado**. | "El comercio confirma que entregó." | 20 s |
| 4 | **Reciclador** → **Mis retiros** | **Confirmar retiro**: 38,5 kg, efectivo → **Confirmar retiro**. Leer el resumen de kg y CO₂e. | "Se registran los kilos reales; el pago se registra, no se procesa." | 30 s |
| 5 | **Ver certificado** | Mostrar el certificado y escanear el QR con el celular. | "Trazabilidad para la Ley ANDRES: cualquiera lo verifica con el QR." | 30 s |
| 6 | Calificar | 5 estrellas (opcional, si sobra tiempo). | "Reputación para los dos lados." | 10 s |
| 7 | **Comercio** → Tu impacto | *(cuando esté el Track B)* kg desviados, CO₂e, ingresos. | "Su reporte ESG sale solo." | 20 s |
| 8 | **Reportes** | *(cuando esté el Track B)* mapa de calor y ranking. | "La alcaldía ve datos agregados, sin datos personales." | 20 s |
| 9 | Portada | Volver al inicio y mostrar las metas del piloto. | "180 toneladas y 35 recicladores formalizados en el primer año." | 15 s |

Si el tiempo aprieta, salta los pasos 6 y 8.

## Plan B

| Si pasa esto | Haz esto |
|---|---|
| El internet del lugar falla | Hotspot del celular. Si tampoco hay, el video de respaldo. |
| Sale "No se pudo cambiar de cuenta" | Esperar dos segundos y volver a tocar. El aviso no rompe la página. |
| Una pantalla dice "Algo falló al cargar esta pantalla" | **Reintentar**; si sigue, **Volver a entrar**. |
| Los datos se ven raros (alguien usó la URL pública) | Marcador de reinicio → **Reiniciar demo** → volver a entrar. |
| La app no responde en absoluto | Supabase puede estar en pausa: el video de respaldo, y reactivarlo después. |

## Preguntas probables del jurado

- **¿Procesan pagos?** Hoy se registra el método (efectivo con comprobante, transferencia, Chivo Wallet). Integrar pagos es la siguiente fase.
- **¿Y los recicladores sin smartphone?** El botón de WhatsApp ya conecta a ambas partes. El chatbot por WhatsApp está en el plan del piloto.
- **¿El certificado tiene validez legal?** Es la versión piloto. El formato está pensado para la Ley ANDRES y se validará con la autoridad.
- **¿Los datos son reales?** Son de ejemplo: nombres ficticios con ubicaciones realistas en Santa Ana y San Salvador.
- **¿Qué ve la alcaldía?** Solo totales y mapas agregados. No ve teléfonos, direcciones ni puede operar.
- **¿Cuánto cuesta mantenerlo?** Supabase y Vercel tienen planes gratuitos o de bajo costo para el piloto.
