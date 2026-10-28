# Modelo de negocio corregido · Plan de implementación

> **Para quien ejecute:** usar superpowers:executing-plans (o subagent-driven-development) tarea por tarea. Los pasos usan casillas `- [ ]`.

**Meta:** que la app cumpla el documento `reciclamigo_cambios_app_claude_code.md` (octubre 2026): libras, un solo plan de pago, comisión solo a compradores de volumen, flujo con confirmación bilateral, reporte de trazabilidad, avisos push, insignia con QR y ReciclaPuntos.

**Arquitectura:** toda regla vive en Postgres (RPC `security definer` + RLS, sin policies de escritura), como hoy. Los valores del negocio salen de una tabla `app_settings`. La app (Next 16, App Router) lee la configuración en el servidor y la pasa a los componentes. Los avisos pasan por un único módulo `notify(usuario, evento)` con el canal push como única implementación.

**Stack:** Next.js 16.4 · React 19 · Supabase (Postgres, PostGIS) · Vitest + PGlite · `web-push` y `pdf-lib` (dependencias de código abierto, sin servicios pagados) · Vercel Cron (incluido en Vercel Pro).

**Spec:** `C:\Users\Daniel\Downloads\reciclamigo_cambios_app_claude_code.md` (copiado en las secciones de abajo donde importa).

## Restricciones globales

- Conversión: `1 kg = 2.20462 lb`, `1 lb = 0.45359237 kg`, `1 quintal = 100 lb`. Quintales visibles desde 100 lb: `"250 lb (2.5 qq)"`.
- Precios de referencia iniciales: PET `$0.09/lb`, HDPE `$0.08/lb`; LDPE, PP y PS sin valor.
- Plan Trazabilidad `$14.99/mes`; gratis: 8 lotes al mes calendario, historial de 30 días.
- Comisión por defecto 3 %, rango 2 % a 4 %, solo compradores de volumen, sobre `peso confirmado en lb × precio acordado por lb` de compras confirmadas.
- Radios de aviso 1, 3 y 5 km; radio extra del plan 2 km; liberar reserva a las 24 h después del horario de retiro; factor CO₂ 2.0.
- Prohibido en textos visibles: "certificado", "certifica", "cumple con la ley ANDRES". Única excepción: el pie obligatorio del reporte: *"Este reporte documenta las entregas registradas en Reciclamigo y puede respaldar la gestión de residuos de la empresa. No es un permiso ni un certificado emitido por una autoridad."*
- WhatsApp: solo enlaces `https://wa.me/<+503…>?text=…`. Sin API, sin bot, sin pasarelas de pago, sin servicios pagados nuevos.
- Nunca editar una migración ya aplicada; migraciones nuevas, en transacción, con rollback documentado para la de unidades. Las migraciones las corre el equipo a mano en el SQL Editor: este plan **no** toca la base real.
- Fuera de alcance: varias sucursales, API para empresas, apps nativas, WhatsApp API, cobro automático.

## Revisión enfocada (casos que el documento no prueba y pueden fallar)

1. Lote 9 del mes en el límite de mes (31 oct 23:30 hora de El Salvador ya es noviembre en UTC): el mes se calcula en `America/El_Salvador`.
2. Una reserva liberada y vuelta a reservar choca con `pickups.lot_id unique`: al liberar se archiva el retiro en `pickup_releases` y se borra la fila.
3. El valorizador corrige el peso: monto, comisión y puntos se calculan con el peso corregido, no con el propuesto.
4. Donación o trueque con comprador de volumen: no hay valor de compra, no hay comisión.
5. Plan vencido: vuelve el límite de 8, desaparece la página pública `/circular/<slug>` y la exportación, sin tocar lotes ya publicados.
6. Teléfono sin prefijo (`7000-0101`): se normaliza a `50370000101` antes de armar el `wa.me`.

## Mapa de archivos

