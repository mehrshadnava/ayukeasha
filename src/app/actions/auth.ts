"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword, endSession, hashPassword, startSession } from "@/lib/auth";
import { email as emailSchema, firstError, registerSchema } from "@/lib/validation";

export type FormState = { error?: string; ok?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
};

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  if (!email.success || !password) return { error: "Enter your email and password." };
  const user = await db.user.findUnique({ where: { email: email.data } });
  if (!user || !(await checkPassword(password, user.passwordHash))) return { error: "That email and password don't match." };
  await startSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, email, phone, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists. Try signing in." };
  const user = await db.user.create({ data: { name, email, phone, passwordHash: await hashPassword(password) } });
  await startSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/");
}
