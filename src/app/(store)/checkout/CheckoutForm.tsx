"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/Cart";
import { money } from "@/lib/format";

type Prefill = Record<"name" | "email" | "phone" | "address1" | "address2" | "city" | "state" | "pincode", string>;
type Started = { orderNumber: string; token: string; razorpay: { key: string; orderId: string; amount: number; name: string; email: string; contact: string } };
type Svc = { serviceable: boolean; etaDays?: number; courier?: string } | null;

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: any) => void): void } }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutForm({ prefill, states, mode, shippingFee, freeAbove }: { prefill: Prefill; states: string[]; mode: "live" | "test" | "off"; shippingFee: number; freeAbove: number }) {
  const router = useRouter();
  const { lines, ready, subtotal, clear } = useCart();
  const [f, setF] = useState<Prefill>(prefill);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [svc, setSvc] = useState<Svc>(null);
  const [testPay, setTestPay] = useState<Started | null>(null);

  const shipping = subtotal >= freeAbove ? 0 : shippingFee;
  const set = (k: keyof Prefill) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function checkPin(pin: string) {
    setSvc(null);
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    const r = await fetch(`/api/serviceability?pincode=${pin}`).then((r) => r.json()).catch(() => null);
    if (r && "serviceable" in r) setSvc(r);
  }

  async function verify(started: Started, extra: Record<string, unknown>) {
    const r = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: started.orderNumber, token: started.token, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error ?? "Payment verification failed."); setBusy(false); return; }
    clear();
    router.push(`/orders/${started.orderNumber}?t=${started.token}&placed=1`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setErrs({});
    if (svc && !svc.serviceable) { setError("Sorry, we don't deliver to this pincode yet."); return; }
    setBusy(true);
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error ?? "Something went wrong."); setErrs(j.fields ?? {}); setBusy(false); return; }
    const started = j as Started;

    if (mode === "test") { setTestPay(started); return; }

    if (!(await loadRazorpay()) || !window.Razorpay) { setError("Couldn't load the payment window. Check your connection and try again."); setBusy(false); return; }
    const rz = new window.Razorpay({
      key: started.razorpay.key,
      order_id: started.razorpay.orderId,
      amount: started.razorpay.amount,
      currency: "INR",
      name: "AyurKesha",
      description: `Order ${started.orderNumber}`,
      prefill: { name: started.razorpay.name, email: started.razorpay.email, contact: started.razorpay.contact },
      notes: { order: started.orderNumber },
      theme: { color: "#c9a45c" },
      handler: (resp: Record<string, string>) => verify(started, resp),
      modal: { ondismiss: () => { setBusy(false); setError("Payment was not completed. You can try again."); } },
    });
    rz.on("payment.failed", (resp: any) => setError(resp?.error?.description ?? "Payment failed. Please try another method."));
    rz.open();
  }

  if (!ready) return <p className="muted">Loading…</p>;
  if (!lines.length && !busy && !testPay) return <div className="card"><p>Your cart is empty.</p><Link href="/product/ritual-box" className="btn btn-gold mt">Shop now</Link></div>;

  const fld = (k: keyof Prefill, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, full = false) => (
    <label className={`field${full ? " full" : ""}`}>
      <span>{label}</span>
      <input className="input" value={f[k]} onChange={set(k)} name={k} {...props} />
      {errs[k] && <em className="err">{errs[k]}</em>}
    </label>
  );

  return (
    <form className="grid-2" onSubmit={submit} noValidate>
      <div className="stack">
        <div className="card">
          <h2 className="h2">Contact</h2>
          <div className="fields">
            {fld("name", "Full name", { autoComplete: "name", required: true }, true)}
            {fld("email", "Email", { type: "email", autoComplete: "email", required: true })}
            {fld("phone", "Mobile number", { type: "tel", autoComplete: "tel", inputMode: "numeric", placeholder: "10-digit mobile", required: true })}
          </div>
          <p className="hint mt-s">We'll send order and delivery updates here. The courier may call this number.</p>
        </div>
        <div className="card">
          <h2 className="h2">Delivery address</h2>
          <div className="fields">
            {fld("address1", "House no., building, street", { autoComplete: "address-line1", required: true }, true)}
            {fld("address2", "Area, landmark (optional)", { autoComplete: "address-line2" }, true)}
            <label className="field">
              <span>Pincode</span>
              <input className="input" value={f.pincode} name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" required
                onChange={(e) => { set("pincode")(e); if (e.target.value.length === 6) checkPin(e.target.value); else setSvc(null); }} />
              {errs.pincode && <em className="err">{errs.pincode}</em>}
              {svc && (svc.serviceable
                ? <em className="hint" style={{ color: "var(--ok)" }}>✓ Delivers here{svc.etaDays ? ` in about ${svc.etaDays} days` : ""}</em>
                : <em className="err">Sorry, we can't deliver to this pincode yet.</em>)}
            </label>
            {fld("city", "City", { autoComplete: "address-level2", required: true })}
            <label className="field full">
              <span>State</span>
              <select className="input" value={f.state} onChange={set("state")} name="state" autoComplete="address-level1" required>
                <option value="">Choose state</option>
                {states.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errs.state && <em className="err">{errs.state}</em>}
            </label>
          </div>
        </div>
      </div>

      <div className="card" style={{ position: "sticky", top: 92 }}>
        <h2 className="h2">Your order</h2>
        {lines.map((l) => (
          <div className="row between small" key={l.variantId} style={{ padding: "6px 0" }}>
            <span>{l.qty} × {l.name} · {l.variantName}</span><span>{money(l.qty * l.price)}</span>
          </div>
        ))}
        <div className="divider" />
        <div className="sum">
          <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div><span>Shipping</span><span>{shipping ? money(shipping) : "Free"}</span></div>
          <div className="tot"><span>Total</span><span>{money(subtotal + shipping)}</span></div>
        </div>
        {error && <p className="notice bad mt">{error}</p>}
        {mode === "off"
          ? <p className="notice mt">Online payment is being set up. Please order on <a className="link" href="https://wa.me/919619178792">WhatsApp</a> for now.</p>
          : <button className="btn btn-gold btn-block mt" disabled={busy}>{busy ? "Processing…" : `Pay ${money(subtotal + shipping)}`}</button>}
        <p className="hint mt-s">UPI, cards, netbanking and wallets via Razorpay. By placing the order you agree to our <a className="link" href="/policies/terms">terms</a> and <a className="link" href="/policies/returns">return policy</a>.</p>
      </div>

      {testPay && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}>
          <div className="card" style={{ maxWidth: 420, width: "100%" }}>
            <p className="eyebrow">Test payment</p>
            <h2 className="h2 mt-s">{money(testPay.razorpay.amount)}</h2>
            <p className="muted small mt-s">Razorpay keys aren't configured, so this simulates the payment window. Order {testPay.orderNumber}.</p>
            <div className="row mt">
              <button type="button" className="btn btn-gold" onClick={() => verify(testPay, { test: true })}>Simulate success</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setTestPay(null); setBusy(false); setError("Payment was not completed. You can try again."); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
