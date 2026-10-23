import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { safeEqual } from "@/lib/ids";
import { dateTime } from "@/lib/format";
import { TICKET_CATEGORY, TICKET_STATUS } from "@/lib/status";
import { Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { replyTicket } from "@/app/actions/customer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support ticket", robots: { index: false } };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; new?: string }> }) {
  const { number } = await params;
  const { t, new: isNew } = await searchParams;
  const tk = await db.ticket.findUnique({ where: { number }, include: { messages: { orderBy: { createdAt: "asc" } }, order: true } });
  const user = await currentUser();
  if (!tk || !((user && user.id === tk.userId) || (t && safeEqual(t, tk.accessToken)))) notFound();

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div className="page-head">
        {isNew && <p className="notice ok" style={{ marginBottom: 24 }}>Thanks — we've received your message and emailed you a link to this ticket.</p>}
        <p className="eyebrow">Ticket {tk.number}</p>
        <h1 className="h2" style={{ fontSize: 34, marginTop: 12 }}>{tk.subject}</h1>
        <div className="row mt-s">
          <Badge map={TICKET_STATUS} value={tk.status} />
          <span className="muted small">{TICKET_CATEGORY[tk.category as keyof typeof TICKET_CATEGORY]}</span>
          {tk.order && <Link className="link small" href={`/orders/${tk.order.number}?t=${tk.order.accessToken}`}>Order {tk.order.number}</Link>}
        </div>
      </div>
      <div className="card">
        <div className="thread">
          {tk.messages.map((m) => (
            <div key={m.id} className={`msg ${m.author === "CUSTOMER" ? "me" : "them"}`}>
              {m.body}
              <small>{m.author === "CUSTOMER" ? "You" : "AyurKesha care"} · {dateTime(m.createdAt)}</small>
            </div>
          ))}
        </div>
        {tk.status !== "CLOSED" ? (
          <>
            <div className="divider" />
            <ActionForm action={replyTicket} submit="Send reply" resetOnOk>
              <input type="hidden" name="ticket" value={tk.number} /><input type="hidden" name="t" value={t ?? ""} />
              <label className="field"><span>Your reply</span><textarea className="input" name="body" required /></label>
            </ActionForm>
          </>
        ) : <p className="muted small mt">This ticket is closed. <Link className="link" href="/support">Open a new one</Link> if you need more help.</p>}
      </div>
    </div>
  );
}
