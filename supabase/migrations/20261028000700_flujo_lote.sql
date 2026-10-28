-- Reciclamigo · 20261028000700 · Flujo del lote
-- • publish_lot con límite de lotes gratis por mes (hora de El Salvador); repeat_lot.
-- • Confirmación bilateral: el comercio propone el peso real y el precio final
--   (propose_delivery); el reciclador acepta o corrige en un paso (complete_pickup).
--   SOLO ahí se genera el comprobante, los puntos, la reputación y la comisión.
-- • Reserva sin confirmar: se libera a mano (release_reservation) o sola
--   (release_expired_reservations) y el lote se vuelve a publicar y a avisar.
-- • Retiros programados (plan): create_scheduled_lots() crea el lote y avisa primero al
--   reciclador de confianza.
-- • "Certificado" pasa a "comprobante": voucher_code y get_voucher.
-- • WhatsApp siempre en formato internacional de El Salvador (+503).

begin;

-- Comprobante
alter table public.pickups rename column certificate_code to voucher_code;
alter table public.pickups rename constraint pickups_certificate_code_key to pickups_voucher_code_key;

-- Propuesta de entrega y confirmación
alter table public.pickups
  add column proposed_lb numeric(9, 2) check (proposed_lb > 0),
  add column proposed_price_per_lb numeric(7, 3) check (proposed_price_per_lb >= 0),
  add column proposed_at timestamptz,
  add column final_price_per_lb numeric(7, 3) check (final_price_per_lb >= 0),
  add column was_corrected boolean not null default false;

-- Datos anteriores: lo entregado ya tiene "propuesta" y lo completado ya tiene precio final.
update public.pickups p
set proposed_lb = coalesce(p.confirmed_lb, l.estimated_lb),
    proposed_price_per_lb = l.price_per_lb,
    proposed_at = p.delivered_at
from public.lots l
where l.id = p.lot_id and p.delivered_at is not null;

update public.pickups p
set final_price_per_lb = l.price_per_lb
from public.lots l
where l.id = p.lot_id and p.completed_at is not null;

