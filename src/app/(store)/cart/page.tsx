import { config } from "@/lib/config";
import CartView from "./CartView";

export const metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="wrap">
      <div className="page-head">
        <p className="eyebrow">Your cart</p>
        <h1 className="h1">Almost <em>yours.</em></h1>
      </div>
      <CartView shippingFee={config.shippingFee} freeAbove={config.freeShippingAbove} />
    </div>
  );
}
