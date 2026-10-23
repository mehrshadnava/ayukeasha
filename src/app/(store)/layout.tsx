import Link from "next/link";
import { CartProvider, CartCount } from "@/components/Cart";
import { currentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { paymentMode } from "@/lib/razorpay";
import { shippingMode } from "@/lib/shiprocket";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const testing = paymentMode() === "test" || shippingMode() === "test";
  return (
    <CartProvider>
      {testing && <div className="test-banner">Test mode — payments and shipments are simulated until Razorpay and Shiprocket keys are added.</div>}
      <header className="hdr">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="AyurKesha home"><b>AyurKesha</b><small>आयुरकेशा</small></Link>
          <nav>
            <Link href="/shop" className="opt">Shop</Link>
            <Link href="/track" className="opt">Track order</Link>
            <Link href="/support" className="opt">Help</Link>
            {user?.role === "ADMIN" && <Link href="/admin" className="opt">Admin</Link>}
            <Link href={user ? "/account" : "/login"}>{user ? "Account" : "Sign in"}</Link>
            <Link href="/cart" className="cart-link">Cart <CartCount /></Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="ftr">
        <div className="wrap">
          <div className="ftr-grid">
            <div>
              <div className="brand"><b>AyurKesha</b><small>आयुरकेशा</small></div>
              <p className="mt-s">From leaves, not from labs. Herbal hair colour, made in India.</p>
            </div>
            <div>
              <h6>Shop</h6>
              <ul><li><Link href="/shop">Ritual box</Link></li><li><Link href="/track">Track an order</Link></li><li><Link href="/account">My orders</Link></li></ul>
            </div>
            <div>
              <h6>Help</h6>
              <ul>
                <li><Link href="/support">Contact support</Link></li>
                <li><Link href="/policies/shipping">Shipping</Link></li>
                <li><Link href="/policies/returns">Returns &amp; refunds</Link></li>
              </ul>
            </div>
            <div>
              <h6>Legal</h6>
              <ul>
                <li><Link href="/policies/terms">Terms</Link></li>
                <li><Link href="/policies/privacy">Privacy</Link></li>
                <li><Link href="/policies/contact">Contact us</Link></li>
              </ul>
            </div>
          </div>
          <div className="ftr-base">
            <span>© {new Date().getFullYear()} AyurKesha · Marketed by {config.seller.name}</span>
            <span>Customer care: {config.seller.phone} · {config.seller.email}</span>
          </div>
        </div>
      </footer>
    </CartProvider>
  );
}
