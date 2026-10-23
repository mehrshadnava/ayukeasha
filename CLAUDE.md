# AyurKesha platform — guide for Claude

D2C e-commerce platform for **AyurKesha**, an Indian herbal hair-colour brand. One Next.js app handles the storefront, checkout and payments (Razorpay), delivery (Shiprocket), after-sales (cancellations, returns, refunds, support tickets) and an admin back office.

Read this before changing anything. `README.md` covers setup and the go-live checklist for humans.

## Business context

- **Product:** "AyurKesha Ritual Box": 3 × 40 g herbal sachets, gloves, comb, shower cap. ₹249 MRP including GST. Four shades (variants): Natural Black, Dark Brown, Brown, Burgundy. Seeded by `prisma/seed.ts` (slug `ritual-box`, SKUs `AK-RB3-*`).
- **Seller:** marketed by Aditya Enterprises, Sector-12, Kharghar, Navi Mumbai, Maharashtra 410210; manufactured by Cosmo International, Bhatinda. Customer care 9619178792, customercare@ayurkesha.com. These details come from env vars (`SELLER_*`) and appear on invoices, emails, policies and Shiprocket return pickups.
- **Market:** India only. Prices in INR, Indian 10-digit mobiles, 6-digit pincodes, Indian states list, GST invoices.
- **Owner's decisions (2026-10-23):** Next.js full-stack, Razorpay only (no Cash on Delivery), Shiprocket for shipping, full scope from day one.

## Folder layout (parent `ayurkesha/`)

```
ayurkesha/
├─ platform/            ← this app; git repo → github.com/mehrshadnava/ayukeasha (Netlify project "ayurkeshaa")
├─ site/                ← OLD checkout of the same repo holding only the static landing page; superseded, don't edit
├─ .claude/launch.json  ← dev-server config for the desktop preview ("ayurkesha" → npm --prefix platform run dev)
└─ *.pdf, glitch.mp4    ← packaging artwork (pouch, box, comb cover, thank-you card)
```

`site/index.html` was copied into `platform/public/landing.html` and edited there (order buttons → `/product/ritual-box`, nav/footer links to track/support/policies). The two copies are now separate; edit `platform/public/landing.html`.

## Stack (versions pinned on purpose)

| Piece | Version | Notes |
|---|---|---|
| Next.js (App Router) | 15.5.28 | `params` / `searchParams` / `cookies()` are **async** (await them) |
| React | 19.1.1 | `useActionState`; see the form rule below |
| Prisma | 6.19.3 | **Keep 6.x.** Prisma 7 needs driver adapters and `prisma.config.ts` |
| Zod | 3.25.76 | v3 API (`errorMap`, `.flatten()`) |
| jose | 5.10.0 | JWT sessions |
| bcryptjs, nodemailer, server-only | — | |
| TypeScript | 5.8, `strict` | path alias `@/*` → `src/*` |

No Tailwind, no UI library: all styling is hand-written CSS in `src/app/globals.css`. No ESLint is configured.

## Commands (run inside `platform/`)

```bash
npm run dev         # http://localhost:3000, admin at /admin
npm run build       # prisma generate + next build (run before claiming a change works)
npm run typecheck   # tsc --noEmit
npm run setup       # prisma db push + seed (product, 4 variants, admin user)
npm run db:push     # apply schema changes (no migrations folder; db push workflow)
npm run db:seed     # idempotent upserts; re-running resets the admin password to ADMIN_PASSWORD
```

**npm on this machine blocks install scripts** (npm 11 `allowScripts`). After a fresh `npm install`, approve them: `npm install-scripts approve @prisma/client @prisma/engines esbuild prisma && npm rebuild`. Without this, Prisma has no engine and `tsx` can't run the seed.

## Environment (`.env`, gitignored; template in `.env.example`)

