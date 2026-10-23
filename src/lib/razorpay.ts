import "server-only";
import { createHmac } from "crypto";
import { config, razorpayLive } from "./config";
import { safeEqual, code } from "./ids";

const API = "https://api.razorpay.com/v1";

async function call<T>(path: string, body: unknown): Promise<T> {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${path}: ${data?.error?.description ?? res.statusText}`);
  return data as T;
}

export function paymentMode(): "live" | "test" | "off" {
  if (razorpayLive()) return "live";
  return config.testModeAllowed ? "test" : "off";
}

export async function createGatewayOrder(amount: number, receipt: string, notes: Record<string, string>) {
  if (!razorpayLive()) return { id: code("test_order_", 14) };
  return call<{ id: string }>("/orders", { amount, currency: "INR", receipt, notes });
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!config.razorpay.webhookSecret) return false;
  const expected = createHmac("sha256", config.razorpay.webhookSecret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function refundPayment(paymentId: string, amount: number, notes: Record<string, string> = {}) {
  if (!razorpayLive() || paymentId.startsWith("test_")) return { id: code("test_rfnd_", 14), amount };
  return call<{ id: string; amount: number }>(`/payments/${paymentId}/refund`, { amount, notes });
}
