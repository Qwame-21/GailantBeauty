begin;

drop policy if exists "Public reads business settings" on public.business_settings;
create policy "Public reads business settings" on public.business_settings
  for select to anon, authenticated
  using (id = 'default');

drop policy if exists "Public submits testimonials" on public.testimonials;
create policy "Public submits testimonials" on public.testimonials
  for insert to anon, authenticated
  with check (published = false and verified = false);

create unique index if not exists orders_payment_reference_unique_idx
  on public.orders(payment_reference)
  where payment_reference is not null;

create index if not exists bookings_payment_reference_idx
  on public.bookings(payment_reference)
  where payment_reference is not null;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_reference text not null unique,
  payment_method text not null,
  workflow text not null,
  amount numeric(12,2) not null,
  status text not null default 'verified',
  created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
drop policy if exists "Admins read payment events" on public.payment_events;
create policy "Admins read payment events" on public.payment_events for select to authenticated using (public.is_admin());

commit;
