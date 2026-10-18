# Reciclamigo — Track B: Tablero de impacto, insignias y vista alcaldía — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el impacto se vea: el tablero ESG del comercio (kg, CO₂e, m³, ingresos), la reputación con insignias en un perfil público, y la vista de solo reportes de la alcaldía con mapa de calor.

**Architecture:** Todo vive en `src/features/impact/`, `src/features/reputation/` y `src/features/municipal/`. Solo se **leen** las vistas agregadas de la Fase 0 (`profile_impact`, `impact_monthly`, `impact_heat`) y la tabla `ratings`. Este track no escribe nada en la BD. Los gráficos son componentes cliente con Recharts; los datos se cargan en server components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4 + shadcn/ui, Recharts 3, Leaflet + react-leaflet 5 + leaflet.heat, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-reciclamigo-mvp-design.md` · **Depende de:** `docs/superpowers/plans/2026-10-17-fase-0-base.md` (terminada). **Responsable:** colaborador, en ramas `feat/impacto`, `feat/reputacion`, `feat/alcaldia`, con PR a `main`.

## Global Constraints

- Las mismas de la Fase 0 (español es-SV, USD, colores de polímero de `POLYMERS`, CO₂e = kg × 2, m³ = t × 3 vía `co2eAvoidedKg` y `landfillM3Freed`; nunca repetir los factores a mano).
- La alcaldía es **solo reportes**: su pantalla no tiene botones de acción, no muestra WhatsApp ni direcciones, y solo consulta vistas agregadas.
- Meses: los últimos 6 incluyendo el actual, con cero cuando no hay datos, en zona `America/El_Salvador`, etiquetas `Intl.DateTimeFormat('es-SV', { month: 'short' })`.
- Solo tocar `src/features/impact/`, `src/features/reputation/`, `src/features/municipal/` y `src/app/(areas)/perfil/`. Si hace falta cambiar una vista o migración, crear una migración nueva y avisar.

## Review Focus

- Comercio sin ningún retiro completado → KPIs en 0 y gráficos con mensaje "Aún no hay retiros completados", no gráficos rotos ni `NaN`. Test en Task 1.
- Mes sin datos en medio del rango → aparece con 0 y el orden cronológico se mantiene. Test en Task 1.
- Perfil con 0 calificaciones → "Sin calificaciones todavía" en vez de "0.0 ★". Test en Task 2.
- `/perfil/<id>` con un id inexistente o mal formado → 404 amable. Verificación en Task 2.
- Alcaldía con el filtro "Santa Ana" sin datos en el mapa de calor → mapa centrado en Santa Ana con aviso, no un mapa del mundo. Verificación en Task 3.

---

### Task 1: Tablero de impacto del comercio

**Files:**
- Create: `src/features/impact/series.ts`, `src/features/impact/queries.ts`, `src/features/impact/components/{generator-impact,kpi-tiles,monthly-chart,polymer-breakdown}.tsx` (reemplaza el placeholder `GeneratorImpact`)
- Test: `src/features/impact/series.test.ts`

**Interfaces:**
- Consumes: `profile_impact`, `impact_monthly` (Fase 0); `co2eAvoidedKg`, `landfillM3Freed`, `formatKg`, `formatUSD`, `POLYMERS`, `POLYMER_CODES`
- Produces (Task 3 reutiliza `fillMonths`, `byPolymer`, `KpiTiles`, `MonthlyChart`, `PolymerBreakdown`):
  - `type MonthlyRow = { month: string; polymer_code: string; completed_kg: number; total_amount: number; pickups_count: number }`
  - `type MonthPoint = { month: string /* 'YYYY-MM' */; label: string; kg: number; amount: number }`
  - `fillMonths(rows: MonthlyRow[], now: Date, months?: number /* 6 */): MonthPoint[]` — suma filas del mismo mes y rellena con cero
  - `byPolymer(rows: MonthlyRow[]): { code: PolymerCode; kg: number }[]` — orden descendente por kg, sin polímeros en 0
  - `fetchGeneratorImpact(supabase, generatorId: string): Promise<{ totals: ProfileImpactRow | null; monthly: MonthlyRow[] }>`
  - `<KpiTiles items: { label: string; value: string; hint?: string }[] />`, `<MonthlyChart data: MonthPoint[] />`, `<PolymerBreakdown data: { code: PolymerCode; kg: number }[] />`

- [ ] **Step 1: Tests (fallan)** — `now = 2026-10-17T18:00:00Z`:

```ts
expect(fillMonths([], now).map(p => p.month)).toEqual(['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'])
expect(fillMonths([], now).every(p => p.kg === 0 && p.amount === 0)).toBe(true)
expect(fillMonths([row('2026-07-01','PET',40,8), row('2026-07-01','HDPE',10,1.8)], now).find(p => p.month === '2026-07'))
  .toMatchObject({ kg: 50, amount: 9.8 })
