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

- Escrituras solo por RPC (`publish_lot`, `reserve_lot`, `mark_delivered`, `complete_pickup`,
  `rate_pickup`); no hay policies de insert/update/delete en las tablas.
- La alcaldía (`municipalidad`) solo lee las vistas agregadas `profile_impact`,
  `impact_monthly` e `impact_heat`; no ve `lots`, `pickups` ni `profile_private`.
- `get_certificate(code)` es lo único que puede leer un visitante sin sesión.
