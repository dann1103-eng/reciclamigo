-- Reciclamigo · 20261028000600 · Avisos (push) y reservas liberadas
-- Los avisos pasan por una cola (notification_queue) que la app vacía con Web Push. Así el
-- orden de aviso (comercios con plan primero, mejor reputación primero) es un retraso por
-- destinatario, y agregar otro canal (WhatsApp, en una fase 2) no toca el flujo.
-- pickup_releases guarda quién soltó un lote, para no volver a avisarle.

begin;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
alter table public.push_subscriptions enable row level security;

create policy "Cada quien ve sus dispositivos"
  on public.push_subscriptions for select to authenticated
  using (profile_id = (select auth.uid()));

create table public.alert_prefs (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default true,
  radius_km integer not null default 3 check (radius_km > 0),
  polymers text[],
  updated_at timestamptz not null default now()
);
alter table public.alert_prefs enable row level security;

create policy "Cada quien ve sus preferencias de aviso"
  on public.alert_prefs for select to authenticated
  using (profile_id = (select auth.uid()));

create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event text not null,
  payload jsonb not null default '{}',
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index notification_queue_due_idx on public.notification_queue (send_after) where sent_at is null;
-- Sin policies: solo la leen las funciones security definer y el rol de servicio.
alter table public.notification_queue enable row level security;

create table public.pickup_releases (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  collector_id uuid not null references public.profiles (id) on delete cascade,
  reserved_at timestamptz not null,
  released_at timestamptz not null default now(),
  reason text not null check (reason in ('generador', 'reciclador', 'automatica'))
);
create index pickup_releases_lot_idx on public.pickup_releases (lot_id);
alter table public.pickup_releases enable row level security;

create policy "Las partes y el administrador ven las liberaciones"
  on public.pickup_releases for select to authenticated
  using (
    collector_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.lots l where l.id = lot_id and l.generator_id = (select auth.uid()))
  );

-- Dispositivos
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(public.my_role()::text, '') not in ('generador', 'valorizador') then
    raise exception 'Solo comercios y recicladores reciben avisos' using errcode = '42501';
  end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Suscripción inválida' using errcode = '22023';
  end if;
  -- Un teléfono compartido pasa a la última persona que activó los avisos.
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
  set profile_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and profile_id = auth.uid()
$$;

-- Preferencias del reciclador: radio (entre los configurados) y tipos de plástico.
create or replace function public.set_alert_prefs(p_radius_km integer, p_polymers text[], p_enabled boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.my_role() is distinct from 'valorizador' then
    raise exception 'Solo los recicladores eligen sus avisos' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.app_settings s, jsonb_array_elements_text(s.value) as r(km)
    where s.key = 'radios_aviso_km' and r.km::numeric = p_radius_km
  ) then
    raise exception 'Elige uno de los radios disponibles' using errcode = '22023';
  end if;
  if p_polymers is not null and (
    cardinality(p_polymers) = 0
    or exists (select 1 from unnest(p_polymers) as u(code) where not exists (select 1 from public.polymers where polymers.code = u.code))
  ) then
    raise exception 'Elige al menos un tipo de plástico válido' using errcode = '22023';
  end if;

  insert into public.alert_prefs (profile_id, enabled, radius_km, polymers)
  values (auth.uid(), coalesce(p_enabled, true), p_radius_km, p_polymers)
  on conflict (profile_id) do update
  set enabled = excluded.enabled, radius_km = excluded.radius_km, polymers = excluded.polymers, updated_at = now();
end;
$$;

-- Interno: a quién avisar de un lote y con cuántos minutos de retraso.
--   • Lote de comercio con plan: sin retraso y con radio mayor (radio del reciclador + radio_extra_plan_km).
--   • Lote de comercio gratis: retraso aviso_retraso_gratis_min.
--   • Reciclador sin buena reputación (nuevo o en marcha): aviso_retraso_reputacion_min más.
--   • Retiro programado: el reciclador de confianza va primero (0 min, sin importar radio);
--     los demás esperan aviso_retraso_programado_min más.
create or replace function public._lot_alert_recipients(p_lot_id uuid, p_trusted uuid default null)
returns table (profile_id uuid, delay_minutes integer, distance_m double precision)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lot public.lots%rowtype;
  v_plan boolean;
  v_extra numeric := coalesce(public.setting_num('radio_extra_plan_km'), 0);
  v_d_free integer := coalesce(public.setting_num('aviso_retraso_gratis_min'), 0)::int;
  v_d_rep integer := coalesce(public.setting_num('aviso_retraso_reputacion_min'), 0)::int;
  v_d_sched integer := coalesce(public.setting_num('aviso_retraso_programado_min'), 0)::int;
