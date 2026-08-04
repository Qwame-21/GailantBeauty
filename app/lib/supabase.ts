import { createBrowserClient } from "@supabase/ssr";
import { createLocalRecord } from "./gailand-store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createBrowserClient(url, anon) : null;
export const isSupabaseConfigured = Boolean(supabase);

export type DataResult<T> = { data: T | null; error: string | null; local: boolean };

function message(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "The database request failed.";
}

export async function insertRecord(table: string, payload: Record<string, unknown>) {
  if (!supabase) return { data: createLocalRecord(table, payload), error: null, local: true };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && ["orders", "bookings", "consultation_requests", "testimonials"].includes(table)) {
    const kind = table === "consultation_requests" ? "consultation" : table === "testimonials" ? "testimonial" : table.slice(0, -1);
    const response = await fetch("/api/public/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, data: payload }) });
    const result = await response.json() as { data?: Record<string, unknown>; error?: string };
    return { data: response.ok ? result.data || payload : null, error: response.ok ? null : result.error || "The submission could not be saved.", local: false };
  }
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

export async function recordActivity(action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  if (!supabase) return { error: null };
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("activity_log").insert({ admin_user_id: user?.id || null, action, entity_type: entityType, entity_id: entityId || null, metadata });
  return { error: error ? message(error) : null };
}

export async function signInAdmin(email: string, password: string) {
  if (!supabase) return { error: null, local: true };
  const response = await fetch("/api/auth/admin-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const result = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok || !result.access_token || !result.refresh_token) return { error: result.error || "Unable to authenticate.", local: false };
  const session = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
  if (session.error) return { error: "Unable to establish the admin session.", local: false };
  return { error: null, local: false };
}

export async function signOutAdmin() { if (supabase) await supabase.auth.signOut(); }
export async function updateAdminPassword(password: string) {
  if (!supabase) return { error: "Supabase authentication is required." };
  if (password.length < 12) return { error: "Use at least 12 characters for the new password." };
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? message(error) : null };
}
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

export async function trackReference(reference: string, credential: string): Promise<{ data: LiveTrackingRecord | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const cleanReference = reference.trim().toUpperCase();
  const cleanCredential = credential.trim().toLowerCase();
  if (!cleanReference || !cleanCredential) return { data: null, error: "Enter the reference and the email address or phone number used at checkout." };

  const response = await fetch("/api/public/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: cleanReference, credential: cleanCredential }) });
  const result = await response.json() as { data?: Record<string, unknown> | null; error?: string };
  if (!response.ok) return { data: null, error: result.error || "Tracking could not be completed." };
  return { data: result.data ? mapTrackingRow(result.data) : null, error: null };
}
