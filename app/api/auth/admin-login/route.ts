import { createClient } from "@supabase/supabase-js";
import { adminLoginSchema } from "../../../lib/validation";
import { enforceRateLimit, rateLimitResponse, requestIp } from "../../../lib/rate-limit";
import { logServerError, securityLog } from "../../../lib/server-logging";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "admin-login");
    if (!limited.success) return rateLimitResponse(limited);
    const parsed = adminLoginSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid login request." }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return Response.json({ error: "Authentication is unavailable." }, { status: 503 });
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword(parsed.data);
    if (result.error || !result.data.session || !result.data.user) {
      securityLog("admin_login_failed", { reason: "invalid_credentials", ip_hash: await safeIpHash(requestIp(request)) });
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const allowed = await client.from("admin_users").select("user_id").eq("user_id", result.data.user.id).eq("active", true).maybeSingle();
    if (allowed.error || !allowed.data) {
      securityLog("admin_login_failed", { reason: "not_admin", ip_hash: await safeIpHash(requestIp(request)) });
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }
    return Response.json({ access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logServerError("/api/auth/admin-login", error);
    return Response.json({ error: "Unable to complete login." }, { status: 500 });
  }
}

async function safeIpHash(ip: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${process.env.LOG_HASH_SALT || "gailant"}:${ip}`));
  return Array.from(new Uint8Array(digest)).slice(0, 8).map(value => value.toString(16).padStart(2, "0")).join("");
}
