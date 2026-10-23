import type { Prisma } from "@prisma/client";

export const FILTERS: Record<string, { label: string; where: Prisma.OrderWhereInput }> = {
  all: { label: "All paid", where: { NOT: { status: "PENDING_PAYMENT" } } },
  "to-ship": { label: "To ship", where: { status: { in: ["CONFIRMED", "PROCESSING"] } } },
  "in-transit": { label: "In transit", where: { status: { in: ["READY_TO_SHIP", "SHIPPED", "OUT_FOR_DELIVERY"] } } },
  delivered: { label: "Delivered", where: { status: "DELIVERED" } },
  problems: { label: "Cancelled / RTO", where: { status: { in: ["CANCELLED", "RTO"] } } },
  unpaid: { label: "Abandoned / unpaid", where: { status: "PENDING_PAYMENT" } },
};

export function orderWhere(status?: string, q?: string): Prisma.OrderWhereInput {
  const base = FILTERS[status ?? "all"]?.where ?? FILTERS.all.where;
  const term = q?.trim();
  if (!term) return base;
  return {
    AND: [base, { OR: [{ number: { contains: term.toUpperCase() } }, { name: { contains: term, mode: "insensitive" } }, { email: { contains: term.toLowerCase() } }, { phone: { contains: term } }, { awbCode: { contains: term } }] }],
  };
}
