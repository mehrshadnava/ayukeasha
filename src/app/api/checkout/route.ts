import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config, shippingFor } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { checkoutSchema, fieldErrors, firstError } from "@/lib/validation";
import { createGatewayOrder, paymentMode } from "@/lib/razorpay";
import { addEvent } from "@/lib/orders";
import { code, token } from "@/lib/ids";

export async function POST(req: Request) {
  const mode = paymentMode();
  if (mode === "off") return NextResponse.json({ error: "Online payments are not configured yet. Please contact us on WhatsApp to order." }, { status: 503 });

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error), fields: fieldErrors(parsed.error) }, { status: 400 });
  const d = parsed.data;

  const qtyById = new Map<string, number>();
  for (const i of d.items) qtyById.set(i.variantId, (qtyById.get(i.variantId) ?? 0) + i.qty);

  const variants = await db.variant.findMany({ where: { id: { in: [...qtyById.keys()] }, active: true, product: { active: true } }, include: { product: true } });
  if (variants.length !== qtyById.size) return NextResponse.json({ error: "Some items in your cart are no longer available. Please review your cart." }, { status: 409 });
  for (const v of variants) {
    if (v.stock < qtyById.get(v.id)!) {
      return NextResponse.json({ error: v.stock === 0 ? `${v.name} is sold out.` : `Only ${v.stock} × ${v.name} left in stock.` }, { status: 409 });
    }
  }

  const items = variants.map((v) => ({
    variantId: v.id, productName: v.product.name, variantName: v.name, sku: v.sku,
    unitPrice: v.product.price, quantity: qtyById.get(v.id)!, gstRate: v.product.gstRate, hsn: v.product.hsn,
  }));
  const subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const shippingFee = shippingFor(subtotal);
  const total = subtotal + shippingFee;
  const user = await currentUser();

  let number = code("AK", 7);
  while (await db.order.findUnique({ where: { number } })) number = code("AK", 7);

  const order = await db.order.create({
    data: {
      number, accessToken: token(), userId: user?.id,
      name: d.name, email: d.email, phone: d.phone,
      address1: d.address1, address2: d.address2, city: d.city, state: d.state, pincode: d.pincode,
      subtotal, shippingFee, total,
      items: { create: items },
    },
  });
  await addEvent(order.id, "Order placed, awaiting payment.", { status: "PENDING_PAYMENT", source: "CUSTOMER" });

  try {
    const gw = await createGatewayOrder(total, order.number, { order: order.number });
    await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: gw.id } });
    return NextResponse.json({
      orderNumber: order.number,
      token: order.accessToken,
      mode,
      razorpay: { key: config.razorpay.keyId, orderId: gw.id, amount: total, name: d.name, email: d.email, contact: d.phone },
    });
  } catch (e) {
    console.error(e);
    await addEvent(order.id, `Could not start payment: ${(e as Error).message}`, { internal: true });
    return NextResponse.json({ error: "We couldn't start the payment. Please try again in a minute." }, { status: 502 });
  }
}
