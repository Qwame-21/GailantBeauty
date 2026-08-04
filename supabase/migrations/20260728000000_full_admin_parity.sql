begin;

alter table public.services
  add column if not exists detail_image_url text,
  add column if not exists display_rank integer not null default 99;

alter table public.products
  add column if not exists sku text unique,
  add column if not exists subtitle text,
  add column if not exists promo_price numeric(12,2),
  add column if not exists promo_active boolean not null default false,
  add column if not exists benefits text[] not null default '{}',
  add column if not exists how_to_use text,
  add column if not exists ingredients text,
  add column if not exists display_rank integer not null default 99,
  add column if not exists badge text;

alter table public.orders
  add column if not exists city text,
  add column if not exists subtotal_amount numeric(12,2) not null default 0,
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists payment_provider text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists customer_note text;

alter table public.bookings
  add column if not exists staff_id uuid references public.staff(id) on delete set null,
  add column if not exists payment_provider text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists service_started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists customer_note text;

alter table public.consultation_requests
  add column if not exists assigned_to uuid references public.staff(id) on delete set null,
  add column if not exists contacted_at timestamptz,
  add column if not exists converted_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.testimonials
  add column if not exists location text,
  add column if not exists verified boolean not null default true,
  add column if not exists reviewed_at date;

alter table public.staff
  add column if not exists specialties text[] not null default '{}';

alter table public.business_settings
  add column if not exists tagline text not null default 'Where Beauty Wears a Crown',
  add column if not exists whatsapp_number text not null default '233554980760',
  add column if not exists notification_sound_enabled boolean not null default true,
  add column if not exists gift_eligibility_threshold numeric(12,2) not null default 500,
  add column if not exists vip_order_threshold integer not null default 3,
  add column if not exists vip_spend_threshold numeric(12,2) not null default 500;

alter table public.admin_users
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.activity_log enable row level security;

drop policy if exists "Admin manages activity_log" on public.activity_log;
create policy "Admin manages activity_log" on public.activity_log
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'services','products','customers','bookings','consultation_requests',
    'orders','testimonials','staff','business_settings','admin_users'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

create index if not exists products_category_rank_idx on public.products(category, display_rank);
create index if not exists products_active_inventory_idx on public.products(active, inventory);
create index if not exists services_category_rank_idx on public.services(category, display_rank);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_phone_idx on public.orders(phone);
create index if not exists bookings_status_date_idx on public.bookings(status, appointment_date, appointment_time);
create index if not exists bookings_phone_idx on public.bookings(phone);
create index if not exists consultations_status_created_idx on public.consultation_requests(status, created_at desc);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists activity_log_created_idx on public.activity_log(created_at desc);

insert into public.services (
  name, slug, category, subcategory, description, price, duration_label,
  consultation_required, featured, active, display_rank
) values
  ('Signature Gel Set','signature-gel-set','Nails','Gel','Detailed prep, shaping and a flawless gel finish.',180,'1 hr 30 min',false,true,true,1),
  ('Knotless Braids (Long)','knotless-braids-long','Hair','Long Hair','Lightweight, clean-parted long braids finished with care.',450,'4 to 6 hrs',false,true,true,2),
  ('Soft Glam','soft-glam','Makeup','Makeup','Radiant skin, softly sculpted eyes and an elegant finish.',350,'1 hr 15 min',false,true,true,3),
  ('Classic Lash Set','classic-lash-set','Lashes','Lashes','A natural, polished set tailored to your eye shape.',250,'2 hrs',false,false,true,4),
  ('Microblading','microblading','Brows','Brows','Bespoke brow mapping and semi-permanent definition.',900,'Consultation',true,false,true,5),
  ('Locs Consultation','locs-consultation','Locs','Locs','Start or maintain your loc journey with a tailored plan.',0,'Consultation',true,false,true,6),
  ('Beauty Training','beauty-training','Training','Training','Hands-on professional beauty training for every level.',0,'Consultation',true,false,true,7),
  ('Silk Press & Treatment','silk-press-treatment','Hair','Treatments','Smooth, bouncy movement with heat-protective care.',300,'2 hrs',false,false,true,8),
  ('2H Hair','2h-hair','Services',null,'Demo service carried forward from the previous testing database.',0,'Consultation',true,false,true,99)
on conflict (slug) do nothing;

insert into public.products (
  name, slug, category, subcategory, description, price, inventory, active,
  badge, display_rank
) values
  ('The Accra Bob (Short Hair)','the-accra-bob-short-hair','Wigs','Short Hair','10-inch precision bob, pre-plucked and ready to wear.',950,10,true,'Bestseller',1),
  ('Royal Wave Unit (Long Hair)','royal-wave-unit-long-hair','Wigs','Long Hair','22-inch body wave unit with a natural lace finish.',1450,10,true,'New',2),
  ('Crown Melt Band','crown-melt-band','Accessories','Accessories','Soft, secure melt band for seamless lace installs.',60,20,true,null,3),
  ('Gloss & Go Duo','gloss-go-duo','Beauty','Beauty','Two high-shine lip essentials for effortless polish.',120,20,true,null,4)
on conflict (slug) do nothing;

update public.business_settings
set
  business_name = 'Gailant Beauty',
  tagline = 'Where Beauty Wears a Crown',
  location = 'Abeka Free Pipe Junction, Abeka Road, Accra',
  primary_phone = '0554980760',
  secondary_phone = '0208228030',
  whatsapp_number = '233554980760',
  opening_hours = 'Mon to Sat 8am to 7pm • Sun 12pm to 7pm',
  home_service_surcharge = 100,
  deposit_percent = 30
where id = 'default';

commit;