expect(fillMonths([row('2026-01-01','PET',40,8)], now).reduce((s,p) => s + p.kg, 0)).toBe(0) // fuera de rango
expect(fillMonths([], now)[5].label).toBe('oct')
expect(byPolymer([row('2026-07-01','PET',40,8), row('2026-08-01','PET',10,2), row('2026-08-01','PP',60,9)]))
  .toEqual([{ code: 'PP', kg: 60 }, { code: 'PET', kg: 50 }])
expect(byPolymer([])).toEqual([])
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **KPIs:**
    - kg desviados.
    - CO₂e evitado (`co2eAvoidedKg`, en kg o t según el tamaño).
    - m³ de vertedero liberados.
    - Ingresos (`formatUSD`).
    - Retiros completados.
  - **Gráficos:** barras mensuales de kg, más un desglose por polímero (barras horizontales o dona) con el color de cada uno.
  - **Sin datos:** mensaje "Aún no hay retiros completados".
  - Las cifras grandes deben leerse bien en proyector.
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador** — como comercio demo, `/comercio` muestra los KPIs con los 6 meses sembrados. Después de completar un retiro (Track A, o con `npm run seed` más un retiro manual) los kg suben. Expected: los números coinciden con `select * from profile_impact where profile_id = …`.
- [ ] **Step 6: Commit** — `git commit -m "feat(impact): tablero de impacto del comercio"`

---

### Task 2: Insignias y perfil público

**Files:**
- Create: `src/features/reputation/rating.ts`, `src/features/reputation/queries.ts`, `src/features/reputation/components/{rating-summary,ratings-list}.tsx`, `src/app/(areas)/perfil/[id]/page.tsx`, `src/app/(areas)/perfil/[id]/not-found.tsx`
- Modify: `src/features/reputation/components/badge-list.tsx` (pulir la versión de la Fase 0 **sin cambiar su firma**)
- Test: `src/features/reputation/rating.test.ts`

**Interfaces:**
- Consumes: `profiles`, `profile_impact`, `ratings` (con el nombre de quien califica vía `profiles`); `computeBadges`, `profileStatsFromRow`, `getProfileImpact`
- Produces:
  - `ratingLabel(avg: number | null, count: number): string`
  - `fetchPublicProfile(supabase, id: string): Promise<null | { profile: { id: string; role: UserRole; displayName: string; orgType: string; municipality: string; verified: boolean }; impact: ProfileImpactRow | null; ratings: { stars: number; comment: string | null; raterName: string; createdAt: string }[] }>` — últimas 10 calificaciones recibidas
  - `BadgeList({ stats }: { stats: ProfileStats })` — misma firma; cada insignia con ícono lucide y `description` como tooltip
  - Ruta `/perfil/[id]` (la ficha del lote del Track A ya enlaza aquí)

- [ ] **Step 1: Tests (fallan)**

