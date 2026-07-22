import type { Product, Service } from "../constants";

export const GAILAND_DATA_EVENT = "gailand:data-changed";
const CATALOG_KEY = "gailand:catalog:v1";
const recordKey = (table: string) => `gailand:records:${table}:v1`;

export type StoredTestimonial = { id?: string; quote: string; name: string; service: string; rating: number; published?: boolean };
export type CatalogStore = { services: Service[]; products: Product[]; testimonials: StoredTestimonial[] };

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function loadCatalog(defaults: CatalogStore): CatalogStore {
  if (typeof window === "undefined") return defaults;
  return safeParse<CatalogStore>(localStorage.getItem(CATALOG_KEY), defaults);
}

export function saveCatalog(catalog: CatalogStore) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  window.dispatchEvent(new CustomEvent(GAILAND_DATA_EVENT, { detail: { table: "catalog" } }));
}

export function loadRecords(table: string): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  return safeParse<Record<string, unknown>[]>(localStorage.getItem(recordKey(table)), []);
}

export function saveRecords(table: string, records: Record<string, unknown>[]) {
  localStorage.setItem(recordKey(table), JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(GAILAND_DATA_EVENT, { detail: { table } }));
}

export function createLocalRecord(table: string, payload: Record<string, unknown>) {
  const prefix = table === "bookings" ? "GB-B" : table === "orders" ? "GB-O" : table === "consultation_requests" ? "GB-C" : "GB";
  const record = { ...payload, id: crypto.randomUUID(), reference: `${prefix}-${Date.now().toString().slice(-7)}`, status: table === "consultation_requests" ? "new" : "pending", created_at: new Date().toISOString() };
  saveRecords(table, [record, ...loadRecords(table)]);
  return record;
}

export function patchLocalRecord(table: string, id: string, patch: Record<string, unknown>) {
  const records = loadRecords(table).map(record => record.id === id || record.reference === id ? { ...record, ...patch, updated_at: new Date().toISOString() } : record);
  saveRecords(table, records);
}

export function deleteLocalRecords(table: string, ids: string[]) {
  saveRecords(table, loadRecords(table).filter(record => !ids.includes(String(record.id)) && !ids.includes(String(record.reference))));
}
