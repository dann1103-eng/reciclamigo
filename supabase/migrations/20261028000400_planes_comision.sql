-- Reciclamigo · 20261028000400 · Valorizadores, plan Trazabilidad y comisión
-- 1) profiles.tipo_valorizador: 'base' (reciclador de base) | 'volumen' (centro de acopio,
--    recicladora, industria). Los valorizadores existentes se clasifican por org_type.
-- 2) generator_plans: un solo plan de pago (Trazabilidad). Sin fila = plan gratis. El
--    administrador lo activa o desactiva a mano; sin pasarela de pago.
-- 3) commissions: solo se calculan y registran (pendiente | cobrada); no hay cobro automático.

begin;

create type public.valorizador_tipo as enum ('base', 'volumen');
alter table public.profiles add column tipo_valorizador public.valorizador_tipo;

update public.profiles
set tipo_valorizador = case
  when org_type ~* '(acopio|transformador|industri|planta)' then 'volumen'::public.valorizador_tipo
  else 'base'::public.valorizador_tipo
end
where role = 'valorizador';

alter table public.profiles
  add constraint profiles_tipo_valorizador_check
  check ((role = 'valorizador') = (tipo_valorizador is not null));

-- Plan del comercio
create type public.plan_tier as enum ('gratis', 'trazabilidad');

