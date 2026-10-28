# Reciclamigo

Mercado circular de plástico reciclable en El Salvador: los comercios publican lotes (PET, HDPE, LDPE, PP, PS), los recicladores cercanos reciben el aviso o los encuentran en un mapa, reservan y coordinan por WhatsApp, y cada libra entregada queda registrada con su comprobante.

Todo se trabaja en **libras** (1 quintal = 100 lb); el kilo solo aparece en el CO₂ evitado y entre paréntesis en los reportes.

Este repo es el **MVP para el demo en vivo del Reto DINAMICA Express 2026**.

- Diseño (qué y por qué): [`docs/superpowers/specs/2026-10-17-reciclamigo-mvp-design.md`](docs/superpowers/specs/2026-10-17-reciclamigo-mvp-design.md)
- Planes por fase y track: [`docs/superpowers/plans/`](docs/superpowers/plans/)
- Contexto de marca y diseño: [`PRODUCT.md`](PRODUCT.md)
- Cambios al modelo de negocio (octubre 2026): [`docs/superpowers/plans/2026-10-28-modelo-de-negocio-corregido.md`](docs/superpowers/plans/2026-10-28-modelo-de-negocio-corregido.md)

## Stack

Next.js 16 (App Router, `src/proxy.ts`) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres + PostGIS, Auth, Storage) · Vercel (con Cron) · PWA con avisos Web Push (`web-push`) · `pdf-lib` para el reporte · Vitest · Playwright. Sin servicios de pago fuera de Vercel y Supabase.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # completa las variables (ver abajo)
npm run db:status            # las migraciones deben estar aplicadas
npm run seed                 # datos del demo (borra y vuelve a sembrar lotes y retiros)
npm run dev                  # http://localhost:3000
```

### Variables (`.env.local`, nunca se sube)

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (Project Settings → API Keys) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key, **solo servidor** |
| `NEXT_PUBLIC_DEMO_MODE` | `true` activa las cuentas demo y el selector de rol |
| `DEMO_PASSWORD` | contraseña común de las cuentas demo |
| `DEMO_RESET_TOKEN` | token para reiniciar el demo |
| `NEXT_PUBLIC_SITE_URL` | dominio público (el QR del comprobante y el de la insignia apuntan aquí) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` | llaves de los avisos push; se generan una vez con `npx web-push generate-vapid-keys` |
| `CRON_SECRET` | protege `/api/cron/*` (Vercel lo manda como `Authorization: Bearer …`) |

Pide los valores al equipo; no los pegues en `.env.example`, que sí se sube.

## Modelo de negocio en la app

- **Roles:** comercio (generador), reciclador (de base o comprador de volumen), alcaldía (solo lectura) y administración.
- **Planes:** gratis (8 lotes al mes, historial de 30 días) y **Plan Trazabilidad** ($14.99/mes, solo comercios; lo activa el administrador a mano, sin pasarela de pago).
- **Comisión:** 0 % para comercios y recicladores de base; 3 % (configurable entre 2 % y 4 %) a los compradores de volumen sobre compras confirmadas. Solo se calcula y se registra.
- **Una entrega cuenta solo cuando se confirma:** el comercio registra el peso real y el precio; el reciclador acepta o corrige. Ahí nacen el comprobante, los ReciclaPuntos, la reputación y la comisión.
- **Todos los valores del negocio** (precios, límites, comisión, radios, horas, factor de CO₂) viven en la tabla `app_settings`, que edita el administrador en `/admin/configuracion`.

## Base de datos

Las migraciones se ejecutan **a mano** en el SQL Editor de Supabase. Todo el proceso está en [`supabase/README.md`](supabase/README.md). Resumen: archivo nuevo en `supabase/migrations/`, validarlo con `npm run test:db`, ejecutarlo en el SQL Editor y confirmar con `npm run db:status`. Nunca edites una migración ya aplicada.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm test` | pruebas unitarias (dominio, datos sembrados) |
| `npm run test:db` | corre las migraciones en un Postgres local (PGlite + PostGIS) y prueba las reglas del mercado |
| `npm run test:integration` | pruebas contra el Supabase real de `.env.local` (requiere `npm run seed`) |
| `npm run db:status` | migraciones aplicadas y pendientes |
| `npm run seed` | deja la base en el estado inicial del demo |
| `npm run lint` · `npm run build` | lint y build de producción |

## Demo

- Guion de la presentación, checklist del día anterior y plan B: [`docs/demo/guion-presentacion.md`](docs/demo/guion-presentacion.md).
- `/demo?token=<DEMO_RESET_TOKEN>`: página discreta con el botón **Reiniciar demo** (guárdala como marcador; no compartas el token).
- `/entrar`: cuentas demo **Comercio** (Comedor La Ceiba, con el Plan Trazabilidad), **Reciclador** (Don José, reciclador de base), **Reportes de alcaldía** (solo lectura) y **Administración**. Arriba, el selector cambia entre comercio y reciclador.
- Reiniciar los datos antes de presentar:

  ```bash
  curl -X POST "https://<dominio>/demo/reset?token=<DEMO_RESET_TOKEN>"
  ```

  o `npm run seed` en local.

## Cómo trabajamos

- `main` siempre desplegable. Cada uno en su rama `feat/<área>` con PR; Vercel crea un preview por PR.
- Cada track toca solo sus carpetas:
  - Track A (ciclo, mapa, WhatsApp, comprobante): `src/features/lots/`, `src/features/vouchers/`, `src/app/(areas)/comercio/publicar/`, `src/app/(areas)/reciclador/retiros/`, `src/app/comprobantes/`.
  - Track B (impacto, insignias, alcaldía): `src/features/impact/`, `src/features/reputation/`, `src/features/municipal/`, `src/app/(areas)/perfil/`.
  - Lo compartido (`src/lib/`, `src/components/`, `src/types/`, `supabase/`) se cambia avisando al otro.
- Los componentes de cada track ya existen como huecos con la firma final (`MyLots`, `CollectorMapPage`, `GeneratorImpact`, `MunicipalDashboard`, `BadgeList`): se reemplaza el contenido sin cambiar nombre ni props.
- Un solo proyecto Supabase para todos (local, preview y producción): no corras `npm run seed` ni reinicies el demo mientras el otro esté probando, sin avisar.
