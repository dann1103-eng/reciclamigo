-- Reciclamigo · 0100 · Esquema base
-- Tablas, enums y catálogo de polímeros. Se ejecuta a mano en el SQL Editor de Supabase.

begin;

-- Registro de migraciones aplicadas a mano (lo lee `npm run db:status`).
create table if not exists public.app_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_migrations enable row level security;

create extension if not exists postgis with schema extensions;

create type public.user_role as enum ('generador', 'valorizador', 'municipalidad');
create type public.lot_modality as enum ('venta', 'trueque', 'donacion');
create type public.lot_status as enum ('publicado', 'reservado', 'entregado', 'completado', 'cancelado');
create type public.payment_method as enum ('efectivo', 'transferencia', 'chivo_wallet');

-- Precio por kg: PET y HDPE vienen de la propuesta; LDPE, PP y PS son provisionales.
create table public.polymers (
  code text primary key,
  resin_number smallint not null unique,
  name text not null,
  price_per_kg numeric(6, 2) not null check (price_per_kg >= 0)
);

insert into public.polymers (code, resin_number, name, price_per_kg) values
  ('PET', 1, 'Tereftalato de polietileno', 0.20),
  ('HDPE', 2, 'Polietileno de alta densidad', 0.18),
  ('LDPE', 4, 'Polietileno de baja densidad', 0.10),
  ('PP', 5, 'Polipropileno', 0.15),
  ('PS', 6, 'Poliestireno', 0.05);

-- Datos públicos del perfil (los ve cualquier usuario con sesión, incluida la alcaldía).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null,
  org_type text not null,
  municipality text not null,
  zone text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Contacto y ubicación exacta: solo comercios y recicladores (nunca la alcaldía).
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  whatsapp text,
  address text,
  location extensions.geography(point, 4326) not null
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  generator_id uuid not null references public.profiles (id) on delete cascade,
  polymer_code text not null references public.polymers (code),
  estimated_kg numeric(8, 2) not null check (estimated_kg > 0 and estimated_kg <= 10000),
  photo_urls text[] not null default '{}' check (cardinality(photo_urls) <= 3),
  pickup_from timestamptz not null,
  pickup_to timestamptz not null,
  modality public.lot_modality not null,
  price_per_kg numeric(6, 2) not null default 0 check (price_per_kg >= 0),
  notes text,
  status public.lot_status not null default 'publicado',
  location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  check (pickup_to > pickup_from)
);
create index lots_location_idx on public.lots using gist (location);
create index lots_status_idx on public.lots (status);
create index lots_generator_idx on public.lots (generator_id);

create table public.pickups (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null unique references public.lots (id) on delete cascade,
  collector_id uuid not null references public.profiles (id) on delete cascade,
  reserved_at timestamptz not null default now(),
  delivered_at timestamptz,
  completed_at timestamptz,
  confirmed_kg numeric(8, 2) check (confirmed_kg > 0),
  total_amount numeric(10, 2),
  payment_method public.payment_method,
  certificate_code text unique
);
create index pickups_collector_idx on public.pickups (collector_id);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null references public.pickups (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 280),
  created_at timestamptz not null default now(),
  unique (pickup_id, rater_id)
);
create index ratings_ratee_idx on public.ratings (ratee_id);

insert into public.app_migrations (name) values ('20261017000100_schema') on conflict do nothing;

commit;
