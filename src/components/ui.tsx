import { label, tone } from "@/lib/status";

export function Badge({ map, value }: { map: Record<string, string>; value: string }) {
  return <span className={`badge ${tone(value)}`}>{label(map, value)}</span>;
}
