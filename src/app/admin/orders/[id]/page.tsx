import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, dateTime } from "@/lib/format";
import { orderUrl } from "@/lib/orders";
import { shippingMode } from "@/lib/shiprocket";
import { ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS, TICKET_STATUS_ADMIN } from "@/lib/status";
import { Badge } from "@/components/ui";
import { Address, Items, Timeline } from "@/components/OrderParts";
import ActionForm from "@/components/ActionForm";
import { addNote, refundOrder, returnDecision, shipOrder, simulateCourier, syncTracking, updateStatus } from "@/app/actions/admin";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const o = await db.order.findUnique({
    where: { id: (await params).id },
    include: { items: true, events: { orderBy: { createdAt: "desc" } }, returnRequest: true, tickets: true, user: true },
  });
  if (!o) notFound();
  const paid = ["PAID", "PARTIALLY_REFUNDED"].includes(o.paymentStatus);
  const refundable = o.total - o.refundedAmount;
  const canShip = paid && ["CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(o.status) && !o.awbCode;
  const inTransit = ["READY_TO_SHIP", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status);
  const testShip = shippingMode() === "test";
  const rr = o.returnRequest;
  const hid = <input type="hidden" name="orderId" value={o.id} />;

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="eyebrow"><Link href="/admin/orders">Orders</Link></p>
          <h1>{o.number}</h1>
          <div className="row mt-s">
            <Badge map={ORDER_STATUS} value={o.status} /><Badge map={PAYMENT_STATUS} value={o.paymentStatus} />
            <span className="small muted">Placed {dateTime(o.createdAt)}</span>
          </div>
        </div>
        <div className="row">
          {o.paidAt && <a className="btn btn-ghost btn-sm" href={`/invoice/${o.number}`} target="_blank">Invoice</a>}
          <a className="btn btn-ghost btn-sm" href={orderUrl(o)} target="_blank">Customer view</a>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          {rr && (
            <div className="card" style={{ borderColor: "rgba(224,178,92,.5)" }}>
              <div className="row between"><h2 className="h2" style={{ margin: 0 }}>Return request</h2><Badge map={RETURN_STATUS} value={rr.status} /></div>
              <p className="mt-s"><b>{rr.reason}</b></p>
              <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{rr.details}</p>
              {rr.awbCode && <p className="small mt-s">Reverse pickup AWB: <span className="gold">{rr.awbCode}</span></p>}
              {rr.adminNote && <p className="small mt-s">Note to customer: {rr.adminNote}</p>}
              {rr.status === "REQUESTED" && (
                <div className="grid-2e mt">
                  <ActionForm action={returnDecision} submit="Approve & book pickup" small>
                    {hid}<input type="hidden" name="decision" value="approve" />
                    <label className="field"><span>Message to customer (optional)</span><input className="input" name="note" /></label>
                  </ActionForm>
                  <ActionForm action={returnDecision} submit="Decline" variant="danger" small>
                    {hid}<input type="hidden" name="decision" value="reject" />
                    <label className="field"><span>Reason (shown to customer)</span><input className="input" name="note" required /></label>
                  </ActionForm>
                </div>
              )}
              {rr.status === "APPROVED" && (
                <div className="mt"><ActionForm action={returnDecision} submit="Mark package received" small variant="ghost">{hid}<input type="hidden" name="decision" value="received" /></ActionForm></div>
              )}
              {(rr.status === "RECEIVED" || rr.status === "APPROVED") && paid && (
                <div className="mt">
                  <ActionForm action={returnDecision} submit="Refund return" small className="row" confirm="Issue this refund via Razorpay?">
                    {hid}<input type="hidden" name="decision" value="refund" />
                    <label className="field"><span>Amount (₹)</span><input className="input" name="amount" type="number" step="0.01" min="1" max={refundable / 100} defaultValue={refundable / 100} style={{ width: 140 }} /></label>
                  </ActionForm>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h2 className="h2">Fulfilment</h2>
            {o.awbCode ? (
              <dl className="dl">
                <dt>Courier</dt><dd>{o.courierName ?? "—"}</dd>
                <dt>AWB</dt><dd className="gold">{o.awbCode}</dd>
                {o.shiprocketOrderId && <><dt>Shiprocket order</dt><dd>{o.shiprocketOrderId} / shipment {o.shiprocketShipmentId}</dd></>}
                {o.estimatedDelivery && <><dt>ETA</dt><dd>{o.estimatedDelivery}</dd></>}
                <dt>Links</dt>
                <dd className="row">
                  {o.labelUrl && <a className="link" href={o.labelUrl} target="_blank" rel="noopener">Shipping label</a>}
                  {o.trackingUrl && <a className="link" href={o.trackingUrl} target="_blank" rel="noopener">Tracking page</a>}
                </dd>
              </dl>
            ) : <p className="muted small">Not shipped yet.</p>}

            <div className="row mt" style={{ alignItems: "flex-start" }}>
              {canShip && (
                <ActionForm action={shipOrder} submit={testShip ? "Create test shipment" : "Ship with Shiprocket"} className="row">{hid}</ActionForm>
              )}
              {o.awbCode && inTransit && !testShip && (
                <ActionForm action={syncTracking} submit="Refresh tracking" variant="ghost" className="row">{hid}</ActionForm>
              )}
            </div>
            {canShip && <p className="hint mt-s">Creates the order in Shiprocket, assigns the recommended courier, requests pickup from your warehouse and generates the label.</p>}

            {testShip && o.awbCode && inTransit && (
              <div className="notice mt">
                <p className="small"><b>Test mode:</b> simulate courier updates (in live mode these arrive automatically via the Shiprocket webhook).</p>
                <div className="row mt-s">
                  {["PICKED UP", "IN TRANSIT", "OUT FOR DELIVERY", "DELIVERED", "RTO INITIATED"].map((ev) => (
                    <ActionForm key={ev} action={simulateCourier} submit={ev.toLowerCase()} variant="ghost" small className="row">{hid}<input type="hidden" name="event" value={ev} /></ActionForm>
                  ))}
                </div>
              </div>
            )}

            <div className="divider" />
            <ActionForm action={updateStatus} submit="Update status" variant="ghost" small className="fields">
              {hid}
              <label className="field"><span>Set status manually</span>
                <select className="input" name="status" defaultValue={o.status}>
                  {Object.entries(ORDER_STATUS).filter(([k]) => k !== "PENDING_PAYMENT").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="field"><span>Message on timeline (optional)</span><input className="input" name="note" /></label>
            </ActionForm>
            <p className="hint mt-s">Choosing "Cancelled" also cancels the Shiprocket order, restocks items and refunds the customer in full.</p>
          </div>

          <div className="card">
            <h2 className="h2">Timeline</h2>
            <Timeline events={o.events} showInternal />
            <div className="divider" />
            <ActionForm action={addNote} submit="Add internal note" variant="ghost" small resetOnOk>
              {hid}<label className="field"><span>Note (staff only)</span><input className="input" name="note" /></label>
            </ActionForm>
          </div>
        </div>

        <div className="stack">
          <div className="card"><h2 className="h2">Items</h2><Items order={o} items={o.items} /></div>
          <div className="card">
            <h2 className="h2">Customer</h2>
            <Address o={o} />
            <p className="small muted mt-s">{o.user ? `Registered customer (${o.user.email})` : "Guest checkout"}</p>
            <div className="row mt-s">
              <a className="link small" href={`https://wa.me/91${o.phone}`} target="_blank" rel="noopener">WhatsApp</a>
              <a className="link small" href={`tel:+91${o.phone}`}>Call</a>
              <a className="link small" href={`mailto:${o.email}?subject=Your AyurKesha order ${o.number}`}>Email</a>
            </div>
          </div>
          <div className="card">
            <h2 className="h2">Payment</h2>
            <dl className="dl">
              <dt>Razorpay order</dt><dd className="small">{o.razorpayOrderId ?? "—"}</dd>
              <dt>Payment</dt><dd className="small">{o.razorpayPaymentId ?? "—"}</dd>
              <dt>Paid at</dt><dd className="small">{o.paidAt ? dateTime(o.paidAt) : "—"}</dd>
              <dt>Refunded</dt><dd>{money(o.refundedAmount)}</dd>
            </dl>
            {paid && refundable > 0 && (
              <>
                <div className="divider" />
                <ActionForm action={refundOrder} submit="Issue refund" variant="danger" small confirm="Issue this refund via Razorpay? This cannot be undone.">
                  {hid}
                  <div className="fields">
                    <label className="field"><span>Amount (₹)</span><input className="input" name="amount" type="number" step="0.01" min="1" max={refundable / 100} defaultValue={refundable / 100} /></label>
                    <label className="field"><span>Reason</span><input className="input" name="reason" /></label>
                  </div>
                </ActionForm>
              </>
            )}
          </div>
          {o.tickets.length > 0 && (
            <div className="card">
              <h2 className="h2">Tickets</h2>
              {o.tickets.map((t) => <p key={t.id} className="row between small"><Link className="link" href={`/admin/tickets/${t.id}`}>{t.subject}</Link><Badge map={TICKET_STATUS_ADMIN} value={t.status} /></p>)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
