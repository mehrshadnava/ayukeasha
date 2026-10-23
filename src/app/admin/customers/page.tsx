import { db } from "@/lib/db";
import { money, dateOnly } from "@/lib/format";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().toLowerCase();
  const groups = await db.order.groupBy({
    by: ["email"],
    where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, ...(term ? { email: { contains: term } } : {}) },
    _count: true,
    _sum: { total: true, refundedAmount: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 300,
  });
  const latest = await db.order.findMany({
    where: { email: { in: groups.map((g) => g.email) } },
    orderBy: { createdAt: "desc" },
    distinct: ["email"],
    select: { email: true, name: true, phone: true, city: true, state: true, userId: true },
  });
  const info = new Map(latest.map((l) => [l.email, l]));
  return (
    <>
      <div className="adm-head">
        <div><p className="eyebrow">People</p><h1>Customers</h1></div>
        <form className="row" action="/admin/customers"><input className="input" name="q" defaultValue={q} placeholder="Search email" style={{ width: 240 }} /><button className="btn btn-ghost btn-sm">Search</button></form>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Location</th><th>Account</th><th className="num">Orders</th><th className="num">Net spent</th><th>Last order</th></tr></thead>
          <tbody>
            {groups.length === 0 && <tr><td colSpan={6} className="muted">No paying customers yet.</td></tr>}
            {groups.map((g) => {
              const c = info.get(g.email);
              return (
                <tr key={g.email}>
                  <td>{c?.name}<div className="small muted">{g.email} · {c?.phone}</div></td>
                  <td className="small">{c?.city}, {c?.state}</td>
                  <td className="small">{c?.userId ? "Registered" : "Guest"}</td>
                  <td className="num">{g._count}</td>
                  <td className="num">{money((g._sum.total ?? 0) - (g._sum.refundedAmount ?? 0))}</td>
                  <td className="small"><a className="link" href={`/admin/orders?q=${encodeURIComponent(g.email)}`}>{g._max.createdAt ? dateOnly(g._max.createdAt) : "—"}</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
