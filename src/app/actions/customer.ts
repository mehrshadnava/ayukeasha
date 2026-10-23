"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { addEvent, canView, cancel } from "@/lib/orders";
import { sendMail } from "@/lib/mail";
import { code, safeEqual, token } from "@/lib/ids";
import { firstError, phone as phoneSchema, ticketSchema } from "@/lib/validation";
import { RETURN_REASONS, TICKET_CATEGORY } from "@/lib/status";
import type { FormState } from "./auth";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const ticketUrl = (t: { number: string; accessToken: string }) => `${config.appUrl}/support/${t.number}?t=${t.accessToken}`;

export async function trackOrder(_: FormState, fd: FormData): Promise<FormState> {
  const number = s(fd, "order").toUpperCase().replace(/^#/, "");
  const contact = s(fd, "contact").toLowerCase();
  if (!number || !contact) return { error: "Enter your order number and the phone or email used to order." };
  const o = await db.order.findUnique({ where: { number } });
  const ph = phoneSchema.safeParse(contact);
  const match = o && (o.email === contact || (ph.success && o.phone === ph.data));
  if (!o || !match) return { error: "We couldn't find an order with those details. Check the order number in your confirmation email." };
  redirect(`/orders/${o.number}?t=${o.accessToken}`);
}

async function loadOwnedOrder(fd: FormData) {
  const o = await db.order.findUnique({ where: { number: s(fd, "order") }, include: { returnRequest: true } });
  if (!o || !canView(o, await currentUser(), s(fd, "t"))) throw new Error("Order not found");
  return o;
}

export async function cancelOrder(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const o = await loadOwnedOrder(fd);
    await cancel(o.id, s(fd, "reason").slice(0, 300), "CUSTOMER");
    await sendMail(config.seller.email, `Order ${o.number} cancelled by customer`, [`${o.name} cancelled order ${o.number}. Reason: ${s(fd, "reason") || "not given"}.`]);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/orders/${s(fd, "order")}`);
  return { ok: "Your order has been cancelled. Any payment will be refunded to the original method within 5–7 working days." };
}

export async function requestReturn(_: FormState, fd: FormData): Promise<FormState> {
  let o;
  try { o = await loadOwnedOrder(fd); } catch { return { error: "Order not found" }; }
  if (o.status !== "DELIVERED" || !o.deliveredAt) return { error: "Returns can be requested once your order is delivered." };
  if (o.returnRequest) return { error: "A return has already been requested for this order." };
  const days = (Date.now() - o.deliveredAt.getTime()) / 86400000;
  if (days > config.returnWindowDays) return { error: `The ${config.returnWindowDays}-day return window for this order has closed. Please contact support if something is wrong.` };
  const reason = s(fd, "reason");
  const details = s(fd, "details").slice(0, 2000);
  if (!RETURN_REASONS.includes(reason)) return { error: "Choose a reason for the return." };
  if (details.length < 10) return { error: "Please describe the problem in a sentence or two." };

  await db.returnRequest.create({ data: { orderId: o.id, reason, details, refundAmount: o.total - o.refundedAmount } });
  const t = await db.ticket.create({
    data: {
      number: code("T", 6), accessToken: token(), userId: o.userId, orderId: o.id,
      name: o.name, email: o.email, phone: o.phone, category: "RETURN",
      subject: `Return request: ${reason}`,
      messages: { create: { author: "CUSTOMER", body: details } },
    },
  });
  await addEvent(o.id, `Return requested — ${reason}.`, { source: "CUSTOMER" });
  await sendMail(o.email, `Return request received for ${o.number}`, [
    `We've received your return request (${reason}). Our team will review it within 1–2 working days.`,
    `If you have photos of the issue, reply on your support ticket — it helps us resolve things faster.`,
  ], { label: "Open support ticket", url: ticketUrl(t) });
  await sendMail(config.seller.email, `New return request: ${o.number}`, [`${o.name} requested a return. Reason: ${reason}.`, details], { label: "Review in admin", url: `${config.appUrl}/admin/orders/${o.id}` });
  revalidatePath(`/orders/${o.number}`);
  return { ok: "Return requested. We'll get back to you within 1–2 working days." };
}

export async function createTicket(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = ticketSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const user = await currentUser();
  let orderId: string | undefined;
  if (d.orderNumber) {
    const o = await db.order.findUnique({ where: { number: d.orderNumber.toUpperCase().replace(/^#/, "") } });
    if (o && (o.email === d.email || (user && o.userId === user.id))) orderId = o.id;
  }
  const t = await db.ticket.create({
    data: {
      number: code("T", 6), accessToken: token(), userId: user?.id, orderId,
      name: d.name, email: d.email, phone: d.phone, category: d.category, subject: d.subject,
      messages: { create: { author: "CUSTOMER", body: d.message } },
    },
  });
  await sendMail(d.email, `We've got your message — ticket ${t.number}`, [
    `Thanks for reaching out, ${d.name.split(" ")[0]}. Our team usually replies within one working day.`,
    `Subject: ${d.subject}`,
  ], { label: "View your ticket", url: ticketUrl(t) });
  await sendMail(config.seller.email, `New support ticket ${t.number}: ${d.subject}`, [`From ${d.name} <${d.email}> · ${TICKET_CATEGORY[d.category]}`, d.message], { label: "Reply in admin", url: `${config.appUrl}/admin/tickets/${t.id}` });
  redirect(`/support/${t.number}?t=${t.accessToken}&new=1`);
}

export async function replyTicket(_: FormState, fd: FormData): Promise<FormState> {
  const t = await db.ticket.findUnique({ where: { number: s(fd, "ticket") } });
  const user = await currentUser();
  const tok = s(fd, "t");
  const allowed = t && ((user && user.id === t.userId) || (tok && safeEqual(tok, t.accessToken)));
  if (!t || !allowed) return { error: "Ticket not found" };
  const body = s(fd, "body").slice(0, 4000);
  if (body.length < 2) return { error: "Write a message first." };
  await db.ticket.update({ where: { id: t.id }, data: { status: "OPEN", messages: { create: { author: "CUSTOMER", body } } } });
  await sendMail(config.seller.email, `Customer replied on ${t.number}`, [`${t.name}: ${body}`], { label: "Reply in admin", url: `${config.appUrl}/admin/tickets/${t.id}` });
  revalidatePath(`/support/${t.number}`);
  return { ok: "Sent" };
}
