-- Reciclamigo · 20261028000200 · Unidades: libras
-- En El Salvador se trabaja en libras. Convierte los pesos guardados en kilos
-- (1 kg = 2.20462 lb) y renombra las columnas con su unidad explícita:
--   lots.estimated_kg   -> estimated_lb       (kg × 2.20462)
--   lots.price_per_kg   -> price_per_lb       (USD/kg ÷ 2.20462, 2 decimales: 0.20 -> 0.09)
--   pickups.confirmed_kg -> confirmed_lb      (kg × 2.20462)
--   vistas: completed_kg -> completed_lb
-- Los montos en dólares (total_amount) no cambian: es dinero ya acordado.
-- polymers.price_per_kg se deja SIN USAR (los precios de referencia pasan a app_settings en
-- la migración 0300); borrarlo requiere confirmación aparte.
-- Reversa: supabase/rollbacks/20261028_modelo_negocio.down.sql (redondeo ±0.01 lb).

begin;

-- Todo lo que depende de las columnas viejas se recrea abajo.
drop view if exists public.profile_impact;
drop view if exists public.impact_monthly;
drop view if exists public.impact_heat;
drop function if exists public.nearby_lots(double precision, double precision, integer, text[]);
drop function if exists public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text);
drop function if exists public.complete_pickup(uuid, numeric, public.payment_method);
drop function if exists public.get_certificate(text);

-- lots
alter table public.lots drop constraint if exists lots_estimated_kg_check;
alter table public.lots drop constraint if exists lots_price_per_kg_check;
alter table public.lots rename column estimated_kg to estimated_lb;
alter table public.lots rename column price_per_kg to price_per_lb;
alter table public.lots
  alter column estimated_lb type numeric(9, 2) using round(estimated_lb * 2.20462, 2),
  alter column price_per_lb type numeric(7, 3) using round(price_per_lb / 2.20462, 2);
alter table public.lots alter column price_per_lb set default 0;
alter table public.lots add constraint lots_estimated_lb_check check (estimated_lb > 0 and estimated_lb <= 22000);
alter table public.lots add constraint lots_price_per_lb_check check (price_per_lb >= 0);

-- pickups
alter table public.pickups drop constraint if exists pickups_confirmed_kg_check;
alter table public.pickups rename column confirmed_kg to confirmed_lb;
alter table public.pickups
  alter column confirmed_lb type numeric(9, 2) using round(confirmed_lb * 2.20462, 2);
alter table public.pickups add constraint pickups_confirmed_lb_check check (confirmed_lb > 0);

-- Vistas agregadas, ahora en libras.
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
       coalesce(r.rating_count, 0) as rating_count
from public.profiles pr
left join agg a on a.profile_id = pr.id
left join published pu on pu.profile_id = pr.id
left join rated r on r.profile_id = pr.id;

create view public.impact_monthly as
select date_trunc('month', p.completed_at at time zone 'America/El_Salvador')::date as month,
       l.generator_id,
       g.municipality,
       l.polymer_code,
       sum(p.confirmed_lb) as completed_lb,
       sum(p.total_amount) as total_amount,
       count(*)::int as pickups_count
from public.pickups p
join public.lots l on l.id = p.lot_id
join public.profiles g on g.id = l.generator_id
where p.completed_at is not null
group by 1, 2, 3, 4;

create view public.impact_heat as
select g.municipality,
       round(extensions.st_y(l.location::extensions.geometry)::numeric, 3)::double precision as lat,
       round(extensions.st_x(l.location::extensions.geometry)::numeric, 3)::double precision as lng,
       sum(p.confirmed_lb) as completed_lb
from public.pickups p
join public.lots l on l.id = p.lot_id
join public.profiles g on g.id = l.generator_id
where p.completed_at is not null
group by 1, 2, 3;

revoke all on public.profile_impact, public.impact_monthly, public.impact_heat from anon;
grant select on public.profile_impact, public.impact_monthly, public.impact_heat to authenticated;

