-- Reciclamigo · 20261028000300 · Configuración editable
-- Precios, límites, comisión, radios y demás valores del negocio viven aquí, no en el código.
-- Lectura pública (no hay nada sensible); escritura solo del administrador, vía set_setting().

begin;

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  min_value numeric,
  max_value numeric,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
alter table public.app_settings enable row level security;

create policy "Configuración visible para todos"
  on public.app_settings for select to anon, authenticated
  using (true);

-- JSON null = "sin valor" (los precios de referencia de LDPE, PP y PS quedan vacíos a propósito).
insert into public.app_settings (key, value, description, min_value, max_value) values
  ('plan_trazabilidad_precio_usd', '14.99', 'Precio mensual del Plan Trazabilidad (USD)', 0, null),
  ('lotes_gratis_por_mes', '8', 'Lotes que un comercio gratis puede publicar por mes calendario', 0, 1000),
  ('historial_gratis_dias', '30', 'Días de historial que ve un comercio gratis', 1, 3650),
  ('comision_volumen_pct', '3', 'Comisión (%) sobre compras confirmadas de compradores de volumen', 2, 4),
  ('precio_ref_pet_usd_lb', '0.09', 'Precio de referencia del PET (USD por libra)', 0, null),
  ('precio_ref_hdpe_usd_lb', '0.08', 'Precio de referencia del HDPE (USD por libra)', 0, null),
  ('precio_ref_ldpe_usd_lb', 'null', 'Precio de referencia del LDPE (USD por libra); vacío = sin referencia', 0, null),
  ('precio_ref_pp_usd_lb', 'null', 'Precio de referencia del PP (USD por libra); vacío = sin referencia', 0, null),
  ('precio_ref_ps_usd_lb', 'null', 'Precio de referencia del PS (USD por libra); vacío = sin referencia', 0, null),
  ('radios_aviso_km', '[1, 3, 5]', 'Radios (km) que el reciclador puede elegir para recibir avisos', null, null),
  ('radio_extra_plan_km', '2', 'Km extra de alcance de los avisos para lotes de comercios con plan', 0, 50),
  ('horas_liberar_reserva', '24', 'Horas después del horario de retiro para liberar una reserva sin confirmar', 1, 720),
  ('factor_co2_mixto', '2.0', 'Factor de CO2 evitado por cada unidad de plástico mixto (masa a masa)', 0, 20),
  ('reciclapuntos_tope_mensual', '500', 'Tope de ReciclaPuntos que un usuario gana por mes (PROVISIONAL: definir con el equipo)', 0, null),
  ('reciclapuntos_caducidad_dias', '365', 'Días hasta que caducan los ReciclaPuntos ganados (PROVISIONAL: definir con el equipo)', 1, null),
  ('reciclapuntos_por_lb', '1', 'ReciclaPuntos por libra confirmada, para cada parte (PROVISIONAL: definir con el equipo)', 0, 100),
  ('aviso_retraso_gratis_min', '10', 'Minutos que se retrasan los avisos de lotes de comercios sin plan', 0, 1440),
  ('aviso_retraso_reputacion_min', '5', 'Minutos extra de aviso para recicladores sin buena reputación', 0, 1440),
  ('aviso_retraso_programado_min', '60', 'Minutos que esperan los demás recicladores cuando un retiro programado avisa primero al de confianza', 0, 1440),
  ('plan_duracion_dias', '30', 'Días que dura una activación manual del Plan Trazabilidad', 1, 3650),
  ('contacto_whatsapp_reciclamigo', 'null', 'WhatsApp de Reciclamigo para pedir la activación del plan (con 503); vacío = sin enlace', null, null);

-- Lectores internos (las funciones security definer los usan).
create or replace function public.setting_num(p_key text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric end
  from public.app_settings where key = p_key
$$;

-- Inicio del mes calendario en hora de El Salvador (UTC-6, sin horario de verano).
create or replace function public.sv_month_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', p_at at time zone 'America/El_Salvador') at time zone 'America/El_Salvador'
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role() = 'administrador', false)
$$;

-- Solo el administrador cambia valores; la base valida tipo y rango.
create or replace function public.set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.app_settings%rowtype;
  v_el jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar la configuración' using errcode = '42501';
  end if;

  select * into v_row from public.app_settings where key = p_key for update;
  if not found then
    raise exception 'Ajuste desconocido' using errcode = 'P0002';
  end if;
  if p_value is null then
    raise exception 'Escribe un valor' using errcode = '22023';
  end if;

  if p_key like 'precio\_ref\_%' escape '\' then
    if jsonb_typeof(p_value) not in ('number', 'null') then
      raise exception 'El precio debe ser un número o quedar vacío' using errcode = '22023';
    end if;
  elsif p_key = 'contacto_whatsapp_reciclamigo' then
    if jsonb_typeof(p_value) not in ('string', 'null') then
      raise exception 'El contacto debe ser un número de WhatsApp o quedar vacío' using errcode = '22023';
    end if;
  elsif p_key = 'radios_aviso_km' then
    if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) not between 1 and 8 then
      raise exception 'Escribe entre 1 y 8 radios en km' using errcode = '22023';
    end if;
    for v_el in select * from jsonb_array_elements(p_value) loop
      if jsonb_typeof(v_el) <> 'number' or (v_el #>> '{}')::numeric <= 0 or (v_el #>> '{}')::numeric > 50 then
        raise exception 'Cada radio debe ser un número de km mayor que 0 y hasta 50' using errcode = '22023';
      end if;
    end loop;
  else
    if jsonb_typeof(p_value) <> 'number' then
      raise exception 'El valor debe ser un número' using errcode = '22023';
    end if;
  end if;

  if jsonb_typeof(p_value) = 'number' then
    if v_row.min_value is not null and (p_value #>> '{}')::numeric < v_row.min_value then
      raise exception 'El valor mínimo es %', v_row.min_value using errcode = '22023';
    end if;
    if v_row.max_value is not null and (p_value #>> '{}')::numeric > v_row.max_value then
      raise exception 'El valor máximo es %', v_row.max_value using errcode = '22023';
    end if;
  end if;

  update public.app_settings
  set value = p_value, updated_at = now(), updated_by = auth.uid()
  where key = p_key;
end;
$$;

revoke execute on function
  public.setting_num(text),
  public.sv_month_start(timestamptz),
  public.is_admin(),
  public.set_setting(text, jsonb)
from public, anon;
grant execute on function
  public.setting_num(text),
  public.sv_month_start(timestamptz),
  public.is_admin(),
  public.set_setting(text, jsonb)
to authenticated, service_role;

insert into public.app_migrations (name) values ('20261028000300_configuracion') on conflict do nothing;

commit;
