import Link from "next/link";
import { db } from "@/lib/db";
import { money, dateTime } from "@/lib/format";
import { RETURN_STATUS } from "@/lib/status";
import { Badge } from "@/components/ui";

export default async function Returns({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const where = status === "open" ? { status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } : status === "all" ? {} : { status };
  const list = await db.returnRequest.findMany({ where, orderBy: { createdAt: "desc" }, include: { order: true }, take: 200 });
  const chips: [string, string][] = [["open", "Open"], ["REQUESTED", "Awaiting decision"], ["APPROVED", "Pickup booked"], ["RECEIVED", "Received"], ["REFUNDED", "Refunded"], ["REJECTED", "Declined"], ["all", "All"]];
  return (
    <>
      <div className="adm-head"><div><p className="eyebrow">After-sales</p><h1>Returns</h1></div></div>
      <div className="filters">{chips.map(([k, l]) => <Link key={k} href={`?status=${k}`} className="chip" aria-current={status === k ? "page" : undefined}>{l}</Link>)}</div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Order</th><th>Customer</th><th>Reason</th><th>Requested</th><th>Status</th><th className="num">Order total</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="muted">No returns here.</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="click">
                <td><Link className="link" href={`/admin/orders/${r.orderId}`}>{r.order.number}</Link></td>
                <td>{r.order.name}<div className="small muted">{r.order.phone}</div></td>
                <td className="small">{r.reason}</td>
                <td className="small">{dateTime(r.createdAt)}</td>
                <td><Badge map={RETURN_STATUS} value={r.status} /></td>
                <td className="num">{money(r.order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
