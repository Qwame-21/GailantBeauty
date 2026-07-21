# Gailand Beauty

Premium salon, booking, retail and operations experience for Gailand Beauty in Abeka, Accra.

## Project structure

- `app/GailandApp.tsx` — storefront, booking, consultation, cart, tracking and admin UI
- `app/constants.ts` — editable brand, service, product and policy content
- `app/lib/supabase.ts` — Supabase browser client and persistence adapter
- `supabase/schema.sql` — production database tables and public RLS policies
- `.env.example` — Supabase, Paystack, Cloudinary and admin configuration
- `vercel.json` — Vercel deployment configuration

## Local development

Copy `.env.example` to `.env.local`, add your keys, then run `npm install` and `npm run dev`.

Without Supabase keys the experience runs in a safe preview mode so all UI can be reviewed. Connect a Supabase project and execute `supabase/schema.sql` before accepting live records.

## Production setup

1. Create a Supabase project, run the schema, and add the public URL and anon key.
2. Add a Paystack public key. Verify transactions on a server or Supabase Edge Function using the secret key—never in the browser.
3. Create an unsigned, restricted Cloudinary upload preset for admin-managed product images.
4. Replace the default admin password. For public production, migrate admin access to Supabase Auth with an allowlisted admin role.
5. Add the variables to Vercel and deploy. Configure the canonical domain and Paystack webhook after launch.

The included booking experience calculates a 30% deposit and separates consultation-led services from standard appointments. The payment button is intentionally ready for verified Paystack initialization once keys and a server-side verification endpoint are available.
