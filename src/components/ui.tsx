import { label, tone } from "@/lib/status";

export function Badge({ map, value }: { map: Record<string, string>; value: string }) {
  return <span className={`badge ${tone(value)}`}>{label(map, value)}</span>;
}

export function BoxVisual({ color, shade, hindi }: { color: string; shade?: string; hindi?: string }) {
  return (
    <div className="pdp-vis">
      <div className="box3d">
        <span>Herbal hair colour</span>
        <b>AyurKesha</b>
        <small>{hindi || "आयुरकेशा"}</small>
        <div className="sw" style={{ background: color }} />
        {shade && <span>{shade}</span>}
      </div>
    </div>
  );
}
