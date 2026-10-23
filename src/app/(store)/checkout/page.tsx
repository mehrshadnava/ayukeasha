import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { config, INDIAN_STATES } from "@/lib/config";
import { paymentMode } from "@/lib/razorpay";
import CheckoutForm from "./CheckoutForm";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await currentUser();
  const last = user ? await db.order.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) : null;
  const prefill = {
    name: last?.name ?? user?.name ?? "",
    email: last?.email ?? user?.email ?? "",
    phone: last?.phone ?? user?.phone ?? "",
    address1: last?.address1 ?? "",
    address2: last?.address2 ?? "",
    city: last?.city ?? "",
    state: last?.state ?? "",
    pincode: last?.pincode ?? "",
  };
  return (
    <div className="wrap">
      <div className="page-head">
        <p className="eyebrow">Checkout</p>
        <h1 className="h1">Where should we <em>send it?</em></h1>
        {!user && <p className="muted">Have an account? <a className="link" href="/login?next=/checkout">Sign in</a> to track all your orders in one place — or continue as a guest.</p>}
      </div>
      <CheckoutForm prefill={prefill} states={INDIAN_STATES} mode={paymentMode()} shippingFee={config.shippingFee} freeAbove={config.freeShippingAbove} />
    </div>
  );
}
