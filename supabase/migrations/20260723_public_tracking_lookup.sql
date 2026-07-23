begin;

create or replace function public.track_gailand_reference(lookup_reference text)
returns table (
  reference text,
  client_name text,
  record_type text,
  item text,
  status text,
  scheduled_detail text,
  admin_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.reference,
    concat(split_part(b.name, ' ', 1), case when position(' ' in b.name) > 0 then ' ' || left(split_part(b.name, ' ', 2), 1) || '.' else '' end),
    'Booking'::text,
    coalesce(b.service_name, 'Beauty appointment'),
    case
      when b.status = 'canceled' then 'Canceled'
      when b.status = 'rescheduled' then 'Rescheduled'
      when b.payment_status = 'paid' then 'Paid'
      when b.status in ('confirmed', 'guaranteed') then 'Confirmed'
      else initcap(replace(b.status, '_', ' '))
    end,
    concat(to_char(b.appointment_date, 'FMMonth DD, YYYY'), ' at ', to_char(b.appointment_time, 'FMHH12:MI AM')),
    b.admin_note
  from public.bookings b
  where upper(b.reference) = upper(trim(lookup_reference))

  union all

  select
    o.reference,
    concat(split_part(o.name, ' ', 1), case when position(' ' in o.name) > 0 then ' ' || left(split_part(o.name, ' ', 2), 1) || '.' else '' end),
    'Order'::text,
    coalesce(o.items->0->>'name', 'Gailant Beauty order'),
    case
      when o.status = 'canceled' then 'Canceled'
      when o.status = 'delivered' then 'Delivered'
      when o.status = 'dispatched' then 'Dispatched'
      when o.status in ('packaged', 'guaranteed') then 'Guaranteed'
      when o.payment_status = 'paid' then 'Paid'
      else initcap(replace(o.status, '_', ' '))
    end,
    coalesce(to_char(o.estimated_delivery_at, 'FMMonth DD, YYYY at FMHH12:MI AM'), 'Delivery timing pending'),
    o.admin_note
  from public.orders o
  where upper(o.reference) = upper(trim(lookup_reference))
  limit 1;
$$;

revoke all on function public.track_gailand_reference(text) from public;
grant execute on function public.track_gailand_reference(text) to anon, authenticated;

update public.business_settings
set business_name = 'Gailant Beauty'
where id = 'default' and business_name = 'Gailand Beauty';

commit;
