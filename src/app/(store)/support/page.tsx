import { currentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { TICKET_CATEGORY } from "@/lib/status";
import ActionForm from "@/components/ActionForm";
import { createTicket } from "@/app/actions/customer";

export const metadata = { title: "Help & support" };

export default async function Support({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order = "" } = await searchParams;
  const user = await currentUser();
  return (
    <div className="wrap">
      <div className="page-head">
        <p className="eyebrow">Customer care</p>
        <h1 className="h1">How can we <em>help?</em></h1>
        <p className="muted">We usually reply within one working day. For anything urgent, WhatsApp us on <a className="link" href={`https://wa.me/91${config.seller.phone}`}>{config.seller.phone}</a>.</p>
      </div>
      <div className="grid-2">
        <div className="card">
          <ActionForm action={createTicket} submit="Send message">
            <div className="fields">
              <label className="field"><span>Name</span><input className="input" name="name" defaultValue={user?.name} required /></label>
              <label className="field"><span>Email</span><input className="input" type="email" name="email" defaultValue={user?.email} required /></label>
              <label className="field"><span>Phone (optional)</span><input className="input" type="tel" name="phone" defaultValue={user?.phone ?? ""} /></label>
              <label className="field"><span>Order number (optional)</span><input className="input" name="orderNumber" defaultValue={order} /></label>
              <label className="field full"><span>Topic</span>
                <select className="input" name="category" defaultValue={order ? "ORDER" : "PRODUCT"}>
                  {Object.entries(TICKET_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="field full"><span>Subject</span><input className="input" name="subject" required maxLength={140} /></label>
              <label className="field full"><span>Message</span><textarea className="input" name="message" required minLength={10} /></label>
            </div>
          </ActionForm>
        </div>
        <div className="card">
          <h2 className="h2">Quick answers</h2>
          <div className="prose small">
            <p><b className="gold">Where is my order?</b><br />Use <a className="link" href="/track">Track order</a> with your order number and phone.</p>
            <p><b className="gold">Can I cancel?</b><br />Yes, from your order page until it is handed to the courier. You get a full refund.</p>
            <p><b className="gold">Damaged or wrong item?</b><br />Request a return from your order page within {config.returnWindowDays} days of delivery.</p>
            <p><b className="gold">How do I apply it?</b><br />Always do a patch test 48 hours before. Mix one sachet into a paste, rest 15–20 min, apply on washed, dry hair, leave 45 min, rinse.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
