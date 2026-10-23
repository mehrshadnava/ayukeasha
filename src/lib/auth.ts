import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { config } from "./config";

const COOKIE = "ak_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  if (config.authSecret.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  return new TextEncoder().encode(config.authSecret);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function startSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    return await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, phone: true, role: true },
    });
  } catch {
    return null;
  }
}

export async function requireUser(next = "/account") {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}
