import "server-only";
import { config, shiprocketLive } from "./config";
import { code } from "./ids";
import type { OrderStatus } from "./status";

const API = "https://apiv2.shiprocket.in/v1/external";

let cached: { token: string; exp: number } | null = null;

async function authToken() {
  if (cached && cached.exp > Date.now()) return cached.token;
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: config.shiprocket.email, password: config.shiprocket.password }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`Shiprocket login failed: ${data.message ?? res.statusText}`);
  // Tokens last 10 days; refresh well before that.
  cached = { token: data.token, exp: Date.now() + 8 * 24 * 3600 * 1000 };
  return cached.token;
}

async function sr<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await authToken()}` },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.errors ? JSON.stringify(data.errors) : data?.message ?? res.statusText;
    throw new Error(`Shiprocket ${path}: ${detail}`);
  }
  return data as T;
}

export function shippingMode(): "live" | "test" | "off" {
  if (shiprocketLive()) return "live";
  return config.testModeAllowed ? "test" : "off";
}

export type Serviceability = { serviceable: boolean; etaDays?: number; etd?: string; courier?: string };

export async function checkServiceability(pincode: string, weightKg: number): Promise<Serviceability> {
  // Without Shiprocket there is no real courier data, so don't invent a delivery estimate.
  if (!shiprocketLive()) return { serviceable: true };
  const q = new URLSearchParams({
    pickup_postcode: config.seller.pincode,
    delivery_postcode: pincode,
    weight: String(weightKg),
    cod: "0",
  });
  try {
    const data = await sr(`/courier/serviceability/?${q}`);
    const list: any[] = data?.data?.available_courier_companies ?? [];
    if (!list.length) return { serviceable: false };
    const recId = data?.data?.recommended_courier_company_id;
    const best = list.find((c) => c.courier_company_id === recId) ?? list.sort((a, b) => a.estimated_delivery_days - b.estimated_delivery_days)[0];
    return { serviceable: true, etaDays: Number(best.estimated_delivery_days) || undefined, etd: best.etd, courier: best.courier_name };
  } catch {
    return { serviceable: false };
  }
}

type Pkg = { lengthCm: number; breadthCm: number; heightCm: number; weightKg: number };
type ShipOrder = {
  number: string; createdAt: Date; name: string; email: string; phone: string;
  address1: string; address2: string; city: string; state: string; pincode: string;
  subtotal: number; shippingFee: number;
  items: { productName: string; variantName: string; sku: string; quantity: number; unitPrice: number; hsn: string; gstRate: number }[];
};

const srDate = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");
const splitName = (n: string) => {
  const parts = n.trim().split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(" ") || "." };
};

export type ShipmentResult = {
  shiprocketOrderId: string; shipmentId: string; awbCode?: string; courierName?: string; labelUrl?: string; trackingUrl?: string; warnings: string[];
};

/**
 * Creates the Shiprocket order, assigns a courier/AWB, requests pickup and fetches the label.
 * Pass `existing` to resume from a partly-completed earlier attempt.
 */
export async function createShipment(o: ShipOrder, pkg: Pkg, existing?: { shiprocketOrderId?: string | null; shipmentId?: string | null; awbCode?: string | null }): Promise<ShipmentResult> {
  if (!shiprocketLive()) {
    const awb = code("TEST", 10);
    return {
      shiprocketOrderId: code("SRT", 8), shipmentId: code("SHT", 8), awbCode: awb, courierName: "Test courier",
      trackingUrl: `${config.appUrl}/track?order=${o.number}`, warnings: [],
    };
  }
  const warnings: string[] = [];
  let shiprocketOrderId = existing?.shiprocketOrderId ?? "";
  let shipmentId = existing?.shipmentId ?? "";

  if (!shipmentId) {
    const { first, last } = splitName(o.name);
    const created = await sr("/orders/create/adhoc", {
      body: {
        order_id: o.number,
        order_date: srDate(o.createdAt),
        pickup_location: config.shiprocket.pickupLocation,
        billing_customer_name: first,
        billing_last_name: last,
        billing_address: o.address1,
        billing_address_2: o.address2,
        billing_city: o.city,
        billing_pincode: o.pincode,
        billing_state: o.state,
        billing_country: "India",
        billing_email: o.email,
        billing_phone: o.phone,
        shipping_is_billing: true,
        order_items: o.items.map((i) => ({
          name: `${i.productName} — ${i.variantName}`,
          sku: i.sku,
          units: i.quantity,
          selling_price: i.unitPrice / 100,
          hsn: i.hsn,
        })),
        payment_method: "Prepaid",
        shipping_charges: o.shippingFee / 100,
        sub_total: o.subtotal / 100,
        length: pkg.lengthCm,
        breadth: pkg.breadthCm,
        height: pkg.heightCm,
        weight: pkg.weightKg,
      },
    });
    shiprocketOrderId = String(created.order_id);
    shipmentId = String(created.shipment_id);
  }

  let awbCode = existing?.awbCode ?? undefined;
  let courierName: string | undefined;
  if (!awbCode) {
    const assigned = await sr("/courier/assign/awb", { body: { shipment_id: shipmentId } });
    const d = assigned?.response?.data;
    if (!d?.awb_code) throw new Error(`Shiprocket did not assign an AWB: ${assigned?.message ?? JSON.stringify(assigned)}`);
    awbCode = String(d.awb_code);
    courierName = d.courier_name;
  }

  try {
    await sr("/courier/generate/pickup", { body: { shipment_id: [Number(shipmentId)] } });
  } catch (e) {
    warnings.push(`Pickup request failed — schedule it from the Shiprocket panel. (${(e as Error).message})`);
  }

  let labelUrl: string | undefined;
  try {
    const label = await sr("/courier/generate/label", { body: { shipment_id: [Number(shipmentId)] } });
    labelUrl = label?.label_url || undefined;
  } catch (e) {
    warnings.push(`Label not generated yet — download it from Shiprocket. (${(e as Error).message})`);
  }

  return { shiprocketOrderId, shipmentId, awbCode, courierName, labelUrl, trackingUrl: `https://shiprocket.co/tracking/${awbCode}`, warnings };
}

