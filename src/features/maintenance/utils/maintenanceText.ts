import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import type { MaintenanceWindow } from "@/lib/maintenance";

/** "Expected back Tue 6 Oct, 3:00 PM (in 25 minutes)", or a plain line when there is no end time. */
export function expectedBack(window: Pick<MaintenanceWindow, "endsAt">) {
  if (!window.endsAt) return "We'll be back as soon as the work is done.";
  return `Expected back ${formatDateTime(window.endsAt)} (${formatTimeAgo(window.endsAt)}).`;
}

/** "Tue 6 Oct, 2:00 PM – 3:00 PM" style range for a scheduled window. */
export function windowRange(window: Pick<MaintenanceWindow, "startsAt" | "endsAt">) {
  const start = window.startsAt ? formatDateTime(window.startsAt) : "now";
  return window.endsAt ? `${start} until ${formatDateTime(window.endsAt)}` : `from ${start}`;
}

export const scopeLabel = (window: Pick<MaintenanceWindow, "scope">) => (window.scope === "platform" ? "TaskFlow" : "this workspace");
