# Reciclamigo — Fases 2 y 3: Integración y congelamiento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Probar el guion completo del demo de punta a punta, dejar producción lista y congelada, y ensayar con plan B.

**Architecture:** Un test Playwright recorre el guion en local y contra la URL de Vercel. Antes de correr se llama a `/demo/reset` con el token. Local, Preview y Production comparten un solo proyecto Supabase (decisión del usuario).

**Tech Stack:** Playwright 1.64, Supabase (SQL Editor), Vercel.

**Spec:** `docs/superpowers/specs/2026-10-17-reciclamigo-mvp-design.md` · **Depende de:** Fase 0, Track A y Track B fusionados en `main`. El registro abierto (prioridad 7, "si sobra tiempo") queda fuera de estos planes; si sobra tiempo se planifica aparte.

## Global Constraints

- Las de la Fase 0. El e2e nunca corre contra producción sin reiniciar el demo antes **y** después.
- Congelamiento: el día anterior a la presentación, sin cambios en `main` salvo un bloqueo del demo.

## Review Focus

- La presentación cae más de 7 días después del último uso → Supabase pausado. Mitigación: abrir la app el día anterior y la mañana del demo (Task 3).
- El internet del lugar falla → hotspot, teselas en caché y video de respaldo (Task 3).
- Alguien usa la URL pública antes del demo y deja datos raros → "Reiniciar demo" justo antes de presentar (Task 3).

---

### Task 1: e2e "guion del demo"

**Files:**
- Create: `playwright.config.ts` (`baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'`, Chromium, viewport 1366×768, `webServer` solo si no hay `E2E_BASE_URL`), `e2e/demo-script.spec.ts`
- Modify: `package.json` (`"e2e": "playwright test"`)

- [ ] **Step 1: Escribir el test** — `beforeAll` y `afterAll`: `POST /demo/reset?token=${DEMO_RESET_TOKEN}`. Pasos y aserciones:
  1. `/entrar` → "Comercio".
  2. Publicar 40 kg de PET en venta → toast "Lote publicado".
  3. Selector "Reciclador" → el mapa a 3 km lista un lote de "40 kg" de PET.
  4. Seleccionarlo y pulsar "Reservar retiro" → URL `/reciclador/retiros`.
  5. Selector "Comercio" → texto "reservó tu lote"; pulsar "Marcar como entregado".
  6. Selector "Reciclador" → "Confirmar retiro" con 38,5 kg en efectivo → aparece un código `RCA-`.
  7. Abrir el certificado → "38.5 kg" y "Versión piloto".
  8. Selector "Comercio" → el KPI de kg desviados subió 38.5 respecto del inicio.
  9. "Reportes" → la alcaldía muestra el total de "Santa Ana" aumentado 38.5 kg; no hay botones "Reservar" ni "Publicar".
- [ ] **Step 2: Correr local** — Run: `npm run e2e` — Expected: PASS. Si falla, corregir el bug con `superpowers:systematic-debugging`, no el test.
- [ ] **Step 3: Commit** — `git commit -m "test: e2e del guion del demo"`

### Task 2: Revisión visual

- [ ] **Step 1:** En el navegador integrado, recorrer el guion a 1366×768 y a 375×812. Anotar textos cortados, contraste, scroll horizontal y pines superpuestos.
- [ ] **Step 2:** Corregir con el skill `impeccable:impeccable` (pulido). Cada arreglo va en su propio commit y `npm run e2e` debe seguir en verde.

### Task 3: Producción, congelamiento y ensayo

- [ ] **Step 1: Migraciones al día** — `npm run db:status` (todas las migraciones de `main` aplicadas a mano en el SQL Editor) y `POST /demo/reset?token=…`. Expected: 0 pendientes y reset con 200.
- [ ] **Step 2: Deploy** — merge a `main` → Vercel Production. Run: `E2E_BASE_URL=<url-prod> DEMO_RESET_TOKEN=… npm run e2e` — Expected: PASS (el test reinicia antes y después).
- [ ] **Step 3: Congelar** — anunciar el congelamiento al colaborador. Desde aquí solo se aceptan arreglos de bloqueos del demo.
- [ ] **Step 4: Ensayo (usuario y equipo)**
  - "Reiniciar demo".
  - Guion completo en menos de 5 minutos, en la laptop y el navegador de la presentación, para que las teselas de Santa Ana queden en caché.
  - Grabar el video de respaldo.
  - Probar la app con el hotspot del celular.
- [ ] **Step 5: Día anterior y mañana del demo** — abrir la URL de producción para que Supabase no se pause, "Reiniciar demo" y revisar la portada, el mapa y la alcaldía.
