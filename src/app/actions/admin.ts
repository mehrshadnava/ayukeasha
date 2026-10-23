"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { addEvent, applyCourierStatus, cancel, orderUrl, packageFor, refund, setStatus, ship } from "@/lib/orders";
import { createReturnShipment, shippingMode, trackAwb } from "@/lib/shiprocket";
import { ORDER_STATUS, TICKET_STATUS, type OrderStatus, type TicketStatus } from "@/lib/status";
import type { FormState } from "./auth";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const rupees = (fd: FormData, k: string) => Math.round(Number(s(fd, k)) * 100);

async function guarded(fn: () => Promise<FormState | void>, paths: string[]): Promise<FormState> {
  await requireAdmin();
  try {
    const r = await fn();
    paths.forEach((p) => revalidatePath(p));
    return r ?? { ok: "Saved" };
  } catch (e) {
    console.error(e);
    return { error: (e as Error).message };
  }
}

const orderPaths = (id: string) => [`/admin/orders/${id}`, "/admin/orders", "/admin"];

export async function shipOrder(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  return guarded(async () => {
    const r = await ship(id);
    return { ok: `Shipment created. AWB ${r.awbCode}.${r.warnings.length ? " " + r.warnings.join(" ") : ""}` };
  }, orderPaths(id));
}

export async function updateStatus(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  const status = s(fd, "status") as OrderStatus;
  return guarded(async () => {
    if (!(status in ORDER_STATUS) || status === "PENDING_PAYMENT") throw new Error("Choose a valid status");
    if (status === "CANCELLED") return void (await cancel(id, s(fd, "note"), "ADMIN"));
    await setStatus(id, status, { message: s(fd, "note") || undefined, source: "ADMIN", force: true });
  }, orderPaths(id));
}

export async function syncTracking(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  return guarded(async () => {
    const o = await db.order.findUniqueOrThrow({ where: { id } });
    if (!o.awbCode) throw new Error("No AWB on this order yet.");
    const t = await trackAwb(o.awbCode);
    if (t.etd) await db.order.update({ where: { id }, data: { estimatedDelivery: t.etd } });
    if (!t.status) return { ok: "No new tracking information from the courier yet." };
    await applyCourierStatus(id, t.status, t.events[0]?.location);
    return { ok: `Courier status: ${t.status}` };
  }, orderPaths(id));
}

export async function simulateCourier(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  return guarded(async () => {
    if (shippingMode() !== "test") throw new Error("Only available in test mode.");
    await applyCourierStatus(id, s(fd, "event"), "Test hub");
  }, orderPaths(id));
}

export async function refundOrder(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  return guarded(async () => {
    const r = await refund(id, rupees(fd, "amount"), s(fd, "reason") || "Refund by AyurKesha team");
    return { ok: `Refund ${r.id} initiated.` };
  }, orderPaths(id));
}

export async function addNote(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  return guarded(async () => {
    const note = s(fd, "note");
    if (!note) throw new Error("Write a note first");
    await addEvent(id, note, { source: "ADMIN", internal: true });
  }, orderPaths(id));
}

