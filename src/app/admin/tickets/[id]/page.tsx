import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import { ORDER_STATUS, TICKET_CATEGORY, TICKET_STATUS_ADMIN } from "@/lib/status";
import { Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { ticketReply } from "@/app/actions/admin";

export default async function AdminTicket({ params }: { params: Promise<{ id: string }> }) {
  const t = await db.ticket.findUnique({ where: { id: (await params).id }, include: { messages: { orderBy: { createdAt: "asc" } }, order: { include: { items: true } } } });
  if (!t) notFound();
  const others = await db.order.findMany({ where: { email: t.email, NOT: { status: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 5 });
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="eyebrow"><Link href="/admin/tickets">Support</Link> · {t.number}</p>
          <h1>{t.subject}</h1>
          <div className="row mt-s"><Badge map={TICKET_STATUS_ADMIN} value={t.status} /><span className="small muted">{TICKET_CATEGORY[t.category as keyof typeof TICKET_CATEGORY]} · opened {dateTime(t.createdAt)}</span></div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="thread">
            {t.messages.map((m) => (
              <div key={m.id} className={`msg ${m.author === "ADMIN" ? "me" : "them"}`}>
                {m.body}<small>{m.author === "ADMIN" ? "AyurKesha care" : t.name} · {dateTime(m.createdAt)}</small>
              </div>
            ))}
          </div>
          <div className="divider" />
          <ActionForm action={ticketReply} submit="Send" resetOnOk>
            <input type="hidden" name="ticketId" value={t.id} />
            <label className="field"><span>Reply (emailed to the customer)</span><textarea className="input" name="body" /></label>
            <label className="field"><span>Then set status to</span>
              <select className="input" name="status" defaultValue="AWAITING_CUSTOMER">
                {Object.entries(TICKET_STATUS_ADMIN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </ActionForm>
        </div>
        <div className="stack">
          <div className="card">
            <h2 className="h2">Customer</h2>
            <p><b>{t.name}</b></p>
            <p className="small muted">{t.email}{t.phone && ` · ${t.phone}`}</p>
            {t.phone && <a className="link small" href={`https://wa.me/91${t.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener">WhatsApp</a>}
          </div>
          {t.order && (
            <div className="card">
              <h2 className="h2">Linked order</h2>
              <p><Link className="link" href={`/admin/orders/${t.order.id}`}>{t.order.number}</Link> · {money(t.order.total)}</p>
              <p className="mt-s"><Badge map={ORDER_STATUS} value={t.order.status} /></p>
              <p className="small muted mt-s">{t.order.items.map((i) => `${i.quantity}× ${i.variantName}`).join(", ")}</p>
            </div>
          )}
          {others.length > 0 && (
            <div className="card">
              <h2 className="h2">Orders from this email</h2>
              {others.map((o) => <p key={o.id} className="row between small"><Link className="link" href={`/admin/orders/${o.id}`}>{o.number}</Link><Badge map={ORDER_STATUS} value={o.status} /></p>)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