- `DATABASE_URL` / `DIRECT_URL`: Neon Postgres pooled string (host contains `-pooler`) and direct string. Use a separate Neon branch for local dev so test orders never reach production. The old `prisma/dev.db` SQLite file is unused.
- `APP_URL`: used in emails, order links and the courier tracking fallback.
- `AUTH_SECRET`: at least 32 characters, or `auth.ts` throws.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: the seed creates or updates this admin. The local password is random and lives only in `.env`; never print it in chat.
- `SHIPPING_FEE_INR=49`, `FREE_SHIPPING_ABOVE_INR=450` (two boxes = ₹498 ships free), `RETURN_WINDOW_DAYS=7`.
- `SELLER_*`: business details, including `SELLER_GSTIN` (empty for now) and `SELLER_STATE` (decides CGST+SGST vs IGST).
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION` (must equal the pickup nickname in the Shiprocket panel), `SHIPROCKET_WEBHOOK_TOKEN`.
- `ALLOW_TEST_MODE`: `"true"` locally; must be `"false"` in production.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: without `SMTP_HOST`, emails are `console.log`ged as `[mail] …`.

All env access goes through `src/lib/config.ts` (`config`, `razorpayLive()`, `shiprocketLive()`, `shippingFor()`, `INDIAN_STATES`). Don't read `process.env` elsewhere.

### Test mode

Each integration has a mode: `"live"` (keys present), `"test"` (no keys and `ALLOW_TEST_MODE=true`) or `"off"`. See `paymentMode()` in `razorpay.ts` and `shippingMode()` in `shiprocket.ts`.
- **Payments in test mode:** `createGatewayOrder` returns `test_order_*`. Checkout shows a "Test payment" dialog, and `/api/payments/verify` with `{test:true}` marks the order paid with `test_pay_*`. Refunds return `test_rfnd_*`.
- **Shipping in test mode:** `createShipment` returns fake `SRT*` / `SHT*` ids and a `TEST*` AWB, and serviceability always says "deliverable in 5 days". The admin order page shows buttons to simulate courier events (picked up / in transit / out for delivery / delivered / RTO).
- **Payments off:** checkout returns 503 and the UI points customers to WhatsApp.
- A red banner appears across the store whenever either integration is in test mode.

## Source map

```
prisma/schema.prisma      data model (Postgres; binaryTargets include rhel-openssl-3.0.x for Netlify functions)
netlify.toml              build command, publish dir, Node version
prisma/seed.ts            product + variants + admin (reads .env itself)
public/landing.html       homepage (static); next.config.ts rewrites "/" → "/landing.html"
src/lib/
  config.ts               env, store rules, Indian states
  db.ts                   Prisma singleton
  auth.ts                 JWT cookie sessions, hash/check password, currentUser/requireUser/requireAdmin
  ids.ts                  token(), code(prefix) human ids, safeEqual (timing-safe)
  format.ts               money(paise) → "₹249", dateTime/dateOnly in Asia/Kolkata
  status.ts               ALL status enums + labels, tone() for badges, FULFILMENT_STEPS, CANCELLABLE, RETURN_REASONS
  validation.ts           zod schemas: checkoutSchema, registerSchema, ticketSchema, phone, email, pincode
  orders.ts               ORDER DOMAIN LOGIC (see below); every status/payment change goes through here
  razorpay.ts             REST client (fetch + basic auth), signature checks, refunds
  shiprocket.ts           REST client (token cached ~8 days), serviceability, createShipment, cancel, track, return pickup, mapCourierStatus
  mail.ts                 sendMail(to, subject, paragraphs[], cta?) with an HTML-escaped template
src/app/
  layout.tsx              fonts (Fraunces, Cormorant Garamond, Jost, Tiro Devanagari Hindi) as CSS vars
  globals.css             design tokens + every class used by store, admin and invoice
  (store)/layout.tsx      header/footer, CartProvider, test-mode banner
  (store)/product/[slug]  page.tsx (server) + ProductBuy.tsx (client: shade, qty, add/buy); ?shade=burgundy preselects
  (store)/cart            CartView (client)
  (store)/checkout        page.tsx prefills from user's last order; CheckoutForm.tsx does pincode check, POST /api/checkout, Razorpay modal / test dialog, verify
  (store)/orders/[number] customer order page: progress, timeline, courier scans, cancel, return form, invoice link
  (store)/track           order number + phone/email → redirect to tokenised order page
  (store)/account         my orders + my tickets, sign out
  (store)/login, register
  (store)/support         new ticket form; support/[number] = ticket thread + reply
  (store)/policies/[slug] shipping | returns | terms | privacy | contact (content inline in the page file)
  invoice/[number]        printable GST tax invoice (outside store layout)
  actions/auth.ts         login, register, logout (server actions)
  actions/customer.ts     trackOrder, cancelOrder, requestReturn, createTicket, replyTicket
  actions/admin.ts        shipOrder, updateStatus, syncTracking, simulateCourier, refundOrder, addNote, returnDecision, ticketReply, updateProduct, updateVariant
  api/checkout            create order + gateway order
  api/payments/verify     verify Razorpay signature (or test) → markPaid
  api/serviceability      GET ?pincode= → Shiprocket serviceability
  api/webhooks/razorpay   payment.captured / payment.failed / refund.processed (HMAC of raw body)
  api/webhooks/courier    Shiprocket tracking webhook (x-api-key header)
  admin/                  layout (requireAdmin + sidebar counts), dashboard, orders (+filters.ts, export CSV route, [id]), returns, tickets (+[id]), products, customers
