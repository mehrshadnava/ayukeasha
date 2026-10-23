import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { markPaid } from "@/lib/orders";
import { paymentMode, verifyCheckoutSignature } from "@/lib/razorpay";
import { code, safeEqual } from "@/lib/ids";

const body = z.object({
  orderNumber: z.string(),
  token: z.string(),
  test: z.boolean().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const b = parsed.data;

  const order = await db.order.findUnique({ where: { number: b.orderNumber } });
  if (!order || !safeEqual(b.token, order.accessToken)) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.paymentStatus === "PAID") return NextResponse.json({ ok: true });

  if (b.test) {
    if (paymentMode() !== "test") return NextResponse.json({ error: "Test payments are disabled" }, { status: 403 });
    await markPaid(order.id, code("test_pay_", 14));
    return NextResponse.json({ ok: true });
  }

  if (!b.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  if (b.razorpay_order_id !== order.razorpayOrderId || !verifyCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    return NextResponse.json({ error: "Payment could not be verified. If money was debited, it will be confirmed automatically or refunded." }, { status: 400 });
  }
  await markPaid(order.id, b.razorpay_payment_id);
  return NextResponse.json({ ok: true });
}
