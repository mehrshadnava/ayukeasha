"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";

type State = { error?: string; ok?: string } | undefined;

/** Submits via onSubmit (not the form `action` prop) so React doesn't wipe the fields when the server returns an error. */
export function useSubmit(action: (s: State, fd: FormData) => Promise<State>, confirm?: string) {
  const [state, run, pending] = useActionState<State, FormData>(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
  return { state, pending, onSubmit };
}

export default function ActionForm({
  action, children, submit, className = "stack", confirm, variant = "gold", small, resetOnOk,
}: {
  action: (s: State, fd: FormData) => Promise<State>;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  confirm?: string;
  variant?: "gold" | "ghost" | "danger";
  small?: boolean;
  resetOnOk?: boolean;
}) {
  const { state, pending, onSubmit } = useSubmit(action, confirm);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnOk && state?.ok) ref.current?.reset(); }, [state, resetOnOk]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {children}
      {state?.error && <p className="notice bad">{state.error}</p>}
      {state?.ok && <p className="notice ok">{state.ok}</p>}
      <div><button className={`btn btn-${variant}${small ? " btn-sm" : ""}`} disabled={pending}>{pending ? "Working…" : submit}</button></div>
    </form>
  );
}
