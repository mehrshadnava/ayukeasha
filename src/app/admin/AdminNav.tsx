"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  const items: [string, string, string?][] = [
    ["/admin", "Dashboard"],
    ["/admin/orders", "Orders", "toShip"],
    ["/admin/returns", "Returns", "returns"],
    ["/admin/tickets", "Support", "tickets"],
    ["/admin/products", "Products & stock", "lowStock"],
    ["/admin/customers", "Customers"],
  ];
  return (
    <>
      {items.map(([href, label, key]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        const n = key ? counts[key] : 0;
        return (
          <Link key={href} href={href} className="nav" aria-current={active ? "page" : undefined}>
            {label}{n > 0 && <span className="pill">{n}</span>}
          </Link>
        );
      })}
    </>
  );
}
