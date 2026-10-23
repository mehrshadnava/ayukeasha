import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { addEvent, markPaid, markPaymentFailed } from "@/lib/orders";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  const evt = JSON.parse(raw);
  const payment = evt?.payload?.payment?.entity;

  if (evt.event === "payment.captured" && payment?.order_id) {
    const order = await db.order.findUnique({ where: { razorpayOrderId: payment.order_id } });
    if (order) {
      if (payment.amount !== order.total) await addEvent(order.id, `Captured amount ${payment.amount} paise differs from order total ${order.total}.`, { internal: true, source: "PAYMENT" });
      await markPaid(order.id, payment.id);
    }
  } else if (evt.event === "payment.failed" && payment?.order_id) {
    const order = await db.order.findUnique({ where: { razorpayOrderId: payment.order_id } });
    if (order) await markPaymentFailed(order.id, payment.error_description ?? "unknown reason");
  } else if (evt.event === "refund.processed") {
    const refund = evt?.payload?.refund?.entity;
    const order = refund?.payment_id ? await db.order.findFirst({ where: { razorpayPaymentId: refund.payment_id } }) : null;
    if (order) await addEvent(order.id, `Refund ${refund.id} processed by the bank.`, { source: "PAYMENT" });
  }
  return NextResponse.json({ ok: true });
}