src/components/
  Cart.tsx                CartProvider/useCart (localStorage key "ak_cart_v1", max 10 per line), CartCount
  ActionForm.tsx          ActionForm + useSubmit hook (THE way to build forms)
  AuthForm.tsx            login/register form
  OrderParts.tsx          Progress, Timeline, Items, Address
  ui.tsx                  Badge, BoxVisual (CSS 3D box in the chosen shade)
```

## Data model and conventions

- **Money is always integer paise** (`24900` = ₹249) in the DB, in the code and in the Razorpay API. Shiprocket wants rupees, so divide by 100 only at that boundary. Admin forms take rupees and convert with `rupees()` in `actions/admin.ts`. Display with `money()`.
- **Statuses are plain strings**, not Prisma enums, so the schema stays portable between SQLite and Postgres. Allowed values and labels live **only** in `src/lib/status.ts`. Add new statuses there.
  - `Order.status`: PENDING_PAYMENT → CONFIRMED → PROCESSING → READY_TO_SHIP → SHIPPED → OUT_FOR_DELIVERY → DELIVERED, plus terminal CANCELLED and RTO.
  - `Order.paymentStatus`: PENDING | PAID | FAILED | PARTIALLY_REFUNDED | REFUNDED.
  - `ReturnRequest.status`: REQUESTED → APPROVED (pickup booked) → RECEIVED → REFUNDED, or REJECTED.
  - `Ticket.status`: OPEN | AWAITING_CUSTOMER | RESOLVED | CLOSED. Admin pages use `TICKET_STATUS_ADMIN`, because the customer label says "Awaiting your reply".
- `OrderItem` **snapshots** product name, variant name, SKU, unit price, GST rate and HSN at purchase time. Never re-read prices from `Product` for an existing order.
- `OrderEvent` is the timeline. `internal: true` events show only in admin. `source` is SYSTEM, ADMIN, CUSTOMER, COURIER or PAYMENT.
- **Human ids:** orders `AK` + 7 chars, tickets `T` + 6 chars (`code()` in `ids.ts`, no ambiguous characters). Guests get access through a random `accessToken` on Order and Ticket.
- Emails are stored lowercase. Phones are normalised to 10 digits (`+91`, `0`, spaces and dashes stripped) by the `phone` zod schema.
- Each order is one parcel. `packageFor()` uses the first product's length and breadth, height × total units, and summed weight.

## Order domain logic (`src/lib/orders.ts`): use it, don't bypass it

- `markPaid(orderId, paymentId)` is **idempotent**: a conditional `updateMany` where paymentStatus is PENDING or FAILED. It decrements stock (if stock is short, it sets stock to 0 and logs an internal "stock shortfall" event), logs an event and emails the customer. It's called from both the verify route and the Razorpay webhook, and whichever arrives first wins.
- `setStatus(orderId, status, {message, source, location, force})` stamps `shippedAt`, `deliveredAt` and `cancelledAt` and sends the customer email for SHIPPED, OUT_FOR_DELIVERY, DELIVERED and RTO. **Without `force`, status never moves backwards** along `FULFILMENT_STEPS` and never leaves DELIVERED, CANCELLED or RTO. Out-of-order courier scans become internal events. Admin manual changes pass `force: true`.
- `applyCourierStatus()` maps Shiprocket's free-text status through `mapCourierStatus()`.
- `refund(orderId, amountPaise, reason)` validates against `total - refundedAmount`, calls Razorpay, updates `refundedAmount` and `paymentStatus`, and emails the customer. Partial refunds are supported.
- `cancel(orderId, reason, source)`: customers may cancel only in `CANCELLABLE` (CONFIRMED, PROCESSING). It cancels the Shiprocket order, restocks if the order was paid, forces CANCELLED and auto-refunds the outstanding amount.
- `ship(orderId)` resumes partial progress: it reuses existing `shiprocketOrderId`, `shiprocketShipmentId` and `awbCode`. It sets READY_TO_SHIP, and warnings (pickup or label failures) become internal events.
- `canView(order, user, token)`: allowed for an admin, the owning user, or a timing-safe token match.

## Payment flow (Razorpay)

1. `CheckoutForm` POSTs the cart (`variantId`, `qty`) and the address to `/api/checkout`.
2. The server validates with zod, merges duplicate variants, re-reads prices and stock from the DB (**client prices are never trusted**), adds shipping, creates the Order with status PENDING_PAYMENT, then creates the Razorpay order and stores `razorpayOrderId`.
3. The client loads `checkout.razorpay.com/v1/checkout.js`, opens the modal, and sends the handler's `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` to `/api/payments/verify`. The server checks the access token, checks the order id matches, verifies HMAC(`order_id|payment_id`, key_secret), then calls `markPaid`.
4. The cart is cleared **only** after a successful verify; the client then redirects to `/orders/{number}?t={token}&placed=1`.
5. Backup: the webhook `payment.captured` (HMAC of the raw body with the webhook secret).

Each attempt creates a new order, so abandoned attempts stay as PENDING_PAYMENT. Admin hides them by default under "Abandoned / unpaid", and the dashboard and customers pages exclude them. Razorpay payment capture must be set to automatic in the dashboard.

## Shipping flow (Shiprocket)

- API base: `https://apiv2.shiprocket.in/v1/external`. Login token is cached in module memory for 8 days (tokens last 10).
- The admin "Ship with Shiprocket" button runs: `orders/create/adhoc` (our order number as `order_id`, Prepaid) → `courier/assign/awb` (recommended courier) → `courier/generate/pickup` → `courier/generate/label`.
- Tracking: the webhook `/api/webhooks/courier` matches by AWB or by `order_id`. **The URL deliberately avoids the words "shiprocket", "sr" and "kr", because Shiprocket rejects webhook URLs containing them.** Auth is the `x-api-key` header compared to `SHIPROCKET_WEBHOOK_TOKEN`. `is_return=1` payloads update the ReturnRequest instead, and a DELIVERED return moves it to RECEIVED. Admin "Refresh tracking" polls `courier/track/awb/{awb}`.
- Return pickup: `orders/create/return` from the customer's address to the seller address, then AWB assignment with `is_return: 1`.
- Serviceability: GET `courier/serviceability` from `SELLER_PINCODE`, weight 0.25 kg, cod=0.
- ⚠️ **The live Razorpay and Shiprocket code paths have never been run against the real APIs** (no keys yet). Field names follow the public docs. When keys arrive, test one real order and adjust payloads if the API complains.

