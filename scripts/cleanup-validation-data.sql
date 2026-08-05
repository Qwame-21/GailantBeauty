-- ============================================================
-- Gailant Beauty: Validation Data Cleanup
-- Run once via Supabase Dashboard SQL editor or CLI
-- Date: 2026-08-04
-- ============================================================

begin;

-- Step 1: Capture phone + Crown Melt Band qty from test orders
-- then delete all 5 test records and restore inventory
do $$
declare
  v_test_phone_cash text;
  v_crown_melt_qty_cash integer := 0;
  v_crown_melt_qty_paystack integer := 0;
begin

  -- Cash POS test order: phone + Crown Melt Band qty
  select
    phone,
    coalesce((
      select sum((item->>'quantity')::integer)
      from jsonb_array_elements(items) as item
      where item->>'name' ilike '%Crown Melt Band%'
    ), 0)
  into v_test_phone_cash, v_crown_melt_qty_cash
  from public.orders
  where upper(reference) = 'GB-O-44EF675A';

  raise notice 'Cash POS phone: %, Crown Melt Band qty: %', v_test_phone_cash, v_crown_melt_qty_cash;

  -- Paystack test order: Crown Melt Band qty
  select coalesce((
    select sum((item->>'quantity')::integer)
    from jsonb_array_elements(items) as item
    where item->>'name' ilike '%Crown Melt Band%'
  ), 0)
  into v_crown_melt_qty_paystack
  from public.orders
  where upper(reference) = 'GB-O-8EB93E58';

  raise notice 'Paystack test order Crown Melt Band qty: %', v_crown_melt_qty_paystack;

  -- Delete test booking
  delete from public.bookings
  where upper(name) = 'CODEX BOOKING VALIDATION'
     or upper(reference) = 'CODEX BOOKING VALIDATION';

  -- Delete test consultation
  delete from public.consultation_requests
  where upper(reference) = 'GB-C-A7A5B58C';

  -- Delete both test orders
  delete from public.orders
  where upper(reference) in ('GB-O-8EB93E58', 'GB-O-44EF675A');

  -- Delete test client created by cash POS sale
  if v_test_phone_cash is not null then
    delete from public.customers
    where regexp_replace(coalesce(phone, ''), '\s+', '', 'g') =
          regexp_replace(v_test_phone_cash, '\s+', '', 'g');
    raise notice 'Deleted test customer with phone: %', v_test_phone_cash;
  else
    raise notice 'Cash POS order GB-O-44EF675A not found (may already be deleted).';
  end if;

  -- Restore Crown Melt Band inventory for both test orders
  if (v_crown_melt_qty_cash + v_crown_melt_qty_paystack) > 0 then
    update public.products
    set inventory = inventory + v_crown_melt_qty_cash + v_crown_melt_qty_paystack
    where name ilike '%Crown Melt Band%';
    raise notice 'Restored % units to Crown Melt Band inventory.',
      v_crown_melt_qty_cash + v_crown_melt_qty_paystack;
  else
    raise notice 'No Crown Melt Band inventory to restore.';
  end if;

end $$;

-- Verification queries (results visible in SQL editor output)
select 'Remaining test bookings' as label, count(*) as count
  from public.bookings where upper(name) = 'CODEX BOOKING VALIDATION'
union all
select 'Remaining test consultations', count(*)
  from public.consultation_requests where upper(reference) = 'GB-C-A7A5B58C'
union all
select 'Remaining test orders', count(*)
  from public.orders where upper(reference) in ('GB-O-8EB93E58', 'GB-O-44EF675A');

select name, inventory as current_inventory
  from public.products where name ilike '%Crown Melt Band%';

select count(*) as real_client_count from public.customers;

commit;
