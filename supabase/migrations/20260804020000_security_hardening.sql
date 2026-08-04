begin;

-- Public writes now pass through the rate-limited server routes. These policies
-- are removed so callers cannot bypass the per-IP controls with direct REST calls.
drop policy if exists "Public creates bookings" on public.bookings;
drop policy if exists "Public creates consultations" on public.consultation_requests;
drop policy if exists "Public creates orders" on public.orders;
drop policy if exists "Public submits testimonials" on public.testimonials;

alter table public.bookings
  add constraint bookings_name_valid check (length(btrim(name)) between 1 and 120),
  add constraint bookings_phone_valid check (length(btrim(phone)) between 7 and 40),
  add constraint bookings_email_valid check (email is null or length(btrim(email)) between 3 and 180),
  add constraint bookings_service_valid check (service_id is not null or length(btrim(coalesce(service_name, ''))) between 1 and 160),
  add constraint bookings_notes_valid check (notes is null or length(notes) <= 1000),
  add constraint bookings_address_valid check (address is null or length(address) <= 500),
  add constraint bookings_status_valid check (status in ('pending_payment','confirmed','rescheduled','in_service','completed','canceled')),
  add constraint bookings_payment_status_valid check (payment_status in ('pending','paid','failed','refunded')),
  add constraint bookings_amounts_valid check (total_amount >= 0 and deposit_amount >= 0 and deposit_amount <= total_amount);

alter table public.consultation_requests
  add constraint consultations_name_valid check (length(btrim(name)) between 1 and 120),
  add constraint consultations_phone_valid check (length(btrim(phone)) between 7 and 40),
  add constraint consultations_email_valid check (email is null or length(btrim(email)) between 3 and 180),
  add constraint consultations_service_valid check (service_id is not null or length(btrim(coalesce(service_name, ''))) between 1 and 160),
  add constraint consultations_notes_valid check (notes is null or length(notes) <= 1000),
  add constraint consultations_status_valid check (status in ('new','contacted','converted','closed'));

alter table public.orders
  add constraint orders_name_valid check (length(btrim(name)) between 1 and 120),
  add constraint orders_phone_valid check (length(btrim(phone)) between 7 and 40),
  add constraint orders_email_valid check (email is null or length(btrim(email)) between 3 and 180),
  add constraint orders_address_valid check (length(btrim(address)) between 1 and 500),
  add constraint orders_items_array_valid check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  add constraint orders_status_valid check (status in ('pending_payment','paid','preparing','dispatched','delivered','canceled')),
  add constraint orders_payment_status_valid check (payment_status in ('pending','paid','failed','refunded')),
  add constraint orders_amount_valid check (total_amount >= 0);

create table public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 25),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  primary key (order_id, product_id)
);
alter table public.order_items enable row level security;
create policy "Admin manages order_items" on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.sync_order_items_from_json()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare item jsonb;
begin
  delete from public.order_items where order_id = new.id;
  for item in select value from jsonb_array_elements(new.items)
  loop
    if jsonb_typeof(item) <> 'object'
      or not (item ? 'id')
      or not (item ? 'quantity')
      or not (item ? 'price')
      or (item->>'quantity') !~ '^[0-9]+$'
    then
      raise exception using errcode = '23514', message = 'Invalid order item.';
    end if;
    insert into public.order_items(order_id, product_id, quantity, unit_price)
    values (new.id, (item->>'id')::uuid, (item->>'quantity')::integer, (item->>'price')::numeric);
  end loop;
  return new;
end;
$$;
revoke all on function public.sync_order_items_from_json() from public;

drop trigger if exists sync_order_items_from_json on public.orders;
create trigger sync_order_items_from_json
  after insert or update of items on public.orders
  for each row execute function public.sync_order_items_from_json();

-- Backfill validates all existing order JSON against products and quantity bounds.
insert into public.order_items(order_id, product_id, quantity, unit_price)
select o.id, (item->>'id')::uuid, (item->>'quantity')::integer, (item->>'price')::numeric
from public.orders o cross join lateral jsonb_array_elements(o.items) item
on conflict (order_id, product_id) do update
set quantity = excluded.quantity, unit_price = excluded.unit_price;

-- The public lookup is reachable only through /api/public/track, where its
-- caller IP is rate limited. service_role retains execution for that route.
revoke execute on function public.track_gailand_reference(text, text) from anon, authenticated;
grant execute on function public.track_gailand_reference(text, text) to service_role;

commit;
