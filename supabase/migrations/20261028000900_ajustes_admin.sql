-- Reciclamigo · 20261028000900 · Ajustes de administración
-- 1) set_setting: PostgREST manda el JSON null como NULL de SQL, y la versión de 0300 lo rechazaba
--    ("Escribe un valor"), así que los precios de LDPE, PP y PS y el contacto no se podían dejar
--    vacíos desde la pantalla. Ahora un NULL se trata como el JSON null (vacío) y cada clave decide
--    si lo acepta: solo los precios de referencia y el contacto; el resto sigue exigiendo un número.
-- 2) commission_pickup_facts: el administrador no lee pickups ni lots (RLS), pero para revisar una
--    comisión necesita peso, fecha, comprobante y plástico de ESA entrega. Esta función de solo
--    administrador devuelve únicamente eso, y solo de entregas que dieron comisión.

begin;

create or replace function public.set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.app_settings%rowtype;
  v_value jsonb := coalesce(p_value, 'null'::jsonb);
  v_el jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar la configuración' using errcode = '42501';
  end if;

  select * into v_row from public.app_settings where key = p_key for update;
  if not found then
    raise exception 'Ajuste desconocido' using errcode = 'P0002';
  end if;

  if p_key like 'precio\_ref\_%' escape '\' then
    if jsonb_typeof(v_value) not in ('number', 'null') then
      raise exception 'El precio debe ser un número o quedar vacío' using errcode = '22023';
    end if;
  elsif p_key = 'contacto_whatsapp_reciclamigo' then
    if jsonb_typeof(v_value) not in ('string', 'null') then
      raise exception 'El contacto debe ser un número de WhatsApp o quedar vacío' using errcode = '22023';
    end if;
  elsif p_key = 'radios_aviso_km' then
    if jsonb_typeof(v_value) <> 'array' or jsonb_array_length(v_value) not between 1 and 8 then
      raise exception 'Escribe entre 1 y 8 radios en km' using errcode = '22023';
    end if;
    for v_el in select * from jsonb_array_elements(v_value) loop
      if jsonb_typeof(v_el) <> 'number' or (v_el #>> '{}')::numeric <= 0 or (v_el #>> '{}')::numeric > 50 then
        raise exception 'Cada radio debe ser un número de km mayor que 0 y hasta 50' using errcode = '22023';
      end if;
    end loop;
  else
    if jsonb_typeof(v_value) <> 'number' then
      raise exception 'El valor debe ser un número' using errcode = '22023';
    end if;
  end if;

  if jsonb_typeof(v_value) = 'number' then
    if v_row.min_value is not null and (v_value #>> '{}')::numeric < v_row.min_value then
      raise exception 'El valor mínimo es %', v_row.min_value using errcode = '22023';
    end if;
    if v_row.max_value is not null and (v_value #>> '{}')::numeric > v_row.max_value then
      raise exception 'El valor máximo es %', v_row.max_value using errcode = '22023';
    end if;
  end if;

  update public.app_settings
  set value = v_value, updated_at = now(), updated_by = auth.uid()
  where key = p_key;
end;
$$;

create or replace function public.commission_pickup_facts(p_pickup_ids uuid[])
returns table (
  pickup_id uuid,
  confirmed_lb numeric,
  completed_at timestamptz,
  voucher_code text,
  polymer_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador ve el detalle de comisiones' using errcode = '42501';
  end if;
  return query
  select p.id, p.confirmed_lb, p.completed_at, p.voucher_code, l.polymer_code
  from public.commissions c
  join public.pickups p on p.id = c.pickup_id
  join public.lots l on l.id = p.lot_id
  where c.pickup_id = any (p_pickup_ids);
end;
$$;

revoke execute on function public.commission_pickup_facts(uuid[]) from public, anon;
grant execute on function public.commission_pickup_facts(uuid[]) to authenticated, service_role;

insert into public.app_migrations (name) values ('20261028000900_ajustes_admin') on conflict do nothing;

commit;
