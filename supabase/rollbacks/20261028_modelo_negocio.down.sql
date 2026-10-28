-- Reciclamigo · REVERSA de las migraciones 20261028000100 a 20261028000900
-- Deja la base como estaba después de 20261018000100_ajustes: libras -> kilos, sin planes,
-- comisión, puntos, avisos, configuración ni flujo bilateral.
--
-- • NO es una migración: vive fuera de supabase/migrations/ y se corre a mano, una sola vez,
--   en el SQL Editor, solo si hay que deshacer el paquete.
-- • Es con pérdida: los pesos vuelven a kilos con redondeo de ±0.01 y se pierden las tablas
--   nuevas (planes, comisiones, puntos, avisos, retiros programados, configuración).
-- • El valor 'administrador' del enum user_role NO se puede quitar en Postgres; queda sin uso.
--   Antes de revertir, cambia o borra los perfiles con ese rol.
-- • Se prueba en tests/db/unidades.test.ts.

begin;

-- ===== 0900 · Ajustes de administración (set_setting se elimina con la 0300) =====
drop function if exists public.commission_pickup_facts(uuid[]);

-- ===== 0800 · Comercio Circular, historial y reporte =====
drop function if exists public.monthly_report(date);
drop function if exists public.generator_history(timestamptz, timestamptz);
drop function if exists public.get_circular(text);
drop trigger if exists profiles_set_slug on public.profiles;
drop function if exists public._profiles_set_slug();
drop function if exists public.slugify(text);
alter table public.profiles drop column if exists slug;

-- ===== 0700 · Flujo del lote =====
drop function if exists public.create_scheduled_lots();
drop function if exists public.delete_scheduled_pickup(uuid);
drop function if exists public.set_scheduled_active(uuid, boolean);
drop function if exists public.save_scheduled_pickup(uuid, text, numeric, public.lot_modality, smallint, time, time, text, uuid);
drop function if exists public.release_expired_reservations();
drop function if exists public.release_reservation(uuid);
drop function if exists public._release_pickup(uuid, text);
drop function if exists public.get_voucher(text);
drop function if exists public.complete_pickup(uuid, boolean, numeric, numeric, public.payment_method);
drop function if exists public.propose_delivery(uuid, numeric, numeric);
drop function if exists public.repeat_lot(uuid);
drop function if exists public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text);
drop function if exists public._create_lot(uuid, text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text, boolean, uuid, uuid);

alter table public.lots drop column if exists scheduled_pickup_id;
drop table if exists public.scheduled_pickups;

drop trigger if exists profile_private_normalize on public.profile_private;
drop function if exists public._profile_private_normalize();
drop function if exists public.normalize_sv_phone(text);

alter table public.pickups
  drop column if exists proposed_lb,
  drop column if exists proposed_price_per_lb,
  drop column if exists proposed_at,
  drop column if exists final_price_per_lb,
  drop column if exists was_corrected;
alter table public.pickups rename constraint pickups_voucher_code_key to pickups_certificate_code_key;
alter table public.pickups rename column voucher_code to certificate_code;

-- ===== 0600 · Avisos =====
drop function if exists public.finish_notification(uuid, text);
drop function if exists public.claim_due_notifications(integer);
drop function if exists public._enqueue_notification(uuid, text, jsonb);
drop function if exists public._enqueue_lot_alerts(uuid, uuid);
drop function if exists public._lot_alert_recipients(uuid, uuid);
drop function if exists public.set_alert_prefs(integer, text[], boolean);
drop function if exists public.remove_push_subscription(text);
drop function if exists public.save_push_subscription(text, text, text, text);
drop table if exists public.pickup_releases;
drop table if exists public.notification_queue;
drop table if exists public.alert_prefs;
drop table if exists public.push_subscriptions;

-- ===== 0500 · Puntos y reputación =====
drop view if exists public.profile_impact;
drop function if exists public.redeem_points(uuid, integer, text);
drop function if exists public._award_points(uuid);
drop function if exists public.points_balance(uuid);
drop function if exists public.reputation_tier(integer, numeric, integer);
drop table if exists public.points_ledger;

