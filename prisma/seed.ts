import { readFileSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const db = new PrismaClient();

const DESCRIPTION =
  "Grey to black, the herbal way. Pure, hand-picked henna blended with ten time-tested Ayurvedic botanicals — Amla, Bhringraj, Shikakai, Brahmi and more. Covers greys while conditioning hair, nourishing the scalp and enhancing natural shine. Self-apply at home, ready in 45 minutes.";

const SHADES = [
  { name: "Natural Black", hindiName: "काला", colorHex: "#17120f", code: "BLK" },
  { name: "Dark Brown", hindiName: "गहरा भूरा", colorHex: "#3b2416", code: "DBR" },
  { name: "Brown", hindiName: "भूरा", colorHex: "#6e3f22", code: "BRN" },
  { name: "Burgundy", hindiName: "बरगंडी", colorHex: "#5c1621", code: "BUR" },
];

// Weight and box sizes for the 1- and 2-sachet packs are estimates; correct them in Admin → Products.
const PACKS = [
  { slug: "pack-1", size: 1, price: 15000, weightGrams: 120, lengthCm: 16, breadthCm: 11, heightCm: 3, skuPrefix: "AK-P1" },
  { slug: "pack-2", size: 2, price: 25000, weightGrams: 190, lengthCm: 18, breadthCm: 12, heightCm: 5, skuPrefix: "AK-P2" },
  { slug: "ritual-box", size: 3, price: 35000, weightGrams: 250, lengthCm: 20, breadthCm: 14, heightCm: 6, skuPrefix: "AK-RB3" },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const nameFor = (n: number) => `AyurKesha Herbal Hair Colour — ${plural(n, "Sachet", "Sachets")}`;
const highlightsFor = (n: number) =>
  [
    `${n} × 40 g herbal ${n === 1 ? "sachet" : "sachets"} — one complete application each`,
    `${plural(n, "pair", "pairs")} of gloves, application comb, shower cap & tissue`,
    "PPD-free · Ammonia-free · Paraben-free",
    "Ready in 45 minutes · for grey hair · self apply",
  ].join("\n");

async function main() {
  // One-time migration: the original 3-sachet Ritual Box (slug kept, so past orders and old links stay valid) moves to ₹350.
  const legacy = await db.product.findUnique({ where: { slug: "ritual-box" } });
  if (legacy && legacy.packSize !== 3) {
    await db.product.update({
      where: { id: legacy.id },
      data: { name: nameFor(3), tagline: "Herbal hair colour · Pack of 3", highlights: highlightsFor(3), packSize: 3, price: 35000, mrp: 35000, sortOrder: 3 },
    });
    console.log("Converted the original Ritual Box into the 3-sachet pack at ₹350");
  }

  for (const p of PACKS) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await db.product.update({ where: { id: existing.id }, data: { packSize: p.size, sortOrder: p.size } });
      console.log(`Pack ready: ${existing.name} (kept existing price and stock)`);
      continue;
    }
    const created = await db.product.create({
      data: {
        slug: p.slug,
        name: nameFor(p.size),
        tagline: `Herbal hair colour · Pack of ${p.size}`,
        description: DESCRIPTION,
        highlights: highlightsFor(p.size),
        packSize: p.size,
        price: p.price,
        mrp: p.price,
        gstRate: 18,
        hsn: "3305",
        weightGrams: p.weightGrams,
        lengthCm: p.lengthCm,
        breadthCm: p.breadthCm,
        heightCm: p.heightCm,
        sortOrder: p.size,
        variants: {
          create: SHADES.map((s, i) => ({ name: s.name, hindiName: s.hindiName, colorHex: s.colorHex, sku: `${p.skuPrefix}-${s.code}`, stock: 100, sortOrder: i })),
        },
      },
    });
    console.log(`Pack created: ${created.name} at ₹${p.price / 100}`);
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash },
    create: { email, name: "AyurKesha Admin", passwordHash, role: "ADMIN" },
  });
  console.log(`Admin ready: ${email} (password is ADMIN_PASSWORD in .env)`);
}

main().finally(() => db.$disconnect());
