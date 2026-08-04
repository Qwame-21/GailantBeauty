begin;

create extension if not exists "pgcrypto";

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text not null,
  description text,
  price numeric(12,2) not null default 0,
  duration_minutes integer,
  consultation_required boolean not null default false,
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text not null,
  description text,
  price numeric(12,2) not null,
  inventory integer not null default 0 check (inventory >= 0),
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('GB-B-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  service_name text,
  appointment_date date not null,
  appointment_time time not null,
  stylist_preference text,
  home_service boolean not null default false,
  address text,
  notes text,
  total_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  payment_reference text,
  payment_status text not null default 'pending',
  status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('GB-C-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  service_id uuid references public.services(id) on delete set null,
  service_name text,
  name text not null,
  phone text not null,
  email text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('GB-O-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  address text not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(12,2) not null,
  payment_reference text,
  payment_status text not null default 'pending',
  status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  service_name text,
  quote text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.consultation_requests enable row level security;
alter table public.orders enable row level security;
alter table public.testimonials enable row level security;

create policy "Public reads active services" on public.services for select to anon, authenticated using (active = true);
create policy "Public reads active products" on public.products for select to anon, authenticated using (active = true);
create policy "Public reads published testimonials" on public.testimonials for select to anon, authenticated using (published = true);
create policy "Public creates bookings" on public.bookings for insert to anon, authenticated with check (true);
create policy "Public creates consultations" on public.consultation_requests for insert to anon, authenticated with check (true);
create policy "Public creates orders" on public.orders for insert to anon, authenticated with check (true);

commit;
