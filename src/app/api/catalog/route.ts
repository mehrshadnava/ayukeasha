import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(
    {
      freeShippingAbove: config.freeShippingAbove,
      packs: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        size: p.packSize,
        price: p.price,
        mrp: p.mrp,
        highlights: p.highlights.split("\n").filter(Boolean),
        shades: p.variants.map((v) => ({ id: v.id, name: v.name, hindiName: v.hindiName, colorHex: v.colorHex, inStock: v.stock > 0 })),
      })),
    },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
  );
}
