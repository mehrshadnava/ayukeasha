import type { Order, OrderEvent, OrderItem } from "@prisma/client";
import { money, dateTime } from "@/lib/format";
import { FULFILMENT_STEPS, ORDER_STATUS } from "@/lib/status";

export function Progress({ status }: { status: string }) {
  if (["CANCELLED", "RTO", "PENDING_PAYMENT"].includes(status)) return null;
  const idx = FULFILMENT_STEPS.indexOf(status as (typeof FULFILMENT_STEPS)[number]);
  return (
    <div className="steps" aria-label={`Status: ${ORDER_STATUS[status as keyof typeof ORDER_STATUS]}`}>
      {FULFILMENT_STEPS.map((s, i) => <div key={s} className={`${i <= idx ? "done" : ""} ${i === idx ? "cur" : ""}`}>{ORDER_STATUS[s]}</div>)}
    </div>
  );
}

export function Timeline({ events, showInternal = false }: { events: OrderEvent[]; showInternal?: boolean }) {
  const list = events.filter((e) => showInternal || !e.internal);
  if (!list.length) return <p className="muted small">No updates yet.</p>;
  return (
    <ul className="tl">
      {list.map((e) => (
        <li key={e.id} className={e.internal ? "int" : ""}>
          {e.message}
          {e.location && <span className="muted"> · {e.location}</span>}
          <time>{dateTime(e.createdAt)}{showInternal && ` · ${e.source.toLowerCase()}${e.internal ? " · internal" : ""}`}</time>
        </li>
      ))}
    </ul>
  );
}

export function Items({ order, items }: { order: Order; items: OrderItem[] }) {
  return (
    <>
      {items.map((i) => (
        <div className="row between" key={i.id} style={{ padding: "8px 0" }}>
          <span>{i.quantity} × {i.productName} <span className="muted">· {i.variantName}</span></span>
          <span>{money(i.unitPrice * i.quantity)}</span>
        </div>
      ))}
      <div className="divider" />
      <div className="sum">
        <div><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
        <div><span>Shipping</span><span>{order.shippingFee ? money(order.shippingFee) : "Free"}</span></div>
        <div className="tot"><span>Total</span><span>{money(order.total)}</span></div>
        {order.refundedAmount > 0 && <div className="small"><span>Refunded</span><span>−{money(order.refundedAmount)}</span></div>}
      </div>
    </>
  );
}

export function Address({ o }: { o: Order }) {
  return (
    <p className="small" style={{ lineHeight: 1.7 }}>
      <b>{o.name}</b><br />{o.address1}{o.address2 && <>, {o.address2}</>}<br />{o.city}, {o.state} {o.pincode}<br />
      <span className="muted">{o.phone} · {o.email}</span>
    </p>
  );
}