-- Retiros programados
create table public.scheduled_pickups (
  id uuid primary key default gen_random_uuid(),
  generator_id uuid not null references public.profiles (id) on delete cascade,
  collector_id uuid not null references public.profiles (id) on delete cascade,
  polymer_code text not null references public.polymers (code),
  estimated_lb numeric(9, 2) not null check (estimated_lb > 0 and estimated_lb <= 22000),
  modality public.lot_modality not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  notes text,
  active boolean not null default true,
  last_created_for date,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index scheduled_pickups_generator_idx on public.scheduled_pickups (generator_id);
alter table public.scheduled_pickups enable row level security;

create policy "El comercio y su reciclador de confianza ven el retiro programado"
  on public.scheduled_pickups for select to authenticated
  using (generator_id = (select auth.uid()) or collector_id = (select auth.uid()));

alter table public.lots
  add column scheduled_pickup_id uuid references public.scheduled_pickups (id) on delete set null;

-- WhatsApp: 8 dígitos -> 503 + 8 dígitos; se quita todo lo que no sea número.
create or replace function public.normalize_sv_phone(p_raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d = '' then null
    when length(d) = 8 then '503' || d
    else d
  end
  from (select regexp_replace(regexp_replace(coalesce(p_raw, ''), '\D', '', 'g'), '^00', '') as d) s
$$;

create or replace function public._profile_private_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.whatsapp := public.normalize_sv_phone(new.whatsapp);
  return new;
end;
$$;

create trigger profile_private_normalize
  before insert or update of whatsapp on public.profile_private
  for each row execute function public._profile_private_normalize();

update public.profile_private set whatsapp = public.normalize_sv_phone(whatsapp) where whatsapp is not null;

-- Interno: crea un lote (validaciones, límite gratis, precio de referencia, avisos).
create or replace function public._create_lot(
  p_uid uuid,
  p_polymer_code text,
  p_estimated_lb numeric,
  p_pickup_from timestamptz,
  p_pickup_to timestamptz,
  p_modality public.lot_modality,
  p_photo_urls text[],
  p_notes text,
  p_enforce_limit boolean default true,
  p_scheduled_id uuid default null,
  p_trusted uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price numeric(7, 3);
  v_location extensions.geography;
  v_id uuid;
  v_limit numeric;
  v_count integer;
begin
  if p_estimated_lb is null or round(p_estimated_lb, 2) <= 0 or p_estimated_lb > 22000 then
    raise exception 'Las libras estimadas deben ser mayores que 0 y hasta 22,000' using errcode = '22023';
  end if;
  if p_pickup_from is null or p_pickup_to is null or p_pickup_to <= p_pickup_from then
    raise exception 'La ventana de retiro debe terminar después de empezar' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_photo_urls), 0) > 3 then
    raise exception 'Máximo 3 fotos por lote' using errcode = '22023';
  end if;
  -- Solo fotos subidas por este comercio a su carpeta del bucket (nada de imágenes externas).
  if exists (
    select 1
    from unnest(coalesce(p_photo_urls, '{}')) as u(url)
    where url !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/lot-photos/' || p_uid::text || '/[^/]+$')
  ) then
    raise exception 'Una de las fotos no es válida' using errcode = '22023';
  end if;
  if p_modality is null then
    raise exception 'Indica si el lote es venta, trueque o donación' using errcode = '22023';
  end if;
  if not exists (select 1 from public.polymers where code = p_polymer_code) then
    raise exception 'Tipo de plástico desconocido' using errcode = '22023';
  end if;

  select location into v_location from public.profile_private where id = p_uid;
  if v_location is null then
    raise exception 'Tu perfil no tiene ubicación registrada' using errcode = '22023';
  end if;

  -- Límite del plan gratis: cuenta los lotes publicados en el mes calendario de El Salvador.
  -- Solo bloquea publicar uno nuevo; nunca toca lotes ya publicados ni entregas.
  if p_enforce_limit and not public.has_active_plan(p_uid) then
    perform pg_advisory_xact_lock(hashtext('lotes:' || p_uid::text));
    v_limit := public.setting_num('lotes_gratis_por_mes');
    select count(*)::int into v_count
    from public.lots
    where generator_id = p_uid and created_at >= public.sv_month_start();
    if v_limit is not null and v_count >= v_limit then
      raise exception 'Ya publicaste tus % lotes gratis de este mes. Activa el Plan Trazabilidad para publicar sin límite.', v_limit::int
        using errcode = 'P0001', hint = 'limite_gratis';
    end if;
  end if;

  -- Precio de referencia desde la configuración (sin referencia = 0: se acuerda entre las partes).
  v_price := coalesce(public.setting_num('precio_ref_' || lower(p_polymer_code) || '_usd_lb'), 0);

  insert into public.lots (
    generator_id, polymer_code, estimated_lb, photo_urls, pickup_from, pickup_to,
    modality, price_per_lb, notes, location, scheduled_pickup_id
  ) values (
    p_uid, p_polymer_code, round(p_estimated_lb, 2), coalesce(p_photo_urls, '{}'), p_pickup_from, p_pickup_to,
    p_modality, case when p_modality = 'venta' then v_price else 0 end, nullif(trim(p_notes), ''), v_location,
    p_scheduled_id
  )
  returning id into v_id;

  perform public._enqueue_lot_alerts(v_id, p_trusted);
  return v_id;
end;
$$;

-- Comercio publica un lote. Ubicación y precio los fija el servidor.
drop function if exists public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text);
create function public.publish_lot(
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
begin
  if auth.uid() is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios pueden publicar lotes' using errcode = '42501';
  end if;
  return public._create_lot(
    auth.uid(), p_polymer_code, p_estimated_lb, p_pickup_from, p_pickup_to, p_modality, p_photo_urls, p_notes
  );
end;
$$;

-- Repetir lote con un toque: copia el lote y corre la ventana de retiro a un día futuro.
create or replace function public.repeat_lot(p_lot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_src public.lots%rowtype;
  v_days integer;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios pueden publicar lotes' using errcode = '42501';
  end if;
  select * into v_src from public.lots where id = p_lot_id and generator_id = v_uid;
  if not found then
    raise exception 'Lote no encontrado' using errcode = 'P0002';
  end if;
  v_days := greatest(1, ceil(extract(epoch from (now() + interval '1 hour' - v_src.pickup_from)) / 86400)::int);
  return public._create_lot(
    v_uid, v_src.polymer_code, v_src.estimated_lb,
    v_src.pickup_from + v_days * interval '1 day', v_src.pickup_to + v_days * interval '1 day',
    v_src.modality, v_src.photo_urls, v_src.notes
  );
end;
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
  v_lot public.lots%rowtype;
begin
  if v_uid is null or public.my_role() is distinct from 'valorizador' then
    raise exception 'Solo los recicladores pueden reservar lotes' using errcode = '42501';
  end if;

  update public.lots set status = 'reservado'
  where id = p_lot_id and status = 'publicado'
  returning * into v_lot;
  if not found then
    raise exception 'El lote ya no está disponible' using errcode = 'P0001';
  end if;

  insert into public.pickups (lot_id, collector_id) values (p_lot_id, v_uid)
  returning id into v_pickup_id;

  perform public._enqueue_notification(
    v_lot.generator_id,
    'lote_reservado',
    jsonb_build_object('lot_id', v_lot.id, 'pickup_id', v_pickup_id, 'polymer_code', v_lot.polymer_code, 'estimated_lb', v_lot.estimated_lb)
  );
  return v_pickup_id;
end;
$$;

-- El comercio registra la entrega con el peso real y el precio final (propuesta).
drop function if exists public.mark_delivered(uuid);
create or replace function public.propose_delivery(p_pickup_id uuid, p_lb numeric, p_price_per_lb numeric default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lot public.lots%rowtype;
  v_collector uuid;
  v_price numeric(7, 3);
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo el comercio puede registrar la entrega' using errcode = '42501';
  end if;
  if p_lb is null or round(p_lb, 2) <= 0 or p_lb > 22000 then
    raise exception 'Las libras reales deben ser mayores que 0 y hasta 22,000' using errcode = '22023';
  end if;

  select l.* into v_lot
  from public.lots l
  join public.pickups p on p.lot_id = l.id
  where p.id = p_pickup_id and l.generator_id = v_uid
  for update of l;
  if not found then
    raise exception 'Retiro no encontrado' using errcode = 'P0002';
  end if;
  select collector_id into v_collector from public.pickups where id = p_pickup_id;
  if v_lot.status = 'completado' then
    raise exception 'Esta entrega ya está confirmada' using errcode = 'P0001';
  end if;
  if v_lot.status not in ('reservado', 'entregado') then
    raise exception 'El lote no está reservado' using errcode = 'P0001';
  end if;

  v_price := case when v_lot.modality = 'venta' then coalesce(p_price_per_lb, v_lot.price_per_lb) else 0 end;
  if v_price < 0 then
    raise exception 'El precio no puede ser negativo' using errcode = '22023';
  end if;

  update public.lots set status = 'entregado' where id = v_lot.id;
  update public.pickups
  set delivered_at = coalesce(delivered_at, now()),
      proposed_lb = round(p_lb, 2),
      proposed_price_per_lb = v_price,
      proposed_at = now()
  where id = p_pickup_id;

  perform public._enqueue_notification(
    v_collector,
    'entrega_propuesta',
    jsonb_build_object('pickup_id', p_pickup_id, 'lot_id', v_lot.id, 'proposed_lb', round(p_lb, 2))
  );
end;
$$;

-- El reciclador acepta o corrige en un paso. Solo aquí cuenta la entrega: comprobante,
-- puntos, reputación y (si el comprador es de volumen y es una venta) comisión.
drop function if exists public.complete_pickup(uuid, numeric, public.payment_method);
create or replace function public.complete_pickup(
  p_pickup_id uuid,
  p_accept boolean,
  p_confirmed_lb numeric default null,
  p_final_price_per_lb numeric default null,
  p_payment_method public.payment_method default 'efectivo'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lot public.lots%rowtype;
  v_pickup public.pickups%rowtype;
  v_lb numeric(9, 2);
  v_price numeric(7, 3);
  v_total numeric(10, 2);
  v_code text;
  v_tipo public.valorizador_tipo;
  v_pct numeric;
begin
  if v_uid is null or public.my_role() is distinct from 'valorizador' then
    raise exception 'Solo el reciclador puede confirmar el retiro' using errcode = '42501';
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
    raise exception 'El comercio todavía no registra la entrega' using errcode = 'P0001';
  end if;

  select * into v_pickup from public.pickups where id = p_pickup_id;
  if v_pickup.proposed_lb is null then
    raise exception 'El comercio todavía no registra el peso real de la entrega' using errcode = 'P0001';
  end if;

  if coalesce(p_accept, false) then
    v_lb := v_pickup.proposed_lb;
    v_price := v_pickup.proposed_price_per_lb;
  else
    if p_confirmed_lb is null or round(p_confirmed_lb, 2) <= 0 or p_confirmed_lb > 22000 then
      raise exception 'Las libras confirmadas deben ser mayores que 0 y hasta 22,000' using errcode = '22023';
    end if;
    v_lb := round(p_confirmed_lb, 2);
    v_price := case
      when v_lot.modality = 'venta' then coalesce(p_final_price_per_lb, v_pickup.proposed_price_per_lb)
      else 0
    end;
    if v_price < 0 then
      raise exception 'El precio no puede ser negativo' using errcode = '22023';
    end if;
  end if;

  v_total := case when v_lot.modality = 'venta' then round(v_lb * v_price, 2) else 0 end;
  v_code := 'RCA-' || to_char(now() at time zone 'America/El_Salvador', 'YYYY') || '-'
            || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  update public.lots set status = 'completado' where id = v_lot.id;
  update public.pickups
  set completed_at = now(),
      confirmed_lb = v_lb,
      final_price_per_lb = v_price,
      total_amount = v_total,
      payment_method = p_payment_method,
      voucher_code = v_code,
      was_corrected = (v_lb is distinct from v_pickup.proposed_lb or v_price is distinct from v_pickup.proposed_price_per_lb)
  where id = p_pickup_id;

  -- Comisión: solo compradores de volumen, solo ventas con valor.
  select tipo_valorizador into v_tipo from public.profiles where id = v_uid;
  if v_tipo = 'volumen' and v_lot.modality = 'venta' and v_total > 0 then
    v_pct := coalesce(public.setting_num('comision_volumen_pct'), 3);
    insert into public.commissions (pickup_id, collector_id, gross_amount, pct, amount)
    values (p_pickup_id, v_uid, v_total, v_pct, round(v_total * v_pct / 100, 2));
  end if;

  perform public._award_points(p_pickup_id);

  perform public._enqueue_notification(
    v_lot.generator_id,
    'entrega_confirmada',
    jsonb_build_object('pickup_id', p_pickup_id, 'lot_id', v_lot.id, 'confirmed_lb', v_lb, 'voucher_code', v_code)
  );

  return v_code;
end;
$$;

-- Interno: suelta la reserva (archiva el retiro, el lote vuelve a "publicado" y se avisa de nuevo).
create or replace function public._release_pickup(p_pickup_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pickup public.pickups%rowtype;
  v_lot public.lots%rowtype;
begin
  select * into v_pickup from public.pickups where id = p_pickup_id for update;
  if not found then
    raise exception 'Retiro no encontrado' using errcode = 'P0002';
  end if;
  select * into v_lot from public.lots where id = v_pickup.lot_id for update;
  if v_lot.status <> 'reservado' then
    raise exception 'Solo se puede liberar una reserva que todavía no tiene entrega registrada' using errcode = 'P0001';
  end if;

  insert into public.pickup_releases (lot_id, collector_id, reserved_at, reason)
  values (v_lot.id, v_pickup.collector_id, v_pickup.reserved_at, p_reason);
  delete from public.pickups where id = p_pickup_id;
  update public.lots set status = 'publicado' where id = v_lot.id;

  if p_reason in ('generador', 'automatica') then
    perform public._enqueue_notification(
      v_pickup.collector_id, 'reserva_liberada',
      jsonb_build_object('lot_id', v_lot.id, 'reason', p_reason)
    );
  end if;
  if p_reason in ('reciclador', 'automatica') then
    perform public._enqueue_notification(
      v_lot.generator_id, 'reserva_liberada',
      jsonb_build_object('lot_id', v_lot.id, 'reason', p_reason)
    );
  end if;
  perform public._enqueue_lot_alerts(v_lot.id);
end;
$$;

-- El comercio dueño del lote, o el reciclador que lo reservó, la suelta con un toque.
create or replace function public.release_reservation(p_pickup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_generator uuid;
  v_collector uuid;
begin
  if v_uid is null then
    raise exception 'Entra para continuar' using errcode = '42501';
  end if;
  select l.generator_id, p.collector_id into v_generator, v_collector
  from public.pickups p join public.lots l on l.id = p.lot_id
  where p.id = p_pickup_id;
  if not found or v_uid not in (v_generator, v_collector) then
    raise exception 'Retiro no encontrado' using errcode = 'P0002';
  end if;
  perform public._release_pickup(p_pickup_id, case when v_uid = v_generator then 'generador' else 'reciclador' end);
end;
$$;

-- Reservas sin entrega registrada pasadas horas_liberar_reserva del horario de retiro. Es
-- idempotente: la app la llama al cargar pantallas y desde el cron.
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours numeric := coalesce(public.setting_num('horas_liberar_reserva'), 24);
  v_count integer := 0;
  r record;
begin
  for r in
    select p.id
    from public.pickups p
    join public.lots l on l.id = p.lot_id
    where l.status = 'reservado' and l.pickup_to + v_hours * interval '1 hour' < now()
  loop
    begin
      perform public._release_pickup(r.id, 'automatica');
      v_count := v_count + 1;
    exception when sqlstate 'P0001' then
      null; -- otra operación la movió justo antes
    end;
  end loop;
  return v_count;
end;
$$;

-- Retiros programados (solo con plan)
create or replace function public.save_scheduled_pickup(
  p_collector_id uuid,
  p_polymer_code text,
  p_estimated_lb numeric,
  p_modality public.lot_modality,
  p_weekday smallint,
  p_start_time time,
  p_end_time time,
  p_notes text default null,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or public.my_role() is distinct from 'generador' then
    raise exception 'Solo los comercios programan retiros' using errcode = '42501';
  end if;
  if not public.has_active_plan(v_uid) then
    raise exception 'Los retiros programados son parte del Plan Trazabilidad' using errcode = '42501', hint = 'requiere_plan';
  end if;
  if not exists (select 1 from public.profiles where id = p_collector_id and role = 'valorizador') then
    raise exception 'Elige un reciclador válido' using errcode = '22023';
  end if;
  if p_estimated_lb is null or p_estimated_lb <= 0 or p_estimated_lb > 22000 then
    raise exception 'Las libras estimadas deben ser mayores que 0 y hasta 22,000' using errcode = '22023';
  end if;
  if p_weekday is null or p_weekday not between 0 and 6 then
    raise exception 'Elige el día de la semana' using errcode = '22023';
  end if;
  if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
    raise exception 'La hora final debe ser después de la inicial' using errcode = '22023';
  end if;
  if not exists (select 1 from public.polymers where code = p_polymer_code) then
    raise exception 'Tipo de plástico desconocido' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.scheduled_pickups (generator_id, collector_id, polymer_code, estimated_lb, modality, weekday, start_time, end_time, notes)
    values (v_uid, p_collector_id, p_polymer_code, round(p_estimated_lb, 2), p_modality, p_weekday, p_start_time, p_end_time, nullif(trim(p_notes), ''))
    returning id into v_id;
  else
    update public.scheduled_pickups
    set collector_id = p_collector_id, polymer_code = p_polymer_code, estimated_lb = round(p_estimated_lb, 2),
        modality = p_modality, weekday = p_weekday, start_time = p_start_time, end_time = p_end_time,
        notes = nullif(trim(p_notes), ''), active = true
    where id = p_id and generator_id = v_uid
    returning id into v_id;
    if v_id is null then
      raise exception 'Retiro programado no encontrado' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_scheduled_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.scheduled_pickups set active = coalesce(p_active, false)
  where id = p_id and generator_id = auth.uid();
  if not found then
    raise exception 'Retiro programado no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_scheduled_pickup(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.scheduled_pickups where id = p_id and generator_id = auth.uid();
  if not found then
    raise exception 'Retiro programado no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

-- Crea los lotes de las próximas 48 h de cada retiro programado activo (comercios con plan).
-- La llama el cron de la app con el rol de servicio.
create or replace function public.create_scheduled_lots()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_k integer;
  v_date date;
  v_from timestamptz;
  v_to timestamptz;
  v_count integer := 0;
begin
  for r in
    select sp.* from public.scheduled_pickups sp
    where sp.active and public.has_active_plan(sp.generator_id)
  loop
    for v_k in 0..2 loop
      v_date := (now() at time zone 'America/El_Salvador')::date + v_k;
      continue when extract(dow from v_date)::int <> r.weekday;
      v_from := (v_date + r.start_time) at time zone 'America/El_Salvador';
      v_to := (v_date + r.end_time) at time zone 'America/El_Salvador';
      continue when v_from <= now() or v_from > now() + interval '48 hours';
      continue when r.last_created_for is not null and r.last_created_for >= v_date;

      perform public._create_lot(
        r.generator_id, r.polymer_code, r.estimated_lb, v_from, v_to, r.modality, '{}', r.notes,
        false, r.id, r.collector_id
      );
      update public.scheduled_pickups set last_created_for = v_date where id = r.id;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- Comprobante público por código (la página de verificación lo lee sin sesión).
drop function if exists public.get_certificate(text);
create or replace function public.get_voucher(p_code text)
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
  confirmed_lb numeric,
  modality public.lot_modality,
  price_per_lb numeric,
  total_amount numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.voucher_code,
         p.completed_at,
         g.display_name,
         g.org_type,
         g.municipality,
         c.display_name,
         c.org_type,
         l.polymer_code,
         po.name,
         po.resin_number,
         p.confirmed_lb,
         l.modality,
         p.final_price_per_lb,
         p.total_amount
  from public.pickups p
  join public.lots l on l.id = p.lot_id
  join public.profiles g on g.id = l.generator_id
  join public.profiles c on c.id = p.collector_id
  join public.polymers po on po.code = l.polymer_code
  where p.voucher_code = p_code
    and p.completed_at is not null
$$;

revoke execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.repeat_lot(uuid),
  public.reserve_lot(uuid),
  public.propose_delivery(uuid, numeric, numeric),
  public.complete_pickup(uuid, boolean, numeric, numeric, public.payment_method),
  public.release_reservation(uuid),
  public.release_expired_reservations(),
  public.save_scheduled_pickup(uuid, text, numeric, public.lot_modality, smallint, time, time, text, uuid),
  public.set_scheduled_active(uuid, boolean),
  public.delete_scheduled_pickup(uuid),
  public.create_scheduled_lots(),
  public.get_voucher(text),
  public.normalize_sv_phone(text)
from public, anon;

grant execute on function
  public.publish_lot(text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text),
  public.repeat_lot(uuid),
  public.reserve_lot(uuid),
  public.propose_delivery(uuid, numeric, numeric),
  public.complete_pickup(uuid, boolean, numeric, numeric, public.payment_method),
  public.release_reservation(uuid),
  public.release_expired_reservations(),
  public.save_scheduled_pickup(uuid, text, numeric, public.lot_modality, smallint, time, time, text, uuid),
  public.set_scheduled_active(uuid, boolean),
  public.delete_scheduled_pickup(uuid),
  public.get_voucher(text),
  public.normalize_sv_phone(text)
to authenticated, service_role;

-- Solo el cron (rol de servicio). Supabase da EXECUTE a authenticated por defecto: se quita aparte.
revoke execute on function public.create_scheduled_lots() from authenticated;
grant execute on function public.create_scheduled_lots() to service_role;
grant execute on function public.get_voucher(text) to anon;

-- Internas.
revoke execute on function
  public._create_lot(uuid, text, numeric, timestamptz, timestamptz, public.lot_modality, text[], text, boolean, uuid, uuid),
  public._release_pickup(uuid, text)
from public, anon, authenticated;

insert into public.app_migrations (name) values ('20261028000700_flujo_lote') on conflict do nothing;

commit;
