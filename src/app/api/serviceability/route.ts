import { NextResponse } from "next/server";
import { pincode } from "@/lib/validation";
import { checkServiceability } from "@/lib/shiprocket";

export async function GET(req: Request) {
  const pin = pincode.safeParse(new URL(req.url).searchParams.get("pincode") ?? "");
  if (!pin.success) return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
  const r = await checkServiceability(pin.data, 0.25);
  return NextResponse.json(r, { headers: { "Cache-Control": "public, max-age=3600" } });
}
