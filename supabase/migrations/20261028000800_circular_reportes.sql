-- Reciclamigo · 20261028000800 · Comercio Circular, historial y reporte de trazabilidad
-- • profiles.slug: dirección de la página pública del comercio (/circular/<slug>).
-- • get_circular(slug): lo que puede ver cualquiera sin sesión. Solo comercios con plan activo
--   y al menos una entrega confirmada; nunca datos personales ni de los valorizadores.
-- • generator_history(): historial del comercio. Gratis = últimos historial_gratis_dias.
-- • monthly_report(mes): entregas confirmadas del mes. Solo con plan.

begin;

alter table public.profiles add column slug text unique;

create or replace function public.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p_text, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

with base as (
  select id, coalesce(nullif(public.slugify(display_name), ''), 'comercio') as s, created_at
  from public.profiles
  where role = 'generador'
),
ranked as (
  select id, s, row_number() over (partition by s order by created_at, id) as n from base
)
update public.profiles p
set slug = case when r.n = 1 then r.s else r.s || '-' || r.n end
from ranked r
where p.id = r.id;

create or replace function public._profiles_set_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
begin
  if new.role = 'generador' and new.slug is null then
    v_base := coalesce(nullif(public.slugify(new.display_name), ''), 'comercio');
    v_slug := v_base;
    while exists (select 1 from public.profiles where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
    new.slug := v_slug;
  end if;
  return new;
end;
$$;

create trigger profiles_set_slug
  before insert on public.profiles
  for each row execute function public._profiles_set_slug();

-- Página pública de la insignia con QR. Vacía si no hay plan activo o no hay entregas.
create or replace function public.get_circular(p_slug text)
returns table (
  business_name text,
  org_type text,
  total_lb numeric,
  co2_kg numeric,
  deliveries integer,
  last_delivery_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.display_name,
         g.org_type,
         sum(p.confirmed_lb),
         sum(p.confirmed_lb) * 0.45359237 * coalesce(public.setting_num('factor_co2_mixto'), 2),
         count(*)::int,
         max(p.completed_at)
  from public.profiles g
  join public.lots l on l.generator_id = g.id
  join public.pickups p on p.lot_id = l.id and p.completed_at is not null
  where g.slug = p_slug
    and g.role = 'generador'
    and public.has_active_plan(g.id)
  group by g.id, g.display_name, g.org_type
$$;

-- Historial del comercio que consulta. Sin plan, solo los últimos historial_gratis_dias.
create or replace function public.generator_history(p_from timestamptz default null, p_to timestamptz default null)
returns table (
  lot_id uuid,
  pickup_id uuid,
  polymer_code text,
  modality public.lot_modality,
  status public.lot_status,
  estimated_lb numeric,
  confirmed_lb numeric,
  total_amount numeric,
  created_at timestamptz,
  completed_at timestamptz,
  collector_name text,
  voucher_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_from timestamptz := p_from;
  v_floor timestamptz;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios tienen historial' using errcode = '42501';
  end if;
  if not public.has_active_plan(v_uid) then
    v_floor := now() - coalesce(public.setting_num('historial_gratis_dias'), 30) * interval '1 day';
    v_from := greatest(coalesce(p_from, v_floor), v_floor);
  end if;

  return query
  select l.id, p.id, l.polymer_code, l.modality, l.status, l.estimated_lb, p.confirmed_lb, p.total_amount,
         l.created_at, p.completed_at, c.display_name, p.voucher_code
  from public.lots l
  left join public.pickups p on p.lot_id = l.id
  left join public.profiles c on c.id = p.collector_id
  where l.generator_id = v_uid
    and l.created_at >= coalesce(v_from, '-infinity'::timestamptz)
    and (p_to is null or l.created_at < p_to)
  order by l.created_at desc;
end;
$$;

-- Reporte de trazabilidad: entregas confirmadas del mes (hora de El Salvador).
create or replace function public.monthly_report(p_month date default null)
returns table (
  voucher_code text,
  completed_at timestamptz,
  collector_name text,
  polymer_code text,
  modality public.lot_modality,
  confirmed_lb numeric,
  total_amount numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_from timestamptz;
  v_to timestamptz;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios tienen reporte' using errcode = '42501';
  end if;
  if not public.has_active_plan(v_uid) then
    raise exception 'El reporte mensual de trazabilidad es parte del Plan Trazabilidad' using errcode = '42501', hint = 'requiere_plan';
  end if;
  v_from := public.sv_month_start(coalesce(p_month::timestamp at time zone 'America/El_Salvador', now()));
  v_to := (date_trunc('month', v_from at time zone 'America/El_Salvador') + interval '1 month') at time zone 'America/El_Salvador';

  return query
  select p.voucher_code, p.completed_at, c.display_name, l.polymer_code, l.modality, p.confirmed_lb, p.total_amount
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  join public.profiles c on c.id = p.collector_id
  where l.generator_id = v_uid
    and p.completed_at >= v_from and p.completed_at < v_to
  order by p.completed_at;
end;
$$;

revoke execute on function
  public.slugify(text),
  public.get_circular(text),
  public.generator_history(timestamptz, timestamptz),
  public.monthly_report(date)
from public, anon;
grant execute on function
  public.slugify(text),
  public.get_circular(text),
  public.generator_history(timestamptz, timestamptz),
  public.monthly_report(date)
to authenticated, service_role;
grant execute on function public.get_circular(text) to anon;

insert into public.app_migrations (name) values ('20261028000800_circular_reportes') on conflict do nothing;

commit;
