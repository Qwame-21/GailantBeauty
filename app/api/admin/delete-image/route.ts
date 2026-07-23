import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL; const supabaseAnon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!supabaseUrl||!supabaseAnon||!token)return Response.json({error:"Unauthorized."},{status:401});
  const authClient=createClient(supabaseUrl,supabaseAnon,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:{user},error:authError}=await authClient.auth.getUser(token);
  if(authError||!user)return Response.json({error:"Unauthorized."},{status:401});
  const {data:admin}=await authClient.from("admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle();
  if(!admin)return Response.json({error:"Forbidden."},{status:403});
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !apiSecret || !cloudName) return Response.json({ error: "Cloudinary cleanup is not configured." }, { status: 503 });
  const { public_id } = await request.json() as { public_id?: string };
  if (!public_id || typeof public_id !== "string") return Response.json({ error: "A valid public_id is required." }, { status: 400 });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`invalidate=true&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({ public_id, timestamp: String(timestamp), invalidate: "true", api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body });
  const result = await response.json() as { result?: string; error?: { message?: string } };
  if (!response.ok || result.error) {
    console.error("Cloudinary asset cleanup failed", { public_id, status: response.status, message: result.error?.message });
    return Response.json({ error: result.error?.message || "Cloudinary cleanup failed." }, { status: 502 });
  }
  return Response.json({ result: result.result || "ok" });
}
