import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { config, shiprocketLive } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { canView } from "@/lib/orders";
import { trackAwb, type TrackEvent } from "@/lib/shiprocket";
import { dateOnly, dateTime } from "@/lib/format";
import { CANCELLABLE, ORDER_STATUS, PAYMENT_STATUS, RETURN_REASONS, RETURN_STATUS, type OrderStatus } from "@/lib/status";
import { Badge } from "@/components/ui";
import { Address, Items, Progress, Timeline } from "@/components/OrderParts";
import ActionForm from "@/components/ActionForm";
import { cancelOrder, requestReturn } from "@/app/actions/customer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; placed?: string }> }) {
  const { number } = await params;
  const { t, placed } = await searchParams;
  const o = await db.order.findUnique({
    where: { number },
    include: { items: true, events: { orderBy: { createdAt: "desc" } }, returnRequest: true, tickets: { orderBy: { createdAt: "desc" } } },
  });
  const user = await currentUser();
  if (!o || !canView(o, user, t)) notFound();

  let scans: TrackEvent[] = [];
  if (o.awbCode && shiprocketLive() && ["READY_TO_SHIP", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status)) {
    try { scans = (await trackAwb(o.awbCode)).events.slice(0, 8); } catch {}
  }

  const paid = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(o.paymentStatus);
  const canCancel = paid && CANCELLABLE.includes(o.status as OrderStatus);
  const returnOpen = o.status === "DELIVERED" && o.deliveredAt && !o.returnRequest && (Date.now() - o.deliveredAt.getTime()) / 86400000 <= config.returnWindowDays;
  const q = t ? `?t=${t}` : "";

  return (
    <div className="wrap">
      <div className="page-head">
        {placed && o.paymentStatus === "PAID" && <p className="notice ok" style={{ marginBottom: 24 }}>Thank you! Your order is confirmed. A confirmation has been sent to {o.email}. Bookmark this page to track your order.</p>}
        <p className="eyebrow">Order {o.number}</p>
        <h1 className="h1 od-title">{ORDER_STATUS[o.status as OrderStatus] ?? o.status}</h1>
        <div className="row">
          <Badge map={PAYMENT_STATUS} value={o.paymentStatus} />
          <span className="muted small">Placed {dateTime(o.createdAt)}</span>
          {o.estimatedDelivery && !["DELIVERED", "CANCELLED", "RTO"].includes(o.status) && <span className="small gold">Expected by {o.estimatedDelivery}</span>}
        </div>
      </div>

      {o.status === "PENDING_PAYMENT" && (
        <p className="notice" style={{ marginBottom: 24 }}>
          {o.paymentStatus === "FAILED" ? "The payment for this order failed." : "Payment for this order wasn't completed."} Your cart is saved — you can <Link className="link" href="/checkout">try checking out again</Link>. If money was debited, it will be confirmed automatically or refunded by your bank within 5–7 days.
        </p>
      )}

      <div className="od">
        <div className="stack">
          <div className="card">
            <Progress status={o.status} />
            {o.awbCode && (
              <div className="notice mt">
                <b>{o.courierName ?? "Courier"}</b> · AWB <span className="gold">{o.awbCode}</span>
                {o.trackingUrl && !o.trackingUrl.includes("/track?") && <> · <a className="link" href={o.trackingUrl} target="_blank" rel="noopener">Live tracking</a></>}
              </div>
            )}
            {scans.length > 0 && (
              <>
                <h3 className="h3 mt">Courier scans</h3>
                <ul className="tl mt-s">{scans.map((s, i) => <li key={i}>{s.activity}{s.location && <span className="muted"> · {s.location}</span>}<time>{s.at}</time></li>)}</ul>
              </>
            )}
            <h3 className="h3 mt">Updates</h3>
            <div className="mt-s"><Timeline events={o.events} /></div>
          </div>

          {o.returnRequest && (
            <div className="card">
              <h2 className="h2">Return</h2>
              <Badge map={RETURN_STATUS} value={o.returnRequest.status} />
              <p className="small mt-s"><b>Reason:</b> {o.returnRequest.reason}</p>
              {o.returnRequest.adminNote && <p className="small mt-s"><b>From our team:</b> {o.returnRequest.adminNote}</p>}
            </div>
          )}

          {returnOpen && (
            <div className="card">
              <h2 className="h2">Something not right?</h2>
              <p className="muted small">You can request a return until {dateOnly(new Date(o.deliveredAt!.getTime() + config.returnWindowDays * 86400000))}.</p>
              <ActionForm action={requestReturn} submit="Request return" className="stack mt">
                <input type="hidden" name="order" value={o.number} /><input type="hidden" name="t" value={t ?? ""} />
                <label className="field"><span>Reason</span>
                  <select className="input" name="reason" required defaultValue=""><option value="" disabled>Choose a reason</option>{RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
                </label>
                <label className="field"><span>What happened?</span><textarea className="input" name="details" required minLength={10} placeholder="Tell us what went wrong. You can share photos on the support ticket we'll open for you." /></label>
              </ActionForm>
            </div>
          )}

          <div className="grid-2e">
            <div className="card">
              <h2 className="h3">Delivering to</h2>
              <Address o={o} />
            </div>
            <div className="card">
              <h2 className="h3">Need help?</h2>
              {o.tickets.map((tk) => <p key={tk.id} className="small"><Link className="link" href={`/support/${tk.number}?t=${tk.accessToken}`}>Ticket {tk.number}</Link> · {tk.subject}</p>)}
              <p className="small muted">Questions about this order? We usually reply within a working day.</p>
              <Link className="btn btn-ghost btn-sm mt-s" href={`/support?order=${o.number}`}>Contact support</Link>
              {canCancel && (
                <details className="od-cancel">
                  <summary>Cancel this order</summary>
                  <ActionForm action={cancelOrder} submit="Cancel order" variant="danger" small confirm="Cancel this order? Your payment will be refunded in full.">
                    <input type="hidden" name="order" value={o.number} /><input type="hidden" name="t" value={t ?? ""} />
                    <label className="field"><span>Reason (optional)</span><input className="input" name="reason" maxLength={300} /></label>
                  </ActionForm>
                </details>
              )}
            </div>
          </div>
        </div>

        <aside className="card od-sum">
          <h2 className="h2">Summary</h2>
          <Items order={o} items={o.items} />
          {paid && <Link className="btn btn-ghost btn-sm btn-block mt" href={`/invoice/${o.number}${q}`} target="_blank">Download invoice</Link>}
        </aside>
      </div>
    </div>
  );
}