## Auth and access control

- Sessions: an HS256 JWT in the httpOnly cookie `ak_session` (30 days, sameSite lax, secure in production). `currentUser()` re-reads the user from the DB on each call.
- Roles: `CUSTOMER` | `ADMIN`. Admins are created only by the seed (or by a DB edit). There is no self-serve admin signup.
- **Every admin server action calls `requireAdmin()`** through the `guarded()` wrapper in `actions/admin.ts`. `admin/layout.tsx` also guards the pages, but the layout guard alone is not enough, because server actions and route handlers are separately reachable. The CSV export route checks the role itself.
- Guest access to an order or ticket uses `?t=<accessToken>`. Order and ticket pages return 404 (not 403) without access.
- Accounts do **not** automatically claim past guest orders with the same email. This is deliberate: there is no email verification yet, so anyone could otherwise register with someone else's email and see their orders.
- `login`/`register` only redirect to a `next` path that starts with `/` and not `//`.

## Rules for writing code here

1. **Forms:** use `<ActionForm action={serverAction} submit="…">` or the `useSubmit()` hook. **Do not use `<form action={…}>` with server actions.** React 19 resets uncontrolled fields after a form-action submit, which wiped what users had typed when validation failed. `useSubmit` submits via `onSubmit` + `startTransition`. Server actions return `{ error }` or `{ ok }` (`FormState` from `actions/auth.ts`) and may `redirect()`.
2. **`"use server"` files may only export async functions.** No constants or sync helpers; the build fails otherwise.
3. Next 15: `await params`, `await searchParams`, `await cookies()`. Pages that read the DB declare `export const dynamic = "force-dynamic"` (admin inherits it from its layout).
4. After a mutation in a server action, `revalidatePath()` the affected pages (`guarded()` takes the list).
5. Put business rules in `src/lib/orders.ts` (or a sibling lib), not in routes or components. Add statuses only in `status.ts`.
6. Validate all external input with zod (`validation.ts`) at route and action boundaries.
7. Compare secrets and tokens with `safeEqual()`, never `===`.
8. Lib files that touch secrets or the DB start with `import "server-only"`.
9. Postgres `contains` is **case-sensitive**. Order numbers are uppercased and emails lowercased before searching; free-text fields like names need `mode: "insensitive"` (see `admin/orders/filters.ts`).
10. CSV export escapes cells starting with `= + - @` to block spreadsheet formula injection. Keep that.
11. Style with existing classes in `globals.css` (`.card`, `.btn btn-gold|ghost|danger`, `.btn-sm`, `.field`, `.input`, `.fields`, `.grid-2`, `.tbl`, `.badge`, `.notice ok|bad`, `.eyebrow`, `.h1/.h2/.h3`, `.kpi`, `.chip`…) and the colour tokens (`--ink`, `--cream`, `--gold`, `--gold-l`, `--olive`, `--rust`…). The look is dark ink + cream + gold, with serif headings and gold-italic `<em>` accents, matching the landing page.
12. Keep code comments minimal; no comment blocks.

