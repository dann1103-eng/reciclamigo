-- Reciclamigo · 0300 · Vistas agregadas
-- Corren con los privilegios del dueño A PROPÓSITO: exponen solo totales (nunca contacto
-- ni ubicación exacta) y así la alcaldía puede leer reportes sin acceso a las tablas.

begin;

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

-- Mes en hora de El Salvador (UTC-6, sin horario de verano).
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

-- Puntos del mapa de calor: ubicación redondeada a 3 decimales (~100 m).
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

insert into public.app_migrations (name) values ('20261017000300_views') on conflict do nothing;

commit;
