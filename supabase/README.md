# Base de datos (Supabase)

Las migraciones se aplican **a mano** en el SQL Editor de Supabase (no usamos la CLI).

## Aplicar migraciones

1. `npm run db:status`: lista qué archivos de `supabase/migrations/` faltan en la base.
2. Para cada **PENDIENTE**, en orden de nombre: abre el archivo, copia todo y ejecútalo en
   **Supabase → SQL Editor → New query → Run**. Cada archivo corre en una transacción
   (`begin; … commit;`): si falla, no deja nada a medias.
3. Vuelve a correr `npm run db:status` hasta ver `0 pendientes`.

## Crear una migración nueva

1. Archivo nuevo `supabase/migrations/<YYYYMMDDHHMMSS>_<nombre>.sql` (hora actual, nombre corto en minúsculas).
2. Envuelve todo en `begin;` … `commit;` y termina con
   `insert into public.app_migrations (name) values ('<YYYYMMDDHHMMSS>_<nombre>') on conflict do nothing;`
3. Actualiza a mano `src/types/database.ts` (mismo formato que `supabase gen types`).
4. Valida en local, sin Docker ni Supabase: `npm run test:db` (PGlite + PostGIS con imitaciones
   de `auth`, `storage` y roles en `supabase/tests/supabase-stubs.sql`). Agrega pruebas en
   `tests/db/migrations.test.ts` si cambias reglas.
5. **Nunca edites una migración ya aplicada.** Para corregir algo, crea otra.
6. Al fusionar en `main`, quien fusiona la ejecuta en el SQL Editor y avisa al otro.

## Reglas que viven en la base

- Escrituras solo por RPC (`publish_lot`, `repeat_lot`, `reserve_lot`, `propose_delivery`,
  `complete_pickup`, `release_reservation`, `rate_pickup`, `set_setting`, `set_generator_plan`, …);
  no hay policies de insert/update/delete en las tablas. Las funciones internas (con guion bajo) no
  las puede llamar ningún usuario.
- Pesos en **libras** (`estimated_lb`, `confirmed_lb`, `price_per_lb`). Los valores del negocio viven en
  `app_settings` (solo el administrador los cambia, con rangos validados en la base).
- Una entrega cuenta solo en `complete_pickup`: ahí se generan el comprobante, la comisión (solo
  compradores de volumen en ventas) y los ReciclaPuntos.
- La alcaldía (`municipalidad`) solo lee las vistas agregadas `profile_impact`,
  `impact_monthly` e `impact_heat`; no ve `lots`, `pickups` ni `profile_private`.
- `get_voucher(code)` (comprobante) y `get_circular(slug)` (página pública de la insignia, solo con plan
  activo) son lo único que puede leer un visitante sin sesión.
- Cada función `security definer` debe quitarse a `authenticated` si es solo del cron: Supabase da
  `EXECUTE` por defecto (ver `create_scheduled_lots`).

## Reversa

`supabase/rollbacks/20261028_modelo_negocio.down.sql` deshace las migraciones `20261028*` (libras a
kilos, sin planes, comisión, puntos, avisos ni configuración). No es una migración: se corre a mano
una sola vez y solo si hace falta. Pierde las tablas nuevas y redondea los pesos (±0.01). El valor
`administrador` del enum de roles no se puede quitar. Lo prueba `tests/db/unidades.test.ts`.
