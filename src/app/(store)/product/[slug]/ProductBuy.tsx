"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, MAX_QTY } from "@/components/Cart";
import Box3D from "@/components/box3d/Box3D";
import { money } from "@/lib/format";

type V = { id: string; name: string; hindiName: string; colorHex: string; inStock: boolean };
type P = { slug: string; name: string; tagline: string; description: string; price: number; mrp: number; highlights: string[] };

export default function ProductBuy({ product, variants, initialShade, freeShippingAbove, returnDays }: { product: P; variants: V[]; initialShade?: string; freeShippingAbove: string; returnDays: number }) {
  const router = useRouter();
  const { add } = useCart();
  const first = variants.find((v) => v.name.toLowerCase().replace(/\s+/g, "-") === initialShade) ?? variants.find((v) => v.inStock) ?? variants[0];
  const [sel, setSel] = useState<V | undefined>(first);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function addToCart(go: boolean) {
    if (!sel?.inStock) return;
    add({ variantId: sel.id, qty, name: product.name, variantName: sel.name, price: product.price, colorHex: sel.colorHex, slug: product.slug });
    if (go) router.push("/checkout");
    else { setAdded(true); setTimeout(() => setAdded(false), 2400); }
  }

  return (
    <div className="pdp">
      <Box3D shade={sel?.name ?? "Natural Black"} color={sel?.colorHex ?? "#17120f"} />
      <div>
        <p className="eyebrow">{product.tagline}</p>
        <h1 className="h1">{product.name.replace("AyurKesha ", "")}</h1>
        <div className="price"><b>{money(product.price)}</b>{product.mrp > product.price && <s>{money(product.mrp)}</s>}<span className="small muted">incl. of all taxes</span></div>
        <p className="muted mt-s">{product.description}</p>

        <p className="eyebrow mt">Shade · <span className="gold" style={{ letterSpacing: ".1em" }}>{sel?.name}</span></p>
        <div className="shades" role="group" aria-label="Choose shade">
          {variants.map((v) => (
            <button key={v.id} type="button" className="shade" aria-pressed={sel?.id === v.id} disabled={!v.inStock} onClick={() => setSel(v)} title={v.inStock ? v.name : `${v.name} — out of stock`}>
              <i style={{ background: v.colorHex }} />{v.name}{!v.inStock && " · sold out"}
            </button>
          ))}
        </div>

        <div className="row mt">
          <div className="qty" aria-label="Quantity">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} aria-label="Increase">+</button>
          </div>
          <button className="btn btn-ghost" disabled={!sel?.inStock} onClick={() => addToCart(false)}>{added ? "Added ✓" : "Add to cart"}</button>
          <button className="btn btn-gold" disabled={!sel?.inStock} onClick={() => addToCart(true)}>Buy now</button>
        </div>
        {added && <p className="small mt-s">Added to your cart. <a className="link" href="/cart">View cart</a></p>}

        <ul className="ticks">{product.highlights.map((h) => <li key={h}>{h}</li>)}</ul>

        <div className="trust">
          <div><b>Free shipping</b>on orders above {freeShippingAbove}</div>
          <div><b>Secure payment</b>UPI, cards &amp; netbanking via Razorpay</div>
          <div><b>{returnDays}-day returns</b>on damaged or wrong items</div>
        </div>
      </div>
    </div>
  );
}
