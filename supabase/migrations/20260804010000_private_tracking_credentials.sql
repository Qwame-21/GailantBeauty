begin;

drop function if exists public.track_gailand_reference(text);

create or replace function public.track_gailand_reference(lookup_reference text, lookup_credential text)
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
security definer
set search_path = public
as $$
  select b.reference, b.name, 'Booking'::text, b.service_name,
    b.status, concat(b.appointment_date::text, case when b.appointment_time is null then '' else ' at ' || b.appointment_time::text end), b.admin_note
  from public.bookings b
  where upper(b.reference) = upper(trim(lookup_reference))
    and (lower(trim(coalesce(b.email, ''))) = lower(trim(lookup_credential))
      or regexp_replace(coalesce(b.phone, ''), '\\s+', '', 'g') = regexp_replace(trim(lookup_credential), '\\s+', '', 'g'))
  union all
  select o.reference, o.name, 'Order'::text,
    coalesce(o.items->0->>'name', 'Gailant Beauty order'), o.status,
    coalesce(o.estimated_delivery_at::text, 'Delivery timing pending'), o.admin_note
  from public.orders o
  where upper(o.reference) = upper(trim(lookup_reference))
    and (lower(trim(coalesce(o.email, ''))) = lower(trim(lookup_credential))
      or regexp_replace(coalesce(o.phone, ''), '\\s+', '', 'g') = regexp_replace(trim(lookup_credential), '\\s+', '', 'g'))
  limit 1;
$$;

revoke all on function public.track_gailand_reference(text, text) from public;
grant execute on function public.track_gailand_reference(text, text) to anon, authenticated;

commit;
