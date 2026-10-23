import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { BoxVisual } from "@/components/ui";

export const metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

export default async function Shop() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  return (
    <div className="wrap">
      <div className="page-head">
        <p className="eyebrow">The collection</p>
        <h1 className="h1">From leaves, <em>not from labs.</em></h1>
        <p className="muted">Herbal hair colour, blended from ten Ayurvedic botanicals.</p>
      </div>
      <div className="cards">
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="pcard">
            <BoxVisual color={p.variants[0]?.colorHex ?? "#17120f"} />
            <div className="pcard-body">
              <p className="small muted">{p.tagline}</p>
              <h2 className="h3 mt-s">{p.name}</h2>
              <div className="row between mt-s">
                <span className="gold" style={{ fontSize: 20, fontFamily: "var(--serif)" }}>{money(p.price)}</span>
                <span className="row" style={{ gap: 6 }}>
                  {p.variants.map((v) => <i key={v.id} title={v.name} style={{ width: 16, height: 16, borderRadius: "50%", background: v.colorHex, boxShadow: "0 0 0 1px rgba(232,207,150,.4)" }} />)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
