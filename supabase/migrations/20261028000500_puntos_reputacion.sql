-- Reciclamigo · 20261028000500 · ReciclaPuntos y reputación
-- Puntos: se ganan solo con entregas confirmadas (los da complete_pickup). Tope mensual y
-- caducidad vienen de app_settings. El canje es manual: lo registra el administrador y
-- consume primero los puntos que caducan antes (FIFO).
-- Reputación: crece solo con entregas confirmadas y buenas calificaciones.

begin;

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('ganado', 'canje', 'ajuste')),
  points integer not null,
  remaining integer,
  pickup_id uuid references public.pickups (id) on delete set null,
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  check ((kind = 'ganado') = (remaining is not null)),
  check (kind <> 'ganado' or (points > 0 and expires_at is not null and remaining between 0 and points)),
  check (kind <> 'canje' or points < 0)
);
create index points_ledger_profile_idx on public.points_ledger (profile_id, created_at desc);
-- Una entrega da puntos una sola vez a cada parte.
create unique index points_ledger_earned_once on public.points_ledger (pickup_id, profile_id)
  where kind = 'ganado' and pickup_id is not null;
alter table public.points_ledger enable row level security;

create policy "Cada quien ve sus puntos y el administrador todos"
  on public.points_ledger for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

-- Saldo vigente (sin caducados ni canjeados).
create or replace function public.points_balance(p_profile uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target uuid := coalesce(p_profile, auth.uid());
begin
  if auth.uid() is null or (v_target is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'No puedes ver los puntos de otra persona' using errcode = '42501';
  end if;
  return coalesce((
    select sum(remaining) from public.points_ledger
    where profile_id = v_target and kind = 'ganado' and expires_at > now()
  ), 0)::int;
end;
$$;

-- Interno: da puntos a las dos partes de una entrega confirmada.
create or replace function public._award_points(p_pickup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lb numeric;
  v_parties uuid[];
  v_party uuid;
  v_rate numeric := coalesce(public.setting_num('reciclapuntos_por_lb'), 0);
  v_cap numeric := public.setting_num('reciclapuntos_tope_mensual');
  v_days numeric := coalesce(public.setting_num('reciclapuntos_caducidad_dias'), 365);
  v_raw integer;
  v_earned numeric;
  v_pts integer;
begin
  select p.confirmed_lb, array[l.generator_id, p.collector_id]
  into v_lb, v_parties
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  where p.id = p_pickup_id and p.completed_at is not null;
  if not found then
    return;
  end if;

  v_raw := floor(v_lb * v_rate)::int;
  foreach v_party in array v_parties loop
    v_pts := v_raw;
    if v_cap is not null then
      select coalesce(sum(points), 0) into v_earned
      from public.points_ledger
      where profile_id = v_party and kind = 'ganado' and created_at >= public.sv_month_start();
      v_pts := least(v_raw, greatest(0, v_cap - v_earned)::int);
    end if;
    if v_pts > 0 then
      insert into public.points_ledger (profile_id, kind, points, remaining, pickup_id, expires_at, note)
      values (v_party, 'ganado', v_pts, v_pts, p_pickup_id, now() + v_days * interval '1 day', 'Entrega confirmada')
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- El administrador registra un canje manual.
create or replace function public.redeem_points(p_profile_id uuid, p_points integer, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left integer := p_points;
  v_take integer;
  r record;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador registra canjes' using errcode = '42501';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'Los puntos a canjear deben ser mayores que 0' using errcode = '22023';
  end if;
  if public.points_balance(p_profile_id) < p_points then
    raise exception 'El saldo no alcanza para ese canje' using errcode = 'P0001';
  end if;

  for r in
    select id, remaining from public.points_ledger
    where profile_id = p_profile_id and kind = 'ganado' and expires_at > now() and remaining > 0
    order by expires_at, created_at
    for update
  loop
    v_take := least(r.remaining, v_left);
    update public.points_ledger set remaining = remaining - v_take where id = r.id;
    v_left := v_left - v_take;
    exit when v_left = 0;
  end loop;

  insert into public.points_ledger (profile_id, kind, points, note, created_by)
  values (p_profile_id, 'canje', -p_points, nullif(trim(p_note), ''), auth.uid());
end;
$$;

-- Reputación: sube con entregas confirmadas y buenas calificaciones.
create or replace function public.reputation_tier(p_completed integer, p_avg numeric, p_count integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_completed >= 10 and p_count >= 5 and coalesce(p_avg, 0) >= 4.5 then 'destacado'
    when p_completed >= 3 and p_count >= 2 and coalesce(p_avg, 0) >= 4.0 then 'confiable'
    when p_completed >= 1 then 'en_marcha'
    else 'nuevo'
  end
$$;

-- profile_impact con reputación (reemplaza la vista de la 0200; mismas columnas más dos al final).
drop view if exists public.profile_impact;
create view public.profile_impact as
with completed as (
  select l.generator_id, p.collector_id, p.confirmed_lb, p.total_amount
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  where p.completed_at is not null
),
party as (
  select generator_id as profile_id, confirmed_lb, total_amount from completed
  union all
  select collector_id, confirmed_lb, total_amount from completed
),
agg as (
  select profile_id,
         count(*)::int as completed_count,
         sum(confirmed_lb) as completed_lb,
         sum(total_amount) as total_amount
  from party
  group by profile_id
),
published as (
  select generator_id as profile_id, count(*)::int as lots_published
  from public.lots
  group by generator_id
),
rated as (
  select ratee_id as profile_id,
         round(avg(stars), 2) as rating_avg,
         count(*)::int as rating_count
  from public.ratings
  group by ratee_id
)
select pr.id as profile_id,
       pr.role,
       pr.display_name,
       pr.org_type,
       pr.municipality,
       pr.verified,
       coalesce(pu.lots_published, 0) as lots_published,
       coalesce(a.completed_count, 0) as completed_count,
       coalesce(a.completed_lb, 0) as completed_lb,
       coalesce(a.total_amount, 0) as total_amount,
       r.rating_avg,
       coalesce(r.rating_count, 0) as rating_count,
       public.reputation_tier(coalesce(a.completed_count, 0), r.rating_avg, coalesce(r.rating_count, 0)) as reputation_tier,
       round(coalesce(a.completed_count, 0) * coalesce(r.rating_avg, 4) / 5, 2) as reputation_score
from public.profiles pr
left join agg a on a.profile_id = pr.id
left join published pu on pu.profile_id = pr.id
left join rated r on r.profile_id = pr.id;

revoke all on public.profile_impact from anon;
grant select on public.profile_impact to authenticated;

revoke execute on function
  public.points_balance(uuid),
  public.redeem_points(uuid, integer, text),
  public.reputation_tier(integer, numeric, integer)
from public, anon;
grant execute on function
  public.points_balance(uuid),
  public.redeem_points(uuid, integer, text),
  public.reputation_tier(integer, numeric, integer)
to authenticated, service_role;

-- Interna: solo la llama complete_pickup.
revoke execute on function public._award_points(uuid) from public, anon, authenticated;

insert into public.app_migrations (name) values ('20261028000500_puntos_reputacion') on conflict do nothing;

commit;
