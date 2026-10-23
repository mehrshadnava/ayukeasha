import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/account" } = await searchParams;
  if (await currentUser()) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="wrap auth">
      <p className="eyebrow">Welcome back</p>
      <h1 className="h1">Sign <em>in.</em></h1>
      <AuthForm kind="login" next={next} />
      <p className="muted small mt">New here? <Link className="link" href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link>. Ordered as a guest? <Link className="link" href="/track">Track your order</Link>.</p>
    </div>
  );
}