| Área | Archivos |
|---|---|
| Migraciones | `supabase/migrations/20261028000{100..800}_*.sql`, `supabase/rollbacks/*.down.sql` |
| Dominio | `src/lib/domain/units.ts`, `settings.ts`, `plans.ts`, `reputation.ts`, `format.ts`, `impact.ts`, `badges.ts`, `types.ts` |
| Configuración | `src/lib/settings/load.ts` (lee `app_settings` en servidor) |
| Avisos | `src/lib/notify/{index,push,messages}.ts`, `public/sw.js`, `src/app/manifest.ts`, `src/app/api/cron/*`, `src/app/api/push/*` |
| Lotes | `src/features/lots/**` (libras, confirmación bilateral, liberar, repetir) |
| Planes/Admin | `src/features/plans/**`, `src/features/admin/**`, `src/app/(areas)/admin/**`, `src/app/(areas)/comercio/{plan,historial,reportes,programados,puntos}` |
| Comprobante | `src/features/vouchers/**` (antes `certificates`), `src/app/comprobantes/[code]` |
| Reporte | `src/features/reports/{pdf,csv,load}.ts`, `src/app/(areas)/comercio/reportes/**` |
| Insignia/Puntos | `src/features/circular/**`, `src/features/points/**`, `src/app/circular/[slug]`, `src/app/(areas)/perfil/[id]` |
| Datos demo | `src/lib/demo/*`, `scripts/seed.ts` |

---

### Tarea 1: Migraciones SQL (con pruebas PGlite)

**Files:** `supabase/migrations/20261028000100_rol_administrador.sql` · `…0200_unidades_libras.sql` · `…0300_configuracion.sql` · `…0400_planes_comision.sql` · `…0500_puntos_reputacion.sql` · `…0600_avisos.sql` · `…0700_flujo_lote.sql` · `…0800_circular_reportes.sql` · `supabase/rollbacks/20261028_modelo_negocio.down.sql` · `tests/db/unidades.test.ts` · `tests/db/migrations.test.ts` · `src/types/database.ts`

**Interfaces — Produces (nombres que usa el resto):**
- Tablas: `app_settings(key, value jsonb, description, min_value, max_value, updated_at, updated_by)`, `generator_plans(profile_id, plan, started_at, expires_at, requested_at, source)`, `commissions(id, pickup_id, collector_id, gross_amount, pct, amount, status, created_at, paid_at)`, `pickup_releases`, `scheduled_pickups`, `push_subscriptions`, `alert_prefs`, `notification_queue`, `points_ledger`.
- Columnas renombradas: `lots.estimated_lb`, `lots.price_per_lb`, `pickups.confirmed_lb`, `pickups.voucher_code`; `profiles.tipo_valorizador`, `profiles.slug`; vistas con `completed_lb`.
- RPC: `set_setting(text, jsonb)`, `publish_lot(...)` (límite), `repeat_lot(uuid)`, `reserve_lot(uuid)`, `propose_delivery(uuid, numeric, numeric)`, `complete_pickup(uuid, boolean, numeric, numeric, payment_method)`, `release_reservation(uuid)`, `release_expired_reservations()`, `set_generator_plan(uuid, plan_tier, timestamptz)`, `request_plan()`, `set_commission_status(uuid, text)`, `commission_summary(date)`, `redeem_points(uuid, int, text)`, `points_balance(uuid)`, `get_voucher(text)`, `get_circular(text)`, `monthly_report(uuid, date)`, `lot_alert_recipients(uuid)`, `create_scheduled_lots()`.

