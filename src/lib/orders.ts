import "server-only";
import { db } from "./db";
import { config } from "./config";
import { money } from "./format";
import { sendMail } from "./mail";
import { refundPayment } from "./razorpay";
import { createShipment, cancelShipment, mapCourierStatus, shippingMode } from "./shiprocket";
import { safeEqual } from "./ids";
import { CANCELLABLE, FULFILMENT_STEPS, ORDER_STATUS, type OrderStatus } from "./status";
import type { Order, OrderItem, Product } from "@prisma/client";

type Source = "SYSTEM" | "ADMIN" | "CUSTOMER" | "COURIER" | "PAYMENT";

export const orderUrl = (o: { number: string; accessToken: string }) => `${config.appUrl}/orders/${o.number}?t=${o.accessToken}`;

export function canView(o: { userId: string | null; accessToken: string }, user: { id: string; role: string } | null, t?: string | null) {
  if (user && (user.role === "ADMIN" || user.id === o.userId)) return true;
  return Boolean(t && safeEqual(t, o.accessToken));
}

export async function addEvent(orderId: string, message: string, opts: { status?: string; source?: Source; internal?: boolean; location?: string } = {}) {
  await db.orderEvent.create({ data: { orderId, message, status: opts.status, source: opts.source ?? "SYSTEM", internal: opts.internal ?? false, location: opts.location } });
}

