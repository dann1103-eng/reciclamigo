# Reciclamigo — Diseño del MVP (demo para el Reto DINAMICA Express 2026)

## Contexto

Reciclamigo es un mercado circular digital que conecta **generadores** de plástico post-consumo (restaurantes, hoteles, comercios, hogares) con **valorizadores** (recicladores de base, centros de acopio, transformadores) en El Salvador (piloto: Santa Ana y AMSS). La propuesta oficial (PDF "Propuesta de Proyecto_Reciclamigo") describe un flujo de 5 pasos: registro → publicación de lote → búsqueda por proximidad → retiro/transacción → confirmación con kg, CO₂e y calificación; más extras (certificado ANDRES, WhatsApp, ESG, insignias, tableros municipales).

**Por qué ahora:** hay que presentar un **demo en vivo al jurado** del Reto DINAMICA Express en **menos de 2 semanas** (hoy: 2026-10-17). No es un piloto con usuarios reales todavía; el objetivo es que el jurado vea en 3–5 minutos que la idea es real y viable.

**Qué es "funcionó":** el equipo maneja en una sola pantalla, cambiando de rol, el ciclo completo: un comercio publica un lote → un reciclador lo ve en el mapa y lo reserva → se confirma el retiro con kg reales → el impacto (kg, CO₂e, ingresos) se actualiza, sale un certificado, y la alcaldía ve los totales.

## Metas, no-metas, anti-metas

**Metas**
- Ciclo central completo y real (datos en Supabase, no maquetas).
- **El mapa de lotes cercanos es la estrella** del demo (decidido por el usuario).
- Datos sembrados creíbles para que todo se vea con vida.
- Base de código que el colaborador pueda seguir después (no desechable).

**No-metas (fuera de este demo)**
- Pagos reales (Chivo Wallet, transferencias): solo se *registra* el método de pago.
- Chatbot de WhatsApp real (API de Meta): solo enlace `wa.me` con mensaje prellenado.
- 2FA, cifrado a nivel de campo, apps nativas iOS/Android, notificaciones push.
- Validez legal del certificado ANDRES.
- Tiempo real (Supabase Realtime): con una sola pantalla no aporta. *(mi decisión)*

**Anti-metas** *(mi lectura; corregir si no)*
- Que el demo falle en vivo (internet del lugar, GPS, datos vacíos, DB pausada).
- Que se vea como plantilla genérica.
- Presentar el certificado como documento legal ya válido.
- Usar nombres de negocios reales en los datos sembrados.

## Restricciones

- Fecha: < 2 semanas.
- Stack decidido por el usuario: **Supabase Cloud plan free** (DB) + **Vercel** (cuenta de pago del usuario) + repo **GitHub** compartido con un colaborador (link pendiente).
- Tecnología del equipo: **Next.js / React + TypeScript**.
- Demo en vivo, **una pantalla, cambiando de rol** (probablemente laptop proyectada).
- UI en español (es-SV, USD).
- Supabase free **pausa el proyecto tras 7 días sin actividad**: hay que abrir la app el día anterior a la presentación.

## Decisiones del usuario

| Tema | Decisión |
|---|---|
| Propósito | Demo para el concurso |
| Presentación | Demo en vivo, una pantalla cambiando de rol |
| Fecha | Menos de 2 semanas |
| Momento estrella | Mapa de lotes cercanos |
| Stack | Next.js + React + TS, Supabase free, Vercel |
| Identidad visual | No existe; la propone Claude |
| Extras | Los cuatro: certificado ANDRES, contacto WhatsApp, insignias/reputación, vista alcaldía |
| Prioridad si falta tiempo | 1) ciclo central + mapa → 2) tablero de impacto → 3) WhatsApp → 4) certificado → 5) insignias → 6) vista alcaldía |
| Día de presentación | La próxima semana (24–31 oct) |
| Colaborador | Programa en paralelo |
| Supabase | Aún no creado |

## El producto

### Roles y cuentas demo
Los **dos protagonistas** del mercado son **Comercio** (generador) y **Reciclador** (valorizador): solo ellos operan (publicar, reservar, entregar, completar, calificar).
**Alcaldía** (municipalidad) es un rol **de pura reportería** (decisión del usuario): solo lee totales agregados; no publica, no reserva, no califica, no aparece en el mapa ni en el flujo, y no ve datos personales de contacto (WhatsApp, direcciones exactas). Nada de lo que haga puede interferir en las operaciones entre comercios y recicladores.
Cuentas demo sembradas, con nombres ficticios: un restaurante en Santa Ana centro, "Don José" reciclador de base en Santa Ana (con muchos lotes a 1–5 km), y "Alcaldía de Santa Ana".
**Selector "Ver como: Comercio | Reciclador"** en el encabezado: cambia de cuenta en un toque. La alcaldía queda aparte, como un enlace **"Reportes"** que entra con su cuenta de solo lectura. Por debajo usa el login real de Supabase (server action que hace `signInWithPassword` con la cuenta demo del rol; contraseña común en variable de entorno `DEMO_PASSWORD`). Solo activo con `NEXT_PUBLIC_DEMO_MODE=true`. *(mi decisión)*

