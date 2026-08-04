import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { deleteImageSchema } from "../../../lib/validation";
import { logServerError } from "../../../lib/server-logging";

async function handlePost(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = deleteImageSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !supabaseAnon || !token) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const authClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { data: admin } = await authClient.from("admin_users").select("user_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!admin) return Response.json({ error: "Forbidden." }, { status: 403 });
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !apiSecret || !cloudName) return Response.json({ error: "Cloudinary cleanup is not configured." }, { status: 503 });
  const publicId = parsed.data.public_id;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate: "true", api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body });
  const result = await response.json() as { result?: string; error?: { message?: string } };
  if (!response.ok || result.error) return Response.json({ error: result.error?.message || "Cloudinary cleanup failed." }, { status: 502 });
  return Response.json({ result: result.result || "ok" });
}

export async function POST(request: Request) {
  try { return await handlePost(request); }
  catch (error) { logServerError("/api/admin/delete-image", error); return Response.json({ error: "Image deletion failed." }, { status: 500 }); }
}
