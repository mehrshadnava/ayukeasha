"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { variantId: string; qty: number; name: string; variantName: string; price: number; colorHex: string; slug: string };

type Cart = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const Ctx = createContext<Cart | null>(null);
const KEY = "ak_cart_v1";
export const MAX_QTY = 10;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: CartLine[] = [];
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {}
    setLines(stored);
    setReady(true);
    if (!stored.length) return;
    // Lines can be stale (price changed, pack removed); refresh them from the live catalog.
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((c: { packs: { slug: string; name: string; price: number; shades: { id: string; name: string; colorHex: string }[] }[] }) => {
        const byId = new Map(c.packs.flatMap((p) => p.shades.map((s) => [s.id, { p, s }] as const)));
        setLines((ls) => ls.flatMap((l) => {
          const hit = byId.get(l.variantId);
          return hit ? [{ ...l, name: hit.p.name, price: hit.p.price, slug: hit.p.slug, variantName: hit.s.name, colorHex: hit.s.colorHex }] : [];
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((ls) => {
      const ex = ls.find((l) => l.variantId === line.variantId);
      if (ex) return ls.map((l) => (l.variantId === line.variantId ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l));
      return [...ls, { ...line, qty: Math.min(MAX_QTY, line.qty) }];
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.variantId !== id) : ls.map((l) => (l.variantId === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))));
  }, []);
  const remove = useCallback((id: string) => setLines((ls) => ls.filter((l) => l.variantId !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Cart>(() => ({
    lines, ready, add, setQty, remove, clear,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
  }), [lines, ready, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

export function CartCount() {
  const { count, ready } = useCart();
  if (!ready || count === 0) return null;
  return <span className="cart-count">{count}</span>;
}