### Recorrido del demo
1. **Entrada** (`/` → `/entrar`): portada breve con la propuesta de valor y tarjetas "Entrar como…".
2. **Comercio publica un lote** (`/comercio/publicar`): botones grandes por polímero (ícono + código de resina + color), kg estimados, hasta 3 fotos (Supabase Storage), ventana de retiro, modalidad (venta / trueque / donación). Precio sugerido automático = kg × precio/kg del polímero (0 en donación/trueque). Ubicación = la del perfil del comercio.
3. **Reciclador — mapa** (`/reciclador`, pantalla estrella): mapa OSM con su ubicación fija y pines de lotes publicados coloreados por polímero; filtros de radio **1 / 3 / 5 km** y por polímero; lista lateral ordenada por distancia (escritorio) o hoja inferior (móvil). Al tocar un pin: ficha con fotos, kg, precio sugerido, ventana, modalidad, distancia, reputación e insignias del comercio, botón **"Reservar retiro"** y botón **"Contactar por WhatsApp"**.
4. **Comercio ve la reserva** (`/comercio`): "Don José reservó tu lote — pasa mañana 9:00"; lo marca como **entregado**.
5. **Reciclador cierra** (`/reciclador/retiros`): confirma **kg reales** y método de pago (efectivo con comprobante / transferencia / Chivo Wallet — solo registrado). Se genera el certificado. Ambos se califican 1–5 estrellas.
6. **Tablero de impacto del comercio** (`/comercio`): kg desviados, **CO₂e evitado = kg × 2.0** (mismo factor de la propuesta: 180 t → 360 tCO₂e), **m³ de vertedero liberados = t × 3** (180 t → 540 m³), ingresos, historial mensual (con 6 meses previos sembrados), desglose por polímero.

### Extras
- **WhatsApp:** enlace `https://wa.me/<número>?text=<mensaje>` con mensaje prellenado ("Hola, soy Don José de Reciclamigo, voy por tu lote de 40 kg de PET…"). Números ficticios en seeds.
- **Certificado ANDRES** (`/certificados/[código]`, página pública): comercio, gestor, polímero, kg confirmados, fecha, CO₂e, código único y QR que apunta a la misma URL de verificación. Estilo imprimible (CSS `@media print`, se guarda como PDF desde el navegador). Marca discreta "Versión piloto". *(mi decisión)*
- **Insignias** (calculadas al vuelo, sin tabla): "Primer lote", "100 kg", "1 tonelada desviada", "5 estrellas" (promedio ≥ 4.8 con ≥ 3 calificaciones), "Reciclador verificado" (campo `verified`). Se muestran en `/perfil/[id]` y en fichas.
- **Vista alcaldía — solo reportes** (`/alcaldia`, sin botones de acción): mapa de calor de kg recuperados (retiros completados ponderados por kg, posiciones redondeadas por zona), totales por polímero, gráfico mensual, ranking de comercios por kg desviados. Se alimenta solo de vistas agregadas.

### Botón "Reiniciar demo" *(mi decisión)*
Acceso discreto (p. ej. `/demo/reset` o menú del selector), solo en modo demo: borra datos transaccionales y vuelve a sembrar el estado inicial. Se usa antes de cada ensayo y de la presentación. **Protegido con un token secreto** (`DEMO_RESET_TOKEN`, p. ej. `/demo/reset?token=…`) porque la URL de producción es pública: cualquiera puede entrar como rol demo (datos ficticios, aceptable), pero nadie sin el token puede borrar los datos antes de la presentación.

### Plan B para internet *(mi decisión)*
Todo depende de la red (Supabase cloud, Vercel, teselas del mapa). Respaldo: (1) hotspot del celular listo, (2) ensayo previo en la misma laptop/navegador para que las teselas de Santa Ana queden en caché, (3) video de respaldo grabado del guion completo en producción.

### Registro abierto *(mi decisión: prioridad 7, después de la vista alcaldía)*
`/registro` simple: rol, nombre, WhatsApp, ubicación tocando el mapa. Sin verificación real. Solo si sobra tiempo.

