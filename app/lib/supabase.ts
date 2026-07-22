import { createClient } from "@supabase/supabase-js";
import { createLocalRecord } from "./gailand-store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;
export const isSupabaseConfigured = Boolean(supabase);

export async function insertRecord(table: string, payload: Record<string, unknown>) {
  if (!supabase) return { data: createLocalRecord(table, payload), error: null, local: true };
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  return { data, error, local: false };
}