- [ ] **Paso 1: Escribir las pruebas que fallan** en `tests/db/migrations.test.ts`: conversión lb (40 kg → 88.18 lb); límite (lote 9 falla con pista `limite_gratis`, lote 9 pasa con plan); mes en hora de El Salvador; comisión 3 % solo con `tipo_valorizador = 'volumen'` y `venta`; reciclador de base sin comisión; confirmación bilateral (propuesta 100 lb, corrección 95 lb → `confirmed_lb = 95`); nada de comprobante, puntos o comisión antes de `completado`; liberar y volver a reservar; liberación automática vencidas 24 h; `set_setting` rechaza `comision_volumen_pct = 5`; solo admin escribe configuración y plan; puntos con tope mensual y canje FIFO.
- [ ] **Paso 2: Correr `npm run test:db`; debe fallar** (columnas y funciones no existen).
- [ ] **Paso 3: Escribir las ocho migraciones** en el orden de la lista. `0100` solo agrega el valor al enum (va aparte: Postgres no deja usar un valor de enum recién agregado en la misma transacción). `0200` renombra y convierte (`× 2.20462`, 2 decimales) y recrea vistas y funciones tocadas; mantiene `polymers.price_per_kg` sin usar (se borrará con su confirmación).
- [ ] **Paso 4: `npm run test:db` debe pasar.**
- [ ] **Paso 5:** actualizar `src/types/database.ts` a mano con tablas, funciones y enums nuevos; `npx tsc --noEmit` fallará en el resto de la app hasta las tareas siguientes (esperado).

### Tarea 2: Dominio, configuración y unidades

**Files:** `src/lib/domain/units.ts` (+ `units.test.ts`), `settings.ts`, `plans.ts`, `reputation.ts`, `format.ts`, `impact.ts`, `badges.ts`, `types.ts`, `src/lib/settings/load.ts`

**Interfaces — Produces:** `kgToLb(kg)`, `lbToKg(lb)`, `formatLb(lb)` → `"250 lb (2.5 qq)"` desde 100 lb, `formatLbKg(lb)` → `"100 lb (45.4 kg)"`, `formatCo2(kg)` → kg o t, `co2AvoidedKg(lb, factor)`, `formatPricePerLb(n)`; `AppSettings` + `loadSettings(supabase)` (memorizado por request); `canPublish(plan, publishedThisMonth, freeLimit)`; `UserRole` con `"administrador"`; `TipoValorizador = "base" | "volumen"`.

- [ ] Prueba primero (`units.test.ts`): `kgToLb(40) = 88.18`, `lbToKg(100) = 45.36`, `formatLb(250) = "250 lb (2.5 qq)"`, `formatLb(99.5) = "99.5 lb"`, `co2AvoidedKg(100, 2) = 90.72` (100 lb → 45.36 kg → 90.7 kg de CO₂), `formatCo2(1500) = "1.5 t"`.
- [ ] Implementar y correr `npm test`.

### Tarea 3: Flujo del lote en libras (publicar, reservar, confirmar, liberar, repetir)

**Files:** `src/features/lots/{schemas,actions,queries,pickups,status,whatsapp,types}.ts` y sus pruebas; componentes `publish-lot-form`, `lot-detail-panel`, `pickup-row`, `my-lots`, `complete-pickup-form` → `confirm-delivery-form`, nuevos `propose-delivery-form`, `release-button`, `repeat-lot-button`; `src/features/vouchers/**`; `src/app/comprobantes/[code]`

**Interfaces — Produces:** `parseLb(raw)`; `publishLotSchema.estimatedLb`; server actions `publishLot`, `repeatLot(lotId)`, `reserveLot(lotId)` (devuelve el enlace `wa.me`), `proposeDelivery({pickupId, lb, pricePerLb})`, `completePickup({pickupId, accept, lb?, pricePerLb?, paymentMethod})`, `releaseReservation(pickupId)`; `ActionResult` con `code?: "limite_gratis"`; `reservationMessage({code, polymer, lb, lotUrl})`; `normalizeSvPhone(raw)`.

- [ ] Pruebas primero: `normalizeSvPhone("7000-0101") = "50370000101"`, `"+503 7000 0101"` y `"50370000101"` igual; `reservationMessage` incluye código, polímero, libras y URL; `parseLb("1,250") = 1250`.
- [ ] Implementar; "Reservar" reserva y abre `wa.me` con el mensaje; el comercio propone peso real y precio final; el reciclador acepta o corrige y confirma en un paso.