export async function returnDecision(_: FormState, fd: FormData) {
  const id = s(fd, "orderId");
  const decision = s(fd, "decision");
  const note = s(fd, "note");
  return guarded(async () => {
    const o = await db.order.findUniqueOrThrow({ where: { id }, include: { returnRequest: true, items: { include: { variant: { include: { product: true } } } } } });
    const rr = o.returnRequest;
    if (!rr) throw new Error("No return request on this order");
    const notify = (subject: string, lines: string[]) => sendMail(o.email, subject, lines, { label: "View order", url: orderUrl(o) });

    if (decision === "approve") {
      if (rr.status !== "REQUESTED") throw new Error("Already decided");
      const r = await createReturnShipment(o, packageFor(o));
      await db.returnRequest.update({ where: { id: rr.id }, data: { status: "APPROVED", adminNote: note, shiprocketOrderId: r.shiprocketOrderId, shiprocketShipmentId: r.shipmentId, awbCode: r.awbCode } });
      await addEvent(id, `Return approved. Reverse pickup scheduled${r.awbCode ? ` (AWB ${r.awbCode})` : ""}.`, { source: "ADMIN" });
      await notify(`Return approved for ${o.number}`, ["Your return has been approved. Our courier partner will contact you to pick up the package in the next 2–4 working days.", "Please keep the items packed. Your refund will be processed once the package reaches us.", note].filter(Boolean));
      return { ok: "Return approved and pickup requested." };
    }
    if (decision === "reject") {
      if (!note) throw new Error("Add a note explaining why — the customer will see it.");
      await db.returnRequest.update({ where: { id: rr.id }, data: { status: "REJECTED", adminNote: note } });
      await addEvent(id, "Return request declined.", { source: "ADMIN" });
      await notify(`Update on your return for ${o.number}`, ["We've reviewed your return request and are unable to accept it.", note]);
      return;
    }
    if (decision === "received") {
      await db.returnRequest.update({ where: { id: rr.id }, data: { status: "RECEIVED" } });
      await addEvent(id, "Returned package received at our warehouse.", { source: "ADMIN" });
      return;
    }
    if (decision === "refund") {
      const amount = rupees(fd, "amount");
      await refund(id, amount, `Return refund: ${rr.reason}`);
      await db.returnRequest.update({ where: { id: rr.id }, data: { status: "REFUNDED", refundAmount: amount } });
      return { ok: "Return refunded." };
    }
    throw new Error("Unknown decision");
  }, [...orderPaths(id), "/admin/returns"]);
}

export async function ticketReply(_: FormState, fd: FormData) {
  const id = s(fd, "ticketId");
  return guarded(async () => {
    const body = s(fd, "body");
    const status = (s(fd, "status") || "AWAITING_CUSTOMER") as TicketStatus;
    if (!(status in TICKET_STATUS)) throw new Error("Bad status");
    const t = await db.ticket.findUniqueOrThrow({ where: { id } });
    await db.ticket.update({ where: { id }, data: { status, messages: body ? { create: { author: "ADMIN", body } } : undefined } });
    if (body) {
      await sendMail(t.email, `Re: ${t.subject} [${t.number}]`, [body, "Reply from your ticket page to continue the conversation."], { label: "Open ticket", url: `${config.appUrl}/support/${t.number}?t=${t.accessToken}` });
    }
    return { ok: body ? "Reply sent" : "Status updated" };
  }, [`/admin/tickets/${id}`, "/admin/tickets", "/admin"]);
}

export async function updateProduct(_: FormState, fd: FormData) {
  const id = s(fd, "productId");
  return guarded(async () => {
    const price = rupees(fd, "price"), mrp = rupees(fd, "mrp");
    if (!(price > 0) || mrp < price) throw new Error("Price must be positive and MRP at least the price.");
    const int = (k: string) => { const v = Number(s(fd, k)); if (!Number.isInteger(v) || v <= 0) throw new Error(`${k} must be a positive whole number`); return v; };
    await db.product.update({
      where: { id },
      data: {
        name: s(fd, "name"), tagline: s(fd, "tagline"), description: s(fd, "description"), highlights: s(fd, "highlights"),
        price, mrp, gstRate: Number(s(fd, "gstRate")), hsn: s(fd, "hsn"),
        weightGrams: int("weightGrams"), lengthCm: int("lengthCm"), breadthCm: int("breadthCm"), heightCm: int("heightCm"),
        active: fd.get("active") === "on",
      },
    });
  }, ["/admin/products", "/product/ritual-box"]);
}

export async function updateVariant(_: FormState, fd: FormData) {
  return guarded(async () => {
    const stock = Number(s(fd, "stock"));
    if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be 0 or more");
    await db.variant.update({ where: { id: s(fd, "variantId") }, data: { stock, active: fd.get("active") === "on" } });
  }, ["/admin/products", "/admin"]);
}
