import Link from "next/link";
import { db } from "@/lib/db";
import { money, dateTime } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/status";
import { Badge } from "@/components/ui";

const PAID = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"];

export default async function Dashboard() {
  const now = new Date();
  const startToday = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
  const since30 = new Date(now.getTime() - 30 * 86400000);

  const [today, month, byStatus, recent, lowStock, openTickets, pendingReturns] = await Promise.all([
    db.order.aggregate({ where: { paidAt: { gte: startToday }, paymentStatus: { in: PAID } }, _sum: { total: true, refundedAmount: true }, _count: true }),
    db.order.aggregate({ where: { paidAt: { gte: since30 }, paymentStatus: { in: PAID } }, _sum: { total: true, refundedAmount: true }, _count: true }),
    db.order.groupBy({ by: ["status"], _count: true, where: { NOT: { status: "PENDING_PAYMENT" } } }),
    db.order.findMany({ where: { NOT: { status: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.variant.findMany({ where: { active: true, stock: { lte: 10 } }, include: { product: true } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
  ]);
  const net = (a: typeof today) => (a._sum.total ?? 0) - (a._sum.refundedAmount ?? 0);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const toShip = count("CONFIRMED") + count("PROCESSING");
  const inTransit = count("READY_TO_SHIP") + count("SHIPPED") + count("OUT_FOR_DELIVERY");

  return (
    <>
      <div className="adm-head"><div><p className="eyebrow">Overview</p><h1>Dashboard</h1></div></div>
      <div className="kpis">
        <div className="kpi"><span>Sales today</span><b>{money(net(today))}</b><small>{today._count} orders</small></div>
        <div className="kpi"><span>Last 30 days</span><b>{money(net(month))}</b><small>{month._count} orders · net of refunds</small></div>
        <Link href="/admin/orders?status=to-ship" className="kpi"><span>To ship</span><b>{toShip}</b><small>confirmed, not yet shipped</small></Link>
        <Link href="/admin/orders?status=in-transit" className="kpi"><span>In transit</span><b>{inTransit}</b><small>with the courier</small></Link>
        <Link href="/admin/tickets" className="kpi"><span>Open tickets</span><b>{openTickets}</b><small>awaiting our reply</small></Link>
        <Link href="/admin/returns" className="kpi"><span>Returns</span><b>{pendingReturns}</b><small>awaiting decision</small></Link>
      </div>

      {lowStock.length > 0 && (
        <p className="notice bad" style={{ marginBottom: 24 }}>
          Low stock: {lowStock.map((v) => `${v.name} (${v.stock})`).join(", ")}. <Link className="link" href="/admin/products">Update stock</Link>
        </p>
      )}

      <div className="row between" style={{ marginBottom: 12 }}><h2 className="h2">Recent orders</h2><Link className="link small" href="/admin/orders">All orders</Link></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Status</th><th>Payment</th><th className="num">Total</th></tr></thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={6} className="muted">No orders yet.</td></tr>}
            {recent.map((o) => (
              <tr key={o.id} className="click">
                <td><Link className="link" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                <td>{o.name}<div className="small muted">{o.city}</div></td>
                <td className="small">{dateTime(o.createdAt)}</td>
                <td><Badge map={ORDER_STATUS} value={o.status} /></td>
                <td><Badge map={PAYMENT_STATUS} value={o.paymentStatus} /></td>
                <td className="num">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