export async function cancelShipment(shiprocketOrderId: string) {
  if (!shiprocketLive() || shiprocketOrderId.startsWith("SRT")) return;
  await sr("/orders/cancel", { body: { ids: [Number(shiprocketOrderId)] } });
}

export type TrackEvent = { at: string; status: string; activity: string; location?: string };

export async function trackAwb(awb: string): Promise<{ status?: string; etd?: string; events: TrackEvent[] }> {
  if (!shiprocketLive() || awb.startsWith("TEST")) return { events: [] };
  const data = await sr(`/courier/track/awb/${encodeURIComponent(awb)}`);
  const t = data?.tracking_data ?? {};
  const events: TrackEvent[] = (t.shipment_track_activities ?? []).map((a: any) => ({
    at: a.date, status: a["sr-status-label"] || a.status, activity: a.activity, location: a.location,
  }));
  const status = t.shipment_track?.[0]?.current_status;
  return { status, etd: t.etd, events };
}

/** Return pickup from the customer back to our warehouse. */
export async function createReturnShipment(o: ShipOrder, pkg: Pkg) {
  if (!shiprocketLive()) return { shiprocketOrderId: code("SRT", 8), shipmentId: code("SHT", 8), awbCode: code("TESTR", 9) };
  const s = config.seller;
  const created = await sr("/orders/create/return", {
    body: {
      order_id: `${o.number}-R`,
      order_date: srDate(new Date()),
      pickup_customer_name: o.name,
      pickup_address: o.address1,
      pickup_address_2: o.address2,
      pickup_city: o.city,
      pickup_state: o.state,
      pickup_country: "India",
      pickup_pincode: o.pincode,
      pickup_email: o.email,
      pickup_phone: o.phone,
      shipping_customer_name: s.name,
      shipping_address: s.address,
      shipping_city: s.address.split(",").pop()?.trim() || s.state,
      shipping_country: "India",
      shipping_pincode: s.pincode,
      shipping_state: s.state,
      shipping_email: s.email,
      shipping_phone: s.phone,
      order_items: o.items.map((i) => ({ name: `${i.productName} — ${i.variantName}`, sku: i.sku, units: i.quantity, selling_price: i.unitPrice / 100 })),
      payment_method: "PREPAID",
      sub_total: o.subtotal / 100,
      length: pkg.lengthCm,
      breadth: pkg.breadthCm,
      height: pkg.heightCm,
      weight: pkg.weightKg,
    },
  });
  const shipmentId = String(created.shipment_id);
  let awbCode: string | undefined;
  try {
    const a = await sr("/courier/assign/awb", { body: { shipment_id: shipmentId, is_return: 1 } });
    awbCode = a?.response?.data?.awb_code ? String(a.response.data.awb_code) : undefined;
  } catch {
    // Courier can also be assigned from the Shiprocket panel; the webhook will fill the AWB in later.
  }
  return { shiprocketOrderId: String(created.order_id), shipmentId, awbCode };
}

/** Maps Shiprocket's free-text shipment status to our order status. */
export function mapCourierStatus(s: string): OrderStatus | null {
  const v = s.toUpperCase().replace(/_/g, " ").trim();
  if (v.startsWith("RTO")) return "RTO";
  if (v === "DELIVERED") return "DELIVERED";
  if (v.includes("OUT FOR DELIVERY")) return "OUT_FOR_DELIVERY";
  if (["CANCELED", "CANCELLED"].includes(v)) return "CANCELLED";
  if (["PICKED UP", "IN TRANSIT", "SHIPPED", "REACHED AT DESTINATION HUB", "REACHED DESTINATION HUB", "OUT FOR PICKUP"].includes(v) || v.includes("TRANSIT")) {
    return v === "OUT FOR PICKUP" ? "READY_TO_SHIP" : "SHIPPED";
  }
  if (["AWB ASSIGNED", "PICKUP SCHEDULED", "PICKUP GENERATED", "LABEL GENERATED", "MANIFEST GENERATED"].includes(v)) return "READY_TO_SHIP";
  return null;
}
