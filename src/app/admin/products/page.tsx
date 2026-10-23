import { db } from "@/lib/db";
import ActionForm from "@/components/ActionForm";
import { updateProduct, updateVariant } from "@/app/actions/admin";

export default async function Products() {
  const products = await db.product.findMany({ orderBy: { sortOrder: "asc" }, include: { variants: { orderBy: { sortOrder: "asc" } } } });
  return (
    <>
      <div className="adm-head"><div><p className="eyebrow">Catalogue</p><h1>Products &amp; stock</h1></div></div>
      {products.map((p) => (
        <div key={p.id} className="stack" style={{ marginBottom: 32 }}>
          <div className="card">
            <h2 className="h2">Stock by shade</h2>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Shade</th><th>SKU</th><th>In stock</th><th>Sell</th><th></th></tr></thead>
                <tbody>
                  {p.variants.map((v) => (
                    <tr key={v.id}>
                      <td><span className="row"><i style={{ width: 18, height: 18, borderRadius: "50%", background: v.colorHex, boxShadow: "0 0 0 1px rgba(232,207,150,.4)" }} />{v.name}</span></td>
                      <td className="small">{v.sku}</td>
                      <td colSpan={3}>
                        <ActionForm action={updateVariant} submit="Save" small variant="ghost" className="row">
                          <input type="hidden" name="variantId" value={v.id} />
                          <input className="input" name="stock" type="number" min={0} defaultValue={v.stock} style={{ width: 110, borderColor: v.stock <= 10 ? "var(--bad)" : undefined }} />
                          <label className="row small"><input type="checkbox" name="active" defaultChecked={v.active} /> on sale</label>
                        </ActionForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h2 className="h2">{p.name}</h2>
            <ActionForm action={updateProduct} submit="Save product">
              <input type="hidden" name="productId" value={p.id} />
              <div className="fields">
                <label className="field"><span>Name</span><input className="input" name="name" defaultValue={p.name} required /></label>
                <label className="field"><span>Tagline</span><input className="input" name="tagline" defaultValue={p.tagline} /></label>
                <label className="field"><span>Price (₹, incl. GST)</span><input className="input" name="price" type="number" step="0.01" defaultValue={p.price / 100} required /></label>
                <label className="field"><span>MRP (₹)</span><input className="input" name="mrp" type="number" step="0.01" defaultValue={p.mrp / 100} required /></label>
                <label className="field"><span>GST rate (%)</span>
                  <select className="input" name="gstRate" defaultValue={String(p.gstRate)}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select>
                </label>
                <label className="field"><span>HSN code</span><input className="input" name="hsn" defaultValue={p.hsn} /></label>
                <label className="field"><span>Packed weight (g)</span><input className="input" name="weightGrams" type="number" defaultValue={p.weightGrams} /></label>
                <div className="field"><span>Box size L × B × H (cm)</span>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input className="input" name="lengthCm" type="number" defaultValue={p.lengthCm} />
                    <input className="input" name="breadthCm" type="number" defaultValue={p.breadthCm} />
                    <input className="input" name="heightCm" type="number" defaultValue={p.heightCm} />
                  </div>
                </div>
                <label className="field full"><span>Description</span><textarea className="input" name="description" defaultValue={p.description} /></label>
                <label className="field full"><span>Highlights (one per line)</span><textarea className="input" name="highlights" defaultValue={p.highlights} /></label>
                <label className="row small"><input type="checkbox" name="active" defaultChecked={p.active} /> Visible in shop</label>
              </div>
            </ActionForm>
            <p className="hint mt-s">Weight and box size are sent to Shiprocket for courier rates — keep them accurate to avoid weight-discrepancy charges. Note: the homepage price (₹249) is part of the landing page design in public/landing.html.</p>
          </div>
        </div>
      ))}
    </>
  );
}
