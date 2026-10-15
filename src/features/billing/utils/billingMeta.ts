// Display metadata for billing statuses and payment methods, plus the line math the server uses.
import type { Tone } from "@/components/ui/Badge";
import type { SelectOption } from "@/components/ui/SelectField";
import type { DocumentKind, DocumentStatus, InvoiceStatus, QuoteStatus } from "../services/billingService";

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export const INVOICE_STATUS_META: Readonly<Record<InvoiceStatus, StatusMeta>> = Object.freeze({
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  partially_paid: { label: "Partially paid", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  void: { label: "Void", tone: "danger" },
});

export const QUOTE_STATUS_META: Readonly<Record<QuoteStatus, StatusMeta>> = Object.freeze({
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  converted: { label: "Converted", tone: "primary" },
});

export function statusMeta(kind: DocumentKind, status: DocumentStatus): StatusMeta {
  const map: Record<string, StatusMeta> = kind === "quote" ? QUOTE_STATUS_META : INVOICE_STATUS_META;
  return map[status] ?? { label: status.replace(/_/g, " "), tone: "neutral" };
}

export function statusOptions(kind: DocumentKind): SelectOption[] {
  const map = kind === "quote" ? QUOTE_STATUS_META : INVOICE_STATUS_META;
  return [{ value: "", label: "All statuses" }, ...Object.entries(map).map(([value, meta]) => ({ value, label: meta.label }))];
}

export const KIND_META: Readonly<Record<DocumentKind, { label: string; plural: string; title: string; dueLabel: string }>> = Object.freeze({
  invoice: { label: "Invoice", plural: "Invoices", title: "Tax invoice", dueLabel: "Due date" },
  quote: { label: "Quote", plural: "Quotes", title: "Quotation", dueLabel: "Valid until" },
});

export const PAYMENT_METHOD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
});

export const paymentMethodLabel = (method: string) => PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, " ");

export const AGING_BUCKETS = Object.freeze([
  { key: "current", label: "Current", className: "bg-emerald-500" },
  { key: "d1_30", label: "1–30 days", className: "bg-amber-400" },
  { key: "d31_60", label: "31–60 days", className: "bg-orange-500" },
  { key: "d61_90", label: "61–90 days", className: "bg-red-500" },
  { key: "d90_plus", label: "90+ days", className: "bg-red-800 dark:bg-red-700" },
] as const);

// ---- Line math: mirrors server/src/services/billing.js priceLines exactly ----
export const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export interface PricedLineInput {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

export function priceLine({ quantity, unitPrice, discountPct, taxRate }: PricedLineInput) {
  const gross = round2(quantity * unitPrice);
  const lineSubtotal = round2(quantity * unitPrice * (1 - discountPct / 100));
  const lineTax = round2((lineSubtotal * taxRate) / 100);
  return { gross, lineSubtotal, lineTax, lineTotal: round2(lineSubtotal + lineTax) };
}

export function priceLines(lines: readonly PricedLineInput[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  for (const line of lines) {
    const priced = priceLine(line);
    subtotal += priced.gross;
    discountTotal += round2(priced.gross - priced.lineSubtotal);
    taxTotal += priced.lineTax;
  }
  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxTotal = round2(taxTotal);
  return { subtotal, discountTotal, taxTotal, total: round2(subtotal - discountTotal + taxTotal) };
}

/** "18" -> 18, "" or junk -> fallback */
export const toNumber = (value: string, fallback = 0) => {
  const number = Number(value);
  return value.trim() === "" || Number.isNaN(number) ? fallback : number;
};
