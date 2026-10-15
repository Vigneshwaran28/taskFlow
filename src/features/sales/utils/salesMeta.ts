// Display metadata for deal stages and order statuses. Complete class names only.
import type { Tone } from "@/components/ui/Badge";
import type { DealStage, OrderStatus } from "../services/salesService";

export const DEAL_STAGES: Readonly<Record<DealStage, { label: string; tone: Tone; open: boolean }>> = Object.freeze({
  lead: { label: "Lead", tone: "neutral", open: true },
  qualified: { label: "Qualified", tone: "info", open: true },
  proposal: { label: "Proposal", tone: "primary", open: true },
  negotiation: { label: "Negotiation", tone: "warning", open: true },
  won: { label: "Won", tone: "success", open: false },
  lost: { label: "Lost", tone: "danger", open: false },
});

export const ORDER_STATUSES: Readonly<Record<OrderStatus, { label: string; tone: Tone }>> = Object.freeze({
  draft: { label: "Draft", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "primary" },
  fulfilled: { label: "Fulfilled", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
});

export const toOptions = <K extends string>(map: Readonly<Record<K, { label: string }>>) =>
  (Object.entries(map) as [K, { label: string }][]).map(([value, meta]) => ({ value, label: meta.label }));
