-- Reciclamigo · 20261028000100 · Rol administrador
-- Valor nuevo del enum de roles. Va en su propio archivo: Postgres no deja usar un valor de
-- enum recién agregado dentro de la misma transacción, y las migraciones siguientes lo usan.
-- (Un valor de enum no se puede quitar; ver supabase/rollbacks/.)

begin;

alter type public.user_role add value if not exists 'administrador';

insert into public.app_migrations (name) values ('20261028000100_rol_administrador') on conflict do nothing;

commit;
