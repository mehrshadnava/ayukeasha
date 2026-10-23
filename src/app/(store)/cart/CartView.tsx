"use client";
import Link from "next/link";
import { useCart, MAX_QTY } from "@/components/Cart";
import { money } from "@/lib/format";

export default function CartView({ shippingFee, freeAbove }: { shippingFee: number; freeAbove: number }) {
  const { lines, ready, subtotal, setQty, remove } = useCart();
  if (!ready) return <p className="muted">Loading your cart…</p>;
  if (!lines.length)
    return (
      <div className="card">
        <p>Your cart is empty.</p>
        <Link href="/shop" className="btn btn-gold mt">Shop the ritual box</Link>
      </div>
    );
  const shipping = subtotal >= freeAbove ? 0 : shippingFee;
  return (
    <div className="grid-2">
      <div className="card">
        {lines.map((l) => (
          <div className="line" key={l.variantId}>
            <div className="thumb"><i style={{ background: l.colorHex }} /></div>
            <div>
              <Link href={`/product/${l.slug}`} className="h3">{l.name}</Link>
              <p className="small muted">{l.variantName} · {money(l.price)} each</p>
              <div className="row mt-s">
                <div className="qty">
                  <button onClick={() => setQty(l.variantId, l.qty - 1)} aria-label="Decrease">−</button>
                  <span>{l.qty}</span>
                  <button onClick={() => setQty(l.variantId, Math.min(MAX_QTY, l.qty + 1))} aria-label="Increase">+</button>
                </div>
                <button className="link small" onClick={() => remove(l.variantId)}>Remove</button>
              </div>
            </div>
            <b className="gold">{money(l.price * l.qty)}</b>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 className="h2">Summary</h2>
        <div className="sum">
          <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div><span>Shipping</span><span>{shipping ? money(shipping) : "Free"}</span></div>
          <div className="tot"><span>Total</span><span>{money(subtotal + shipping)}</span></div>
        </div>
        {shipping > 0 && <p className="hint mt-s">Add {money(freeAbove - subtotal)} more for free shipping.</p>}
        <Link href="/checkout" className="btn btn-gold btn-block mt">Checkout</Link>
        <p className="hint mt-s">Prices include GST. Secure payment via Razorpay.</p>
      </div>
    </div>
  );
}
