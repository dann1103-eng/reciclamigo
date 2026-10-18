-- Reciclamigo · 20261018000100 · Ajustes tras las revisiones de Fase 0 y Track A
-- 1) publish_lot: solo fotos de la carpeta del propio comercio en el bucket; kg que se
--    redondean a 0 dan error en español.
-- 2) complete_pickup: un segundo envío dice "Este retiro ya está completado"; misma
--    validación de kg redondeados.
-- 3) RLS: my_role() se evalúa una vez por consulta, no por fila.
-- 4) Storage: un comercio puede borrar las fotos de su propia carpeta (limpieza).

begin;

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
  if p_estimated_kg is null or round(p_estimated_kg, 2) <= 0 or p_estimated_kg > 10000 then
    raise exception 'Los kg estimados deben ser mayores que 0 y hasta 10,000' using errcode = '22023';
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

-- my_role() una vez por consulta (subselect) en vez de una vez por fila.
drop policy "Contacto visible solo para comercios y recicladores" on public.profile_private;
create policy "Contacto visible solo para comercios y recicladores"
  on public.profile_private for select to authenticated
  using ((select public.my_role()) in ('generador', 'valorizador'));

drop policy "Lotes visibles para comercios y recicladores" on public.lots;
create policy "Lotes visibles para comercios y recicladores"
  on public.lots for select to authenticated
  using ((select public.my_role()) in ('generador', 'valorizador'));

-- Borrar exige poder ver la fila (Supabase pide SELECT + DELETE para remove()).
create policy "Comercios ven las fotos de su carpeta"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lot-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Comercios borran fotos de su carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lot-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.my_role()) = 'generador'
  );

insert into public.app_migrations (name) values ('20261018000100_ajustes') on conflict do nothing;

commit;
