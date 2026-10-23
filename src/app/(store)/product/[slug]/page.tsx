import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { money } from "@/lib/format";
import ProductBuy from "./ProductBuy";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.product.findFirst({
    where: { slug, active: true },
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  return { title: p?.name ?? "Product" };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ shade?: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const { shade } = await searchParams;
  return (
    <div className="wrap">
      <ProductBuy
        product={{ slug: p.slug, name: p.name, tagline: p.tagline, description: p.description, price: p.price, mrp: p.mrp, highlights: p.highlights.split("\n").filter(Boolean) }}
        variants={p.variants.map((v) => ({ id: v.id, name: v.name, hindiName: v.hindiName, colorHex: v.colorHex, inStock: v.stock > 0 }))}
        initialShade={shade}
        freeShippingAbove={money(config.freeShippingAbove)}
        returnDays={config.returnWindowDays}
      />
      <section className="card mt-l">
        <h2 className="h2">Before you colour</h2>
        <p className="muted"><b className="gold">Allergy test 48 h before every use.</b> Even natural ingredients can cause allergies. Mix a little powder into a paste, apply inside your elbow and leave for 24 h. If redness or itching appears, do not use. Avoid eyes, eyebrows and lashes. External use only. Keep away from children.</p>
      </section>
    </div>
  );
}