-- ===== 0400 · Planes y comisión =====
drop function if exists public.set_commission_status(uuid, text);
drop function if exists public.commission_summary(date);
drop function if exists public.set_valorizador_tipo(uuid, public.valorizador_tipo);
drop function if exists public.plan_status();
drop function if exists public.request_plan();
drop function if exists public.set_generator_plan(uuid, public.plan_tier, timestamptz);
drop function if exists public.has_active_plan(uuid);
drop table if exists public.commissions;
drop table if exists public.generator_plans;
drop type if exists public.plan_tier;
alter table public.profiles drop constraint if exists profiles_tipo_valorizador_check;
alter table public.profiles drop column if exists tipo_valorizador;
drop type if exists public.valorizador_tipo;

-- ===== 0300 · Configuración =====
drop function if exists public.set_setting(text, jsonb);
drop function if exists public.is_admin();
drop function if exists public.sv_month_start(timestamptz);
drop function if exists public.setting_num(text);
drop table if exists public.app_settings;

-- ===== 0200 · Unidades: libras -> kilos =====
drop view if exists public.impact_monthly;
drop view if exists public.impact_heat;
drop function if exists public.nearby_lots(double precision, double precision, integer, text[]);
drop function if exists public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text);
drop function if exists public.complete_pickup(uuid, numeric, public.payment_method);
drop function if exists public.get_certificate(text);

alter table public.lots drop constraint if exists lots_estimated_lb_check;
alter table public.lots drop constraint if exists lots_price_per_lb_check;
alter table public.lots rename column estimated_lb to estimated_kg;
alter table public.lots rename column price_per_lb to price_per_kg;
alter table public.lots
  alter column estimated_kg type numeric(8, 2) using round(estimated_kg * 0.45359237, 2),
  alter column price_per_kg type numeric(6, 2) using round(price_per_kg * 2.20462, 2);
alter table public.lots add constraint lots_estimated_kg_check check (estimated_kg > 0 and estimated_kg <= 10000);
alter table public.lots add constraint lots_price_per_kg_check check (price_per_kg >= 0);

alter table public.pickups drop constraint if exists pickups_confirmed_lb_check;
alter table public.pickups rename column confirmed_lb to confirmed_kg;
alter table public.pickups
  alter column confirmed_kg type numeric(8, 2) using round(confirmed_kg * 0.45359237, 2);
alter table public.pickups add constraint pickups_confirmed_kg_check check (confirmed_kg > 0);