## Identidad visual *(mi decisión — dirección, el detalle lo resuelve el builder con el skill de diseño)*
- Tono: cercano y confiable, salvadoreño, no corporativo ni "eco genérico".
- Paleta base: verde profundo (coherente con el PDF) + un acento cálido; **cada polímero tiene un color fijo** usado igual en pines, chips, gráficos y certificado.
- Logotipo: wordmark "Reciclamigo" con un símbolo simple en SVG.
- Optimizado para proyector: alto contraste, tipografía grande; responsive (escritorio = mapa + panel lateral; móvil = mapa + hoja inferior).

## Arquitectura técnica *(mis decisiones)*

**Stack:** Next.js (última estable, App Router) + TypeScript + Tailwind CSS + shadcn/ui; `@supabase/ssr` para auth con cookies; Leaflet + react-leaflet (import dinámico sin SSR) con teselas OSM/CARTO; `leaflet.heat` para el mapa de calor; Recharts para gráficos; `qrcode` para el QR; lucide-react para íconos.

**Supabase:** Postgres + **PostGIS** + Auth + Storage (bucket público `lot-photos`). Migraciones versionadas en `supabase/migrations/` y aplicadas con Supabase CLI (`npx supabase db push`) para que el colaborador quede sincronizado. Ambos desarrollan contra el mismo proyecto cloud (sin Docker en Windows).

**Modelo de datos**
- `polymers` (code PK: PET/HDPE/LDPE/PP/PS, resin_number 1/2/4/5/6, name, color, price_per_kg). Precios: PET 0.20, HDPE 0.18 (de la propuesta); LDPE, PP, PS con valores provisionales editables.
- `profiles` (id = auth.users.id, role enum `generador|valorizador|municipalidad`, display_name, org_type, whatsapp, municipality, address, location `geography(Point)`, verified bool).
- `lots` (id, generator_id, polymer_code, estimated_kg, photo_urls text[], pickup_from/pickup_to timestamptz, modality enum `venta|trueque|donacion`, price_per_kg, status enum `publicado|reservado|entregado|completado|cancelado`, location geography, created_at).
- `pickups` (id, lot_id unique, collector_id, reserved_at, delivered_at, completed_at, confirmed_kg, total_amount, payment_method enum `efectivo|transferencia|chivo_wallet`, certificate_code unique).
- `ratings` (id, pickup_id, rater_id, ratee_id, stars 1–5, comment, unique(pickup_id, rater_id)).
- Vistas: `profile_impact` (kg, CO₂e, ingresos, rating promedio por perfil), `impact_monthly`, `impact_by_polymer`.

**Funciones (RPC, `security definer` con chequeo de `auth.uid()` y rol)**
- `nearby_lots(lat, lng, radius_m, polymers text[])` → lotes publicados con `ST_DWithin` y distancia.
- `reserve_lot(lot_id)` → atómico: solo si status = publicado; crea `pickup`.
- `mark_delivered(pickup_id)` (comercio dueño), `complete_pickup(pickup_id, confirmed_kg, payment_method)` (reciclador) → calcula total, genera `certificate_code`.
- `reset_demo()` → solo service role; limpia y re-siembra.

**RLS:** lectura pública de lotes publicados, perfiles y certificados; escritura solo del dueño; transiciones de estado solo vía RPC. Las RPC operativas (`reserve_lot`, `mark_delivered`, `complete_pickup`, calificar, publicar) rechazan el rol `municipalidad`. La alcaldía lee únicamente vistas agregadas (`impact_monthly`, `impact_by_polymer`, `impact_by_zone`, ranking), sin columnas de contacto.

**Seeds:** script TS `scripts/seed.ts` (Admin API con service role) crea usuarios demo + ~12 comercios y ~8 recicladores ficticios con coordenadas realistas en Santa Ana y San Salvador, ~20 lotes publicados, ~60 retiros completados en los 6 meses previos con calificaciones. Las fotos de lotes sembrados son ilustraciones por polímero en `/public/seed/`. El mismo contenido lo usa `reset_demo`.

