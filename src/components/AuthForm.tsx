"use client";
import { login, register } from "@/app/actions/auth";
import { useSubmit } from "./ActionForm";

export default function AuthForm({ kind, next }: { kind: "login" | "register"; next: string }) {
  const { state, pending, onSubmit } = useSubmit(kind === "login" ? login : register);
  return (
    <form onSubmit={onSubmit} className="card stack">
      <input type="hidden" name="next" value={next} />
      {kind === "register" && (
        <label className="field"><span>Full name</span><input className="input" name="name" autoComplete="name" required /></label>
      )}
      <label className="field"><span>Email</span><input className="input" type="email" name="email" autoComplete="email" required /></label>
      {kind === "register" && (
        <label className="field"><span>Mobile (optional)</span><input className="input" type="tel" name="phone" autoComplete="tel" inputMode="numeric" /></label>
      )}
      <label className="field">
        <span>Password</span>
        <input className="input" type="password" name="password" autoComplete={kind === "login" ? "current-password" : "new-password"} minLength={kind === "register" ? 8 : undefined} required />
      </label>
      {state?.error && <p className="notice bad">{state.error}</p>}
      <button className="btn btn-gold btn-block" disabled={pending}>{pending ? "Please wait…" : kind === "login" ? "Sign in" : "Create account"}</button>
    </form>
  );
}
