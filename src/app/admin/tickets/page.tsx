import Link from "next/link";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { TICKET_CATEGORY, TICKET_STATUS_ADMIN } from "@/lib/status";
import { Badge } from "@/components/ui";

export default async function Tickets({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "OPEN" } = await searchParams;
  const tickets = await db.ticket.findMany({
    where: status === "all" ? {} : { status },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { order: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return (
    <>
      <div className="adm-head"><div><p className="eyebrow">After-sales</p><h1>Support tickets</h1></div></div>
      <div className="filters">
        {[...Object.entries(TICKET_STATUS_ADMIN), ["all", "All"]].map(([k, l]) => <Link key={k} href={`?status=${k}`} className="chip" aria-current={status === k ? "page" : undefined}>{l}</Link>)}
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Ticket</th><th>Subject</th><th>Customer</th><th>Topic</th><th>Order</th><th>Last activity</th><th>Status</th></tr></thead>
          <tbody>
            {tickets.length === 0 && <tr><td colSpan={7} className="muted">Nothing here — all caught up.</td></tr>}
            {tickets.map((t) => (
              <tr key={t.id} className="click">
                <td><Link className="link" href={`/admin/tickets/${t.id}`}>{t.number}</Link></td>
                <td>{t.subject}<div className="small muted">{t.messages[0]?.author === "CUSTOMER" ? "Customer wrote last" : "We replied last"}</div></td>
                <td>{t.name}<div className="small muted">{t.email}</div></td>
                <td className="small">{TICKET_CATEGORY[t.category as keyof typeof TICKET_CATEGORY]}</td>
                <td className="small">{t.order ? <Link className="link" href={`/admin/orders/${t.order.id}`}>{t.order.number}</Link> : "—"}</td>
                <td className="small">{dateTime(t.updatedAt)}</td>
                <td><Badge map={TICKET_STATUS_ADMIN} value={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