begin
  select * into v_lot from public.lots where id = p_lot_id;
  if not found then
    return;
  end if;
  v_plan := public.has_active_plan(v_lot.generator_id);

  return query
  with rep as materialized (
    select pi.profile_id as pid, pi.reputation_tier as tier
    from public.profile_impact pi
    where pi.role = 'valorizador'
  )
  select pr.id,
         case
           when pr.id = p_trusted then 0
           else (case when v_plan then 0 else v_d_free end)
                + (case when coalesce(rep.tier, 'nuevo') in ('destacado', 'confiable') then 0 else v_d_rep end)
                + (case when p_trusted is not null then v_d_sched else 0 end)
         end,
         extensions.st_distance(v_lot.location, pp.location)
  from public.profiles pr
  join public.profile_private pp on pp.id = pr.id
  left join public.alert_prefs ap on ap.profile_id = pr.id
  left join rep on rep.pid = pr.id
  where pr.role = 'valorizador'
    and (pr.id = p_trusted or coalesce(ap.enabled, true))
    and (ap.polymers is null or v_lot.polymer_code = any (ap.polymers))
    and (
      pr.id = p_trusted
      or extensions.st_dwithin(
        v_lot.location,
        pp.location,
        (coalesce(ap.radius_km, 3) + case when v_plan then v_extra else 0 end) * 1000
      )
    )
    and not exists (select 1 from public.pickup_releases r where r.lot_id = p_lot_id and r.collector_id = pr.id);
end;
$$;

-- Interno: deja en la cola el aviso de un lote a los recicladores cercanos.
create or replace function public._enqueue_lot_alerts(p_lot_id uuid, p_trusted uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.notification_queue (profile_id, event, payload, send_after)
  select r.profile_id,
         'lote_cercano',
         jsonb_build_object(
           'lot_id', l.id,
           'polymer_code', l.polymer_code,
           'estimated_lb', l.estimated_lb,
           'generator_name', g.display_name,
           'distance_m', round(r.distance_m::numeric)
         ),
         now() + r.delay_minutes * interval '1 minute'
  from public._lot_alert_recipients(p_lot_id, p_trusted) r
  join public.lots l on l.id = p_lot_id
  join public.profiles g on g.id = l.generator_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Interno: aviso directo a una persona (reserva, propuesta de entrega, confirmación…).
create or replace function public._enqueue_notification(p_profile uuid, p_event text, p_payload jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_queue (profile_id, event, payload) values (p_profile, p_event, coalesce(p_payload, '{}'))
$$;

-- Lo usa el cron de la app (rol de servicio): toma los avisos vencidos y descarta los de
-- lotes que ya no están publicados.
create or replace function public.claim_due_notifications(p_limit integer default 50)
returns table (id uuid, profile_id uuid, event text, payload jsonb, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_queue q
  set sent_at = now(), error = 'El lote ya no está disponible'
  where q.sent_at is null
    and q.event = 'lote_cercano'
    and q.send_after <= now()
    and not exists (
      select 1 from public.lots l where l.id = (q.payload ->> 'lot_id')::uuid and l.status = 'publicado'
    );

  return query
  update public.notification_queue q
  set attempts = q.attempts + 1
  where q.id in (
    select n.id from public.notification_queue n
    where n.sent_at is null and n.send_after <= now() and n.attempts < 3
    order by n.send_after
    limit p_limit
    for update skip locked
  )
  returning q.id, q.profile_id, q.event, q.payload, q.attempts;
end;
$$;

create or replace function public.finish_notification(p_id uuid, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_queue
  set sent_at = case when p_error is null or attempts >= 3 then now() else null end,
      error = p_error
  where id = p_id
$$;

revoke execute on function
  public.save_push_subscription(text, text, text, text),
  public.remove_push_subscription(text),
  public.set_alert_prefs(integer, text[], boolean)
from public, anon;
grant execute on function
  public.save_push_subscription(text, text, text, text),
  public.remove_push_subscription(text),
  public.set_alert_prefs(integer, text[], boolean)
to authenticated, service_role;

-- Internas y del cron: nadie con sesión de usuario las llama.
revoke execute on function
  public._lot_alert_recipients(uuid, uuid),
  public._enqueue_lot_alerts(uuid, uuid),
  public._enqueue_notification(uuid, text, jsonb),
  public.claim_due_notifications(integer),
  public.finish_notification(uuid, text)
from public, anon, authenticated;
grant execute on function
  public.claim_due_notifications(integer),
  public.finish_notification(uuid, text)
to service_role;

insert into public.app_migrations (name) values ('20261028000600_avisos') on conflict do nothing;

commit;
