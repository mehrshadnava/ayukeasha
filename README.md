# AyurKesha platform

Storefront, checkout, order management, delivery and after-sales for AyurKesha — one Next.js app.

- **Store:** landing page (`public/landing.html`), shop, product with shades, cart, checkout with pincode check, guest or account checkout
- **Payments:** Razorpay (UPI, cards, netbanking) with signature verification and webhook backup; full and partial refunds
- **Delivery:** Shiprocket — shipment creation, courier/AWB assignment, pickup, labels, live tracking via webhook, reverse pickups for returns
- **After-sales:** order tracking, customer cancellation (auto-refund + restock), return requests, support tickets with email replies, GST invoices
- **Admin (`/admin`):** dashboard, orders (filter, search, CSV export), fulfilment, returns, tickets, stock and pricing, customers

## Run locally

```bash
npm install
cp .env.example .env      # fill DATABASE_URL + DIRECT_URL (Neon dev branch), AUTH_SECRET, ADMIN_PASSWORD
npm run setup             # creates the tables, product and admin user
npm run dev               # http://localhost:3000  (admin at /admin)
```

With no Razorpay/Shiprocket keys and `ALLOW_TEST_MODE="true"`, payments and shipments are simulated, and the admin order page has buttons to simulate courier updates. Emails print to the console until SMTP is set.

## Going live — checklist

1. **Database:** a Neon Postgres project (production branch). With its pooled/direct strings in `.env`, run `npm run setup` once from your PC to create tables, product and admin.
2. **Hosting:** Netlify project `ayurkeshaa`, deploying from `main` of github.com/mehrshadnava/ayukeasha. Build settings live in `netlify.toml`. Add every variable from `.env.example` under Project configuration → Environment variables (Import from a .env file). Set `ALLOW_TEST_MODE="false"` and, once on your own domain, `APP_URL`. Pull requests get a Deploy Preview URL before anything goes live.
3. **Razorpay:** complete KYC, then Settings → API Keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). Add webhook `{APP_URL}/api/webhooks/razorpay` for `payment.captured`, `payment.failed`, `refund.processed`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. Keep payment capture on *automatic*.
4. **Shiprocket:** add your pickup address (its nickname → `SHIPROCKET_PICKUP_LOCATION`), create an API user under Settings → API (`SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`), add webhook `{APP_URL}/api/webhooks/courier` with token = `SHIPROCKET_WEBHOOK_TOKEN`. Recharge the wallet.
5. **Email:** set `SMTP_*` (e.g. Zoho Mail, Google Workspace, Amazon SES, Resend SMTP).
6. **Review:** policies in `src/app/(store)/policies/[slug]/page.tsx`, GST rate/HSN and box weight/size in Admin → Products, `SELLER_GSTIN`.
7. Place one real low-value order end to end, ship it, and refund it, before announcing.
