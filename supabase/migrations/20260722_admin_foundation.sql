begin;

create extension if not exists "pgcrypto";

alter table public.services add column if not exists subcategory text;
alter table public.services add column if not exists duration_label text;
alter table public.services add column if not exists featured boolean not null default false;
alter table public.services add column if not exists primary_image_url text;
alter table public.services add column if not exists gallery_image_urls text[] not null default '{}';
alter table public.services add column if not exists cloudinary_public_ids text[] not null default '{}';
alter table public.services add column if not exists home_service_available boolean not null default false;
alter table public.services add column if not exists updated_at timestamptz not null default now();

alter table public.products add column if not exists brand text;
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists audience text;
alter table public.products add column if not exists low_stock_threshold integer not null default 5;
alter table public.products add column if not exists promo_percent numeric(5,2) not null default 0 check (promo_percent between 0 and 99);
alter table public.products add column if not exists bestseller boolean not null default false;
alter table public.products add column if not exists trending boolean not null default false;
alter table public.products add column if not exists primary_image_url text;
alter table public.products add column if not exists detail_image_url text;
alter table public.products add column if not exists gallery_image_urls text[] not null default '{}';
alter table public.products add column if not exists cloudinary_public_ids text[] not null default '{}';
alter table public.products add column if not exists key_ingredients text;
alter table public.products add column if not exists size_label text;
alter table public.products add column if not exists updated_at timestamptz not null default now();

alter table public.orders add column if not exists source text not null default 'storefront';
alter table public.orders add column if not exists admin_note text;
alter table public.orders add column if not exists estimated_delivery_at timestamptz;
alter table public.orders add column if not exists packaged_at timestamptz;
alter table public.orders add column if not exists dispatched_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists read_at timestamptz;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.bookings add column if not exists admin_note text;
alter table public.bookings add column if not exists read_at timestamptz;
alter table public.bookings add column if not exists updated_at timestamptz not null default now();
alter table public.consultation_requests add column if not exists admin_note text;
alter table public.consultation_requests add column if not exists read_at timestamptz;
alter table public.consultation_requests add column if not exists updated_at timestamptz not null default now();
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists active boolean not null default true;
alter table public.customers add column if not exists updated_at timestamptz not null default now();
alter table public.testimonials add column if not exists social_handle text;
alter table public.testimonials add column if not exists customer_image_url text;
alter table public.testimonials add column if not exists updated_at timestamptz not null default now();

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(), auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null, email text, phone text, role text not null default 'staff', active boolean not null default true,
  avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.business_settings (
  id text primary key default 'default' check (id = 'default'), business_name text not null default 'Gailant Beauty',
  location text, primary_phone text, secondary_phone text, opening_hours text,
  home_service_surcharge numeric(12,2) not null default 0, deposit_percent numeric(5,2) not null default 30,
  social_proof_enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade, email text not null,
  role text not null default 'admin', active boolean not null default true, created_at timestamptz not null default now()
);

alter table public.staff enable row level security;
alter table public.business_settings enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users a where a.user_id = auth.uid() and a.active); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['services','products','customers','bookings','consultation_requests','orders','testimonials','staff','business_settings'] loop
    execute format('drop policy if exists "Admin manages %s" on public.%I', t, t);
    execute format('create policy "Admin manages %s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;
drop policy if exists "Admins read admin users" on public.admin_users;
create policy "Admins read admin users" on public.admin_users for select to authenticated using (public.is_admin());

create or replace function public.bootstrap_gailand_admin() returns trigger language plpgsql security definer set search_path = public
as $$ begin if lower(new.email) = 'gailantb@admin.com' then insert into public.admin_users(user_id,email) values(new.id,new.email) on conflict(user_id) do update set email=excluded.email,active=true; end if; return new; end; $$;
drop trigger if exists bootstrap_gailand_admin on auth.users;
create trigger bootstrap_gailand_admin after insert or update of email on auth.users for each row execute function public.bootstrap_gailand_admin();
insert into public.admin_users(user_id,email)
select id,email from auth.users where lower(email)='gailantb@admin.com'
on conflict(user_id) do update set email=excluded.email,active=true;

insert into public.business_settings(id,business_name) values('default','Gailant Beauty') on conflict(id) do nothing;
commit;