create table public.generator_plans (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  plan public.plan_tier not null default 'gratis',
  started_at timestamptz,
  expires_at timestamptz,
  requested_at timestamptz,
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
alter table public.generator_plans enable row level security;

create policy "El comercio y el administrador ven el plan"
  on public.generator_plans for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.has_active_plan(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.generator_plans gp
    where gp.profile_id = p_profile
      and gp.plan = 'trazabilidad'
      and (gp.started_at is null or gp.started_at <= now())
      and (gp.expires_at is null or gp.expires_at > now())
  )
$$;

-- El administrador activa (con vencimiento) o desactiva el plan de un comercio.
create or replace function public.set_generator_plan(
  p_profile_id uuid,
  p_plan public.plan_tier,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days numeric := coalesce(public.setting_num('plan_duracion_dias'), 30);
  v_expires timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar planes' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and role = 'generador') then
    raise exception 'El plan es solo para comercios (generadores)' using errcode = '22023';
  end if;

  if p_plan = 'trazabilidad' then
    if p_expires_at is not null and p_expires_at <= now() then
      raise exception 'El vencimiento debe ser una fecha futura' using errcode = '22023';
    end if;
    v_expires := coalesce(p_expires_at, now() + v_days * interval '1 day');
    insert into public.generator_plans (profile_id, plan, started_at, expires_at, requested_at, source, updated_by)
    values (p_profile_id, 'trazabilidad', now(), v_expires, null, 'manual', auth.uid())
    on conflict (profile_id) do update
    set plan = 'trazabilidad',
        started_at = case
          when public.generator_plans.plan = 'trazabilidad'
           and (public.generator_plans.expires_at is null or public.generator_plans.expires_at > now())
          then public.generator_plans.started_at
          else now()
        end,
        expires_at = v_expires,
        requested_at = null,
        source = 'manual',
        updated_at = now(),
        updated_by = auth.uid();
  else
    insert into public.generator_plans (profile_id, plan, started_at, expires_at, source, updated_by)
    values (p_profile_id, 'gratis', null, null, 'manual', auth.uid())
    on conflict (profile_id) do update
    set plan = 'gratis',
        expires_at = now(),
        requested_at = null,
        source = 'manual',
        updated_at = now(),
        updated_by = auth.uid();
  end if;
end;
$$;

-- El comercio avisa que quiere el plan (el administrador lo ve primero en su lista).
create or replace function public.request_plan()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios pueden pedir el plan' using errcode = '42501';
  end if;
  insert into public.generator_plans (profile_id, requested_at)
  values (auth.uid(), now())
  on conflict (profile_id) do update set requested_at = now(), updated_at = now();
end;
$$;

-- Estado del plan y uso del mes del comercio que consulta.
create or replace function public.plan_status()
returns table (
  plan text,
  active boolean,
  started_at timestamptz,
  expires_at timestamptz,
  requested_at timestamptz,
  published_this_month integer,
  free_limit integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.has_active_plan(auth.uid()) then 'trazabilidad' else 'gratis' end,
         public.has_active_plan(auth.uid()),
         gp.started_at,
         gp.expires_at,
         gp.requested_at,
         (select count(*)::int from public.lots l
           where l.generator_id = auth.uid() and l.created_at >= public.sv_month_start()),
         public.setting_num('lotes_gratis_por_mes')::int
  from (select 1) as one
  left join public.generator_plans gp on gp.profile_id = auth.uid()
  where public.my_role() = 'generador'
$$;

-- El administrador clasifica a un valorizador.
create or replace function public.set_valorizador_tipo(p_profile_id uuid, p_tipo public.valorizador_tipo)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede clasificar valorizadores' using errcode = '42501';
  end if;
  update public.profiles set tipo_valorizador = p_tipo where id = p_profile_id and role = 'valorizador';
  if not found then
    raise exception 'Valorizador no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

-- Comisiones
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null unique references public.pickups (id) on delete cascade,
  collector_id uuid not null references public.profiles (id) on delete cascade,
  gross_amount numeric(10, 2) not null check (gross_amount > 0),
  pct numeric(5, 2) not null check (pct >= 0),
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'cobrada')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index commissions_collector_idx on public.commissions (collector_id, created_at);
alter table public.commissions enable row level security;

create policy "El comprador y el administrador ven las comisiones"
  on public.commissions for select to authenticated
  using (collector_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.commission_summary(p_month date default null)
returns table (
  collector_id uuid,
  collector_name text,
  deliveries integer,
  gross_amount numeric,
  commission_amount numeric,
  pending_amount numeric,
  paid_amount numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador ve el resumen de comisiones' using errcode = '42501';
  end if;
  v_from := public.sv_month_start(coalesce(p_month::timestamp at time zone 'America/El_Salvador', now()));
  v_to := (date_trunc('month', v_from at time zone 'America/El_Salvador') + interval '1 month') at time zone 'America/El_Salvador';

  return query
  select c.collector_id,
         pr.display_name,
         count(*)::int,
         sum(c.gross_amount),
         sum(c.amount),
         coalesce(sum(c.amount) filter (where c.status = 'pendiente'), 0),
         coalesce(sum(c.amount) filter (where c.status = 'cobrada'), 0)
  from public.commissions c
  join public.profiles pr on pr.id = c.collector_id
  where c.created_at >= v_from and c.created_at < v_to
  group by c.collector_id, pr.display_name
  order by sum(c.amount) desc;
end;
$$;

create or replace function public.set_commission_status(p_commission_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede marcar comisiones' using errcode = '42501';
  end if;
  if p_status not in ('pendiente', 'cobrada') then
    raise exception 'El estado debe ser pendiente o cobrada' using errcode = '22023';
  end if;
  update public.commissions
  set status = p_status,
      paid_at = case when p_status = 'cobrada' then now() else null end
  where id = p_commission_id;
  if not found then
    raise exception 'Comisión no encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function
  public.has_active_plan(uuid),
  public.set_generator_plan(uuid, public.plan_tier, timestamptz),
  public.request_plan(),
  public.plan_status(),
  public.set_valorizador_tipo(uuid, public.valorizador_tipo),
  public.commission_summary(date),
  public.set_commission_status(uuid, text)
from public, anon;
grant execute on function
  public.has_active_plan(uuid),
  public.set_generator_plan(uuid, public.plan_tier, timestamptz),
  public.request_plan(),
  public.plan_status(),
  public.set_valorizador_tipo(uuid, public.valorizador_tipo),
  public.commission_summary(date),
  public.set_commission_status(uuid, text)
to authenticated, service_role;

insert into public.app_migrations (name) values ('20261028000400_planes_comision') on conflict do nothing;

commit;