-- Funciones en libras (la 0700 las reemplaza por la versión final del flujo).
create or replace function public.publish_lot(
  p_polymer_code text,
  p_estimated_lb numeric,
  p_pickup_from timestamptz,
  p_pickup_to timestamptz,
  p_modality public.lot_modality,
  p_photo_urls text[] default '{}',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price numeric(7, 3);
  v_location extensions.geography;
  v_id uuid;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios pueden publicar lotes' using errcode = '42501';
  end if;
  if p_estimated_lb is null or round(p_estimated_lb, 2) <= 0 or p_estimated_lb > 22000 then
    raise exception 'Las libras estimadas deben ser mayores que 0 y hasta 22,000' using errcode = '22023';
  end if;
  if p_pickup_from is null or p_pickup_to is null or p_pickup_to <= p_pickup_from then
    raise exception 'La ventana de retiro debe terminar después de empezar' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_photo_urls), 0) > 3 then
    raise exception 'Máximo 3 fotos por lote' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_photo_urls, '{}')) as u(url)
    where url !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/lot-photos/' || v_uid::text || '/[^/]+$')
  ) then
    raise exception 'Una de las fotos no es válida' using errcode = '22023';
  end if;
  if p_modality is null then
    raise exception 'Indica si el lote es venta, trueque o donación' using errcode = '22023';
  end if;

  select round(price_per_kg / 2.20462, 2) into v_price from public.polymers where code = p_polymer_code;
  if not found then
    raise exception 'Tipo de plástico desconocido' using errcode = '22023';
  end if;

  select location into v_location from public.profile_private where id = v_uid;
  if v_location is null then
    raise exception 'Tu perfil no tiene ubicación registrada' using errcode = '22023';
  end if;

  insert into public.lots (
    generator_id, polymer_code, estimated_lb, photo_urls, pickup_from, pickup_to,
    modality, price_per_lb, notes, location
  ) values (
    v_uid, p_polymer_code, round(p_estimated_lb, 2), coalesce(p_photo_urls, '{}'), p_pickup_from, p_pickup_to,
    p_modality, case when p_modality = 'venta' then v_price else 0 end, nullif(trim(p_notes), ''), v_location
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.nearby_lots(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer,
  p_polymers text[] default null
)
returns table (
  id uuid,
  generator_id uuid,
  generator_name text,
  polymer_code text,
  estimated_lb numeric,
  price_per_lb numeric,
  modality public.lot_modality,
  pickup_from timestamptz,
  pickup_to timestamptz,
  photo_urls text[],
  notes text,
  lat double precision,
  lng double precision,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as point
  )
  select l.id,
         l.generator_id,
         pr.display_name as generator_name,
         l.polymer_code,
         l.estimated_lb,
         l.price_per_lb,
         l.modality,
         l.pickup_from,
         l.pickup_to,
         l.photo_urls,
         l.notes,
         extensions.st_y(l.location::extensions.geometry) as lat,
         extensions.st_x(l.location::extensions.geometry) as lng,
         extensions.st_distance(l.location, o.point) as distance_m
  from public.lots l
  join public.profiles pr on pr.id = l.generator_id
  cross join origin o
  where l.status = 'publicado'
    and extensions.st_dwithin(l.location, o.point, p_radius_m)
    and (p_polymers is null or l.polymer_code = any (p_polymers))
  order by distance_m
$$;

create or replace function public.complete_pickup(
  p_pickup_id uuid,
  p_confirmed_lb numeric,
  p_payment_method public.payment_method
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lot public.lots%rowtype;
  v_code text;
begin
  if v_uid is null or public.my_role() is distinct from 'valorizador' then
    raise exception 'Solo el reciclador puede confirmar el retiro' using errcode = '42501';
  end if;
  if p_confirmed_lb is null or round(p_confirmed_lb, 2) <= 0 or p_confirmed_lb > 22000 then
    raise exception 'Las libras confirmadas deben ser mayores que 0 y hasta 22,000' using errcode = '22023';
  end if;
  if p_payment_method is null then
    raise exception 'Indica el método de pago' using errcode = '22023';
  end if;

  select l.* into v_lot
  from public.lots l
  join public.pickups p on p.lot_id = l.id
  where p.id = p_pickup_id and p.collector_id = v_uid
  for update of l;
  if not found then
    raise exception 'Retiro no encontrado' using errcode = 'P0002';
  end if;
  if v_lot.status = 'completado' then
    raise exception 'Este retiro ya está completado' using errcode = 'P0001';
  end if;
  if v_lot.status <> 'entregado' then
    raise exception 'El comercio todavía no marca la entrega' using errcode = 'P0001';
  end if;

  v_code := 'RCA-' || to_char(now() at time zone 'America/El_Salvador', 'YYYY') || '-'
            || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  update public.lots set status = 'completado' where id = v_lot.id;
  update public.pickups
  set completed_at = now(),
      confirmed_lb = round(p_confirmed_lb, 2),
      total_amount = round(round(p_confirmed_lb, 2) * v_lot.price_per_lb, 2),
      payment_method = p_payment_method,
      certificate_code = v_code
  where id = p_pickup_id;

  return v_code;
end;
$$;

create or replace function public.get_certificate(p_code text)
returns table (
  code text,
  completed_at timestamptz,
  generator_name text,
  generator_org_type text,
  municipality text,
  collector_name text,
  collector_org_type text,
  polymer_code text,
  polymer_name text,
  resin_number smallint,
  confirmed_lb numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.certificate_code,
         p.completed_at,
         g.display_name,
         g.org_type,
         g.municipality,
         c.display_name,
         c.org_type,
         l.polymer_code,
         po.name,
         po.resin_number,
         p.confirmed_lb
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  join public.profiles g on g.id = l.generator_id
  join public.profiles c on c.id = p.collector_id
  join public.polymers po on po.code = l.polymer_code
  where p.certificate_code = p_code
    and p.completed_at is not null
$$;

revoke execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.nearby_lots(double precision, double precision, integer, text[]),
  public.complete_pickup(uuid, numeric, public.payment_method),
  public.get_certificate(text)
from public, anon;

grant execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.nearby_lots(double precision, double precision, integer, text[]),
  public.complete_pickup(uuid, numeric, public.payment_method),
  public.get_certificate(text)
to authenticated, service_role;

grant execute on function public.get_certificate(text) to anon;

insert into public.app_migrations (name) values ('20261028000200_unidades_libras') on conflict do nothing;

commit;
