import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Create account" };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/account" } = await searchParams;
  return (
    <div className="wrap auth">
      <p className="eyebrow">Join the family</p>
      <h1 className="h1">Create an <em>account.</em></h1>
      <AuthForm kind="register" next={next} />
      <p className="muted small mt">Already have one? <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>.</p>
    </div>
  );
}