### Tarea 4: Planes, comisión y administración

**Files:** `src/app/(areas)/admin/**`, `src/features/admin/**`, `src/features/plans/**`, `src/app/(areas)/comercio/plan/page.tsx`, `src/lib/auth.ts`, `src/lib/demo/accounts.ts`, `src/components/shell/*`

**Interfaces — Produces:** `ROLE_HOME.administrador = "/admin"`; página de planes pública en `/planes`; páginas `/admin/{planes,comisiones,configuracion,puntos}`.

- [ ] Admin activa y desactiva el plan (con vencimiento), edita configuración (valida rangos), ve el resumen mensual de comisiones por comprador y marca `cobrada`; registra canjes de puntos.
- [ ] Pantalla de planes: "vender siempre es gratis" y "el plan es para quien necesita documentar lo que recicla"; precio leído de configuración.

### Tarea 5: Avisos push, PWA y `notify`

**Files:** `src/lib/notify/{index,push,messages}.ts` (+ pruebas), `public/sw.js`, `src/app/manifest.ts`, `src/app/pwa-icon/[size]/route.tsx`, `src/app/api/push/subscribe/route.ts`, `src/app/api/cron/avisos/route.ts`, `vercel.json`, `.env.example`, `next.config.ts`

**Interfaces — Produces:** `notify(profileId: string, event: NotifyEvent): Promise<void>` con `NotifyEvent = lote_cercano | reserva_liberada | entrega_propuesta | entrega_confirmada | plan_activado`; canales registrados en un arreglo (hoy solo `pushChannel`).

- [ ] Pruebas primero de `messages.ts` (texto de cada evento, libras) y de la selección de destinatarios (SQL, en Tarea 1).
- [ ] Cola `notification_queue` con retraso por plan y reputación; el cron la vacía; publicar dispara la primera tanda con `after()`.

### Tarea 6: Reporte de trazabilidad, historial y exportación

**Files:** `src/features/reports/{pdf,csv,load}.ts` (+ pruebas), `src/app/(areas)/comercio/{historial,reportes}/**`, `src/app/(areas)/comercio/reportes/[mes]/pdf/route.ts`, `…/historial/export/route.ts`

- [ ] Prueba primero: el PDF trae el pie obligatorio y ninguna otra aparición de "certificad"; pesos en lb con kg entre paréntesis.
- [ ] Historial: gratis 30 días; plan completo y exportable CSV y PDF.

### Tarea 7: Insignia Comercio Circular, perfil, reputación y ReciclaPuntos

**Files:** `src/features/circular/**`, `src/features/points/**`, `src/app/circular/[slug]/{page.tsx,qr/route.ts}`, `src/app/(areas)/perfil/[id]/page.tsx`, `src/app/(areas)/{comercio,reciclador}/puntos/page.tsx`

- [ ] Insignia básica con ≥ 1 entrega confirmada; con plan, página pública `/circular/<slug>` (nombre, libras acumuladas, CO₂, última entrega) y QR descargable; sin datos personales.
- [ ] Perfil con reputación (nivel + promedio + entregas confirmadas) también en la reserva.

### Tarea 8: Textos, onboarding, landing, seed, e2e y documentación

**Files:** `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/landing/*`, onboarding en `/reciclador`, `src/lib/demo/*`, `scripts/seed.ts`, `e2e/*`, `tests/integration/*`, `README.md`, `PRODUCT.md`, `supabase/README.md`

- [ ] Barrido de "certificado/ANDRES/kg"; prueba automática que falla si reaparece fuera del pie permitido.
- [ ] Onboarding: "no necesitas descargar nada: entra desde un enlace o un QR y coordina por WhatsApp".

### Tarea 9: Verificación final

- [ ] `npm test`, `npm run test:db`, `npm run lint`, `npx tsc --noEmit`, `npm run build` (exit 0) y búsqueda de textos prohibidos sin resultados.
- [ ] Recorrer cada criterio de la sección 14 con evidencia y entregar el resumen final.
