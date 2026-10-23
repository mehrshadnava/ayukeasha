import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, dateOnly } from "@/lib/format";
import { ORDER_STATUS, TICKET_STATUS } from "@/lib/status";
import { Badge } from "@/components/ui";
import { logout } from "@/app/actions/auth";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await requireUser("/account");
  const [orders, tickets] = await Promise.all([
    db.order.findMany({ where: { userId: user.id, NOT: { status: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    db.ticket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="wrap">
      <div className="page-head row between" style={{ alignItems: "flex-end" }}>
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="h1">Namaste, <em>{user.name.split(" ")[0]}.</em></h1>
          <p className="muted">{user.email}</p>
        </div>
        <form action={logout}><button className="btn btn-ghost btn-sm">Sign out</button></form>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 className="h2">Orders</h2>
          {orders.length === 0 ? (
            <p className="muted">No orders yet. <Link className="link" href="/product/ritual-box">Shop the ritual box</Link>.</p>
          ) : (
            orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.number}`} className="line" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <b>{o.number}</b> <span className="muted small">· {dateOnly(o.createdAt)}</span>
                  <p className="small muted">{o.items.map((i) => `${i.quantity} × ${i.variantName}`).join(", ")}</p>
                </div>
                <div className="right"><Badge map={ORDER_STATUS} value={o.status} /><p className="small gold mt-s">{money(o.total)}</p></div>
              </Link>
            ))
          )}
        </div>
        <div className="card">
          <h2 className="h2">Support tickets</h2>
          {tickets.length === 0 ? <p className="muted small">No tickets.</p> : tickets.map((t) => (
            <p key={t.id} className="row between small" style={{ padding: "6px 0" }}>
              <Link className="link" href={`/support/${t.number}`}>{t.subject}</Link><Badge map={TICKET_STATUS} value={t.status} />
            </p>
          ))}
          <Link href="/support" className="btn btn-ghost btn-sm mt">New ticket</Link>
        </div>
      </div>
    </div>
  );
}