-- Vistas y funciones tal como quedaron en 0300, 0400 y 20261018000100_ajustes.
create view public.profile_impact as
with completed as (
  select l.generator_id, p.collector_id, p.confirmed_kg, p.total_amount
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  where p.completed_at is not null
),
party as (
  select generator_id as profile_id, confirmed_kg, total_amount from completed
  union all
  select collector_id, confirmed_kg, total_amount from completed
),
agg as (
  select profile_id,
         count(*)::int as completed_count,
         sum(confirmed_kg) as completed_kg,
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
       coalesce(a.completed_kg, 0) as completed_kg,
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
       sum(p.confirmed_kg) as completed_kg,
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
       sum(p.confirmed_kg) as completed_kg
from public.pickups p
join public.lots l on l.id = p.lot_id
join public.profiles g on g.id = l.generator_id
where p.completed_at is not null
group by 1, 2, 3;

revoke all on public.profile_impact, public.impact_monthly, public.impact_heat from anon;
grant select on public.profile_impact, public.impact_monthly, public.impact_heat to authenticated;

create function public.publish_lot(
  p_polymer_code text,
  p_estimated_kg numeric,
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
  v_price numeric(6, 2);
  v_location extensions.geography;
  v_id uuid;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios pueden publicar lotes' using errcode = '42501';
  end if;
  if p_estimated_kg is null or round(p_estimated_kg, 2) <= 0 or p_estimated_kg > 10000 then
    raise exception 'Los kg estimados deben ser mayores que 0 y hasta 10,000' using errcode = '22023';
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

  select price_per_kg into v_price from public.polymers where code = p_polymer_code;
  if not found then
    raise exception 'Tipo de plástico desconocido' using errcode = '22023';
  end if;

  select location into v_location from public.profile_private where id = v_uid;
  if v_location is null then
    raise exception 'Tu perfil no tiene ubicación registrada' using errcode = '22023';
  end if;

  insert into public.lots (
    generator_id, polymer_code, estimated_kg, photo_urls, pickup_from, pickup_to,
    modality, price_per_kg, notes, location
  ) values (
    v_uid, p_polymer_code, round(p_estimated_kg, 2), coalesce(p_photo_urls, '{}'), p_pickup_from, p_pickup_to,
    p_modality, case when p_modality = 'venta' then v_price else 0 end, nullif(trim(p_notes), ''), v_location
  )
  returning id into v_id;

  return v_id;
end;
$$;

create function public.nearby_lots(
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
  estimated_kg numeric,
  price_per_kg numeric,
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
         l.estimated_kg,
         l.price_per_kg,
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

create or replace function public.reserve_lot(p_lot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_pickup_id uuid;
begin
  if v_uid is null or public.my_role() is distinct from 'valorizador' then
    raise exception 'Solo los recicladores pueden reservar lotes' using errcode = '42501';
  end if;

  update public.lots set status = 'reservado'
  where id = p_lot_id and status = 'publicado';
  if not found then
    raise exception 'El lote ya no está disponible' using errcode = 'P0001';
  end if;

  insert into public.pickups (lot_id, collector_id) values (p_lot_id, v_uid)
  returning id into v_pickup_id;

  return v_pickup_id;
end;
$$;

create function public.mark_delivered(p_pickup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lot_id uuid;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo el comercio puede marcar la entrega' using errcode = '42501';
  end if;

  select p.lot_id into v_lot_id
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  where p.id = p_pickup_id and l.generator_id = v_uid;
  if v_lot_id is null then
    raise exception 'Retiro no encontrado' using errcode = 'P0002';
  end if;

  update public.lots set status = 'entregado'
  where id = v_lot_id and status = 'reservado';
  if not found then
    raise exception 'El lote no está reservado' using errcode = 'P0001';
  end if;

  update public.pickups set delivered_at = now() where id = p_pickup_id;
end;
$$;

create function public.complete_pickup(
  p_pickup_id uuid,
  p_confirmed_kg numeric,
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
  if p_confirmed_kg is null or round(p_confirmed_kg, 2) <= 0 or p_confirmed_kg > 10000 then
    raise exception 'Los kg confirmados deben ser mayores que 0 y hasta 10,000' using errcode = '22023';
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
      confirmed_kg = round(p_confirmed_kg, 2),
      total_amount = round(round(p_confirmed_kg, 2) * v_lot.price_per_kg, 2),
      payment_method = p_payment_method,
      certificate_code = v_code
  where id = p_pickup_id;

  return v_code;
end;
$$;

create function public.get_certificate(p_code text)
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
  confirmed_kg numeric
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
         p.confirmed_kg
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
  public.reserve_lot(uuid),
  public.mark_delivered(uuid),
  public.complete_pickup(uuid, numeric, public.payment_method),
  public.get_certificate(text)
from public, anon;
grant execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.nearby_lots(double precision, double precision, integer, text[]),
  public.reserve_lot(uuid),
  public.mark_delivered(uuid),
  public.complete_pickup(uuid, numeric, public.payment_method),
  public.get_certificate(text)
to authenticated, service_role;
grant execute on function public.get_certificate(text) to anon;

-- Para poder volver a aplicar las migraciones nuevas.
delete from public.app_migrations where name like '20261028%';

commit;
