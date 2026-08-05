begin;

-- Drop old 2-arg signature (was already replaced by the credentials migration, but make
-- sure there are no stale 1-arg or 2-arg variants floating around)
drop function if exists public.track_gailand_reference(text);
drop function if exists public.track_gailand_reference(text, text);

-- Recreate with financial fields so the tracking page can show real totals
create or replace function public.track_gailand_reference(lookup_reference text, lookup_credential text)
returns table (
  reference       text,
  client_name     text,
  record_type     text,
  item            text,
  status          text,
  scheduled_detail text,
  admin_note      text,
  -- Financial fields (null for record types that don't apply)
  subtotal        numeric,
  delivery_fee    numeric,
  discount_amount numeric,
  total_amount    numeric,
  service_price   numeric,
  deposit_paid    numeric
)
language sql
security definer
set search_path = public
as $$
  -- Orders: return subtotal, delivery_fee, discount, total
  select
    o.reference,
    o.name,
    'Order'::text,
    coalesce(o.items->0->>'name', 'Gailant Beauty order'),
    o.status,
    coalesce(o.estimated_delivery_at::text, 'Delivery timing pending'),
    o.admin_note,
    o.subtotal_amount,
    o.delivery_fee,
    o.discount_amount,
    o.total_amount,
    null::numeric,   -- service_price (not applicable for orders)
    null::numeric    -- deposit_paid  (not applicable for orders)
  from public.orders o
  where upper(o.reference) = upper(trim(lookup_reference))
    and (
      lower(trim(coalesce(o.email, ''))) = lower(trim(lookup_credential))
      or regexp_replace(coalesce(o.phone, ''), '\s+', '', 'g') =
         regexp_replace(trim(lookup_credential), '\s+', '', 'g')
    )
  union all
  -- Bookings: return service price and deposit paid; no delivery fee
  select
    b.reference,
    b.name,
    'Booking'::text,
    b.service_name,
    b.status,
    concat(
      b.appointment_date::text,
      case when b.appointment_time is null then '' else ' at ' || b.appointment_time::text end
    ),
    b.admin_note,
    null::numeric,          -- subtotal
    null::numeric,          -- delivery_fee (bookings don't have delivery fees)
    null::numeric,          -- discount_amount
    b.total_amount,         -- total
    b.total_amount,         -- service_price (same as total for bookings)
    b.deposit_amount        -- deposit_paid
  from public.bookings b
  where upper(b.reference) = upper(trim(lookup_reference))
    and (
      lower(trim(coalesce(b.email, ''))) = lower(trim(lookup_credential))
      or regexp_replace(coalesce(b.phone, ''), '\s+', '', 'g') =
         regexp_replace(trim(lookup_credential), '\s+', '', 'g')
    )
  limit 1;
$$;

revoke all on function public.track_gailand_reference(text, text) from public;
grant execute on function public.track_gailand_reference(text, text) to anon, authenticated;

commit;