export async function markPaid(orderId: string, paymentId: string, source: Source = "PAYMENT") {
  const updated = await db.order.updateMany({
    where: { id: orderId, paymentStatus: { in: ["PENDING", "FAILED"] } },
    data: { paymentStatus: "PAID", status: "CONFIRMED", razorpayPaymentId: paymentId, paidAt: new Date() },
  });
  if (updated.count === 0) return false;

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const short: string[] = [];
  for (const i of order.items) {
    const r = await db.variant.updateMany({ where: { id: i.variantId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
    if (r.count === 0) {
      await db.variant.update({ where: { id: i.variantId }, data: { stock: 0 } });
      short.push(`${i.variantName} ×${i.quantity}`);
    }
  }
  await addEvent(orderId, `Payment of ${money(order.total)} received. Order confirmed.`, { status: "CONFIRMED", source });
  if (short.length) await addEvent(orderId, `Stock shortfall at payment time: ${short.join(", ")}. Restock before packing.`, { internal: true });

  await sendMail(order.email, `Order ${order.number} confirmed`, [
    `Namaste ${order.name.split(" ")[0]}, thank you for choosing AyurKesha.`,
    `We have received your payment of ${money(order.total)}. ${order.items.map((i) => `${i.quantity} × ${i.productName} (${i.variantName})`).join(", ")}.`,
    `We'll email you again as soon as it ships.`,
  ], { label: "View your order", url: orderUrl(order) });
  return true;
}

export async function markPaymentFailed(orderId: string, reason: string) {
  const r = await db.order.updateMany({ where: { id: orderId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
  if (r.count) await addEvent(orderId, `Payment attempt failed: ${reason}`, { source: "PAYMENT", internal: true });
}

const rank = (s: string) => FULFILMENT_STEPS.indexOf(s as OrderStatus);

const customerNotes: Partial<Record<OrderStatus, (o: Order) => [string, string[]]>> = {
  SHIPPED: (o) => [`Your order ${o.number} is on its way`, [
    `Your AyurKesha order has left our warehouse${o.courierName ? ` with ${o.courierName}` : ""}.`,
    o.awbCode ? `Tracking number (AWB): ${o.awbCode}.` : "",
    `Remember: do an allergy patch test 48 hours before your first application.`,
  ].filter(Boolean)],
  OUT_FOR_DELIVERY: (o) => [`Order ${o.number} is out for delivery`, [`Your package will reach you today. Please keep your phone handy for the delivery partner.`]],
  DELIVERED: (o) => [`Order ${o.number} delivered`, [
    `Your AyurKesha order has been delivered. We hope you love the results!`,
    `If anything is wrong with your order, you can request a return within ${config.returnWindowDays} days from your order page.`,
  ]],
  RTO: (o) => [`Delivery of order ${o.number} was unsuccessful`, [`The courier could not deliver your package and it is being returned to us. Our team will contact you shortly.`]],
};

/** Moves an order to a new status, stamping dates and notifying the customer. Courier updates never move an order backwards. */
export async function setStatus(orderId: string, status: OrderStatus, opts: { message?: string; source?: Source; location?: string; force?: boolean } = {}) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (o.status === status) {
    if (opts.message) await addEvent(orderId, opts.message, { source: opts.source, location: opts.location });
    return o;
  }
  if (!opts.force) {
    const terminal = ["DELIVERED", "CANCELLED", "RTO"].includes(o.status);
    const forwards = rank(status) > rank(o.status);
    if (terminal || (rank(status) >= 0 && !forwards)) {
      if (opts.message) await addEvent(orderId, opts.message, { source: opts.source, location: opts.location, internal: true });
      return o;
    }
  }
  const now = new Date();
  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      shippedAt: status === "SHIPPED" && !o.shippedAt ? now : undefined,
      deliveredAt: status === "DELIVERED" ? now : undefined,
      cancelledAt: status === "CANCELLED" ? now : undefined,
    },
  });
  await addEvent(orderId, opts.message || ORDER_STATUS[status], { status, source: opts.source, location: opts.location });
  const note = customerNotes[status]?.(updated);
  if (note) await sendMail(updated.email, note[0], note[1], { label: "Track your order", url: orderUrl(updated) });
  return updated;
}

export async function applyCourierStatus(orderId: string, rawStatus: string, location?: string) {
  const mapped = mapCourierStatus(rawStatus);
  const msg = `Courier update: ${rawStatus}`;
  if (mapped) return setStatus(orderId, mapped, { message: msg, source: "COURIER", location });
  await addEvent(orderId, msg, { source: "COURIER", location });
}

export async function refund(orderId: string, amount: number, reason: string, source: Source = "ADMIN") {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const refundable = o.total - o.refundedAmount;
  if (!o.razorpayPaymentId || !["PAID", "PARTIALLY_REFUNDED"].includes(o.paymentStatus)) throw new Error("This order has no captured payment to refund.");
  if (amount <= 0 || amount > refundable) throw new Error(`Refund must be between ₹1 and ${money(refundable)}.`);
  const r = await refundPayment(o.razorpayPaymentId, amount, { order: o.number, reason: reason.slice(0, 200) });
  const refunded = o.refundedAmount + amount;
  await db.order.update({ where: { id: orderId }, data: { refundedAmount: refunded, paymentStatus: refunded >= o.total ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  await addEvent(orderId, `Refund of ${money(amount)} initiated (${r.id}). ${reason}`, { source });
  await sendMail(o.email, `Refund for order ${o.number}`, [
    `We've initiated a refund of ${money(amount)} to your original payment method.`,
    `Banks usually take 5–7 working days to show it in your account.`,
  ], { label: "View order", url: orderUrl(o) });
  return r;
}

export async function cancel(orderId: string, reason: string, source: Source) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (o.status === "CANCELLED") return;
  if (source === "CUSTOMER" && !CANCELLABLE.includes(o.status as OrderStatus)) throw new Error("This order has already been handed to the courier and can no longer be cancelled. You can request a return after delivery.");
  if (o.shiprocketOrderId) {
    try { await cancelShipment(o.shiprocketOrderId); } catch (e) {
      await addEvent(orderId, `Could not cancel Shiprocket order automatically: ${(e as Error).message}`, { internal: true });
    }
  }
  if (o.paidAt) {
    for (const i of o.items) await db.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
  }
  await setStatus(orderId, "CANCELLED", { message: `Order cancelled${source === "CUSTOMER" ? " by customer" : ""}. ${reason}`.trim(), source, force: true });
  const outstanding = o.total - o.refundedAmount;
  if (o.paymentStatus === "PAID" || o.paymentStatus === "PARTIALLY_REFUNDED") {
    if (outstanding > 0) await refund(orderId, outstanding, "Order cancelled", source);
  } else {
    await sendMail(o.email, `Order ${o.number} cancelled`, ["Your order has been cancelled. No payment was taken."]);
  }
}

export function packageFor(o: Order & { items: (OrderItem & { variant: { product: Product } })[] }) {
  const p = o.items[0].variant.product;
  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  const grams = o.items.reduce((n, i) => n + i.variant.product.weightGrams * i.quantity, 0);
  return { lengthCm: p.lengthCm, breadthCm: p.breadthCm, heightCm: p.heightCm * units, weightKg: Math.max(0.1, grams / 1000) };
}

export async function ship(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { variant: { include: { product: true } } } } } });
  if (!["CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(o.status)) throw new Error(`Orders in status "${ORDER_STATUS[o.status as OrderStatus]}" cannot be shipped.`);
  if (shippingMode() === "off") throw new Error("Shiprocket isn't connected yet. Use “Mark as shipped” with your courier's tracking number instead.");
  const res = await createShipment(o, packageFor(o), { shiprocketOrderId: o.shiprocketOrderId, shipmentId: o.shiprocketShipmentId, awbCode: o.awbCode });
  await db.order.update({
    where: { id: orderId },
    data: {
      shiprocketOrderId: res.shiprocketOrderId, shiprocketShipmentId: res.shipmentId, awbCode: res.awbCode,
      courierName: res.courierName ?? o.courierName, labelUrl: res.labelUrl ?? o.labelUrl, trackingUrl: res.trackingUrl ?? o.trackingUrl,
    },
  });
  await setStatus(orderId, "READY_TO_SHIP", { message: `Shipment created${res.courierName ? ` with ${res.courierName}` : ""}. AWB ${res.awbCode}. Pickup requested.`, source: "ADMIN" });
  for (const w of res.warnings) await addEvent(orderId, w, { internal: true });
  return res;
}

/** Fulfilment without Shiprocket: record the courier and tracking number by hand and notify the customer. */
export async function shipManually(orderId: string, courier: string, awb: string, trackingUrl: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!["CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(o.status)) throw new Error(`Orders in status "${ORDER_STATUS[o.status as OrderStatus]}" cannot be shipped.`);
  if (!courier || !awb) throw new Error("Enter the courier name and tracking number.");
  if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) throw new Error("The tracking link must start with http:// or https://");
  await db.order.update({ where: { id: orderId }, data: { courierName: courier, awbCode: awb, trackingUrl: trackingUrl || null } });
  await setStatus(orderId, "SHIPPED", { message: `Shipped with ${courier}. Tracking number ${awb}.`, source: "ADMIN", force: true });
}
