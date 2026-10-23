const env = (k: string, d = "") => process.env[k]?.trim() || d;
const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && process.env[k] !== "" && process.env[k] != null ? v : d;
};

export const config = {
  // On Netlify, DEPLOY_PRIME_URL is the preview/branch URL and URL the production URL.
  appUrl: (env("APP_URL") || env("DEPLOY_PRIME_URL") || env("URL") || "http://localhost:3000").replace(/\/$/, ""),
  authSecret: env("AUTH_SECRET"),
  shippingFee: num("SHIPPING_FEE_INR", 49) * 100,
  freeShippingAbove: num("FREE_SHIPPING_ABOVE_INR", 450) * 100,
  returnWindowDays: num("RETURN_WINDOW_DAYS", 7),
  testModeAllowed: env("ALLOW_TEST_MODE") === "true",
  seller: {
    name: env("SELLER_NAME", "Aditya Enterprises"),
    address: env("SELLER_ADDRESS", "Sector-12, Kharghar, Navi Mumbai"),
    state: env("SELLER_STATE", "Maharashtra"),
    pincode: env("SELLER_PINCODE", "410210"),
    gstin: env("SELLER_GSTIN"),
    phone: env("SELLER_PHONE", "9619178792"),
    email: env("SELLER_EMAIL", "customercare@ayurkesha.com"),
  },
  razorpay: {
    keyId: env("RAZORPAY_KEY_ID"),
    keySecret: env("RAZORPAY_KEY_SECRET"),
    webhookSecret: env("RAZORPAY_WEBHOOK_SECRET"),
  },
  shiprocket: {
    email: env("SHIPROCKET_EMAIL"),
    password: env("SHIPROCKET_PASSWORD"),
    pickupLocation: env("SHIPROCKET_PICKUP_LOCATION", "Primary"),
    webhookToken: env("SHIPROCKET_WEBHOOK_TOKEN"),
  },
  smtp: {
    host: env("SMTP_HOST"),
    port: num("SMTP_PORT", 587),
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
    from: env("MAIL_FROM", "AyurKesha <customercare@ayurkesha.com>"),
  },
};

export const razorpayLive = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);
export const shiprocketLive = () => Boolean(config.shiprocket.email && config.shiprocket.password);

export function shippingFor(subtotal: number) {
  return subtotal >= config.freeShippingAbove ? 0 : config.shippingFee;
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];
