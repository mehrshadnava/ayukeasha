import { randomBytes, randomInt, timingSafeEqual } from "crypto";

export const token = () => randomBytes(24).toString("base64url");

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const code = (prefix: string, len = 7) =>
  prefix + Array.from({ length: len }, () => ALPHA[randomInt(ALPHA.length)]).join("");

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