## Design notes

- The homepage (`public/landing.html`) is a single large hand-built HTML file: a 3D CSS box, scroll animations, custom cursor, and a loader that needs JS. It is served statically, outside React. **The ₹249 price is hard-coded in it** (nav button, order section, box art), so it won't follow price changes made in Admin → Products.
- Store pages work down to 375 px wide (checked); on mobile the header shows only Sign in / Account and Cart, and the footer carries the other links.

## Testing

There is no automated test suite yet. Verification so far was manual, in the browser (2026-10-23, test mode):
- Product → cart → checkout validation → test payment → confirmation email (console).
- Admin: test shipment → simulated picked up / out for delivery / late in-transit (correctly ignored) / delivered.
- Customer return → auto-created ticket → admin approve with reverse pickup → partial refund of ₹249 → paymentStatus PARTIALLY_REFUNDED.
- Customer cancel → full refund + restock (Dark Brown 100 → 97 → 100); repeated verify calls don't double-decrement.
- Ticket create (validation keeps fields) → admin reply → customer view.
- GST invoice maths (₹249 at 18% intra-state = 211.02 + 18.99 CGST + 18.99 SGST).
- Security probes: webhooks reject a missing or wrong token or signature (401); a wrong order token gets 404; admin export without login gets 403; `/admin` redirects to login; oversized quantities and unknown variants get 409; a bad pincode gets 400.

To re-test end to end, use the "ayurkesha" preview config, sign in as admin with the `.env` credentials, and use the test-mode buttons. The local DB contains test orders (`AK3Y72VJC`, `AKURBTNET`) and the owner's own test order from Mumbai. **Don't modify orders you didn't create.**

## Known gaps and ideas (not built)

- There is **no `/shop` page**: the owner disliked a second "home-like" screen, so it was removed (2026-10-23). `/shop` redirects to `/product/ritual-box` (next.config.ts), and every "Shop" link points there. If more products are added, ask before bringing back a listing page, and make it match the landing page's look.
- No coupons or discount codes, COD, reviews, wishlists, multiple saved addresses, email verification, password reset, rate limiting on login and checkout, or cleanup job for abandoned PENDING_PAYMENT orders.
- No retry-payment button on an unpaid order; the customer re-checks out from the saved cart.
- No upload support on tickets (customers are asked for photos but can't attach them; they use WhatsApp or email).
- Policies are reasonable templates and need the owner's (or a lawyer's) review. GST 18% / HSN 3305 needs confirmation from their accountant. Box weight 250 g and size 20×14×6 cm are guesses.
- The project lives in OneDrive, where syncing `node_modules` and `.next` is slow and can lock files. Moving it outside OneDrive is recommended.
- **Deployment:** Netlify project `ayurkeshaa` builds `main` of `ayukeasha` for production and gives every pull request a Deploy Preview. Env vars are set in the Netlify UI by the owner (Claude must never type secrets into it). Remaining go-live steps: Neon production DB + seed, Razorpay KYC + webhook, Shiprocket API user + pickup location + webhook, SMTP, `ALLOW_TEST_MODE=false`. See README. The Netlify plan was low on credits (180 left on 2026-10-23); each build uses credits.
