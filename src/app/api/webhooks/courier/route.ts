import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { safeEqual } from "@/lib/ids";
import { addEvent, applyCourierStatus } from "@/lib/orders";

// Shiprocket tracking webhook. Shiprocket rejects URLs containing "shiprocket", "sr" or "kr", hence /courier.
export async function POST(req: Request) {
  const expected = config.shiprocket.webhookToken;
  if (!expected || !safeEqual(req.headers.get("x-api-key") ?? "", expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const p = await req.json().catch(() => null);
  if (!p) return NextResponse.json({ ok: true });

  const awb = p.awb ? String(p.awb) : "";
  const status: string = p.current_status ?? p.shipment_status ?? "";
  const location: string | undefined = p.scans?.at?.(-1)?.location ?? undefined;
  const isReturn = Number(p.is_return) === 1;

  if (isReturn) {
    const or: { awbCode?: string; shiprocketOrderId?: string }[] = [];
    if (awb) or.push({ awbCode: awb });
    if (p.sr_order_id) or.push({ shiprocketOrderId: String(p.sr_order_id) });
    const rr = or.length ? await db.returnRequest.findFirst({ where: { OR: or } }) : null;
    if (rr) {
      if (awb && !rr.awbCode) await db.returnRequest.update({ where: { id: rr.id }, data: { awbCode: awb } });
      await addEvent(rr.orderId, `Return pickup update: ${status}`, { source: "COURIER", location });
      if (status.toUpperCase() === "DELIVERED" && rr.status === "APPROVED") {
        await db.returnRequest.update({ where: { id: rr.id }, data: { status: "RECEIVED" } });
        await addEvent(rr.orderId, "Returned package received at our warehouse. Refund will be processed after inspection.", { source: "COURIER" });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const or: { awbCode?: string; number?: string }[] = [];
  if (awb) or.push({ awbCode: awb });
  if (p.order_id) or.push({ number: String(p.order_id).split("_")[0] });
  const order = or.length ? await db.order.findFirst({ where: { OR: or } }) : null;
  if (!order) return NextResponse.json({ ok: true });

  if (awb && !order.awbCode) {
    await db.order.update({ where: { id: order.id }, data: { awbCode: awb, courierName: p.courier_name ?? order.courierName, trackingUrl: `https://shiprocket.co/tracking/${awb}` } });
  }
  if (p.etd) await db.order.update({ where: { id: order.id }, data: { estimatedDelivery: String(p.etd) } });
  if (status) await applyCourierStatus(order.id, status, location);
  return NextResponse.json({ ok: true });
}
