import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { paymentMode } from "@/lib/razorpay";
import { shippingMode } from "@/lib/shiprocket";
import { logout } from "@/app/actions/auth";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [toShip, returns, tickets, lowStock] = await Promise.all([
    db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
    db.returnRequest.count({ where: { status: { in: ["REQUESTED", "RECEIVED"] } } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.variant.count({ where: { active: true, stock: { lte: 10 } } }),
  ]);
  const pm = paymentMode(), sm = shippingMode();
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="brand"><b>AyurKesha</b><small>admin</small></Link>
        <AdminNav counts={{ toShip, returns, tickets, lowStock }} />
        <div style={{ marginTop: "auto", padding: "16px 12px 0", fontSize: 12 }} className="muted">
          <p>Payments: <b className={pm === "live" ? "gold" : ""}>{pm === "live" ? "Razorpay" : pm === "test" ? "test mode" : "off"}</b></p>
          <p>Shipping: <b className={sm === "live" ? "gold" : ""}>{sm === "live" ? "Shiprocket" : sm === "test" ? "test mode" : "off"}</b></p>
          <p className="mt-s">{admin.email}</p>
          <div className="row mt-s"><Link href="/shop" className="link">View store</Link><form action={logout}><button className="link">Sign out</button></form></div>
        </div>
      </aside>
      <div className="adm-main">{children}</div>
    </div>
  );
}
