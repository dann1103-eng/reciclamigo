# Reciclamigo — Track A: Ciclo central, mapa, WhatsApp y certificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El ciclo completo entre comercio y reciclador: publicar un lote, encontrarlo en el mapa (la estrella del demo), reservarlo, marcarlo entregado, completarlo con kg reales, calificarse, contactarse por WhatsApp y obtener el certificado verificable.

**Architecture:** Todo vive en `src/features/lots/` y `src/features/certificates/`. Las lecturas usan el cliente Supabase con RLS; cada escritura es una server action que llama a una RPC de la Fase 0 y devuelve `ActionResult`. El mapa es un componente cliente Leaflet cargado con `next/dynamic` (`ssr: false`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4 + shadcn/ui (incl. sonner para toasts), Leaflet + react-leaflet 5, zod 4, qrcode, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-reciclamigo-mvp-design.md` · **Depende de:** `docs/superpowers/plans/2026-10-17-fase-0-base.md` (terminada).

## Global Constraints

- Las mismas de la Fase 0 (español es-SV, USD, enums en español, polímeros y precios fijos, alcaldía solo lectura).
- Zona horaria de todas las fechas mostradas: `America/El_Salvador` (el servidor de Vercel corre en UTC).
- Radios del mapa: 1, 3 y 5 km; por defecto 3 km.
- Fotos: máx. 3, máx. 5 MB c/u, `image/jpeg|png|webp`; se suben desde el navegador directo a Storage (Vercel limita el cuerpo de una función a 4.5 MB).
- Pagos: solo se registra el método (`efectivo` = "Efectivo con comprobante", `transferencia` = "Transferencia", `chivo_wallet` = "Chivo Wallet"); nunca se procesa dinero.
- Certificado: marca visible "Versión piloto"; QR a `${NEXT_PUBLIC_SITE_URL}/certificados/<código>`.
- Solo tocar `src/features/lots/`, `src/features/certificates/`, `src/app/(areas)/comercio/publicar/`, `src/app/(areas)/reciclador/retiros/`, `src/app/certificados/`. Cambios en archivos compartidos, con aviso al colaborador.

## Review Focus

- Subida de fotos que falla a mitad (red, archivo de 8 MB, PDF) → mensaje claro y el lote no se publica con URLs rotas. Test en Task 1.
- El reciclador demo sin lotes en el radio elegido → estado vacío que sugiere ampliar a 5 km, no un mapa mudo. Verificación en Task 2.
- Doble clic en "Reservar retiro" o lote ya tomado → un solo retiro; el segundo intento muestra "El lote ya no está disponible" y refresca el mapa. Verificación en Task 2.
- kg confirmados vacíos, 0, negativos o con coma decimal ("35,5") → validación con mensaje en español; "35,5" se acepta como 35.5. Test en Task 4.
- Código de certificado inexistente o mal escrito → página 404 "Certificado no encontrado", no un error 500. Verificación en Task 7.

## Interfaces compartidas del track

```ts
// src/features/lots/types.ts
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
export type NearbyLot = Database['public']['Functions']['nearby_lots']['Returns'][number]
export const RADIUS_OPTIONS = [1000, 3000, 5000] as const
export type RadiusM = (typeof RADIUS_OPTIONS)[number]
```

---

### Task 1: Publicar lote

**Files:**
- Create: `src/features/lots/types.ts`, `src/features/lots/schemas.ts`, `src/features/lots/upload.ts`, `src/features/lots/actions.ts`, `src/features/lots/components/publish-lot-form.tsx`, `src/app/(areas)/comercio/publicar/page.tsx`
- Test: `src/features/lots/schemas.test.ts`, `src/features/lots/upload.test.ts`

**Interfaces:**
- Consumes: RPC `publish_lot`; `POLYMERS`, `PolymerChip`, `suggestedTotal`, `formatUSD`; `requireRole`
- Produces:
  - `publishLotSchema` (zod) → `type PublishLotInput = { polymerCode: PolymerCode; estimatedKg: number; pickupFrom: string; pickupTo: string; modality: Modality; photoUrls: string[]; notes?: string }` (fechas ISO)
  - `validatePhotoFiles(files: File[]): string | null` — devuelve el mensaje de error o `null`
  - `uploadLotPhotos(supabase, userId: string, files: File[]): Promise<string[]>` — ruta `<userId>/<uuid>.<ext>` en `lot-photos`, devuelve URLs públicas
  - `publishLot(input: PublishLotInput): Promise<ActionResult<{ lotId: string }>>` — server action; `revalidatePath('/comercio')`

- [ ] **Step 1: Tests (fallan)**

```ts
expect(publishLotSchema.safeParse(valid).success).toBe(true)
expect(publishLotSchema.safeParse({ ...valid, estimatedKg: 0 }).success).toBe(false)
expect(publishLotSchema.safeParse({ ...valid, estimatedKg: 10001 }).success).toBe(false)
expect(publishLotSchema.safeParse({ ...valid, pickupTo: valid.pickupFrom }).success).toBe(false)
expect(publishLotSchema.safeParse({ ...valid, photoUrls: ['a','b','c','d'] }).success).toBe(false)
expect(validatePhotoFiles([file('a.jpg', 'image/jpeg', 1_000_000)])).toBeNull()
expect(validatePhotoFiles([file('a.jpg', 'image/jpeg', 6_000_000)])).toBe('Cada foto debe pesar menos de 5 MB')
expect(validatePhotoFiles([file('a.pdf', 'application/pdf', 1000)])).toBe('Solo se aceptan fotos JPG, PNG o WebP')
expect(validatePhotoFiles(Array(4).fill(file('a.jpg','image/jpeg',1000)))).toBe('Máximo 3 fotos por lote')
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar** schema, validación, subida y action.
  - **Formulario:**
    - Botones grandes `PolymerChip size="lg"`.
    - kg numérico.
    - Fotos con vista previa.
    - Fecha + hora desde/hasta, por defecto mañana 9:00–11:00 en hora de El Salvador.
    - Modalidad segmentada.
    - Notas opcionales.
    - Total sugerido en vivo con `suggestedTotal` y el precio leído de `polymers` en el server component.
  - **Al enviar:**
    1. `validatePhotoFiles`.
    2. `uploadLotPhotos`. Si falla, mostrar el error y no llamar a la action.
    3. `publishLot`.
    4. Toast "Lote publicado" y `router.push('/comercio')`.
  - Botón deshabilitado mientras envía.
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador** — como comercio demo, publicar 25 kg de PET con una foto → aparece en `/comercio` (placeholder o `MyLots`) y la foto se ve. Expected: lote creado, foto en Storage.
- [ ] **Step 6: Commit** — `git commit -m "feat(lots): publicar lote con fotos"`

---

### Task 2: Mapa del reciclador (pantalla estrella)

**Files:**
- Create: `src/features/lots/queries.ts`, `src/features/lots/format-window.ts`, `src/features/lots/components/{collector-map-page,collector-map,lots-map,lot-filters,lot-list,lot-detail-panel}.tsx`
- Modify: `src/features/lots/actions.ts`
- Test: `src/features/lots/format-window.test.ts`

**Interfaces:**
- Consumes: RPC `nearby_lots`, `reserve_lot`; `profile_private.location` del reciclador; `getProfileImpact`, `profileStatsFromRow`, `BadgeList`; `formatDistance`, `formatKg`, `suggestedTotal`
- Produces:
  - `fetchNearbyLots(supabase, p: { lat: number; lng: number; radiusM: RadiusM; polymers: PolymerCode[] | null }): Promise<NearbyLot[]>`
  - `formatPickupWindow(from: Date, to: Date, now: Date): string`
  - `reserveLot(lotId: string): Promise<ActionResult<{ pickupId: string }>>` — `revalidatePath('/reciclador')`
  - `CollectorMapPage({ collectorId })` reemplaza el placeholder de la Fase 0 (server: lee la ubicación y los lotes iniciales a 3 km).

- [ ] **Step 1: Tests (fallan)** — con `now = 2026-10-20T15:00:00Z` (9:00 en El Salvador):

```ts
expect(formatPickupWindow(sv('2026-10-20 14:00'), sv('2026-10-20 16:00'), now)).toBe('Hoy 14:00–16:00')
expect(formatPickupWindow(sv('2026-10-21 09:00'), sv('2026-10-21 11:00'), now)).toBe('Mañana 9:00–11:00')
expect(formatPickupWindow(sv('2026-10-23 09:00'), sv('2026-10-23 11:00'), now)).toBe('jue 23 oct 9:00–11:00')
```
(`sv('YYYY-MM-DD HH:mm')` crea la fecha en UTC-6.)

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **Escritorio:** mapa a pantalla completa con panel lateral (filtros arriba, lista ordenada por distancia y ficha del lote seleccionado).
  - **Móvil:** el mismo contenido en una hoja inferior.
  - **Mapa:**
    - Marcador del reciclador.
    - Círculo del radio activo.
    - Pines `L.divIcon` del color del polímero con su número de resina.
    - Al tocar un pin o un ítem de la lista se selecciona el lote y el mapa se centra en él.
  - **Filtros:**
    - Radio 1/3/5 km.
    - Polímeros multiselección con `PolymerChip`.
    - Cada cambio vuelve a llamar `fetchNearbyLots` con el cliente del navegador.
  - **Ficha del lote:**
    - Fotos, kg, total sugerido, ventana (`formatPickupWindow`), modalidad y distancia.
    - Nombre del comercio con enlace a `/perfil/<id>`, rating y `BadgeList`.
    - Botón "Reservar retiro". Deshabilitado mientras envía; si sale bien, va a `/reciclador/retiros`. Si da error, toast con el mensaje y se recarga la lista.
  - **Estado vacío:** "No hay lotes a X km" con botón "Ver a 5 km".
  - **Teselas:** CARTO Voyager o OSM, con atribución.
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador a 1366×768 y 375×812**
  - Como reciclador demo: el radio de 1 km muestra menos pines que el de 5 km.
  - Filtrar solo PET deja solo pines azules.
  - Reservar un lote lo lleva a `/reciclador/retiros` y el lote ya no aparece en el mapa.
  - Desde otra pestaña, reservar ese mismo lote muestra "El lote ya no está disponible".
  - Filtrar solo PS a 1 km muestra "No hay lotes a 1 km" con el botón "Ver a 5 km".
  - Expected: todo lo anterior se cumple.
- [ ] **Step 6: Commit** — `git commit -m "feat(lots): mapa de lotes cercanos y reserva"`

---

### Task 3: Mis lotes del comercio + marcar entregado

**Files:**
- Create: `src/features/lots/status.ts`, `src/features/lots/components/{my-lots,mark-delivered-button}.tsx` (reemplaza el placeholder)
- Modify: `src/features/lots/queries.ts`, `src/features/lots/actions.ts`
- Test: `src/features/lots/status.test.ts`

**Interfaces:**
- Produces:
  - `type MyLot = { id: string; polymerCode: PolymerCode; estimatedKg: number; status: LotStatus; pickupFrom: string; pickupTo: string; createdAt: string; pickup: null | { id: string; collectorId: string; collectorName: string; collectorWhatsapp: string | null; confirmedKg: number | null; totalAmount: number | null; certificateCode: string | null; myRatingGiven: boolean } }`
  - `fetchMyLots(supabase, generatorId: string): Promise<MyLot[]>` — activos primero; completados de los últimos 30 días.
  - `myLotStatusLabel(lot: MyLot, now: Date): string`
  - `markDelivered(pickupId: string): Promise<ActionResult>` — `revalidatePath('/comercio')`

- [ ] **Step 1: Tests (fallan)**

```ts
expect(myLotStatusLabel(lot({ status: 'publicado' }), now)).toBe('Esperando reciclador')
// now = 2026-10-20 09:00 (El Salvador); ventana del lote 2026-10-21 09:00–11:00
expect(myLotStatusLabel(lot({ status: 'reservado', collectorName: 'Don José' }), now)).toBe('Don José reservó tu lote — pasa mañana 9:00–11:00')
expect(myLotStatusLabel(lot({ status: 'entregado' }), now)).toBe('Entregado — esperando confirmación de kg')
expect(myLotStatusLabel(lot({ status: 'completado', confirmedKg: 35.5 }), now)).toBe('35.5 kg confirmados')
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar.** En la etiqueta de reservado, la ventana es `formatPickupWindow` con la primera letra en minúscula. Cada tarjeta muestra `PolymerChip`, kg, estado (`myLotStatusLabel`) y la acción que toca:
  - **Reservado:** "Marcar como entregado".
  - **Completado:** "Ver certificado".
  - **Completado sin calificar:** espacio reservado para la calificación (Task 5).
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador** — con el lote reservado en la Task 2, cambiar a Comercio: se ve "Don José reservó tu lote — pasa …". Marcarlo como entregado cambia el estado. Expected: estado `entregado` en la BD.
- [ ] **Step 6: Commit** — `git commit -m "feat(lots): mis lotes y marcar entregado"`

---

### Task 4: Mis retiros del reciclador + completar con kg reales

**Files:**
- Create: `src/app/(areas)/reciclador/retiros/page.tsx`, `src/features/lots/components/{my-pickups,complete-pickup-dialog}.tsx`
- Modify: `src/features/lots/{schemas,queries,actions}.ts`
- Test: `src/features/lots/schemas.test.ts`

**Interfaces:**
- Produces:
  - `parseKg(raw: string): number | null` — acepta "35.5" y "35,5"
  - `completePickupSchema` → `{ pickupId: string; confirmedKg: number; paymentMethod: PaymentMethod }`
  - `type MyPickup = { id: string; lotId: string; polymerCode: PolymerCode; estimatedKg: number; status: LotStatus; pickupFrom: string; pickupTo: string; generatorId: string; generatorName: string; generatorWhatsapp: string | null; confirmedKg: number | null; totalAmount: number | null; certificateCode: string | null; myRatingGiven: boolean }`
  - `fetchMyPickups(supabase, collectorId: string): Promise<MyPickup[]>`
  - `completePickup(input: { pickupId: string; confirmedKg: number; paymentMethod: PaymentMethod }): Promise<ActionResult<{ certificateCode: string }>>` — `revalidatePath('/reciclador/retiros')`, `revalidatePath('/comercio')`

- [ ] **Step 1: Tests (fallan)**

```ts
expect(parseKg('35.5')).toBe(35.5); expect(parseKg('35,5')).toBe(35.5)
expect(parseKg('')).toBeNull(); expect(parseKg('abc')).toBeNull()
expect(completePickupSchema.safeParse({ pickupId: uuid, confirmedKg: 0, paymentMethod: 'efectivo' }).success).toBe(false)
expect(completePickupSchema.safeParse({ pickupId: uuid, confirmedKg: -3, paymentMethod: 'efectivo' }).success).toBe(false)
expect(completePickupSchema.safeParse({ pickupId: uuid, confirmedKg: 35.5, paymentMethod: 'bitcoin' }).success).toBe(false)
expect(completePickupSchema.safeParse({ pickupId: uuid, confirmedKg: 35.5, paymentMethod: 'chivo_wallet' }).success).toBe(true)
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar.** La lista agrupa en "Por recoger" (`reservado`), "Listos para confirmar" (`entregado`) y "Completados".
  - **Diálogo "Confirmar retiro":**
    - kg, con los estimados como valor por defecto.
    - Total recalculado en vivo.
    - Método de pago en radio, con la nota "Se registra, no se procesa el pago".
  - **Si sale bien:** pantalla de éxito con kg, CO₂e evitado (`co2eAvoidedKg`), enlace "Ver certificado" e invitación a calificar.
  - Un retiro `reservado` muestra "Esperando que el comercio marque la entrega".
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador** — como reciclador, confirmar "35,5" kg en efectivo → el retiro pasa a Completados con código `RCA-…`. Expected: estado `completado`, total = 35.5 × precio.
- [ ] **Step 6: Commit** — `git commit -m "feat(lots): mis retiros y confirmación con kg reales"`

---

### Task 5: Calificación recíproca

**Files:**
- Create: `src/features/lots/components/rate-pickup.tsx`
- Modify: `src/features/lots/{schemas,actions}.ts`, `my-lots.tsx`, `my-pickups.tsx`
- Test: `src/features/lots/schemas.test.ts`

**Interfaces:**
- Produces: `ratePickupSchema` → `{ pickupId: string; stars: 1|2|3|4|5; comment?: string (máx. 280) }`; `ratePickup(input): Promise<ActionResult>` (revalida `/comercio` y `/reciclador/retiros`)

- [ ] **Step 1: Tests (fallan)** — `stars: 0` y `6` → inválido; `2.5` → inválido; comentario de 281 caracteres → inválido; `{ stars: 5 }` sin comentario → válido.
- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar** las 5 estrellas tocables y el comentario opcional. Se muestra en cada retiro `completado` con `myRatingGiven = false`; después se ve "Calificaste con N ★".
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador** — calificar desde ambos lados → `profile_impact.rating_count` sube 1 para cada parte. Expected: ninguna de las dos puede calificar dos veces.
- [ ] **Step 6: Commit** — `git commit -m "feat(lots): calificación recíproca"`

---

### Task 6: Contacto por WhatsApp

**Files:**
- Create: `src/features/lots/whatsapp.ts`, `src/features/lots/components/whatsapp-button.tsx`
- Modify: `lot-detail-panel.tsx`, `my-pickups.tsx`, `my-lots.tsx`
- Test: `src/features/lots/whatsapp.test.ts`

**Interfaces:**
- Produces:
  - `whatsappLink(phone: string, text: string): string`
  - `collectorMessage(p: { collectorName: string; kg: number; polymerCode: PolymerCode; windowLabel: string }): string`
  - `generatorMessage(p: { generatorName: string; kg: number; polymerCode: PolymerCode }): string`
  - `<WhatsAppButton phone: string | null text: string />` — si `phone` es null, no se renderiza

- [ ] **Step 1: Tests (fallan)**

```ts
expect(whatsappLink('+503 7012-3456', 'Hola')).toBe('https://wa.me/50370123456?text=Hola')
expect(whatsappLink('50370123456', 'Voy por 40 kg')).toBe('https://wa.me/50370123456?text=Voy%20por%2040%20kg')
expect(collectorMessage({ collectorName: 'Don José', kg: 40, polymerCode: 'PET', windowLabel: 'Mañana 9:00–11:00' }))
  .toBe('Hola, soy Don José de Reciclamigo. Voy por tu lote de 40 kg de PET (Mañana 9:00–11:00).')
expect(generatorMessage({ generatorName: 'Comedor La Ceiba', kg: 40, polymerCode: 'PET' }))
  .toBe('Hola, le escribimos de Comedor La Ceiba por Reciclamigo, sobre el lote de 40 kg de PET.')
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar** y colocar el botón en tres lugares:
  - En la ficha del lote y en "Mis retiros": del reciclador al comercio.
  - En "Mis lotes" cuando el lote está reservado: del comercio al reciclador.
  - El enlace abre en una pestaña nueva (`target="_blank" rel="noopener"`).
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador** — el botón de la ficha abre `wa.me` con el mensaje prellenado. Expected: URL correcta en la pestaña nueva.
- [ ] **Step 6: Commit** — `git commit -m "feat(lots): contacto por WhatsApp"`

---

### Task 7: Certificado ANDRES + verificación + QR

**Files:**
- Create: `src/features/certificates/{url,qr}.ts`, `src/features/certificates/components/certificate.tsx`, `src/app/certificados/[code]/page.tsx`, `src/app/certificados/[code]/not-found.tsx`
- Modify: `my-lots.tsx`, `my-pickups.tsx` (enlace "Ver certificado")
- Test: `src/features/certificates/url.test.ts`

**Interfaces:**
- Consumes: RPC `get_certificate` (concedida a `anon`); `co2eAvoidedKg`, `formatKg`, `POLYMERS`, `Logo`
- Produces:
  - `certificateUrl(code: string, siteUrl?: string): string` — por defecto `process.env.NEXT_PUBLIC_SITE_URL`, sin doble `/`
  - `certificateQrDataUrl(code: string): Promise<string>` — `QRCode.toDataURL(certificateUrl(code))`
  - `isCertificateCode(code: string): boolean` — `/^RCA-\d{4}-[0-9A-F]{6}$/`

- [ ] **Step 1: Tests (fallan)**

```ts
expect(certificateUrl('RCA-2026-0A1B2C', 'https://reciclamigo.vercel.app/')).toBe('https://reciclamigo.vercel.app/certificados/RCA-2026-0A1B2C')
expect(isCertificateCode('RCA-2026-0A1B2C')).toBe(true)
expect(isCertificateCode('rca-2026-0a1b2c')).toBe(false)
expect(isCertificateCode('RCA-2026-0A1B2')).toBe(false)
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar** la página pública, sin login y fuera de `(areas)`.
  - Si el código no pasa `isCertificateCode` o la RPC no devuelve nada → `notFound()`, que muestra "Certificado no encontrado".
  - **Contenido:**
    - Logo y título "Certificado de manejo de residuos plásticos".
    - Referencia a la "Ley ANDRES (Decreto 186/2024)".
    - Comercio y gestor (reciclador) con su tipo.
    - Polímero con número de resina, kg confirmados, CO₂e evitado y fecha (zona de El Salvador).
    - Código y QR.
    - Marca "Versión piloto".
  - **Impresión:** CSS `@media print` en A4 sin encabezado de la app, y botón "Imprimir / Guardar PDF" (`window.print()`).
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador**
  - En una ventana sin sesión, abrir el certificado del retiro de la Task 4: se ve y el QR decodifica a la misma URL.
  - `/certificados/RCA-2026-XXXXXX` da 404 amable.
  - La vista previa de impresión cabe en una página.
  - Expected: las tres cosas se cumplen.
- [ ] **Step 6: Commit** — `git commit -m "feat(certificates): certificado verificable con QR"`
