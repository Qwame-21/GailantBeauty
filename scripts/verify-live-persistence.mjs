import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  if (!fs.existsSync(path)) return {};
  const values = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    values[line.slice(0, index)] = line.slice(index + 1).replace(/^"|"$/g, "");
  }
  return values;
}

const env = {
  ...loadEnv(".env.local"),
  ...loadEnv(".env.persistence.local"),
  ...process.env,
};
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = env.SUPABASE_ADMIN_TEST_PASSWORD;
if (!url || !anon || !password) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_ADMIN_TEST_PASSWORD are required.");
}

const db = createClient(url, anon, { auth: { persistSession: false } });
const marker = `codex-persistence-${Date.now()}`;
const created = [];

function fail(table, action, error) {
  throw new Error(`${table} ${action} failed: ${error?.message || "unknown error"}`);
}

async function insertUpdateReadDelete(table, payload, update) {
  const inserted = await db.from(table).insert(payload).select().single();
  if (inserted.error || !inserted.data) fail(table, "insert", inserted.error);
  created.push({ table, id: inserted.data.id });

  const changed = await db.from(table).update(update).eq("id", inserted.data.id).select().single();
  if (changed.error || !changed.data) fail(table, "update", changed.error);

  const read = await db.from(table).select("id").eq("id", inserted.data.id).single();
  if (read.error || !read.data) fail(table, "read", read.error);

  const removed = await db.from(table).delete().eq("id", inserted.data.id).select("id").single();
  if (removed.error || !removed.data) fail(table, "delete", removed.error);
  created.splice(created.findIndex(item => item.table === table && item.id === inserted.data.id), 1);
  console.log(`PASS ${table}: create → update → read → delete`);
}

async function main() {
  const signedIn = await db.auth.signInWithPassword({ email: "gailantB@admin.com", password });
  if (signedIn.error || !signedIn.data.user) fail("auth", "sign-in", signedIn.error);

  const allowed = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", signedIn.data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (allowed.error || !allowed.data) fail("admin_users", "allowlist", allowed.error);
  console.log("PASS auth: Supabase session and admin allowlist");

  const date = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await insertUpdateReadDelete("customers", {
    full_name: marker, phone: "0000000000", email: `${marker}@example.invalid`, notes: "temporary test",
  }, { notes: "temporary test updated" });
  await insertUpdateReadDelete("staff", {
    full_name: marker, email: `${marker}@example.invalid`, role: "test", active: true,
  }, { role: "test-updated" });
  await insertUpdateReadDelete("services", {
    name: marker, slug: marker, category: "Test", description: "temporary test", price: 1, active: false,
  }, { description: "temporary test updated" });
  await insertUpdateReadDelete("products", {
    name: marker, slug: marker, category: "Test", description: "temporary test", price: 1, inventory: 0, active: false,
  }, { description: "temporary test updated" });
  await insertUpdateReadDelete("testimonials", {
    customer_name: marker, service_name: "Test", quote: "Temporary persistence test", rating: 5, published: false,
  }, { quote: "Temporary persistence test updated" });
  await insertUpdateReadDelete("bookings", {
    name: marker, phone: "0000000000", service_name: "Test", appointment_date: date,
    appointment_time: "12:00", notes: "temporary test", status: "pending",
  }, { admin_note: "temporary note" });
  await insertUpdateReadDelete("consultation_requests", {
    name: marker, phone: "0000000000", service_name: "Test", notes: "temporary test", status: "new",
  }, { admin_note: "temporary note" });
  await insertUpdateReadDelete("orders", {
    name: marker, phone: "0000000000", address: "Temporary test", items: [],
    total_amount: 1, payment_status: "pending", status: "pending_payment", source: "admin_test",
  }, { admin_note: "temporary note" });

  const settings = await db.from("business_settings").select("*").eq("id", "default").single();
  if (settings.error || !settings.data) fail("business_settings", "read", settings.error);
  const touched = await db.from("business_settings").update({ business_name: settings.data.business_name }).eq("id", "default").select("id").single();
  if (touched.error || !touched.data) fail("business_settings", "update", touched.error);
  console.log("PASS business_settings: authenticated read and non-destructive update");
}

try {
  await main();
} finally {
  for (const item of created.reverse()) {
    const cleanup = await db.from(item.table).delete().eq("id", item.id);
    if (cleanup.error) console.error(`CLEANUP FAILED ${item.table} ${item.id}: ${cleanup.error.message}`);
  }
  await db.auth.signOut();
}
