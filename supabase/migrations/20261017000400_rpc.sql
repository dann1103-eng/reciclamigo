-- Reciclamigo · 0400 · Funciones RPC
-- Toda transición de estado del mercado pasa por aquí. Las funciones operativas son
-- security definer, validan auth.uid() y el rol, y rechazan a la alcaldía.
-- Errores en español: la app los muestra tal cual.

begin;

-- Comercio publica un lote. Ubicación y precio los fija el servidor.
create or replace function public.publish_lot(
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
  if p_estimated_kg is null or p_estimated_kg <= 0 or p_estimated_kg > 10000 then
    raise exception 'Los kg estimados deben ser mayores que 0 y hasta 10,000' using errcode = '22023';
  end if;
  if p_pickup_from is null or p_pickup_to is null or p_pickup_to <= p_pickup_from then
    raise exception 'La ventana de retiro debe terminar después de empezar' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_photo_urls), 0) > 3 then
    raise exception 'Máximo 3 fotos por lote' using errcode = '22023';
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

-- Lotes publicados dentro de un radio, ordenados por distancia.
-- security invoker: el RLS de lots deja fuera a la alcaldía (devuelve vacío).
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

-- Reciclador reserva un lote. El UPDATE condicionado evita la doble reserva.
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

-- Comercio dueño del lote confirma que entregó el material.
create or replace function public.mark_delivered(p_pickup_id uuid)
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

-- Reciclador confirma kg reales y método de pago (solo se registra). Devuelve el código del certificado.
create or replace function public.complete_pickup(
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
  if p_confirmed_kg is null or p_confirmed_kg <= 0 or p_confirmed_kg > 10000 then
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

-- Calificación recíproca: cada parte califica a la otra una sola vez.
create or replace function public.rate_pickup(
  p_pickup_id uuid,
  p_stars smallint,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_generator_id uuid;
  v_collector_id uuid;
  v_completed_at timestamptz;
begin
  if v_uid is null or coalesce(public.my_role()::text, '') not in ('generador', 'valorizador') then
    raise exception 'Solo comercios y recicladores pueden calificar' using errcode = '42501';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'La calificación va de 1 a 5 estrellas' using errcode = '22023';
  end if;
  if char_length(p_comment) > 280 then
    raise exception 'El comentario puede tener hasta 280 caracteres' using errcode = '22023';
  end if;

  select l.generator_id, p.collector_id, p.completed_at
  into v_generator_id, v_collector_id, v_completed_at
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  where p.id = p_pickup_id;
  if not found or v_uid not in (v_generator_id, v_collector_id) then
    raise exception 'Retiro no encontrado' using errcode = 'P0002';
  end if;
  if v_completed_at is null then
    raise exception 'Solo se califican retiros completados' using errcode = 'P0001';
  end if;

  insert into public.ratings (pickup_id, rater_id, ratee_id, stars, comment)
  values (
    p_pickup_id,
    v_uid,
    case when v_uid = v_generator_id then v_collector_id else v_generator_id end,
    p_stars,
    nullif(trim(p_comment), '')
  );
exception
  when unique_violation then
    raise exception 'Ya calificaste este retiro' using errcode = '23505';
end;
$$;

-- Certificado público por código (lo usa la página de verificación sin sesión).
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

-- Permisos: solo usuarios con sesión; el certificado también sin sesión.
revoke execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.nearby_lots(double precision, double precision, integer, text[]),
  public.reserve_lot(uuid),
  public.mark_delivered(uuid),
  public.complete_pickup(uuid, numeric, public.payment_method),
  public.rate_pickup(uuid, smallint, text),
  public.get_certificate(text)
from public, anon;

grant execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.nearby_lots(double precision, double precision, integer, text[]),
  public.reserve_lot(uuid),
  public.mark_delivered(uuid),
  public.complete_pickup(uuid, numeric, public.payment_method),
  public.rate_pickup(uuid, smallint, text),
  public.get_certificate(text)
to authenticated, service_role;

grant execute on function public.get_certificate(text) to anon;

insert into public.app_migrations (name) values ('20261017000400_rpc') on conflict do nothing;

commit;
