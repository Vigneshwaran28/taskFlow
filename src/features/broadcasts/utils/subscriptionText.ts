import type { Tone } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { BroadcastSeverity, SubscriptionSummary } from "../services/broadcastService";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "Ends on 12 Nov 2026 · 5 days left", "Ended on … Access continues until …", … */
export function subscriptionLine(subscription: SubscriptionSummary): string {
  const { endsOn, daysLeft, graceEndsOn, state } = subscription;
  if (!endsOn || daysLeft == null) return "No end date";
  if (state === "grace") return `Ended on ${formatDate(endsOn)}. Access continues until ${formatDate(graceEndsOn)}.`;
  if (state === "expired") return `Ended on ${formatDate(endsOn)}.`;
  const left = daysLeft === 0 ? "ends today" : daysLeft === 1 ? "1 day left" : `${plural(daysLeft, "day")} left`;
  return `Ends on ${formatDate(endsOn)} · ${left}`;
}

/** Short status: Active, Ends in 5 days, In grace, Expired. */
export function subscriptionStatus(subscription: SubscriptionSummary): { label: string; tone: Tone } {
  const { daysLeft, state } = subscription;
  if (state === "ending" && daysLeft != null) return { label: daysLeft === 0 ? "Ends today" : `Ends in ${plural(daysLeft, "day")}`, tone: daysLeft <= 7 ? "danger" : "warning" };
  if (state === "grace") return { label: "In grace period", tone: "danger" };
  if (state === "expired") return { label: "Expired", tone: "danger" };
  return { label: "Active", tone: "success" };
}

export const SEVERITY_TONE: Record<BroadcastSeverity, Tone> = { info: "info", warning: "warning", critical: "danger" };
export const SEVERITY_LABEL: Record<BroadcastSeverity, string> = { info: "Info", warning: "Warning", critical: "Critical" };
export const KIND_LABEL = { announcement: "Announcement", maintenance: "Maintenance", subscription: "Subscription" } as const;
