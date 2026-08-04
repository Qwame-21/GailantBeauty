import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/)
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
      }),
  );
}

const env = { ...loadEnv(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_TEST_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("New-project URL, public key, and transient service test key are required.");

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const marker = `GB-RLS-${Date.now()}`;
let orderId = null;
let orderReference = null;

try {
  const catalog = await anon.from("products").select("id,name").eq("active", true).limit(1);
  if (catalog.error || !catalog.data?.length) throw new Error(`Anonymous active-product read failed: ${catalog.error?.message}`);
  console.log("PASS anonymous users can read the active catalog");

  const privateOrders = await anon.from("orders").select("id").limit(1);
  if (privateOrders.error || privateOrders.data?.length) throw new Error("Anonymous order enumeration exposed private rows.");
  console.log("PASS anonymous users cannot enumerate orders");

  const mutation = await anon.from("products").update({ price: 0 }).eq("id", catalog.data[0].id).select("id");
  if (mutation.error || mutation.data?.length) throw new Error("Anonymous product mutation changed a protected row.");
  console.log("PASS anonymous users cannot mutate products");

  const inserted = await anon.from("orders").insert({
    name: "RLS Test",
    phone: "0000000000",
    address: "Automated security test",
    items: [],
    total_amount: 1,
    payment_status: "pending",
    status: "pending_payment",
    source: marker,
  });
  if (inserted.error) throw new Error(`Anonymous checkout insert failed: ${inserted.error.message}`);
  const created = await service.from("orders").select("id,reference").eq("source", marker).single();
  if (created.error || !created.data) throw new Error(`Inserted checkout could not be verified: ${created.error?.message}`);
  orderId = created.data.id;
  orderReference = created.data.reference;
  console.log("PASS anonymous storefront checkout insert is allowed");

  const tracked = await anon.rpc("track_gailand_reference", { lookup_reference: orderReference });
  if (tracked.error || !tracked.data?.[0]) throw new Error(`Guest tracking RPC failed: ${tracked.error?.message}`);
  const allowed = new Set(["reference", "client_name", "record_type", "item", "status", "scheduled_detail", "admin_note"]);
  const leaked = Object.keys(tracked.data[0]).filter(key => !allowed.has(key));
  if (leaked.length) throw new Error(`Guest tracking leaked fields: ${leaked.join(", ")}`);
  console.log("PASS guest tracking returns only its restricted projection");
} finally {
  if (orderId) {
    const cleanup = await service.from("orders").delete().eq("id", orderId);
    if (cleanup.error) console.error(`Cleanup failed: ${cleanup.error.message}`);
  }
}
