-- Reciclamigo · 0200 · Seguridad a nivel de fila
-- Lecturas por RLS. No hay policies de insert/update/delete: toda escritura pasa por las RPC (0400).

begin;

-- Rol del usuario con sesión (null si no tiene perfil).
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.polymers enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.lots enable row level security;
alter table public.pickups enable row level security;
alter table public.ratings enable row level security;

create policy "Catálogo de polímeros visible para todos"
  on public.polymers for select to anon, authenticated
  using (true);

create policy "Perfiles visibles para usuarios con sesión"
  on public.profiles for select to authenticated
  using (true);

create policy "Contacto visible solo para comercios y recicladores"
  on public.profile_private for select to authenticated
  using (public.my_role() in ('generador', 'valorizador'));

create policy "Lotes visibles para comercios y recicladores"
  on public.lots for select to authenticated
  using (public.my_role() in ('generador', 'valorizador'));

create policy "Retiros visibles para sus dos partes"
  on public.pickups for select to authenticated
  using (
    collector_id = (select auth.uid())
    or exists (
      select 1 from public.lots l
      where l.id = lot_id and l.generator_id = (select auth.uid())
    )
  );

create policy "Calificaciones visibles para usuarios con sesión"
  on public.ratings for select to authenticated
  using (true);

insert into public.app_migrations (name) values ('20261017000200_rls') on conflict do nothing;

commit;
