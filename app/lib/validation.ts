import { z } from "zod";

const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const email = z.string().trim().email().max(180).optional().nullable();
const phone = z.string().trim().min(7).max(40);
const uuid = z.string().uuid();

export const lineSchema = z.object({
  id: uuid,
  name: shortText(160),
  price: z.number().finite().nonnegative().max(1_000_000),
  quantity: z.number().int().min(1).max(25),
  kind: z.enum(["product", "service"]).optional(),
}).strict();

const customerSchema = z.object({
  name: optionalText(120), phone: optionalText(40), email, address: optionalText(500),
}).strict().optional();

const paymentBookingSchema = z.object({
  service_id: uuid.optional().nullable(), service_name: shortText(160), appointment_date: z.string().date(), appointment_time: shortText(20),
  stylist_preference: optionalText(120), home_service: z.boolean().optional(), address: optionalText(500), notes: optionalText(1000),
  total_amount: z.number().finite().nonnegative().max(1_000_000), deposit_amount: z.number().finite().nonnegative().max(1_000_000).optional(),
  status: z.enum(["pending_payment", "confirmed"]).optional(),
}).strict();

export const paymentCompletionSchema = z.object({
  kind: z.enum(["order", "booking", "reschedule", "pos"]),
  paymentReference: optionalText(120),
  paymentMethod: z.enum(["paystack", "cash"]).optional(),
  amount: z.number().finite().nonnegative().max(1_000_000),
  customer: customerSchema,
  items: z.array(lineSchema).max(50).optional(),
  booking: paymentBookingSchema.optional(),
  reference: optionalText(80), newDate: optionalText(10), newTime: optionalText(20),
}).strict().superRefine((value, context) => {
  if (["order", "pos"].includes(value.kind) && !value.items?.length) context.addIssue({ code: "custom", message: "Items are required.", path: ["items"] });
  if (value.kind === "booking" && !value.booking) context.addIssue({ code: "custom", message: "Booking data is required.", path: ["booking"] });
  if (value.kind === "reschedule" && (!value.reference || !value.newDate || !value.newTime)) context.addIssue({ code: "custom", message: "Reschedule data is required." });
  if (value.paymentMethod !== "cash" && !value.paymentReference) context.addIssue({ code: "custom", message: "Payment reference is required.", path: ["paymentReference"] });
});

export const deleteImageSchema = z.object({
  public_id: z.string().trim().min(1).max(255).regex(/^[a-zA-Z0-9_\-/.]+$/),
}).strict();

export const adminLoginSchema = z.object({ email: z.string().trim().email().max(180), password: z.string().min(1).max(256) }).strict();
export const trackingSchema = z.object({ reference: shortText(80), credential: shortText(180) }).strict();

export const publicSubmissionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("booking"), data: z.object({
    name: shortText(120), phone, email, service_id: uuid.optional().nullable(), service_name: shortText(160),
    appointment_date: z.string().date(), appointment_time: shortText(20), stylist_preference: optionalText(120),
    home_service: z.boolean().optional(), address: optionalText(500), notes: optionalText(1000),
    total_amount: z.number().finite().nonnegative().max(1_000_000), deposit_amount: z.number().finite().nonnegative().max(1_000_000),
    status: z.literal("pending_payment").optional(),
  }).strict() }).strict(),
  z.object({ kind: z.literal("consultation"), data: z.object({
    name: shortText(120), phone, email, service_id: uuid.optional().nullable(), service_name: shortText(160), notes: optionalText(1000), status: z.literal("new").optional(),
  }).strict() }).strict(),
  z.object({ kind: z.literal("order"), data: z.object({
    name: shortText(120), phone, email, address: shortText(500), items: z.array(lineSchema.extend({ kind: z.literal("product").optional() })).min(1).max(50),
    total_amount: z.number().finite().nonnegative().max(1_000_000), status: z.literal("pending_payment").optional(), payment_status: z.literal("pending").optional(),
  }).strict() }).strict(),
  z.object({ kind: z.literal("testimonial"), data: z.object({
    customer_name: shortText(120), service_name: optionalText(160), quote: shortText(1500), rating: z.number().int().min(1).max(5), published: z.literal(false), verified: z.literal(false),
  }).strict() }).strict(),
]);
