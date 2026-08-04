import { createClient } from "@supabase/supabase-js";

type Line = { id: string; name: string; price: number; quantity: number; kind?: "product" | "service" };
type RequestBody = {
  kind: "order" | "booking" | "reschedule" | "pos";
  paymentReference?: string;
  paymentMethod?: "paystack" | "cash";
  amount: number;
  customer?: { name?: string; phone?: string; email?: string; address?: string };
  items?: Line[];
  booking?: Record<string, unknown>;
  reference?: string;
  newDate?: string;
  newTime?: string;
};

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });
const cleanText = (value: unknown, max = 500) => String(value || "").trim().slice(0, max);

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return json({ error: "Payment completion is not configured." }, 503);
  let body: RequestBody;
  try { body = await request.json() as RequestBody; } catch { return json({ error: "Invalid request." }, 400); }
  if (!Number.isFinite(body.amount) || body.amount < 0) return json({ error: "Invalid payment amount." }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const paymentMethod = body.paymentMethod || "paystack";
  let verifiedReference = cleanText(body.paymentReference, 120);

  if (paymentMethod === "cash") {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Admin authorization is required for cash sales." }, 401);
    const { data: authData } = await admin.auth.getUser(token);
    if (!authData.user) return json({ error: "Admin authorization is invalid." }, 401);
    const { data: allowed } = await admin.from("admin_users").select("user_id").eq("user_id", authData.user.id).eq("active", true).maybeSingle();
    if (!allowed) return json({ error: "Admin access is required." }, 403);
    verifiedReference = `CASH-${Date.now()}`;
  } else {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !verifiedReference) return json({ error: "Paystack verification is not configured." }, 503);
    const verification = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(verifiedReference)}`, { headers: { authorization: `Bearer ${secret}` }, cache: "no-store" });
    const result = await verification.json() as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; reference?: string } };
    const expectedPesewas = Math.round(body.amount * 100);
    if (!verification.ok || !result.status || result.data?.status !== "success" || result.data.currency !== "GHS" || result.data.amount !== expectedPesewas) return json({ error: "Payment could not be verified." }, 402);
    verifiedReference = cleanText(result.data.reference, 120);
  }

  const customer = body.customer || {};
  const name = cleanText(customer.name, 120) || "Walk-in customer";
  const phone = cleanText(customer.phone, 40) || "N/A";
  const email = cleanText(customer.email, 180) || null;
  const now = new Date().toISOString();
  if (body.kind === "reschedule" && (!body.reference || !body.newDate || !body.newTime)) return json({ error: "Booking reference, date, and time are required." }, 400);
  const validatedItems = (body.items || []).filter(line => line.id && line.quantity > 0 && line.price >= 0).map(line => ({ ...line, name: cleanText(line.name, 160), quantity: Math.floor(line.quantity), price: Number(line.price) }));
  if (["order", "pos"].includes(body.kind) && !validatedItems.length) return json({ error: "At least one item is required." }, 400);
  if (body.kind === "order" && !cleanText(customer.address, 500)) return json({ error: "Delivery address is required." }, 400);
  for (const line of validatedItems.filter(line => line.kind !== "service")) {
    const { data: product, error } = await admin.from("products").select("inventory").eq("id", line.id).single();
    if (error || Number(product.inventory) < line.quantity) return json({ error: `${line.name} no longer has enough inventory.` }, 409);
  }
  const { error: eventError } = await admin.from("payment_events").insert({ payment_reference: verifiedReference, payment_method: paymentMethod, workflow: body.kind, amount: body.amount });
  if (eventError) return json({ error: eventError.code === "23505" ? "This payment has already been completed." : eventError.message }, eventError.code === "23505" ? 409 : 400);

  if (body.kind === "reschedule") {
    const { data, error } = await admin.from("bookings").update({ appointment_date: body.newDate, appointment_time: body.newTime, status: "rescheduled", payment_reference: verifiedReference, payment_provider: paymentMethod, updated_at: now }).eq("reference", cleanText(body.reference, 80)).select("id,reference,status,appointment_date,appointment_time").single();
    if (error) return json({ error: error.message }, 400);
    await admin.from("activity_log").insert({ action: "booking.rescheduled", entity_type: "booking", entity_id: String(data.id), metadata: { reference: data.reference, payment_reference: verifiedReference } });
    return json({ data, receipt: { reference: verifiedReference, amount: body.amount, paidAt: now } });
  }

  let customerId: string | null = null;
  if (name !== "Walk-in customer" || phone !== "N/A") {
    const { data: existing } = await admin.from("customers").select("id").eq("phone", phone).maybeSingle();
    if (existing?.id) customerId = String(existing.id);
    else {
      const { data: created, error } = await admin.from("customers").insert({ full_name: name, phone, email }).select("id").single();
      if (error) return json({ error: error.message }, 400);
      customerId = String(created.id);
    }
  }

  if (body.kind === "booking") {
    const booking = body.booking || {};
    const payload = { customer_id: customerId, service_id: booking.service_id || null, name, phone, email, service_name: cleanText(booking.service_name, 160), appointment_date: booking.appointment_date, appointment_time: booking.appointment_time, stylist_preference: cleanText(booking.stylist_preference, 120) || null, home_service: Boolean(booking.home_service), address: cleanText(booking.address, 300) || null, notes: cleanText(booking.notes, 1000) || null, total_amount: Number(booking.total_amount || body.amount), deposit_amount: body.amount, payment_reference: verifiedReference, payment_provider: paymentMethod, payment_status: "paid", status: "confirmed", confirmed_at: now };
    const { data, error } = await admin.from("bookings").insert(payload).select("id,reference,status").single();
    if (error) return json({ error: error.message }, 400);
    await admin.from("activity_log").insert({ action: "booking.created", entity_type: "booking", entity_id: String(data.id), metadata: { reference: data.reference, source: "storefront" } });
    return json({ data, receipt: { reference: data.reference, paymentReference: verifiedReference, amount: body.amount, paidAt: now } });
  }

  const items = validatedItems;
  if (!items.length) return json({ error: "At least one item is required." }, 400);

  if (body.kind === "order") {
    const address = cleanText(customer.address, 500);
    if (!address) return json({ error: "Delivery address is required." }, 400);
    for (const line of items) { const { data: product, error } = await admin.from("products").select("inventory").eq("id", line.id).single(); if (error || Number(product.inventory) < line.quantity) return json({ error: `${line.name} no longer has enough inventory.` }, 409); }
    const payload = { customer_id: customerId, name, phone, email, address, items, subtotal_amount: body.amount, delivery_fee: 0, discount_amount: 0, total_amount: body.amount, payment_reference: verifiedReference, payment_provider: paymentMethod, payment_verified_at: now, payment_status: "paid", status: "paid", source: "storefront" };
    const { data, error } = await admin.from("orders").insert(payload).select("id,reference,status").single();
    if (error) return json({ error: error.message }, 400);
    for (const line of items) { const { data: product } = await admin.from("products").select("inventory").eq("id", line.id).single(); await admin.from("products").update({ inventory: Math.max(0,Number(product?.inventory||0)-line.quantity) }).eq("id",line.id); }
    await admin.from("activity_log").insert({ action: "order.created", entity_type: "order", entity_id: String(data.id), metadata: { reference: data.reference, source: "storefront" } });
    return json({ data, receipt: { reference: data.reference, paymentReference: verifiedReference, amount: body.amount, paidAt: now } });
  }

  const productLines = items.filter(line => line.kind === "product");
  const serviceLines = items.filter(line => line.kind === "service");
  const created: Array<{ type: string; id: string; reference: string }> = [];
  if (productLines.length) {
    const total = productLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const { data, error } = await admin.from("orders").insert({ customer_id: customerId, name, phone, email, address: "In-store collection", items: productLines, subtotal_amount: total, delivery_fee: 0, discount_amount: 0, total_amount: total, payment_reference: verifiedReference, payment_provider: paymentMethod, payment_verified_at: now, payment_status: "paid", status: "delivered", source: "pos", delivered_at: now }).select("id,reference").single();
    if (error) return json({ error: error.message }, 400);
    created.push({ type: "order", id: String(data.id), reference: String(data.reference) });
    for (const line of productLines) {
      const { data: product, error: productError } = await admin.from("products").select("inventory").eq("id", line.id).single();
      if (productError || Number(product.inventory) < line.quantity) return json({ error: `${line.name} no longer has enough inventory.` }, 409);
      const { error: inventoryError } = await admin.from("products").update({ inventory: Number(product.inventory) - line.quantity }).eq("id", line.id);
      if (inventoryError) return json({ error: inventoryError.message }, 400);
    }
  }
  for (const line of serviceLines) {
    for (let count = 0; count < line.quantity; count += 1) {
      const today = now.slice(0, 10); const time = now.slice(11, 19);
      const { data, error } = await admin.from("bookings").insert({ customer_id: customerId, service_id: line.id, name, phone, email, service_name: line.name, appointment_date: today, appointment_time: time, home_service: false, total_amount: line.price, deposit_amount: line.price, payment_reference: verifiedReference, payment_provider: paymentMethod, payment_status: "paid", status: "completed", completed_at: now }).select("id,reference").single();
      if (error) return json({ error: error.message }, 400);
      created.push({ type: "booking", id: String(data.id), reference: String(data.reference) });
    }
  }
  await admin.from("activity_log").insert(created.map(record => ({ action: `${record.type}.pos_completed`, entity_type: record.type, entity_id: record.id, metadata: { reference: record.reference, payment_reference: verifiedReference } })));
  return json({ data: created, receipt: { reference: created[0]?.reference || verifiedReference, paymentReference: verifiedReference, amount: body.amount, paidAt: now } });
}
