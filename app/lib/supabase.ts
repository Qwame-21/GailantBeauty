import { createClient } from "@supabase/supabase-js";
import { createLocalRecord } from "./gailand-store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;
export const isSupabaseConfigured = Boolean(supabase);

export type DataResult<T> = { data: T | null; error: string | null; local: boolean };

function message(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "The database request failed.";
}

export async function insertRecord(table: string, payload: Record<string, unknown>) {
  if (!supabase) return { data: createLocalRecord(table, payload), error: null, local: true };
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  return { data, error: error ? message(error) : null, local: false };
}

export async function fetchRecords(table: string): Promise<DataResult<Record<string, unknown>[]>> {
  if (!supabase) return { data: null, error: null, local: true };
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(250);
  return { data: data || [], error: error ? message(error) : null, local: false };
}

export async function updateRecord(table: string, id: string, payload: Record<string, unknown>): Promise<DataResult<Record<string, unknown>>> {
  if (!supabase) return { data: { id, ...payload }, error: null, local: true };
  const { data, error } = await supabase.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  return { data, error: error ? message(error) : null, local: false };
}

export async function deleteRecord(table: string, id: string): Promise<DataResult<Record<string, unknown>>> {
  if (!supabase) return { data: { id }, error: null, local: true };
  const { data, error } = await supabase.from(table).delete().eq("id", id).select().single();
  return { data, error: error ? message(error) : null, local: false };
}

export async function upsertRecord(table: string, payload: Record<string, unknown>, conflict = "id"): Promise<DataResult<Record<string, unknown>>> {
  if (!supabase) return { data: payload, error: null, local: true };
  const { data, error } = await supabase.from(table).upsert(payload, { onConflict: conflict }).select().single();
  return { data, error: error ? message(error) : null, local: false };
}

export async function signInAdmin(email: string, password: string) {
  if (!supabase) return { error: null, local: true };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: error ? message(error) : "Unable to authenticate.", local: false };
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (adminError || !admin) {
    await supabase.auth.signOut();
    return { error: adminError ? message(adminError) : "This account does not have admin access.", local: false };
  }
  return { error: null, local: false };
}

export async function signOutAdmin() { if (supabase) await supabase.auth.signOut(); }
export async function hasAdminSession() {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .eq("active", true)
    .maybeSingle();
  return Boolean(data);
}

export async function reauthenticateAdmin(password: string) {
  if (!supabase) return { error: "Supabase authentication is required." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Your admin session has expired. Sign in again." };
  const result = await signInAdmin(user.email, password);
  return { error: result.error };
}

export type LiveTrackingRecord = {
  reference: string;
  clientName: string;
  type: "Booking" | "Order";
  item: string;
  status: string;
  date: string;
  adminNote?: string;
};

function mapTrackingRow(row: Record<string, unknown>): LiveTrackingRecord {
  return {
    reference: String(row.reference || ""),
    clientName: String(row.client_name || row.name || "Gailant client"),
    type: String(row.record_type || "Booking") === "Order" ? "Order" : "Booking",
    item: String(row.item || row.service_name || "Gailant Beauty service"),
    status: String(row.status || "Pending").replaceAll("_", " "),
    date: String(row.scheduled_detail || row.appointment_date || "Schedule pending"),
    ...(row.admin_note ? { adminNote: String(row.admin_note) } : {}),
  };
}

export async function trackReference(reference: string): Promise<{ data: LiveTrackingRecord | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const cleanReference = reference.trim().toUpperCase();

  const rpc = await supabase.rpc("track_gailand_reference", { lookup_reference: cleanReference });
  if (!rpc.error && Array.isArray(rpc.data) && rpc.data[0]) {
    return { data: mapTrackingRow(rpc.data[0] as Record<string, unknown>), error: null };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const missingFunction = rpc.error?.message?.toLowerCase().includes("function") || rpc.error?.code === "PGRST202";
    return { data: null, error: missingFunction ? "Live tracking is awaiting its database update." : null };
  }

  const isOrder = cleanReference.startsWith("GB-O-");
  let directData: unknown = null;
  if (isOrder) {
    const direct = await supabase
      .from("orders")
      .select("reference,name,items,status,payment_status,estimated_delivery_at,admin_note")
      .eq("reference", cleanReference)
      .maybeSingle();
    if (direct.error) return { data: null, error: message(direct.error) };
    directData = direct.data;
  } else {
    const direct = await supabase
      .from("bookings")
      .select("reference,name,service_name,status,payment_status,appointment_date,appointment_time,admin_note")
      .eq("reference", cleanReference)
      .maybeSingle();
    if (direct.error) return { data: null, error: message(direct.error) };
    directData = direct.data;
  }
  if (!directData) return { data: null, error: null };

  const row = directData as Record<string, unknown>;
  if (isOrder) {
    const items = Array.isArray(row.items) ? row.items as Record<string, unknown>[] : [];
    row.record_type = "Order";
    row.item = String(items[0]?.name || "Gailant Beauty order");
    row.scheduled_detail = row.estimated_delivery_at
      ? new Date(String(row.estimated_delivery_at)).toLocaleString()
      : "Delivery timing pending";
  } else {
    row.record_type = "Booking";
    row.item = row.service_name;
    row.scheduled_detail = `${row.appointment_date || "Date pending"}${row.appointment_time ? ` at ${row.appointment_time}` : ""}`;
  }
  row.client_name = row.name;
  return { data: mapTrackingRow(row), error: null };
}
