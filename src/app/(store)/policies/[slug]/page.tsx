import { notFound } from "next/navigation";
import { config } from "@/lib/config";
import { money } from "@/lib/format";

type Policy = { title: string; body: { h?: string; p: string[] }[] };

function policies(): Record<string, Policy> {
  const s = config.seller;
  const contact = `${s.name}, ${s.address}, ${s.state} ${s.pincode}. Phone / WhatsApp: ${s.phone}. Email: ${s.email}.`;
  return {
    shipping: {
      title: "Shipping policy",
      body: [
        { p: [`We ship across India through our courier partners (via Shiprocket). Orders are packed and handed to the courier within 1–2 working days of payment.`] },
        { h: "Delivery time", p: ["Most metro cities receive orders in 2–5 working days; other locations may take 5–8 working days. The estimated delivery date is shown at checkout and on your order page."] },
        { h: "Shipping charges", p: [`Shipping is free on orders of ${money(config.freeShippingAbove)} and above. Below that a flat fee of ${money(config.shippingFee)} applies, shown before you pay.`] },
        { h: "Tracking", p: ["You'll receive an email with your tracking number once your order ships. You can also track it any time from the Track order page using your order number and phone number."] },
        { h: "Unsuccessful delivery", p: ["If the courier is unable to deliver after multiple attempts, the package returns to us and we will contact you to reship or refund (less the shipping charges)."] },
      ],
    },
    returns: {
      title: "Returns & refunds",
      body: [
        { p: ["Because AyurKesha is a personal-care product, we cannot accept returns of opened sachets for reasons of hygiene. We will gladly help if something has gone wrong with your order."] },
        { h: "Eligible returns", p: [`Request a return within ${config.returnWindowDays} days of delivery if your order arrived damaged, leaking, incomplete, expired, or with the wrong shade. Use the "Request return" option on your order page, or contact support. Photos help us resolve things quickly.`] },
        { h: "Process", p: ["Once approved, we arrange a free reverse pickup from your address. After the returned item reaches us and is inspected, we issue the refund — or a replacement if you prefer."] },
        { h: "Cancellations", p: ["You can cancel an order from your order page until it is handed to the courier. Cancelled orders are refunded in full."] },
        { h: "Refund timelines", p: ["Refunds are made to the original payment method via Razorpay. Banks usually take 5–7 working days to credit the amount."] },
      ],
    },
    terms: {
      title: "Terms & conditions",
      body: [
        { p: [`This website is operated by ${s.name}. By placing an order you agree to these terms.`] },
        { h: "Products", p: ["AyurKesha is a herbal hair colour for external use only. Always carry out the allergy patch test 48 hours before every use as described on the pack. Results vary with hair type, previous treatments and application."] },
        { h: "Pricing & payment", p: ["All prices are in Indian Rupees and include GST. Payments are processed securely by Razorpay; we do not store your card or bank details."] },
        { h: "Orders", p: ["We may cancel an order if a product is out of stock, the delivery address is not serviceable, or we suspect fraud. In such cases you will receive a full refund."] },
        { h: "Liability", p: ["Our liability for any order is limited to the amount paid for that order."] },
        { h: "Governing law", p: [`These terms are governed by the laws of India, with courts at ${s.state} having jurisdiction.`] },
      ],
    },
    privacy: {
      title: "Privacy policy",
      body: [
        { p: ["We collect only what we need to deliver your order and support you: your name, contact details, delivery address and order history."] },
        { h: "How we use it", p: ["To process and deliver orders, send order updates, respond to support requests, and meet legal and tax requirements. We do not sell your data."] },
        { h: "Who we share it with", p: ["Razorpay (payments), Shiprocket and its courier partners (delivery), and our email provider (order notifications) — only as needed to provide the service."] },
        { h: "Cookies", p: ["We use a sign-in cookie to keep you logged in and store your cart in your browser. We do not use advertising cookies."] },
        { h: "Your choices", p: [`To access, correct or delete your data, write to ${s.email}.`] },
      ],
    },
    contact: {
      title: "Contact us",
      body: [
        { p: [contact] },
        { p: ["Customer care hours: Monday to Saturday, 10 am – 6 pm IST.", "Manufactured by Cosmo International, Bhatinda (Mfg. Lic. No. 94-COS-PB)."] },
      ],
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: policies()[(await params).slug]?.title ?? "Policy" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = policies()[(await params).slug];
  if (!p) notFound();
  return (
    <div className="wrap">
      <div className="page-head"><p className="eyebrow">AyurKesha</p><h1 className="h1">{p.title}</h1></div>
      <div className="prose">
        {p.body.map((b, i) => (
          <section key={i}>{b.h && <h2>{b.h}</h2>}{b.p.map((x, j) => <p key={j}>{x}</p>)}</section>
        ))}
      </div>
    </div>
  );
}