**Variables de entorno** (`.env.example` en el repo; valores reales los pone el usuario en `.env.local` y en Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (solo servidor; las llaves legacy anon/service_role se retiran a fines de 2026), `DEMO_PASSWORD`, `DEMO_RESET_TOKEN`, `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_SITE_URL` (dominio de producción; el QR del certificado apunta ahí).

## Calendario y trabajo en paralelo

Presentación: **la próxima semana (24–31 oct)**. El colaborador **programa en paralelo**. Supabase **aún no existe**.

**Un solo proyecto Supabase** (decisión del usuario, 2026-10-17; ya creado): lo usan ambos devs, los preview deploys y producción. Los datos de demo se borran cuando llegue la producción real. Riesgo: un experimento o un "Reiniciar demo" afecta lo que ve el jurado; se mitiga con el congelamiento y reiniciando el demo antes de presentar. El colaborador debe ser miembro de la organización de Supabase.

**Reglas del repo** *(mi decisión)*
- `main` siempre desplegable; cada uno trabaja en ramas `feat/<área>` con PR y preview deploy de Vercel.
- Migraciones: un archivo nuevo por cambio con timestamp (`npx supabase migration new <nombre>`), nunca editar una ya fusionada; se aplican a `dev` al fusionar en `main`, y a `demo` solo en el congelamiento.
- Cada track toca sus propias carpetas de rutas/componentes; lo compartido (tipos de BD, cliente Supabase, UI base, utilidades de dominio) vive en la base y se cambia con aviso.

**Fases**
- **Fase 0 — Base (día 1–2, Daniel + Claude, bloquea todo lo demás):** proyecto Next.js en `C:\Users\Daniel\Desktop\Reciclamigo`, git, Tailwind/shadcn, identidad visual y layout, cliente Supabase, migraciones completas (PostGIS, tablas, enums, vistas, RLS, RPC), tipos generados, seeds + `reset_demo`, cuentas demo y selector de rol, utilidades de dominio (precio, CO₂e, m³, insignias) con tests, primer deploy a Vercel. Guardar este diseño en `docs/superpowers/specs/2026-10-17-reciclamigo-mvp-design.md` y un `README` con el setup para el colaborador.
- **Fase 1 — Tracks en paralelo (días 2–5):**
  - **Track A (Daniel + Claude):** ciclo central + mapa (publicar, mapa/ficha, reservar, entregado, completar, calificar) → WhatsApp → certificado + verificación + QR.
  - **Track B (colaborador):** tablero de impacto del comercio → insignias + perfil público → vista alcaldía.
  - El orden de prioridad acordado se respeta dentro de cada track; si falta tiempo se corta desde el final (alcaldía, insignias, certificado).
- **Fase 2 — Integración (día 6):** e2e del guion completo, revisión visual proyector/móvil, reiniciar el demo, deploy de producción.
- **Fase 3 — Congelamiento (día anterior a la presentación):** no más cambios en `main`; ensayo con "Reiniciar demo"; grabar video de respaldo; abrir la app para que Supabase no esté pausado.
- *(si sobra tiempo)* Registro abierto.

Tras aprobar este diseño: invocar `superpowers:writing-plans` para el plan detallado tarea por tarea (separado por fase y track, para que el colaborador tenga el suyo), y ejecutar la Fase 0.

## Lo que hace el usuario (no Claude)
- ~~Crear el proyecto Supabase~~ (hecho); invitar al colaborador a la organización.
- Copiar URL, publishable key y secret key a `.env.local` y a las variables de Vercel (Production y Preview).
- `npx supabase login` (token personal) para que la CLI aplique migraciones.
- Crear el repo en GitHub, pasar el link e invitar al colaborador (lo antes posible: la base se sube el día 1–2).
- Importar el repo en Vercel.
- Confirmar la fecha exacta de la presentación en cuanto se sepa (define el día de congelamiento).

## Lo que queda a criterio del builder
Estructura de carpetas, componentes concretos, detalles visuales dentro de la dirección indicada, textos de la UI, contenido exacto de los seeds, proveedor exacto de teselas (OSM o CARTO).

## Verificación
- **Vitest** para lógica de dominio pura: precio sugerido, CO₂e, m³, reglas de insignias, formato de distancia.
- **Script SQL de prueba** para las RPC: `nearby_lots` respeta radio y filtros; `reserve_lot` no permite doble reserva; transiciones de estado inválidas fallan; con la cuenta de alcaldía, toda RPC operativa y toda escritura fallan.
- **Playwright e2e "guion del demo"**: entrar como comercio → publicar lote → cambiar a reciclador → ver pin dentro de 3 km → reservar → cambiar a comercio → marcar entregado → reciclador completa con kg → certificado visible → tablero de impacto actualizado → alcaldía muestra el nuevo total. Corre contra local y luego contra la URL de Vercel.
- Revisión visual en el navegador integrado a 1366×768 (proyector) y 375×812 (móvil).
- Ensayo: "Reiniciar demo" → guion completo en < 5 minutos.
