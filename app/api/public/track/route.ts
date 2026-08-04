import { createClient } from "@supabase/supabase-js";
import { trackingSchema } from "../../../lib/validation";
import { enforceRateLimit, rateLimitResponse } from "../../../lib/rate-limit";
import { logServerError } from "../../../lib/server-logging";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "tracking");
    if (!limited.success) return rateLimitResponse(limited);
    const parsed = trackingSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid tracking request." }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return Response.json({ error: "Tracking is temporarily unavailable." }, { status: 503 });
    const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.rpc("track_gailand_reference", {
      lookup_reference: parsed.data.reference.trim().toUpperCase(), lookup_credential: parsed.data.credential.trim().toLowerCase(),
    });
    if (result.error) throw result.error;
    return Response.json({ data: Array.isArray(result.data) ? result.data[0] || null : null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logServerError("/api/public/track", error);
    return Response.json({ error: "Tracking could not be completed." }, { status: 500 });
  }
}
