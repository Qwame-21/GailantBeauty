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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? message(error) : null, local: false };
}

export async function signOutAdmin() { if (supabase) await supabase.auth.signOut(); }
export async function hasAdminSession() { if (!supabase) return false; const { data } = await supabase.auth.getSession(); return Boolean(data.session); }
