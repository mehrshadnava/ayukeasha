import { z } from "zod";
import { INDIAN_STATES } from "./config";

const trimmed = (max: number) => z.string().trim().max(max);

export const phone = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));

export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(120);
export const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode");

export const checkoutSchema = z.object({
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).max(10) })).min(1, "Your cart is empty").max(20),
  name: trimmed(80).min(2, "Enter your full name"),
  email,
  phone,
  address1: trimmed(160).min(5, "Enter your house / street address"),
  address2: trimmed(160).optional().default(""),
  city: trimmed(60).min(2, "Enter your city"),
  state: z.enum(INDIAN_STATES as [string, ...string[]], { errorMap: () => ({ message: "Choose your state" }) }),
  pincode,
});

export const registerSchema = z.object({
  name: trimmed(80).min(2, "Enter your name"),
  email,
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "Use at least 8 characters").max(100),
});

export const ticketSchema = z.object({
  name: trimmed(80).min(2, "Enter your name"),
  email,
  phone: z.string().trim().max(20).optional().default(""),
  orderNumber: trimmed(20).optional().default(""),
  category: z.enum(["ORDER", "DELIVERY", "RETURN", "PRODUCT", "OTHER"]),
  subject: trimmed(140).min(4, "Add a short subject"),
  message: trimmed(4000).min(10, "Tell us a little more (at least 10 characters)"),
});

export function firstError(e: z.ZodError) {
  const f = e.flatten();
  return Object.values(f.fieldErrors).flat()[0] ?? f.formErrors[0] ?? "Please check the form";
}

export function fieldErrors(e: z.ZodError) {
  return Object.fromEntries(Object.entries(e.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""]));
}
