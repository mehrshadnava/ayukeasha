import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { canView } from "@/lib/orders";
import { dateOnly } from "@/lib/format";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false } };

const r = (paise: number) => (paise / 100).toFixed(2);

export default async function Invoice({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const o = await db.order.findUnique({ where: { number: (await params).number }, include: { items: true } });
  if (!o || !o.paidAt || !canView(o, await currentUser(), (await searchParams).t)) notFound();
  const s = config.seller;
  const intra = o.state === s.state;

  const lines = o.items.map((i) => ({ desc: `${i.productName} — ${i.variantName}`, hsn: i.hsn, qty: i.quantity, rate: i.gstRate, gross: i.unitPrice * i.quantity }));
  if (o.shippingFee) lines.push({ desc: "Shipping charges", hsn: "996812", qty: 1, rate: o.items[0].gstRate, gross: o.shippingFee });
  const rows = lines.map((l) => {
    const taxable = Math.round((l.gross * 100) / (100 + l.rate));
    return { ...l, taxable, tax: l.gross - taxable };
  });
  const tot = rows.reduce((a, x) => ({ taxable: a.taxable + x.taxable, tax: a.tax + x.tax, gross: a.gross + x.gross }), { taxable: 0, tax: 0, gross: 0 });

  return (
    <div style={{ background: "#efe9dc", minHeight: "100vh", padding: "1px 16px" }}>
      <div className="inv">
        <div className="inv-top">
          <div>
            <h1>Tax Invoice</h1>
            <p><b>{s.name}</b><br />{s.address}, {s.state} {s.pincode}<br />{s.gstin ? <>GSTIN: {s.gstin}<br /></> : null}{s.email} · {s.phone}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p><b>Invoice no.:</b> INV-{o.number}<br /><b>Order no.:</b> {o.number}<br /><b>Date:</b> {dateOnly(o.paidAt)}<br /><b>Place of supply:</b> {o.state}</p>
          </div>
        </div>
        <p style={{ marginTop: 18 }}><b>Bill / Ship to:</b><br />{o.name}<br />{o.address1}{o.address2 && `, ${o.address2}`}<br />{o.city}, {o.state} {o.pincode}<br />{o.phone}</p>
        <table>
          <thead>
            <tr><th>Description</th><th>HSN/SAC</th><th className="r">Qty</th><th className="r">Taxable (₹)</th>{intra ? <><th className="r">CGST (₹)</th><th className="r">SGST (₹)</th></> : <th className="r">IGST (₹)</th>}<th className="r">Total (₹)</th></tr>
          </thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={i}>
                <td>{x.desc}</td><td>{x.hsn}</td><td className="r">{x.qty}</td><td className="r">{r(x.taxable)}</td>
                {intra ? <><td className="r">{r(Math.floor(x.tax / 2))} <small>@{x.rate / 2}%</small></td><td className="r">{r(x.tax - Math.floor(x.tax / 2))} <small>@{x.rate / 2}%</small></td></> : <td className="r">{r(x.tax)} <small>@{x.rate}%</small></td>}
                <td className="r">{r(x.gross)}</td>
              </tr>
            ))}
            <tr>
              <th colSpan={3}>Total</th><th className="r">{r(tot.taxable)}</th>
              {intra ? <><th className="r">{r(Math.floor(tot.tax / 2))}</th><th className="r">{r(tot.tax - Math.floor(tot.tax / 2))}</th></> : <th className="r">{r(tot.tax)}</th>}
              <th className="r">{r(tot.gross)}</th>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 14 }}>Amount paid online via Razorpay{o.razorpayPaymentId ? ` (${o.razorpayPaymentId})` : ""}: <b>₹{r(o.total)}</b>{o.refundedAmount > 0 && <> · Refunded: ₹{r(o.refundedAmount)}</>}</p>
        <p style={{ marginTop: 24, fontSize: 11, color: "#666" }}>This is a computer-generated invoice and does not require a signature.</p>
        <div className="no-print" style={{ marginTop: 20 }}><PrintButton /></div>
      </div>
    </div>
  );
}