```ts
expect(ratingLabel(null, 0)).toBe('Sin calificaciones todavía')
expect(ratingLabel(4.666, 3)).toBe('4.7 ★ (3 calificaciones)')
expect(ratingLabel(5, 1)).toBe('5.0 ★ (1 calificación)')
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar** el perfil:
  - **Encabezado:** nombre, tipo, municipio y "Verificado".
  - `BadgeList`.
  - **Cifras:** kg desviados o recolectados según el rol, retiros y `ratingLabel`.
  - **Calificaciones:** lista de las últimas.
  - **No se muestra:** WhatsApp ni dirección.
  - Si el id no es un uuid o no existe → `notFound()`.
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador**
  - `/perfil/<id de Don José>` muestra "Reciclador verificado", "1 tonelada desviada" si aplica, y calificaciones.
  - `/perfil/123` da 404.
  - La ficha del lote en el mapa muestra las mismas insignias.
  - Expected: las tres cosas se cumplen.
- [ ] **Step 6: Commit** — `git commit -m "feat(reputation): insignias y perfil público"`

---

### Task 3: Vista alcaldía (solo reportes)

**Files:**
- Create: `src/features/municipal/queries.ts`, `src/features/municipal/ranking.ts`, `src/features/municipal/components/{municipal-dashboard,heat-map,heat-layer,municipality-filter,generator-ranking}.tsx` (reemplaza el placeholder `MunicipalDashboard`)
- Modify: `package.json` (`npm i leaflet.heat && npm i -D @types/leaflet.heat`)
- Test: `src/features/municipal/ranking.test.ts`

**Interfaces:**
- Consumes: `impact_heat`, `impact_monthly`, `profile_impact` (Fase 0); `fillMonths`, `byPolymer`, `KpiTiles`, `MonthlyChart`, `PolymerBreakdown` (Task 1)
- Produces:
  - `type MunicipalityFilter = 'Santa Ana' | 'todos'`; filtro con `?municipio=` en la URL, por defecto el municipio de la cuenta de alcaldía
  - `fetchMunicipalReport(supabase, filter: MunicipalityFilter): Promise<{ heat: { lat: number; lng: number; completed_kg: number }[]; monthly: MonthlyRow[]; generators: ProfileImpactRow[] }>`
  - `rankGenerators(rows: ProfileImpactRow[], limit?: number /* 10 */): { position: number; profileId: string; displayName: string; orgType: string; completedKg: number }[]` — solo `role = 'generador'` con kg > 0, orden descendente
  - `<HeatLayer points: [lat, lng, weight][] />` — usa `useMap()` y `L.heatLayer`; peso normalizado al máximo

- [ ] **Step 1: Tests (fallan)**

```ts
expect(rankGenerators([gen('a', 50), gen('b', 300), rec('c', 900), gen('d', 0)]))
  .toEqual([{ position: 1, profileId: 'b', displayName: 'b', orgType: 'Restaurante', completedKg: 300 },
            { position: 2, profileId: 'a', displayName: 'a', orgType: 'Restaurante', completedKg: 50 }])
expect(rankGenerators(Array.from({ length: 15 }, (_, i) => gen(String(i), i + 1))).length).toBe(10)
```

- [ ] **Step 2: Correr** `npm test` — Expected: FAIL.
- [ ] **Step 3: Implementar** el panel, sin ningún botón de acción. `impact_heat`, `impact_monthly` y `profile_impact` ya exponen `municipality` (Fase 0).
  - **Arriba:** filtro "Santa Ana | Todo el país".
  - **KPIs:**
    - kg recuperados.
    - CO₂e evitado.
    - m³ liberados.
    - Retiros.
    - Comercios activos.
  - **Mapa de calor:** centrado en el municipio (Santa Ana ≈ 13.9946, -89.5597; San Salvador ≈ 13.6929, -89.2182; "todos" encuadra ambos).
  - **Gráficos:** mensual (`fillMonths`) y por polímero.
  - **Ranking:** top 10 de comercios con enlace a `/perfil/<id>`.
  - **Sin datos:** aviso.
- [ ] **Step 4: Correr** `npm test` — Expected: PASS.
- [ ] **Step 5: Verificar en el navegador**
  - Entrar por "Reportes": se ven el mapa de calor y las cifras.
  - Cambiar a "Todo el país" cambia los totales.
  - No aparece ningún botón operativo, teléfono ni dirección.
  - Expected: las tres cosas se cumplen.
- [ ] **Step 6: Commit** — `git commit -m "feat(municipal): vista de reportes de la alcaldía"`
