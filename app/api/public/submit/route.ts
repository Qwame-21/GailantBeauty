import { createClient } from "@supabase/supabase-js";
import { publicSubmissionSchema } from "../../../lib/validation";
import { enforceRateLimit, rateLimitResponse, type LimitName } from "../../../lib/rate-limit";
import { logServerError } from "../../../lib/server-logging";

const limits: Record<string, LimitName> = {
  booking: "public-booking", consultation: "public-consultation", order: "public-order", testimonial: "public-testimonial",
};
const tables = { booking: "bookings", consultation: "consultation_requests", order: "orders", testimonial: "testimonials" } as const;

export async function POST(request: Request) {
  try {
    const parsed = publicSubmissionSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid submission." }, { status: 400 });
    const limited = await enforceRateLimit(request, limits[parsed.data.kind]);
    if (!limited.success) return rateLimitResponse(limited);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return Response.json({ error: "Submissions are temporarily unavailable." }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    let data: Record<string, unknown> = parsed.data.data;
    if (parsed.data.kind === "order") {
      const ids = parsed.data.data.items.map(item => item.id);
      const products = await admin.from("products").select("id,name,price,active,inventory").in("id", ids);
      if (products.error || products.data?.length !== new Set(ids).size) return Response.json({ error: "One or more products are unavailable." }, { status: 400 });
      const byId = new Map(products.data.map(product => [String(product.id), product]));
      const items = parsed.data.data.items.map(item => {
        const product = byId.get(item.id)!;
        if (!product.active || Number(product.inventory) < item.quantity) throw new Error("PRODUCT_UNAVAILABLE");
        return { ...item, name: String(product.name), price: Number(product.price), kind: "product" as const };
      });
      data = { ...parsed.data.data, items, total_amount: items.reduce((sum, item) => sum + item.price * item.quantity, 0) };
    }
    const inserted = await admin.from(tables[parsed.data.kind]).insert(data).select("id,reference").single();
    if (inserted.error) return Response.json({ error: "Submission could not be saved." }, { status: 400 });
    return Response.json({ data: inserted.data }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_UNAVAILABLE") return Response.json({ error: "One or more products are unavailable." }, { status: 400 });
    logServerError("/api/public/submit", error);
    return Response.json({ error: "Submission could not be completed." }, { status: 500 });
  }
}
