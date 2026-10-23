import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { orderWhere } from "../filters";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const orders = await db.order.findMany({ where: orderWhere(sp.get("status") ?? "all", sp.get("q") ?? ""), orderBy: { createdAt: "desc" }, include: { items: true } });
  const head = ["Order", "Placed", "Paid", "Status", "Payment", "Name", "Email", "Phone", "Address", "City", "State", "Pincode", "Items", "Subtotal", "Shipping", "Total", "Refunded", "Razorpay payment", "AWB", "Courier"];
  const rows = orders.map((o) => [
    o.number, o.createdAt.toISOString(), o.paidAt?.toISOString(), o.status, o.paymentStatus, o.name, o.email, o.phone,
    [o.address1, o.address2].filter(Boolean).join(", "), o.city, o.state, o.pincode,
    o.items.map((i) => `${i.quantity}x ${i.sku}`).join("; "),
    o.subtotal / 100, o.shippingFee / 100, o.total / 100, o.refundedAmount / 100, o.razorpayPaymentId, o.awbCode, o.courierName,
  ]);
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  return new Response("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ayurkesha-orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
