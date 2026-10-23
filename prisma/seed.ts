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

async function main() {
  const product = await db.product.upsert({
    where: { slug: "ritual-box" },
    update: {},
    create: {
      slug: "ritual-box",
      name: "AyurKesha Ritual Box",
      tagline: "Herbal hair colour · Pack of 3",
      description:
        "Grey to black, the herbal way. Pure, hand-picked henna blended with ten time-tested Ayurvedic botanicals — Amla, Bhringraj, Shikakai, Brahmi and more. Covers greys while conditioning hair, nourishing the scalp and enhancing natural shine. Self-apply at home, ready in 45 minutes.",
      highlights: [
        "3 × 40 g herbal sachets — one complete application each",
        "3 pairs of gloves, 1 application comb, shower cap & tissue",
        "PPD-free · Ammonia-free · Paraben-free",
        "Ready in 45 minutes · for grey hair · self apply",
      ].join("\n"),
      price: 24900,
      mrp: 24900,
      gstRate: 18,
      hsn: "3305",
      weightGrams: 250,
      lengthCm: 20,
      breadthCm: 14,
      heightCm: 6,
      variants: {
        create: [
          { name: "Natural Black", hindiName: "काला", colorHex: "#17120f", sku: "AK-RB3-BLK", stock: 200, sortOrder: 0 },
          { name: "Dark Brown", hindiName: "गहरा भूरा", colorHex: "#3b2416", sku: "AK-RB3-DBR", stock: 100, sortOrder: 1 },
          { name: "Brown", hindiName: "भूरा", colorHex: "#6e3f22", sku: "AK-RB3-BRN", stock: 100, sortOrder: 2 },
          { name: "Burgundy", hindiName: "बरगंडी", colorHex: "#5c1621", sku: "AK-RB3-BUR", stock: 100, sortOrder: 3 },
        ],
      },
    },
  });
  console.log(`Product ready: ${product.name}`);

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
