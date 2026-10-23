import Link from "next/link";
import { db } from "@/lib/db";
import { money, dateTime } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/status";
import { Badge } from "@/components/ui";
import { FILTERS, orderWhere } from "./filters";

const PAGE = 50;

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const { status = "all", q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const where = orderWhere(status, q);
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * PAGE, take: PAGE, include: { items: true, returnRequest: true } }),
    db.order.count({ where }),
  ]);
  const qs = (o: Record<string, string>) => "?" + new URLSearchParams({ status, ...(q ? { q } : {}), ...o }).toString();

  return (
    <>
      <div className="adm-head">
        <div><p className="eyebrow">Fulfilment</p><h1>Orders</h1></div>
        <div className="row">
          <form className="row" action="/admin/orders">
            <input type="hidden" name="status" value={status} />
            <input className="input" name="q" defaultValue={q} placeholder="Order no., name, phone, AWB" style={{ width: 260 }} />
            <button className="btn btn-ghost btn-sm">Search</button>
          </form>
          <a className="btn btn-ghost btn-sm" href={`/admin/orders/export${qs({})}`}>Export CSV</a>
        </div>
      </div>
      <div className="filters">
        {Object.entries(FILTERS).map(([k, f]) => <Link key={k} href={`?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="chip" aria-current={status === k ? "page" : undefined}>{f.label}</Link>)}
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Placed</th><th>Status</th><th>Payment</th><th>AWB</th><th className="num">Total</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={8} className="muted">No orders match.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="click">
                <td><Link className="link" href={`/admin/orders/${o.id}`}>{o.number}</Link>{o.returnRequest && <div className="small" style={{ color: "var(--warn)" }}>return</div>}</td>
                <td>{o.name}<div className="small muted">{o.phone} · {o.pincode}</div></td>
                <td className="small">{o.items.map((i) => `${i.quantity}× ${i.variantName}`).join(", ")}</td>
                <td className="small">{dateTime(o.createdAt)}</td>
                <td><Badge map={ORDER_STATUS} value={o.status} /></td>
                <td><Badge map={PAYMENT_STATUS} value={o.paymentStatus} /></td>
                <td className="small">{o.awbCode ?? "—"}</td>
                <td className="num">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row between mt">
        <span className="small muted">{total} orders</span>
        <div className="row">
          {p > 1 && <Link className="btn btn-ghost btn-sm" href={qs({ page: String(p - 1) })}>Previous</Link>}
          {p * PAGE < total && <Link className="btn btn-ghost btn-sm" href={qs({ page: String(p + 1) })}>Next</Link>}
        </div>
      </div>
    </>
  );
}
