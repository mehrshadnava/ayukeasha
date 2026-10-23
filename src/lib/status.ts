export const ORDER_STATUS = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Packing",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RTO: "Returned to sender",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUS;

export const PAYMENT_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
} as const;

export const RETURN_STATUS = {
  REQUESTED: "Return requested",
  APPROVED: "Return approved — pickup scheduled",
  REJECTED: "Return declined",
  RECEIVED: "Returned item received",
  REFUNDED: "Refunded",
} as const;
export type ReturnStatus = keyof typeof RETURN_STATUS;

export const TICKET_STATUS = {
  OPEN: "Open",
  AWAITING_CUSTOMER: "Awaiting your reply",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
} as const;
export type TicketStatus = keyof typeof TICKET_STATUS;
export const TICKET_STATUS_ADMIN: Record<TicketStatus, string> = { ...TICKET_STATUS, AWAITING_CUSTOMER: "Awaiting customer" };

export const TICKET_CATEGORY = {
  ORDER: "Order or payment",
  DELIVERY: "Delivery",
  RETURN: "Return or refund",
  PRODUCT: "Product or usage question",
  OTHER: "Something else",
} as const;

export const RETURN_REASONS = [
  "Damaged or leaking sachet",
  "Wrong shade or item received",
  "Missing items in the box",
  "Allergic reaction / skin irritation",
  "Expired or near-expiry product",
  "Other",
];

/** Ordered fulfilment steps shown on the customer tracking timeline. */
export const FULFILMENT_STEPS: OrderStatus[] = ["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export const CANCELLABLE: OrderStatus[] = ["CONFIRMED", "PROCESSING"];

export function tone(status: string) {
  if (["DELIVERED", "PAID", "RESOLVED", "REFUNDED", "RECEIVED"].includes(status)) return "ok";
  if (["CANCELLED", "RTO", "FAILED", "REJECTED", "CLOSED"].includes(status)) return "bad";
  if (["PENDING_PAYMENT", "PENDING", "REQUESTED", "OPEN", "AWAITING_CUSTOMER"].includes(status)) return "warn";
  return "info";
}

export const label = (map: Record<string, string>, s: string) => map[s] ?? s;
