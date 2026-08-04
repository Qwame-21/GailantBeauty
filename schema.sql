-- GERLAND BEAUTY ADMIN DATABASE SCHEMA
create table if not exists products (
  id text primary key, name text not null, brand text default '', category text not null,
  subcategory text default 'other', price numeric not null, original_price numeric not null,
  notes text default '', extra text default '', image text default '', secondary_image text default '',
  bestseller boolean default false, is_trending boolean default false, gender text default 'women',
  stock integer default 0, low_stock_threshold integer default 3, promo_active boolean default false,
  promo_price numeric, created_at timestamptz default now()
);
create table if not exists orders (
  id text primary key, purchase_code text, timestamp_ms bigint not null, customer_name text not null,
  customer_phone text not null, customer_email text, customer_country text default 'Ghana',
  street_address text not null, apartment text, city text not null default 'Accra', postal_code text,
  customer_notes text, items jsonb not null, total numeric not null, staff_order boolean default false,
  payment_method text default 'momo', momo_ref text, paystack_ref text,
  status_payment boolean default false, status_packaged boolean default false,
  status_dispatched boolean default false, status_delivered boolean default false,
  status_payment_at bigint, status_packaged_at bigint, status_dispatched_at bigint,
  status_delivered_at bigint, admin_note text, estimated_delivery text, created_at timestamptz default now()
);
create table if not exists customers (
  id bigint generated always as identity primary key, phone text unique not null, name text, email text,
  total_orders integer default 0, total_spent numeric default 0, last_order_at timestamptz default now(),
  created_at timestamptz default now()
);
create table if not exists services (
  id text primary key default ('SV-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null, category text not null default 'other', description text default '',
  duration_minutes integer default 60, price numeric not null default 0, active boolean default true,
  requires_consultation boolean default false, created_at timestamptz default now()
);
create table if not exists staff (
  id text primary key default ('ST-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null, role text not null default 'stylist', phone text, email text,
  active boolean default true, specialties text default '', created_at timestamptz default now()
);
create table if not exists bookings (
  id text primary key default ('BK-' || substr(gen_random_uuid()::text, 1, 8)),
  customer_name text not null, customer_phone text not null, customer_email text,
  service_id text references services(id), service_name text not null,
  stylist_id text references staff(id), stylist_name text, booking_date date not null,
  booking_time text not null, status text not null default 'pending', notes text,
  deposit_paid boolean default false, deposit_amount numeric default 0,
  total_price numeric not null default 0, created_at timestamptz default now()
);
create table if not exists consultations (
  id text primary key default ('CS-' || substr(gen_random_uuid()::text, 1, 8)),
  customer_name text not null, customer_phone text not null, customer_email text,
  consultation_type text not null default 'general', preferred_date date, preferred_time text,
  status text not null default 'pending', notes text, recommended_services text,
  stylist_id text references staff(id), converted_to_booking text references bookings(id),
  created_at timestamptz default now()
);
create table if not exists gerland_testimonials (
  id bigint generated always as identity primary key, name text not null,
  handle text default 'verified_customer', review text not null, rating integer default 5, published boolean default true,
  created_at timestamptz default now()
);
alter table gerland_testimonials add column if not exists published boolean default true;
alter table products enable row level security;
alter table orders enable row level security;
alter table customers enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table bookings enable row level security;
alter table consultations enable row level security;
alter table gerland_testimonials enable row level security;
drop policy if exists "Full access to products" on products;
drop policy if exists "Full access to orders" on orders;
drop policy if exists "Full access to customers" on customers;
drop policy if exists "Full access services" on services;
drop policy if exists "Full access staff" on staff;
drop policy if exists "Full access bookings" on bookings;
drop policy if exists "Full access consultations" on consultations;
drop policy if exists "Full access to testimonials" on gerland_testimonials;
create policy "Full access to products" on products for all using (true) with check (true);
create policy "Full access to orders" on orders for all using (true) with check (true);
create policy "Full access to customers" on customers for all using (true) with check (true);
create policy "Full access services" on services for all using (true) with check (true);
create policy "Full access staff" on staff for all using (true) with check (true);
create policy "Full access bookings" on bookings for all using (true) with check (true);
create policy "Full access consultations" on consultations for all using (true) with check (true);
create policy "Full access to testimonials" on gerland_testimonials for all using (true) with check (true);
