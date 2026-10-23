import ActionForm from "@/components/ActionForm";
import { trackOrder } from "@/app/actions/customer";

export const metadata = { title: "Track your order" };

export default async function Track({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order = "" } = await searchParams;
  return (
    <div className="wrap auth">
      <p className="eyebrow">Track</p>
      <h1 className="h1">Where's my <em>order?</em></h1>
      <p className="muted">Enter the order number from your confirmation email and the phone number or email you ordered with.</p>
      <div className="card mt">
        <ActionForm action={trackOrder} submit="Track order">
          <label className="field"><span>Order number</span><input className="input" name="order" defaultValue={order} placeholder="e.g. AK7XK2P9Q" required /></label>
          <label className="field"><span>Phone or email</span><input className="input" name="contact" required /></label>
        </ActionForm>
      </div>
    </div>
  );
}
